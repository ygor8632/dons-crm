import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Cliente com a secret key (ignora RLS). USO EXCLUSIVO NO SERVIDOR.
// Criado sob demanda: assim o build não depende da chave estar disponível,
// e ela é lida do ambiente apenas em tempo de execução.
let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error('Supabase admin não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
  }

  adminClient = createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}
