import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos a chave Service Role para contornar o RLS do Supabase,
// pois o webhook é um pedido externo sem sessão de utilizador.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    // Lê os dados enviados pela plataforma externa (Zapier, Facebook, etc.)
    const body = await request.json();

    // Extraímos as informações principais
    const { nome, email, telefone, origem } = body;

    // O nome é o único campo estritamente obrigatório para criarmos uma oportunidade
    if (!nome) {
      return NextResponse.json(
        { erro: 'O campo "nome" é obrigatório.' }, 
        { status: 400 }
      );
    }

    // Inserimos a lead no Supabase usando o cliente de Admin
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          nome: nome,
          email: email || '',
          telefone: telefone || '',
          origem: origem || 'Webhook (Sistema Externo)',
          status: 'novo' // Cai sempre no topo do funil como "Aguardando Contacto"
        }
      ])
      .select();

    if (error) {
      console.error('Erro na base de dados:', error.message);
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    // Resposta de sucesso para a plataforma que enviou o webhook
    return NextResponse.json({ 
      sucesso: true, 
      mensagem: 'Oportunidade criada com sucesso!',
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