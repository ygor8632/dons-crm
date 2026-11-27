// Edge Function: webhook do WhatsApp (API oficial da Meta).
//
// GET  → verificação do webhook: a Meta manda hub.verify_token e hub.challenge;
//        se o token for o de alguma conta conectada, devolve o challenge.
// POST → eventos. A assinatura X-Hub-Signature-256 é conferida com o App Secret
//        da conta dona do número (Vault). Mensagens recebidas criam ou atualizam
//        a conversa, ligam ao lead pelo telefone (ou criam o lead) e entram no
//        histórico. Status (enviada, entregue, lida, falhou) atualizam as
//        mensagens enviadas pelo CRM.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

type Conta = { id: string; empresa_id: string; phone_number_id: string; verify_token: string };

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/** Mesma regra de public.chave_telefone: DDD + 8 últimos dígitos, sem 55 e sem o nono dígito. */
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

// deno-lint-ignore no-explicit-any
type Msg = Record<string, any>;

/** Texto, mídia e tipo de uma mensagem recebida, no formato da tabela. */
function lerMensagem(m: Msg) {
  const tipo: string = m.type;
  const conhecidos = ['text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contacts', 'reaction'];
  let texto: string | null = null;
  let midia: { id?: string; mime?: string; nome?: string } = {};
  switch (tipo) {
    case 'text': texto = m.text?.body ?? null; break;
    case 'image': case 'video': case 'audio': case 'sticker': case 'document':
      midia = { id: m[tipo]?.id, mime: m[tipo]?.mime_type, nome: m[tipo]?.filename };
      texto = m[tipo]?.caption ?? (tipo === 'document' ? m.document?.filename ?? null : null);
      break;
    case 'location': {
      const l = m.location ?? {};
      texto = [l.name, l.address, `${l.latitude},${l.longitude}`].filter(Boolean).join(' · ');
      break;
    }
    case 'contacts': texto = (m.contacts ?? []).map((c: Msg) => `${c.name?.formatted_name ?? ''} ${c.phones?.[0]?.phone ?? ''}`.trim()).join('\n'); break;
    case 'reaction': texto = m.reaction?.emoji ? `Reagiu com ${m.reaction.emoji}` : 'Removeu a reação'; break;
    case 'button': texto = m.button?.text ?? null; break;
    case 'interactive': texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null; break;
  }
  return { tipo: conhecidos.includes(tipo) ? tipo : 'outro', texto: texto ? String(texto).slice(0, 4096) : null, midia };
}

const PREVIA: Record<string, string> = { image: '📷 Imagem', audio: '🎤 Áudio', video: '🎬 Vídeo', document: '📄 Documento', sticker: 'Figurinha', location: '📍 Localização', contacts: '👤 Contato', outro: 'Mensagem' };

/** Conversa do contato; na primeira mensagem liga ao lead pelo telefone ou cria o lead. */
async function obterConversa(db: SupabaseClient, conta: Conta, waId: string, nome: string | null) {
  const { data: existente } = await db.from('whatsapp_conversas').select('id, lead_id, nao_lidas, ultima_entrada_em').eq('empresa_id', conta.empresa_id).eq('wa_id', waId).maybeSingle();
  if (existente) return existente;

  const chave = chaveTelefone(waId);
  let lead: { id: string; vendedor_id: string | null } | null = null;
  if (chave) {
    const { data } = await db.from('leads').select('id, vendedor_id').eq('empresa_id', conta.empresa_id).eq('chave_telefone', chave)
      .is('anonimizado_em', null).order('situacao', { ascending: true }).order('created_at', { ascending: false }).limit(1);
    lead = data?.[0] ?? null;
  }
  if (!lead) {
    const { data: etapa } = await db.from('etapas_funil').select('id').eq('empresa_id', conta.empresa_id).order('ordem').limit(1).maybeSingle();
    const { data: novo } = await db.from('leads').insert({
      empresa_id: conta.empresa_id, nome: (nome || `+${waId}`).slice(0, 120), telefone: `+${waId}`, origem: 'WhatsApp',
      etapa_id: etapa?.id ?? null, base_legal: 'contrato',
    }).select('id, vendedor_id').single();
    lead = novo;
    if (lead) await db.from('lead_atividades').insert({ empresa_id: conta.empresa_id, lead_id: lead.id, usuario_id: null, tipo: 'whatsapp', descricao: 'Primeira mensagem pelo WhatsApp' });
  }
  const { data: criada } = await db.from('whatsapp_conversas').upsert({
    empresa_id: conta.empresa_id, wa_id: waId, nome_contato: nome?.slice(0, 120) ?? null, lead_id: lead?.id ?? null, responsavel_id: lead?.vendedor_id ?? null,
  }, { onConflict: 'empresa_id,wa_id' }).select('id, lead_id, nao_lidas, ultima_entrada_em').single();
  return criada;
}

const ORDEM_STATUS: Record<string, number> = { enviando: 0, enviada: 1, entregue: 2, lida: 3, falhou: 4 };
const STATUS_META: Record<string, string> = { sent: 'enviada', delivered: 'entregue', read: 'lida', failed: 'falhou' };

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const token = url.searchParams.get('hub.verify_token') ?? '';
    if (url.searchParams.get('hub.mode') !== 'subscribe' || !/^[0-9a-f]{32}$/.test(token)) return new Response('Proibido', { status: 403 });
    const { data } = await db.from('whatsapp_contas').select('id').eq('verify_token', token).maybeSingle();
    if (!data) return new Response('Proibido', { status: 403 });
    return new Response(url.searchParams.get('hub.challenge') ?? '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 });

  const bruto = await req.text();
  // deno-lint-ignore no-explicit-any
  let corpo: any;
  try { corpo = JSON.parse(bruto); } catch { return new Response('JSON inválido', { status: 400 }); }
  const valores: Msg[] = (corpo.entry ?? []).flatMap((e: Msg) => (e.changes ?? []).filter((c: Msg) => c.field === 'messages').map((c: Msg) => c.value));
  const pnid = valores.find((v) => v?.metadata?.phone_number_id)?.metadata?.phone_number_id;
  if (!pnid) return new Response('ok');

  const { data: conta } = await db.from('whatsapp_contas').select('id, empresa_id, phone_number_id, verify_token').eq('phone_number_id', String(pnid)).maybeSingle();
  // Número que não é de nenhum cliente: responde 200 para a Meta não reenviar
  if (!conta) return new Response('ok');
  const { data: seg } = await db.rpc('whatsapp_segredos', { p_conta: conta.id });
  const appSecret = (seg as { app_secret: string | null }[] | null)?.[0]?.app_secret;
  if (!appSecret || !(await assinaturaValida(bruto, req.headers.get('x-hub-signature-256'), appSecret))) {
    return new Response('Assinatura inválida', { status: 401 });
  }

  for (const v of valores) {
    if (String(v?.metadata?.phone_number_id) !== conta.phone_number_id) continue;
    const nomes = new Map<string, string>((v.contacts ?? []).map((c: Msg) => [String(c.wa_id), c.profile?.name ?? null]));

    for (const m of (v.messages ?? []) as Msg[]) {
      const waId = String(m.from ?? '').replace(/\D/g, '');
      if (!waId) continue;
      const conversa = await obterConversa(db, conta as Conta, waId, nomes.get(waId) ?? null);
      if (!conversa) continue;
      const quando = m.timestamp ? new Date(Number(m.timestamp) * 1000).toISOString() : new Date().toISOString();
      const { tipo, texto, midia } = lerMensagem(m);
      const { data: gravada } = await db.from('whatsapp_mensagens').upsert({
        empresa_id: conta.empresa_id, conversa_id: conversa.id, wa_message_id: m.id, direcao: 'entrada', tipo, texto,
        midia_id: midia.id ?? null, midia_mime: midia.mime ?? null, midia_nome: midia.nome ?? null, status: 'recebida', criado_em: quando,
      }, { onConflict: 'wa_message_id', ignoreDuplicates: true }).select('id');
      if (!gravada?.length) continue; // reenvio da Meta: já gravada

      await db.from('whatsapp_conversas').update({
        ultima_previa: (texto || PREVIA[tipo] || 'Mensagem').slice(0, 160), ultima_mensagem_em: quando, ultima_entrada_em: quando,
        nao_lidas: (conversa.nao_lidas ?? 0) + 1, status: 'aberta', ...(nomes.get(waId) ? { nome_contato: nomes.get(waId)!.slice(0, 120) } : {}),
      }).eq('id', conversa.id);
      conversa.nao_lidas = (conversa.nao_lidas ?? 0) + 1;
      // Uma atividade por conversa a cada hora basta para o histórico e para "parado"
      const ultima = conversa.ultima_entrada_em ? new Date(conversa.ultima_entrada_em).getTime() : 0;
      if (conversa.lead_id && Date.now() - ultima > 3600e3) {
        await db.from('lead_atividades').insert({ empresa_id: conta.empresa_id, lead_id: conversa.lead_id, usuario_id: null, tipo: 'whatsapp', descricao: 'Mensagem recebida no WhatsApp' });
      }
      conversa.ultima_entrada_em = quando;
    }

    for (const s of (v.statuses ?? []) as Msg[]) {
      const novo = STATUS_META[s.status];
      if (!novo || !s.id) continue;
      const { data: atual } = await db.from('whatsapp_mensagens').select('id, status').eq('wa_message_id', s.id).maybeSingle();
      if (!atual || (ORDEM_STATUS[novo] ?? 0) <= (ORDEM_STATUS[atual.status] ?? 0)) continue;
      const erro = s.errors?.[0] ? `${s.errors[0].code ?? ''} ${s.errors[0].title ?? s.errors[0].message ?? ''}`.trim().slice(0, 500) : null;
      await db.from('whatsapp_mensagens').update({ status: novo, ...(erro ? { erro } : {}) }).eq('id', atual.id);
    }
  }

  await db.from('whatsapp_contas').update({ status: 'conectado', status_detalhe: null, ultimo_evento_em: new Date().toISOString() }).eq('id', conta.id);
  return new Response('ok');
});
