import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Agora exigimos o empresa_id no payload do webhook!
    const { nome, email, telefone, origem, empresa_id } = body;

    // Validação de segurança
    if (!nome || !empresa_id) {
      return NextResponse.json(
        { erro: 'Os campos "nome" e "empresa_id" são obrigatórios.' }, 
        { status: 400 }
      );
    }

    // Inserimos a lead já associada à empresa correta
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          nome: nome,
          email: email || '',
          telefone: telefone || '',
          origem: origem || 'Webhook (Sistema Externo)',
          status: 'novo',
          empresa_id: empresa_id
        }
      ])
      .select();

    if (error) {
      console.error('Erro na base de dados:', error.message);
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Oportunidade criada e atribuída ao cliente com sucesso!',
      lead: data[0] 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erro crítico no webhook:', error);
    return NextResponse.json(
      { erro: 'Erro interno no servidor ao processar o webhook.' }, 
      { status: 500 }
    );
  }
}