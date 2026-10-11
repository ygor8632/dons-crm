import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Supabase com a chave de administrador para ignorar o RLS em chamadas de API externas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // O cliente vai usar um link assim: https://crm.donstech.com.br/api/webhooks/leads?token=ID_DA_EMPRESA
    const url = new URL(request.url);
    const empresaId = url.searchParams.get('token');

    // Validação de Segurança Básica
    if (!empresaId) {
      return NextResponse.json({ error: 'Token de integração (ID da empresa) não fornecido.' }, { status: 401 });
    }

    // 1. Mapeamento Flexível:
    // Sistemas diferentes enviam os dados com nomes diferentes. O Typeform pode enviar "name", o Elementor "nome_completo".
    const nome = body.nome || body.name || body.nome_completo || body.fullname || 'Lead Automática (Sem Nome)';
    const email = body.email || body.e_mail || null;
    const telefone = body.telefone || body.phone || body.whatsapp || body.celular || null;
    const origem = body.origem || body.source || 'Webhook / Integração';

    // 2. Inserir no Banco de Dados
    const { error } = await supabase.from('leads').insert([{
      empresa_id: empresaId,
      nome,
      email,
      telefone,
      origem,
      status: 'novo'
    }]);

    if (error) {
      console.error("Erro ao inserir lead via webhook:", error);
      return NextResponse.json({ error: 'Falha ao guardar a lead no banco de dados.' }, { status: 500 });
    }

    // 3. Sucesso!
    return NextResponse.json({ success: true, message: 'Lead capturada e inserida com sucesso!' }, { status: 201 });

  } catch (error: any) {
    console.error("Erro fatal no webhook:", error);
    return NextResponse.json({ error: 'Ocorreu um erro ao processar o webhook. Verifique o formato do JSON.' }, { status: 400 });
  }
}

// Responde a requisições OPTIONS (necessário para o CORS de algumas plataformas como o Zapier/Make)
export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { status: 200 });
}