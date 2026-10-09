'use server';

import { supabaseAdmin } from '@/utils/supabase/admin';

export async function criarCliente(formData: FormData) {
  const nomeEmpresa = formData.get('nomeEmpresa') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert([{ name: nomeEmpresa, plan: 'basic' }])
      .select()
      .single();
      
    if (tenantError) throw tenantError;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([{
        id: authData.user.id,
        tenant_id: tenant.id,
        full_name: `Admin - ${nomeEmpresa}`,
        role: 'admin'
      }]);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}