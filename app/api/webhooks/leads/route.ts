import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { chaveTelefone } from '@/app/painel/_lib/util';

// CORS para chamadas de navegador (se necessário)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Zod Schema para validação estrita
const leadSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email().max(150).optional().or(z.literal('')),
  telefone: z.string().max(20).optional().or(z.literal('')),
  origem: z.string().max(50).default('Webhook Automático'),
  valor: z.preprocess((val) => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string') {
      const parsed = parseFloat(val);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, z.number().min(0))
});

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Extração Segura do Token (Bearer ou Query)
    let token = new URL(request.url).searchParams.get('token');
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return NextResponse.json({ error: 'Acesso Negado: Token não fornecido.' }, { status: 401, headers: corsHeaders });

    // 2. Resolver a Empresa
    const { data: empresa, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, ativo')
      .eq('webhook_token', token)
      .single();

    if (empresaError || !empresa || !empresa.ativo) {
      return NextResponse.json({ error: 'Acesso Negado: Token inválido ou empresa inativa.' }, { status: 401, headers: corsHeaders });
    }

    // 3. Validação do Payload com Zod (Evita string gigante ou objeto sujo)
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400, headers: corsHeaders });
    }

    // Mapeamento flexível antes da validação
    const payloadBruto = {
      nome: body.nome || body.name || body.first_name,
      email: body.email,
      telefone: body.telefone || body.phone || body.whatsapp,
      origem: body.origem || body.source,
      valor: body.valor || body.value
    };

    const validData = leadSchema.safeParse(payloadBruto);
    if (!validData.success) {
      return NextResponse.json({ error: 'Dados inválidos.', detalhes: validData.error.format() }, { status: 400, headers: corsHeaders });
    }

    const { nome, email, telefone, origem, valor } = validData.data;

    // LGPD: o formulário pode mandar o consentimento (caixa marcada) ou a base legal
    const aceite = body.consentimento ?? body.consent ?? body.aceite ?? body.lgpd;
    const consentiu = aceite === true || ['true', 'sim', 'yes', '1', 'on'].includes(String(aceite ?? '').toLowerCase());
    const BASES = ['consentimento', 'contrato', 'legitimo_interesse', 'obrigacao_legal'];
    const baseInformada = typeof body.base_legal === 'string' && BASES.includes(body.base_legal) ? body.base_legal : null;
    const base_legal = consentiu ? 'consentimento' : baseInformada;
    const consentimento_em = base_legal === 'consentimento' ? new Date().toISOString() : null;

    // 4. Deduplicação: mesmo WhatsApp (DDD + 8 últimos dígitos, com ou sem 55/9º dígito)
    //    ou mesmo e-mail num lead EM ABERTO desta empresa. Em vez de criar outro lead,
    //    registra o novo contato no histórico do existente. Lead ganho/perdido: cria um novo.
    const chave = chaveTelefone(telefone);
    const emailNorm = (email || '').trim().toLowerCase();
    let existente: { id: string } | null = null;
    if (chave) {
      const { data } = await supabaseAdmin.from('leads').select('id')
        .eq('empresa_id', empresa.id).eq('situacao', 'aberto').eq('chave_telefone', chave)
        .order('created_at', { ascending: false }).limit(1);
      existente = data?.[0] ?? null;
    }
    if (!existente && emailNorm) {
      const { data } = await supabaseAdmin.from('leads').select('id')
        .eq('empresa_id', empresa.id).eq('situacao', 'aberto').ilike('email', emailNorm.replace(/[\\%_]/g, (c) => `\\${c}`))
        .order('created_at', { ascending: false }).limit(1);
      existente = data?.[0] ?? null;
    }
    if (existente) {
      await supabaseAdmin.from('lead_atividades').insert([{
        empresa_id: empresa.id, lead_id: existente.id, usuario_id: null, tipo: 'webhook',
        descricao: `Novo contato${origem ? ` (${origem})` : ''}`,
      }]);
      return NextResponse.json({ success: true, duplicado: true, message: 'Lead já existe; contato registrado no histórico.', lead_id: existente.id }, { status: 200, headers: corsHeaders });
    }

    // 5. Descobrir a primeira etapa pelo ID e não pelo nome
    const { data: etapa } = await supabaseAdmin
      .from('etapas_funil')
      .select('id')
      .eq('empresa_id', empresa.id)
      .order('ordem', { ascending: true })
      .limit(1)
      .single();

    if (!etapa) {
      return NextResponse.json({ error: 'Funil da empresa não configurado.' }, { status: 400, headers: corsHeaders });
    }

    // 6. Inserir a Lead com etapa_id
    const { data: novaLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert([{ empresa_id: empresa.id, nome, email, telefone, origem, valor, etapa_id: etapa.id, base_legal, consentimento_em }])
      .select()
      .single();

    if (leadError) throw leadError;

    await supabaseAdmin.from('lead_atividades').insert([{ empresa_id: empresa.id, lead_id: novaLead.id, usuario_id: null, tipo: 'webhook', descricao: origem ? `Entrou por ${origem}` : 'Entrou pelo webhook' }]);

    return NextResponse.json({ success: true, lead: novaLead }, { headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Falha no servidor.' }, { status: 500, headers: corsHeaders });
  }
}