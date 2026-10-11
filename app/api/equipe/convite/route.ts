import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usamos a chave SERVICE_ROLE para ter poderes de administrador na criação do usuário
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { email, empresa_id, role } = await request.json();

    if (!email || !empresa_id) {
      return NextResponse.json({ error: 'E-mail e ID da Empresa são obrigatórios.' }, { status: 400 });
    }

    // 1. Enviar o convite por e-mail através do Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    
    if (error) {
      throw error;
    }

    // 2. Assim que o convite é criado, o utilizador ganha um ID no auth.users.
    // Vamos já criar o perfil dele associado à empresa correta.
    if (data.user) {
       await supabaseAdmin.from('perfis').upsert({
           id: data.user.id,
           email: email,
           empresa_id: empresa_id,
           role: role || 'vendedor'
       });
    }

    return NextResponse.json({ success: true, message: 'Convite enviado com sucesso!' });
  } catch (error: any) {
    console.error("Erro ao convidar:", error);
    return NextResponse.json({ error: error.message || 'Erro ao enviar convite.' }, { status: 500 });
  }
}