// Edge Function: leads dos anúncios da Meta (Lead Ads / formulário instantâneo).
//
// Webhook (chamadas da Meta, com X-Hub-Signature-256):
//   GET  → verificação: hub.verify_token de alguma Página conectada devolve o challenge.
//   POST → evento "leadgen": busca o lead na Graph API com o token da Página, cria o lead
//          no funil (origem Facebook/Instagram Ads, campanha e anúncio) ou, se já existe um
//          lead em aberto com o mesmo WhatsApp ou e-mail, registra no histórico dele.
//          A roleta de distribuição (trigger no banco) escolhe o responsável.
// Ações do admin (POST com o JWT do usuário, sem assinatura):
//   { acao: 'testar' }      confere a Página e assina o app no campo leadgen
//   { acao: 'sincronizar' } busca os leads dos últimos 7 dias em todos os formulários
//                           (recupera o que o webhook possa ter perdido)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GRAPH = `https://graph.facebook.com/${Deno.env.get('META_GRAPH_VERSAO') ?? 'v23.0'}`;
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// deno-lint-ignore no-explicit-any
type Obj = Record<string, any>;
type Conta = { id: string; empresa_id: string; page_id: string };

function chaveTelefone(tel: string) {
  let v = tel.replace(/\D/g, '');
  if (v.length >= 12 && v.startsWith('55')) v = v.slice(2);
  if (v.length >= 10) return v.slice(0, 2) + v.slice(-8);
  return v.length >= 8 ? v.slice(-8) : null;
}

async function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string) {
  if (!cabecalho?.startsWith('sha256=')) return false;
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(segredo), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(corpo)));
  const esperado = [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
  const recebido = cabecalho.slice(7).toLowerCase();
  if (recebido.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ recebido.charCodeAt(i);
  return dif === 0;
}

async function segredos(conta: Conta) {
  const { data } = await db.rpc('meta_segredos', { p_conta: conta.id });
  return (data as { token: string | null; app_secret: string | null }[] | null)?.[0] ?? { token: null, app_secret: null };
}

async function graph(token: string, caminho: string, init: RequestInit = {}) {
  try {
    const sep = caminho.includes('?') ? '&' : '?';
    const r = await fetch(`${GRAPH}/${caminho}${sep}access_token=${encodeURIComponent(token)}`, init);
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      const e = dados?.error ?? {};
      const msg = e.code === 190 ? 'Token inválido ou expirado. Gere um token permanente da Página.'
        : e.code === 200 || e.code === 10 ? 'Falta permissão: o token precisa de leads_retrieval, pages_manage_metadata e pages_show_list.'
        : (e.error_user_msg || e.message || `Erro ${r.status} na Meta`);
      return { ok: false as const, erro: String(msg).slice(0, 300), dados };
    }
    return { ok: true as const, dados };
  } catch {
    return { ok: false as const, erro: 'Não foi possível falar com a Meta agora.', dados: null };
  }
}

/** Respostas do formulário → campos do lead + o resto das perguntas para uma anotação. */
function lerCampos(fieldData: Obj[]) {
  const mapa = new Map<string, string>();
  for (const f of fieldData ?? []) mapa.set(String(f.name ?? '').toLowerCase(), (f.values ?? []).join(', ').trim());
  const pega = (...nomes: string[]) => nomes.map((n) => mapa.get(n)).find((v) => v) ?? '';
  const nome = pega('full_name', 'nome_completo', 'name', 'nome') || [pega('first_name'), pega('last_name')].filter(Boolean).join(' ');
  const telefone = pega('phone_number', 'phone', 'telefone', 'whatsapp', 'celular');
  const email = pega('email', 'e-mail', 'work_email');
  const usados = new Set(['full_name', 'nome_completo', 'name', 'nome', 'first_name', 'last_name', 'phone_number', 'phone', 'telefone', 'whatsapp', 'celular', 'email', 'e-mail', 'work_email']);
  const extras = [...mapa.entries()].filter(([k, v]) => !usados.has(k) && v).map(([k, v]) => `• ${k.replace(/_/g, ' ')}: ${v}`);
  return { nome: nome.slice(0, 100), telefone: telefone.slice(0, 20), email: email.slice(0, 150), extras };
}

const nomesFormulario = new Map<string, string>();
async function nomeDoFormulario(token: string, formId: string | null) {
  if (!formId) return null;
  if (nomesFormulario.has(formId)) return nomesFormulario.get(formId)!;
  const r = await graph(token, `${encodeURIComponent(formId)}?fields=name`);
  const nome = r.ok ? String(r.dados?.name ?? '').slice(0, 200) || null : null;
  if (nome) nomesFormulario.set(formId, nome);
  return nome;
}

type Resultado = 'criado' | 'duplicado' | 'ja_recebido' | 'erro';

/** Processa um lead da Meta (pelo webhook ou pela sincronização). `pronto` evita buscar de novo. */
async function processar(conta: Conta, token: string, leadgenId: string, pronto?: Obj): Promise<Resultado> {
  if (!/^[0-9]{5,40}$/.test(leadgenId)) return 'erro';
  const { data: reg, error: errReg } = await db.from('meta_leads').insert({ empresa_id: conta.empresa_id, leadgen_id: leadgenId }).select('id').maybeSingle();
  if (errReg?.code === '23505') return 'ja_recebido'; // reenvio da Meta ou já sincronizado (leadgen_id único)
  if (!reg) return 'erro';

  const falhar = async (erro: string) => { await db.from('meta_leads').update({ resultado: 'erro', erro: erro.slice(0, 500) }).eq('id', reg.id); return 'erro' as const; };

  let dados: Obj | null = pronto ?? null;
  if (!dados) {
    const lido = await graph(token, `${leadgenId}?fields=created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id,platform,is_organic`);
    if (!lido.ok) return falhar(lido.erro);
    dados = lido.dados;
  }
  if (!dados) return falhar('Lead vazio');

  const { nome, telefone, email, extras } = lerCampos(dados.field_data ?? []);
  const formulario = await nomeDoFormulario(token, dados.form_id ?? null);
  const campanha = (dados.campaign_name ? String(dados.campaign_name) : dados.is_organic ? 'Orgânico (sem anúncio)' : null)?.slice(0, 200) ?? null;
  const anuncio = dados.ad_name ? String(dados.ad_name).slice(0, 200) : null;
  const origem = String(dados.platform ?? '').toLowerCase() === 'ig' ? 'Instagram Ads' : 'Facebook Ads';
  const quando = dados.created_time ? new Date(dados.created_time).toISOString() : new Date().toISOString();
  await db.from('meta_leads').update({ form_id: dados.form_id ?? null, formulario, campanha, anuncio }).eq('id', reg.id);
  if (!nome && !telefone && !email) return falhar('O formulário não trouxe nome, telefone nem e-mail');

  // Mesmo WhatsApp ou e-mail de um lead em aberto: registra no histórico dele
  const chave = telefone ? chaveTelefone(telefone) : null;
  let existente: { id: string } | null = null;
  if (chave) {
    const { data } = await db.from('leads').select('id').eq('empresa_id', conta.empresa_id).eq('situacao', 'aberto').eq('chave_telefone', chave).order('created_at', { ascending: false }).limit(1);
    existente = data?.[0] ?? null;
  }
  if (!existente && email) {
    const { data } = await db.from('leads').select('id').eq('empresa_id', conta.empresa_id).eq('situacao', 'aberto').ilike('email', email.toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`)).order('created_at', { ascending: false }).limit(1);
    existente = data?.[0] ?? null;
  }
  const descricaoAnuncio = [formulario ? `formulário "${formulario}"` : 'formulário', campanha ? `campanha "${campanha}"` : null].filter(Boolean).join(', ');
  if (existente) {
    await db.from('lead_atividades').insert({ empresa_id: conta.empresa_id, lead_id: existente.id, usuario_id: null, tipo: 'webhook', descricao: `Preencheu de novo o ${descricaoAnuncio} (${origem})`.slice(0, 500) });
    await db.from('meta_leads').update({ resultado: 'duplicado', lead_id: existente.id }).eq('id', reg.id);
    return 'duplicado';
  }

  const { data: etapa } = await db.from('etapas_funil').select('id').eq('empresa_id', conta.empresa_id).order('ordem').limit(1).maybeSingle();
  if (!etapa) return falhar('Funil da empresa não configurado');
  const { data: lead, error } = await db.from('leads').insert({
    empresa_id: conta.empresa_id, nome: nome || telefone || email, telefone: telefone || null, email: email || null, origem,
    campanha, anuncio, etapa_id: etapa.id, base_legal: 'consentimento', consentimento_em: quando,
  }).select('id').single();
  if (error || !lead) return falhar(`Não foi possível criar o lead: ${error?.message ?? ''}`);

  await db.from('lead_atividades').insert({ empresa_id: conta.empresa_id, lead_id: lead.id, usuario_id: null, tipo: 'webhook', descricao: `Entrou pelo ${descricaoAnuncio} (${origem})`.slice(0, 500) });
  if (extras.length) await db.from('lead_anotacoes').insert({ empresa_id: conta.empresa_id, lead_id: lead.id, usuario_id: null, texto: `Respostas do formulário:\n${extras.join('\n')}`.slice(0, 4000) });
  await db.from('meta_leads').update({ resultado: 'criado', lead_id: lead.id }).eq('id', reg.id);
  return 'criado';
}

async function marcarEvento(conta: Conta) {
  await db.from('meta_contas').update({ status: 'conectado', status_detalhe: null, ultimo_evento_em: new Date().toISOString() }).eq('id', conta.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);

  // Verificação do webhook pela Meta
  if (req.method === 'GET') {
    const token = url.searchParams.get('hub.verify_token') ?? '';
    if (url.searchParams.get('hub.mode') !== 'subscribe' || !/^[0-9a-f]{32}$/.test(token)) return new Response('Proibido', { status: 403 });
    const { data } = await db.from('meta_contas').select('id').eq('verify_token', token).maybeSingle();
    if (!data) return new Response('Proibido', { status: 403 });
    return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  const bruto = await req.text();
  const assinatura = req.headers.get('x-hub-signature-256');

  /* ---------- Evento da Meta ---------- */
  if (assinatura) {
    let corpo: Obj;
    try { corpo = JSON.parse(bruto); } catch { return new Response('JSON inválido', { status: 400 }); }
    const entradas: Obj[] = (corpo.entry ?? []).filter((e: Obj) => e?.id);
    const pageId = String(entradas[0]?.id ?? '');
    if (!pageId) return new Response('ok');
    const { data: conta } = await db.from('meta_contas').select('id, empresa_id, page_id').eq('page_id', pageId).maybeSingle();
    if (!conta) return new Response('ok'); // Página de ninguém: 200 para a Meta não reenviar
    const { token, app_secret } = await segredos(conta);
    if (!app_secret || !(await assinaturaValida(bruto, assinatura, app_secret))) return new Response('Assinatura inválida', { status: 401 });
    if (!token) return new Response('ok');

    for (const e of entradas) {
      if (String(e.id) !== conta.page_id) continue;
      for (const c of (e.changes ?? []) as Obj[]) {
        if (c.field !== 'leadgen' || !c.value?.leadgen_id) continue;
        await processar(conta, token, String(c.value.leadgen_id));
      }
    }
    await marcarEvento(conta);
    return new Response('ok');
  }

  /* ---------- Ações do admin ---------- */
  const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await db.auth.getUser(jwt);
  if (!user) return json({ erro: 'Entre novamente para continuar.' }, 401);
  const { data: perfil } = await db.from('perfis').select('empresa_id, role').eq('id', user.id).maybeSingle();
  if (!perfil?.empresa_id || perfil.role !== 'admin') return json({ erro: 'Só o administrador mexe nos anúncios.' }, 403);
  const { data: conta } = await db.from('meta_contas').select('id, empresa_id, page_id').eq('empresa_id', perfil.empresa_id).maybeSingle();
  if (!conta) return json({ erro: 'Os anúncios da Meta ainda não foram conectados.' }, 404);
  const { token } = await segredos(conta);
  if (!token) return json({ erro: 'Token não encontrado. Conecte de novo.' }, 409);
  let acao = '';
  try { acao = JSON.parse(bruto)?.acao ?? ''; } catch { /* corpo inválido */ }

  if (acao === 'testar') {
    const pagina = await graph(token, `${conta.page_id}?fields=id,name`);
    if (!pagina.ok) {
      await db.from('meta_contas').update({ status: 'erro', status_detalhe: pagina.erro }).eq('id', conta.id);
      return json({ ok: false, erro: pagina.erro });
    }
    const assinar = await graph(token, `${conta.page_id}/subscribed_apps?subscribed_fields=leadgen`, { method: 'POST' });
    const detalhe = assinar.ok ? null : `Página ok, mas não foi possível assinar os leads: ${assinar.erro}`;
    await db.from('meta_contas').update({ page_nome: String(pagina.dados?.name ?? '').slice(0, 200) || null, status: assinar.ok ? 'conectado' : 'erro', status_detalhe: detalhe?.slice(0, 300) ?? null }).eq('id', conta.id);
    return json({ ok: assinar.ok, pagina: pagina.dados?.name, erro: detalhe });
  }

  if (acao === 'sincronizar') {
    const forms = await graph(token, `${conta.page_id}/leadgen_forms?fields=id,name,status&limit=100`);
    if (!forms.ok) return json({ erro: forms.erro }, 502);
    const desde = Math.floor((Date.now() - 7 * 864e5) / 1000);
    const filtro = encodeURIComponent(JSON.stringify([{ field: 'time_created', operator: 'GREATER_THAN', value: desde }]));
    const conta_: Record<Resultado, number> = { criado: 0, duplicado: 0, ja_recebido: 0, erro: 0 };
    let formularios = 0;
    for (const f of (forms.dados?.data ?? []) as Obj[]) {
      formularios++;
      if (f.name) nomesFormulario.set(String(f.id), String(f.name).slice(0, 200));
      let caminho: string | null = `${f.id}/leads?fields=id,created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id,platform,is_organic&limit=100&filtering=${filtro}`;
      for (let pagina = 0; caminho && pagina < 10; pagina++) {
        const r = await graph(token, caminho);
        if (!r.ok) { conta_.erro++; break; }
        for (const l of (r.dados?.data ?? []) as Obj[]) conta_[await processar(conta, token, String(l.id), { ...l, form_id: l.form_id ?? f.id })]++;
        const prox: string | undefined = r.dados?.paging?.next;
        caminho = prox ? prox.replace(/^https:\/\/graph\.facebook\.com\/v[0-9.]+\//, '').replace(/([?&])access_token=[^&]*&?/, '$1') : null;
      }
    }
    if (conta_.criado || conta_.duplicado) await marcarEvento(conta);
    return json({ ok: true, formularios, ...conta_ });
  }

  return json({ erro: 'Ação desconhecida.' }, 400);
});
