import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase com privilégios de Admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { email, empresa_id, role } = await request.json();

    if (!email || !empresa_id) {
      return NextResponse.json({ error: 'E-mail e ID da empresa são obrigatórios.' }, { status: 400 });
    }

    // 1. Envia o convite oficial via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        empresa_id: empresa_id,
        role_solicitada: role || 'vendedor'
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 2. Garante que o perfil do utilizador convidado recebe a permissão e a empresa correta imediatamente
    if (authData.user) {
      await supabaseAdmin.from('perfis').update({
        empresa_id: empresa_id,
        role: role || 'vendedor'
      }).eq('id', authData.user.id);
    }

    return NextResponse.json({ success: true, message: 'Convite enviado com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}