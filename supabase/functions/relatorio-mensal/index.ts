// Edge Function: relatório mensal por e-mail.
//
// Modos (corpo JSON):
//  - { modo: "mensal", simular?: boolean }  → chamado pelo pg_cron no dia 1 com o
//    cabeçalho x-relatorio-token (conferido no Vault). Envia o mês anterior para
//    toda empresa ativa com o envio ligado, uma vez por mês. "simular" só calcula.
//  - { modo: "previa", mes?: "AAAA-MM" }    → chamado pelo painel por um admin
//    logado. Envia o relatório só para o e-mail de quem pediu.
//  - { modo: "teste", empresa_id?: string } → token do Vault. Envia o relatório
//    de uma empresa só para a caixa remetente (confere senha e SMTP).
//
// SMTP da Hostinger (porta 465, SSL) com a caixa suporte@donstech.com.br.
// A senha fica no segredo SMTP_PASS (definido no painel do Supabase).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer@6.9.16';

const SITE = 'https://crm.donstech.com.br';
const REMETENTE = Deno.env.get('SMTP_USER') ?? 'suporte@donstech.com.br';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Empresa = { id: string; nome: string; cor_primaria: string | null; ativo: boolean; relatorio_email_ativo: boolean; relatorio_emails_extras: string[] | null };
type Lead = { id: string; created_at: string; situacao: string | null; fechado_em: string | null; valor: number | null; motivo_perda: string | null; origem: string | null; vendedor_id: string | null; anonimizado_em: string | null };

const json = (dados: unknown, status = 200) => new Response(JSON.stringify(dados), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

/** Mês anterior ao de hoje no horário de Brasília (UTC-3, sem horário de verão). */
function mesAnterior(base = new Date()) {
  const br = new Date(base.getTime() - 3 * 3600e3);
  return new Date(Date.UTC(br.getUTCFullYear(), br.getUTCMonth() - 1, 1));
}
const fimDoMes = (ini: Date) => new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 1));
const isoDia = (d: Date) => d.toISOString().slice(0, 10);
// Limites do mês em Brasília: 00:00 BRT = 03:00 UTC
const limite = (d: Date) => new Date(d.getTime() + 3 * 3600e3).toISOString();

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const nomeMes = (d: Date) => `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const pct = (v: number) => `${Math.round(v * 100)}%`;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function hexValido(c?: string | null) { return !!c && /^#[0-9a-f]{6}$/i.test(c); }
function corTexto(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (1.05) / (l + 0.05) >= (l + 0.05) / 0.0592 ? '#ffffff' : '#1b1716';
}

/** Números de um mês para uma empresa. */
function calcular(leads: Lead[], ini: Date) {
  const de = limite(ini), ate = limite(fimDoMes(ini));
  const no = (iso: string | null) => !!iso && iso >= de && iso < ate;
  const novos = leads.filter((l) => no(l.created_at));
  const ganhos = leads.filter((l) => l.situacao === 'ganho' && no(l.fechado_em));
  const perdidos = leads.filter((l) => l.situacao === 'perdido' && no(l.fechado_em));
  const vendido = ganhos.reduce((s, l) => s + Number(l.valor || 0), 0);
  const decididos = ganhos.length + perdidos.length;
  const contar = (lista: Lead[], chave: (l: Lead) => string | null) => {
    const m = new Map<string, number>();
    lista.forEach((l) => { const k = chave(l); if (k) m.set(k, (m.get(k) ?? 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const porVendedor = new Map<string, number>();
  ganhos.forEach((l) => { if (l.vendedor_id) porVendedor.set(l.vendedor_id, (porVendedor.get(l.vendedor_id) ?? 0) + Number(l.valor || 0)); });
  return {
    novos: novos.length,
    ganhos: ganhos.length,
    perdidos: perdidos.length,
    vendido,
    taxa: decididos ? ganhos.length / decididos : null,
    motivos: contar(perdidos, (l) => l.motivo_perda || 'Sem motivo informado').slice(0, 3),
    origens: contar(novos, (l) => l.origem || 'Sem origem').slice(0, 3),
    vendedores: [...porVendedor.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3),
  };
}
type Numeros = ReturnType<typeof calcular>;

function variacao(atual: number, anterior: number) {
  if (!anterior) return atual ? 'novo' : '';
  const d = (atual - anterior) / anterior;
  if (Math.abs(d) < 0.005) return 'igual ao mês anterior';
  return `${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))}% vs. mês anterior`;
}

function montarEmail(emp: Empresa, mes: Date, n: Numeros, ant: Numeros, meta: number | null, nomes: Map<string, string>) {
  const cor = hexValido(emp.cor_primaria) ? emp.cor_primaria! : '#da4c3c';
  const tx = corTexto(cor);
  const titulo = `Relatório de ${nomeMes(mes)} · ${emp.nome}`;
  const link = `${SITE}/painel?empresa=${emp.id}&secao=relatorios&visao=mensal`;
  const card = (rotulo: string, valor: string, sub: string) => `
    <td style="width:50%;padding:6px;vertical-align:top">
      <div style="background:#f6f1ec;border-radius:14px;padding:14px 16px">
        <div style="font-size:12px;color:#6b605b">${esc(rotulo)}</div>
        <div style="font-size:24px;font-weight:700;color:#1b1716;margin-top:2px">${esc(valor)}</div>
        <div style="font-size:12px;color:#6b605b;margin-top:2px">${esc(sub)}</div>
      </div>
    </td>`;
  const lista = (t: string, itens: [string, string][]) => itens.length ? `
    <h3 style="font-size:14px;margin:22px 0 8px;color:#1b1716">${esc(t)}</h3>
    <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px">
      ${itens.map(([a, b]) => `<tr><td style="padding:6px 0;border-bottom:1px solid #eee5de;color:#1b1716">${esc(a)}</td><td style="padding:6px 0;border-bottom:1px solid #eee5de;text-align:right;color:#6b605b">${esc(b)}</td></tr>`).join('')}
    </table>` : '';
  const metaTxt = meta ? `${pct(n.vendido / meta)} da meta de ${moeda(meta)}` : variacao(n.vendido, ant.vendido);

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(titulo)}</title></head>
<body style="margin:0;background:#efe6de;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif">
  <table role="presentation" width="100%" style="background:#efe6de;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
      <tr><td style="background:${cor};color:${tx};padding:22px 24px">
        <table role="presentation"><tr>
          <td style="padding-right:12px"><img src="${SITE}/api/app/${emp.id}/icone/192" width="44" height="44" alt="" style="border-radius:10px;display:block"></td>
          <td><div style="font-size:13px;opacity:.85">${esc(emp.nome)}</div><div style="font-size:20px;font-weight:700">Relatório de ${esc(nomeMes(mes))}</div></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 18px 6px">
        <table role="presentation" width="100%"><tr>
          ${card('Vendido', moeda(n.vendido), metaTxt)}
          ${card('Negócios ganhos', String(n.ganhos), variacao(n.ganhos, ant.ganhos))}
        </tr><tr>
          ${card('Leads novos', String(n.novos), variacao(n.novos, ant.novos))}
          ${card('Taxa de ganho', n.taxa == null ? '—' : pct(n.taxa), `${n.ganhos} ganhos · ${n.perdidos} perdidos`)}
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 24px 8px">
        ${lista('Quem mais vendeu', n.vendedores.map(([id, v]) => [nomes.get(id) || 'Vendedor', moeda(v)]))}
        ${lista('Por que perdemos', n.motivos.map(([m, q]) => [m, `${q} ${q === 1 ? 'lead' : 'leads'}`]))}
        ${lista('De onde vieram os leads', n.origens.map(([o, q]) => [o, `${q} ${q === 1 ? 'lead' : 'leads'}`]))}
        <div style="text-align:center;margin:26px 0 8px">
          <a href="${link}" style="display:inline-block;background:#1b1716;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px">Ver o relatório completo</a>
        </div>
      </td></tr>
      <tr><td style="padding:16px 24px 22px;font-size:12px;color:#8a7f79;border-top:1px solid #f0e8e1">
        Você recebe este resumo porque está cadastrado no CRM da ${esc(emp.nome)}. O administrador muda quem recebe ou desliga o envio em Relatórios › Relatório mensal.<br>Enviado pelo Dons CRM.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const texto = [
    titulo, '',
    `Vendido: ${moeda(n.vendido)} (${metaTxt})`,
    `Negócios ganhos: ${n.ganhos}`, `Leads novos: ${n.novos}`,
    `Taxa de ganho: ${n.taxa == null ? '—' : pct(n.taxa)} (${n.ganhos} ganhos, ${n.perdidos} perdidos)`,
    n.motivos.length ? `\nPor que perdemos: ${n.motivos.map(([m, q]) => `${m} (${q})`).join(', ')}` : '',
    `\nRelatório completo: ${link}`,
  ].join('\n');
  return { assunto: titulo, html, texto };
}

async function dadosEmpresa(db: SupabaseClient, emp: Empresa, mes: Date) {
  const { data: leads } = await db.from('leads')
    .select('id, created_at, situacao, fechado_em, valor, motivo_perda, origem, vendedor_id, anonimizado_em')
    .eq('empresa_id', emp.id)
    .gte('created_at', limite(new Date(Date.UTC(mes.getUTCFullYear() - 1, mes.getUTCMonth(), 1))))
    .limit(20000);
  // Leads fechados no mês podem ter sido criados há mais de um ano
  const { data: fechados } = await db.from('leads')
    .select('id, created_at, situacao, fechado_em, valor, motivo_perda, origem, vendedor_id, anonimizado_em')
    .eq('empresa_id', emp.id)
    .gte('fechado_em', limite(new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() - 1, 1))))
    .limit(20000);
  const todos = new Map<string, Lead>();
  [...(leads ?? []), ...(fechados ?? [])].forEach((l) => todos.set(l.id, l as Lead));
  const lista = [...todos.values()];
  const anterior = new Date(Date.UTC(mes.getUTCFullYear(), mes.getUTCMonth() - 1, 1));
  const n = calcular(lista, mes), ant = calcular(lista, anterior);
  const [{ data: metaRow }, { data: perfis }] = await Promise.all([
    db.from('metas').select('valor').eq('empresa_id', emp.id).is('usuario_id', null).eq('mes', isoDia(mes)).maybeSingle(),
    db.from('perfis').select('id, nome, email, role').eq('empresa_id', emp.id),
  ]);
  const nomes = new Map<string, string>((perfis ?? []).map((p) => [p.id, p.nome || p.email]));
  return { n, ant, meta: metaRow?.valor ? Number(metaRow.valor) : null, nomes, perfis: perfis ?? [] };
}

function transporte() {
  const senha = Deno.env.get('SMTP_PASS');
  if (!senha) throw new Error('Senha do e-mail não configurada (segredo SMTP_PASS).');
  return nodemailer.createTransport({ host: 'smtp.hostinger.com', port: 465, secure: true, auth: { user: REMETENTE, pass: senha } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ erro: 'Método não permitido' }, 405);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const corpo = await req.json().catch(() => ({}));

  /* ---------- Prévia: admin logado, só para ele ---------- */
  if (corpo.modo === 'previa') {
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: { user } } = await db.auth.getUser(jwt);
    if (!user?.email) return json({ erro: 'Faça login para pedir a prévia.' }, 401);
    const { data: perfil } = await db.from('perfis').select('empresa_id, role').eq('id', user.id).single();
    if (!perfil?.empresa_id || perfil.role !== 'admin') return json({ erro: 'Só o administrador pode pedir a prévia.' }, 403);
    const { data: emp } = await db.from('empresas').select('id, nome, cor_primaria, ativo, relatorio_email_ativo, relatorio_emails_extras').eq('id', perfil.empresa_id).single();
    if (!emp) return json({ erro: 'Empresa não encontrada.' }, 404);
    const mes = /^\d{4}-\d{2}$/.test(corpo.mes ?? '') ? new Date(`${corpo.mes}-01T00:00:00Z`) : mesAnterior();
    try {
      const d = await dadosEmpresa(db, emp as Empresa, mes);
      const email = montarEmail(emp as Empresa, mes, d.n, d.ant, d.meta, d.nomes);
      await transporte().sendMail({ from: `"Dons CRM" <${REMETENTE}>`, to: user.email, subject: `[Prévia] ${email.assunto}`, html: email.html, text: email.texto });
      await db.from('relatorios_enviados').insert({ empresa_id: emp.id, mes: isoDia(mes), tipo: 'previa', destinatarios: 1 });
      return json({ ok: true, para: user.email, mes: isoDia(mes) });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db.from('relatorios_enviados').insert({ empresa_id: emp.id, mes: isoDia(mes), tipo: 'previa', erro: msg.slice(0, 500) });
      return json({ erro: 'Não foi possível enviar a prévia.', detalhe: msg }, 502);
    }
  }

  /* ---------- Teste: token do Vault; manda um relatório só para a caixa remetente ---------- */
  if (corpo.modo === 'teste') {
    const token = req.headers.get('x-relatorio-token') || '';
    const { data: valido } = await db.rpc('relatorio_token_valido', { token });
    if (!valido) return json({ erro: 'Não autorizado' }, 401);
    const mes = mesAnterior();
    let q = db.from('empresas').select('id, nome, cor_primaria, ativo, relatorio_email_ativo, relatorio_emails_extras').eq('ativo', true).limit(1);
    if (typeof corpo.empresa_id === 'string') q = q.eq('id', corpo.empresa_id);
    const { data: lista } = await q;
    const emp = lista?.[0] as Empresa | undefined;
    if (!emp) return json({ erro: 'Nenhuma empresa ativa' }, 404);
    try {
      const d = await dadosEmpresa(db, emp, mes);
      const email = montarEmail(emp, mes, d.n, d.ant, d.meta, d.nomes);
      const info = await transporte().sendMail({ from: `"Dons CRM" <${REMETENTE}>`, to: REMETENTE, subject: `[Teste] ${email.assunto}`, html: email.html, text: email.texto });
      return json({ ok: true, para: REMETENTE, empresa: emp.nome, mes: isoDia(mes), aceito: info.accepted, resposta: info.response });
    } catch (e) {
      return json({ erro: 'Falha no envio de teste', detalhe: e instanceof Error ? e.message : String(e) }, 502);
    }
  }

  /* ---------- Mensal: pg_cron com o token do Vault ---------- */
  if (corpo.modo === 'mensal') {
    const token = req.headers.get('x-relatorio-token') || '';
    const { data: valido } = await db.rpc('relatorio_token_valido', { token });
    if (!valido) return json({ erro: 'Não autorizado' }, 401);
    const mes = mesAnterior();
    const { data: empresas } = await db.from('empresas').select('id, nome, cor_primaria, ativo, relatorio_email_ativo, relatorio_emails_extras').eq('ativo', true).eq('relatorio_email_ativo', true);
    const { data: jaEnviados } = await db.from('relatorios_enviados').select('empresa_id').eq('mes', isoDia(mes)).eq('tipo', 'mensal').is('erro', null);
    const feitos = new Set((jaEnviados ?? []).map((r) => r.empresa_id));
    const resultado: { empresa: string; destinatarios: number; erro?: string }[] = [];
    const smtp = corpo.simular ? null : transporte();

    for (const emp of (empresas ?? []) as Empresa[]) {
      if (feitos.has(emp.id)) continue;
      try {
        const d = await dadosEmpresa(db, emp, mes);
        const para = [...new Set([
          ...d.perfis.filter((p) => p.role === 'admin' && p.email).map((p) => p.email as string),
          ...(emp.relatorio_emails_extras ?? []),
        ].map((e) => e.trim().toLowerCase()))];
        if (!para.length) { resultado.push({ empresa: emp.nome, destinatarios: 0, erro: 'Sem destinatários' }); continue; }
        if (smtp) {
          const email = montarEmail(emp, mes, d.n, d.ant, d.meta, d.nomes);
          // Cópia oculta: um destinatário não vê o e-mail dos outros
          await smtp.sendMail({ from: `"${emp.nome.replace(/"/g, '')} via Dons CRM" <${REMETENTE}>`, to: REMETENTE, bcc: para, subject: email.assunto, html: email.html, text: email.texto });
          await db.from('relatorios_enviados').insert({ empresa_id: emp.id, mes: isoDia(mes), tipo: 'mensal', destinatarios: para.length });
        }
        resultado.push({ empresa: emp.nome, destinatarios: para.length });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        resultado.push({ empresa: emp.nome, destinatarios: 0, erro: msg });
        if (!corpo.simular) await db.from('relatorios_enviados').insert({ empresa_id: emp.id, mes: isoDia(mes), tipo: 'mensal', erro: msg.slice(0, 500) });
      }
    }
    return json({ mes: isoDia(mes), simulado: !!corpo.simular, empresas: resultado });
  }

  return json({ erro: 'Modo desconhecido' }, 400);
});
