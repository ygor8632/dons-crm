// Edge Function: ações do CRM na API oficial do WhatsApp (Meta Cloud API).
//
// Sempre com o JWT do usuário. A visibilidade da conversa é conferida com o
// próprio JWT (RLS); gravações e o token da Meta (Vault) ficam com o service role.
//
// Ações (POST { acao, ... }):
//   testar         admin  · confere número e token na Meta e assina o app no WABA
//   enviar_texto   todos  · { conversa_id, texto } — só dentro da janela de 24h
//   modelos        todos  · lista os modelos APROVADOS do WABA
//   enviar_modelo  todos  · { conversa_id | lead_id, nome, idioma, parametros[] }
//   marcar_lida    todos  · { conversa_id } — zera não lidas e avisa a Meta
//   midia          todos  · { mensagem_id } — baixa a mídia recebida (base64)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { encodeBase64 } from 'jsr:@std/encoding@1/base64';

const URL_SB = Deno.env.get('SUPABASE_URL')!;
const GRAPH = `https://graph.facebook.com/${Deno.env.get('WHATSAPP_GRAPH_VERSAO') ?? 'v23.0'}`;
const JANELA_MS = 24 * 3600e3;
const MIDIA_MAX = 16 * 1024 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const falha = (erro: string, status = 400) => json({ erro }, status);

const db = createClient(URL_SB, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;
type Conta = { id: string; empresa_id: string; phone_number_id: string; waba_id: string };

/** Chamada à Graph API; devolve { ok, dados } com a mensagem de erro da Meta em português quando possível. */
async function graph(token: string, caminho: string, init: RequestInit = {}) {
  try {
    const r = await fetch(`${GRAPH}/${caminho}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = dados?.error ?? {};
      const msg = e.code === 190 ? 'Token inválido ou expirado. Gere um token permanente de usuário do sistema.'
        : e.code === 131047 ? 'Fora da janela de 24h: use um modelo aprovado.'
        : e.code === 131026 ? 'O número não pode receber mensagens (não tem WhatsApp ou bloqueou).'
        : e.code === 132001 ? 'Modelo não encontrado nesse idioma.'
        : e.code === 100 ? `Dado recusado pela Meta: ${e.error_data?.details ?? e.message ?? ''}`
        : (e.error_user_msg || e.message || `Erro ${r.status} na Meta`);
      return { ok: false as const, erro: String(msg).slice(0, 300), codigo: e.code as number | undefined, dados };
    }
    return { ok: true as const, dados };
  } catch {
    return { ok: false as const, erro: 'Não foi possível falar com a Meta agora.', codigo: undefined, dados: null };
  }
}

async function tokenDa(conta: Conta) {
  const { data } = await db.rpc('whatsapp_segredos', { p_conta: conta.id });
  return (data as { token: string | null }[] | null)?.[0]?.token ?? null;
}

/** Número do lead no formato da Meta (DDI 55 quando vier só DDD + número). */
function waIdDoTelefone(tel: string | null) {
  let v = (tel ?? '').replace(/\D/g, '');
  if (v.length === 10 || v.length === 11) v = '55' + v;
  return /^[0-9]{8,20}$/.test(v) ? v : null;
}

/** Grava a mensagem de saída, chama a Meta e atualiza status e conversa. */
async function enviar(conta: Conta, token: string, conversa: Obj, autor: string, payload: Obj, registro: { tipo: string; texto: string }) {
  const { data: msg, error } = await db.from('whatsapp_mensagens').insert({
    empresa_id: conta.empresa_id, conversa_id: conversa.id, direcao: 'saida', tipo: registro.tipo, texto: registro.texto.slice(0, 4096), status: 'enviando', autor_id: autor,
  }).select('*').single();
  if (error || !msg) return falha('Não foi possível registrar a mensagem.', 500);

  const r = await graph(token, `${conta.phone_number_id}/messages`, {
    method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: conversa.wa_id, ...payload }),
  });
  const agora = new Date().toISOString();
  if (!r.ok) {
    const { data: falhou } = await db.from('whatsapp_mensagens').update({ status: 'falhou', erro: r.erro }).eq('id', msg.id).select('*').single();
    return json({ erro: r.erro, mensagem: falhou ?? msg }, 502);
  }
  const wamid = r.dados?.messages?.[0]?.id ?? null;
  const { data: enviada } = await db.from('whatsapp_mensagens').update({ status: 'enviada', wa_message_id: wamid }).eq('id', msg.id).select('*').single();
  await db.from('whatsapp_conversas').update({ ultima_previa: registro.texto.slice(0, 160), ultima_mensagem_em: agora, status: 'aberta', nao_lidas: 0 }).eq('id', conversa.id);
  if (conversa.lead_id) {
    await db.from('lead_atividades').insert({ empresa_id: conta.empresa_id, lead_id: conversa.lead_id, usuario_id: autor, tipo: 'whatsapp', descricao: registro.tipo === 'template' ? `Modelo enviado: ${registro.texto.slice(0, 120)}` : 'Mensagem enviada pelo WhatsApp' });
  }
  return json({ mensagem: enviada ?? msg });
}

/** Lead bloqueado para contato (LGPD: pediu para não ser contatado ou foi anonimizado). */
async function leadBloqueado(leadId: string | null) {
  if (!leadId) return false;
  const { data } = await db.from('leads').select('nao_contatar, anonimizado_em').eq('id', leadId).maybeSingle();
  return !!(data?.nao_contatar || data?.anonimizado_em);
}

/** Texto final do modelo com as variáveis {{1}}, {{2}}… preenchidas, para o histórico. */
function textoDoModelo(modelo: Obj | null, nome: string, params: string[]) {
  const corpo: string = modelo?.components?.find((c: Obj) => c.type === 'BODY')?.text ?? '';
  if (!corpo) return `[${nome}]`;
  return corpo.replace(/\{\{(\d+)\}\}/g, (_: string, n: string) => params[Number(n) - 1] ?? `{{${n}}}`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return falha('Método não permitido', 405);

  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return falha('Entre novamente para continuar.', 401);
  const { data: perfil } = await db.from('perfis').select('id, empresa_id, role').eq('id', user.id).maybeSingle();
  if (!perfil?.empresa_id) return falha('Usuário sem empresa.', 403);
  // Cliente com o JWT do usuário: respeita o RLS (quem pode ver qual conversa)
  const comoUsuario: SupabaseClient = createClient(URL_SB, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  let corpo: Obj;
  try { corpo = await req.json(); } catch { return falha('JSON inválido'); }

  const { data: conta } = await db.from('whatsapp_contas').select('id, empresa_id, phone_number_id, waba_id').eq('empresa_id', perfil.empresa_id).maybeSingle();
  if (!conta) return falha('O WhatsApp ainda não foi conectado nesta empresa.', 404);
  const token = await tokenDa(conta);
  if (!token) return falha('Token do WhatsApp não encontrado. Conecte de novo em Integrações.', 409);

  /** Conversa que o usuário pode ver (RLS); null se não puder. */
  const conversaVisivel = async (id: unknown) => {
    if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/.test(id)) return null;
    const { data } = await comoUsuario.from('whatsapp_conversas').select('id, wa_id, lead_id, ultima_entrada_em, responsavel_id').eq('id', id).maybeSingle();
    return data;
  };

  switch (corpo.acao) {
    case 'testar': {
      if (perfil.role !== 'admin') return falha('Só o administrador pode testar a conexão.', 403);
      const numero = await graph(token, `${conta.phone_number_id}?fields=display_phone_number,verified_name,quality_rating,code_verification_status`);
      if (!numero.ok) {
        await db.from('whatsapp_contas').update({ status: 'erro', status_detalhe: numero.erro }).eq('id', conta.id);
        return json({ ok: false, erro: numero.erro });
      }
      const assinatura = await graph(token, `${conta.waba_id}/subscribed_apps`, { method: 'POST' });
      const detalhe = assinatura.ok ? null : `Número ok, mas o app não foi assinado no WABA: ${assinatura.erro}`;
      await db.from('whatsapp_contas').update({
        numero: numero.dados.display_phone_number ?? null, nome_verificado: numero.dados.verified_name ?? null,
        status: assinatura.ok ? 'conectado' : 'erro', status_detalhe: detalhe?.slice(0, 300) ?? null,
      }).eq('id', conta.id);
      return json({ ok: assinatura.ok, numero: numero.dados.display_phone_number, nome: numero.dados.verified_name, qualidade: numero.dados.quality_rating, erro: detalhe });
    }

    case 'enviar_texto': {
      const conversa = await conversaVisivel(corpo.conversa_id);
      if (!conversa) return falha('Conversa não encontrada.', 404);
      const texto = String(corpo.texto ?? '').trim();
      if (!texto || texto.length > 4096) return falha('Escreva a mensagem (até 4096 caracteres).');
      if (await leadBloqueado(conversa.lead_id)) return falha('Este contato pediu para não ser contatado.', 403);
      const entrada = conversa.ultima_entrada_em ? new Date(conversa.ultima_entrada_em).getTime() : 0;
      if (Date.now() - entrada > JANELA_MS) return falha('Passaram 24h desde a última mensagem do cliente. Use um modelo aprovado.', 409);
      return enviar(conta, token, conversa, perfil.id, { type: 'text', text: { body: texto, preview_url: true } }, { tipo: 'text', texto });
    }

    case 'modelos': {
      const r = await graph(token, `${conta.waba_id}/message_templates?status=APPROVED&fields=name,language,category,components&limit=200`);
      if (!r.ok) return falha(r.erro, 502);
      // deno-lint-ignore no-explicit-any
      const modelos = (r.dados?.data ?? []).map((m: any) => {
        const corpoTxt: string = m.components?.find((c: Obj) => c.type === 'BODY')?.text ?? '';
        const variaveis = new Set([...corpoTxt.matchAll(/\{\{(\d+)\}\}/g)].map((x) => x[1])).size;
        return { nome: m.name, idioma: m.language, categoria: m.category, texto: corpoTxt, variaveis };
      });
      return json({ modelos });
    }

    case 'enviar_modelo': {
      const nome = String(corpo.nome ?? '');
      const idioma = String(corpo.idioma ?? 'pt_BR');
      const params: string[] = Array.isArray(corpo.parametros) ? corpo.parametros.slice(0, 20).map((p: unknown) => String(p ?? '').slice(0, 1000)) : [];
      if (!/^[a-z0-9_]{1,512}$/.test(nome) || !/^[a-zA-Z_]{2,10}$/.test(idioma)) return falha('Modelo inválido.');
      if (params.some((p) => !p.trim())) return falha('Preencha todas as variáveis do modelo.');

      let conversa = corpo.conversa_id ? await conversaVisivel(corpo.conversa_id) : null;
      if (!conversa && typeof corpo.lead_id === 'string') {
        // Começar conversa a partir da ficha do lead (visível ao usuário pelo RLS)
        const { data: lead } = await comoUsuario.from('leads').select('id, nome, telefone, vendedor_id').eq('id', corpo.lead_id).maybeSingle();
        if (!lead) return falha('Lead não encontrado.', 404);
        const waId = waIdDoTelefone(lead.telefone);
        if (!waId) return falha('O lead não tem um telefone válido.');
        const { data: existente } = await db.from('whatsapp_conversas').select('id, wa_id, lead_id, ultima_entrada_em, responsavel_id').eq('empresa_id', conta.empresa_id).eq('wa_id', waId).maybeSingle();
        conversa = existente ?? (await db.from('whatsapp_conversas').insert({
          empresa_id: conta.empresa_id, wa_id: waId, nome_contato: lead.nome?.slice(0, 120), lead_id: lead.id, responsavel_id: lead.vendedor_id ?? (perfil.role === 'admin' ? null : perfil.id),
        }).select('id, wa_id, lead_id, ultima_entrada_em, responsavel_id').single()).data;
        if (existente && !(await conversaVisivel(existente.id))) return falha('Esta conversa está com outro responsável.', 403);
      }
      if (!conversa) return falha('Conversa não encontrada.', 404);
      if (await leadBloqueado(conversa.lead_id)) return falha('Este contato pediu para não ser contatado.', 403);

      const lista = await graph(token, `${conta.waba_id}/message_templates?name=${encodeURIComponent(nome)}&fields=name,language,components`);
      const modelo = lista.ok ? (lista.dados?.data ?? []).find((m: Obj) => m.name === nome && m.language === idioma) ?? null : null;
      const componentes = params.length ? [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] : [];
      const r = await enviar(conta, token, conversa, perfil.id,
        { type: 'template', template: { name: nome, language: { code: idioma }, ...(componentes.length ? { components: componentes } : {}) } },
        { tipo: 'template', texto: textoDoModelo(modelo, nome, params) });
      if (r.ok) {
        const dados = await r.clone().json();
        return json({ ...dados, conversa_id: conversa.id });
      }
      return r;
    }

    case 'marcar_lida': {
      const conversa = await conversaVisivel(corpo.conversa_id);
      if (!conversa) return falha('Conversa não encontrada.', 404);
      await db.from('whatsapp_conversas').update({ nao_lidas: 0 }).eq('id', conversa.id);
      const { data: ultima } = await db.from('whatsapp_mensagens').select('wa_message_id').eq('conversa_id', conversa.id).eq('direcao', 'entrada')
        .order('criado_em', { ascending: false }).limit(1).maybeSingle();
      if (ultima?.wa_message_id) {
        await graph(token, `${conta.phone_number_id}/messages`, { method: 'POST', body: JSON.stringify({ messaging_product: 'whatsapp', status: 'read', message_id: ultima.wa_message_id }) });
      }
      return json({ ok: true });
    }

    case 'midia': {
      if (typeof corpo.mensagem_id !== 'string') return falha('Mensagem inválida.');
      const { data: msg } = await comoUsuario.from('whatsapp_mensagens').select('id, midia_id, midia_mime, midia_nome').eq('id', corpo.mensagem_id).maybeSingle();
      if (!msg?.midia_id) return falha('Mídia não encontrada.', 404);
      const info = await graph(token, encodeURIComponent(msg.midia_id));
      if (!info.ok || !info.dados?.url) return falha(info.ok ? 'A Meta não devolveu a mídia.' : info.erro, 502);
      if (Number(info.dados.file_size ?? 0) > MIDIA_MAX) return falha('Arquivo grande demais para abrir aqui.', 413);
      const arq = await fetch(info.dados.url, { headers: { Authorization: `Bearer ${token}` } });
      if (!arq.ok) return falha('A mídia expirou na Meta (fica disponível por 30 dias).', 410);
      const bytes = new Uint8Array(await arq.arrayBuffer());
      if (bytes.byteLength > MIDIA_MAX) return falha('Arquivo grande demais para abrir aqui.', 413);
      return json({ mime: info.dados.mime_type ?? msg.midia_mime ?? 'application/octet-stream', nome: msg.midia_nome, base64: encodeBase64(bytes) });
    }
  }
  return falha('Ação desconhecida.');
});
