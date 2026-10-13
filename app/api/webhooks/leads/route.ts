import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Garantido que não tem NEXT_PUBLIC_ e está no .gitignore
);

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
    } catch (e) {
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

    // 4. Deduplicação (Impede Spam se e-mail ou telefone já existirem nesta empresa)
    if (email || telefone) {
      let query = supabaseAdmin.from('leads').select('id').eq('empresa_id', empresa.id);
      if (email && telefone) query = query.or(`email.eq.${email},telefone.eq.${telefone}`);
      else if (email) query = query.eq('email', email);
      else if (telefone) query = query.eq('telefone', telefone);

      const { data: leadExistente } = await query.limit(1);
      if (leadExistente && leadExistente.length > 0) {
        return NextResponse.json({ success: true, message: 'Lead já existe.', lead_id: leadExistente[0].id }, { status: 200, headers: corsHeaders });
      }
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
      .insert([{ empresa_id: empresa.id, nome, email, telefone, origem, valor, etapa_id: etapa.id }])
      .select()
      .single();

    if (leadError) throw leadError;

    // 7. (Opcional/Futuro) Inserir registo inicial na tabela `lead_movimentos`
    // await supabaseAdmin.from('lead_movimentos').insert([{ lead_id: novaLead.id, para_etapa_id: etapa.id, usuario_id: null }]);

    return NextResponse.json({ success: true, lead: novaLead }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: 'Falha no servidor.' }, { status: 500, headers: corsHeaders });
  }
}