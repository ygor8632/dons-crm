import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { getSupabaseAdmin } from '@/utils/supabase/admin';

const conviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
  empresa_id: z.string().uuid(),
  role: z.enum(['admin', 'vendedor']).default('vendedor'),
});

export async function POST(request: Request) {
  try {
    // 1. Quem está chamando? (sessão validada no servidor do Supabase)
    const supabase = await createClient();
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // 2. Validação do payload
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON inválido.' }, { status: 400 });
    }
    const parsed = conviteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'E-mail, empresa ou cargo inválidos.' }, { status: 400 });
    }
    const { email, empresa_id, role } = parsed.data;

    // 3. Autorização: superadmin convida para qualquer empresa e qualquer cargo;
    //    admin só convida vendedores para a própria empresa.
    const { data: chamador } = await supabaseAdmin
      .from('perfis')
      .select('role, empresa_id')
      .eq('id', user.id)
      .single();

    const isSuperadmin = chamador?.role === 'superadmin';
    const isAdminDaEmpresa = chamador?.role === 'admin' && chamador.empresa_id === empresa_id;

    if (!isSuperadmin && !(isAdminDaEmpresa && role === 'vendedor')) {
      return NextResponse.json({ error: 'Sem permissão para este convite.' }, { status: 403 });
    }

    // 4. A empresa precisa existir e estar ativa
    const { data: empresa } = await supabaseAdmin
      .from('empresas')
      .select('id, ativo')
      .eq('id', empresa_id)
      .single();
    if (!empresa || !empresa.ativo) {
      return NextResponse.json({ error: 'Empresa inexistente ou inativa.' }, { status: 400 });
    }

    // 5. Envia o convite oficial via Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { empresa_id, role_solicitada: role },
    });
    if (authError || !authData.user) {
      console.error('Falha no convite:', authError?.message);
      return NextResponse.json({ error: 'Não foi possível enviar o convite. Verifique se o e-mail já está cadastrado.' }, { status: 400 });
    }

    // 6. Cria (ou atualiza) o perfil já ligado à empresa e ao cargo corretos
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .upsert({ id: authData.user.id, email, empresa_id, role }, { onConflict: 'id' });
    if (perfilError) {
      console.error('Falha ao criar perfil do convidado:', perfilError.message);
      return NextResponse.json({ error: 'Convite enviado, mas houve falha ao criar o perfil.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Convite enviado com sucesso!' });
  } catch (error) {
    console.error('Erro no convite:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}
