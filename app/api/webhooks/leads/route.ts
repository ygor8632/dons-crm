import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase/admin';

export async function POST(request: Request) {
  try {
    // Lê os dados que chegam no corpo do Webhook (JSON)
    const body = await request.json();
    const { tenant_id, nome, email, telefone, origem } = body;

    // Validação básica: precisamos saber de quem é a Lead e qual o nome
    if (!tenant_id || !nome) {
      return NextResponse.json(
        { erro: 'Os campos tenant_id e nome são obrigatórios.' }, 
        { status: 400 }
      );
    }

    // Grava a Lead na base de dados
    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert([{ tenant_id, nome, email, telefone, origem }])
      .select()
      .single();

    if (error) throw error;

    // Responde ao sistema externo que correu tudo bem
    return NextResponse.json({ sucesso: true, lead: data }, { status: 201 });
    
  } catch (erro: any) {
    return NextResponse.json({ erro: erro.message }, { status: 500 });
  }
}