/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração PÚBLICA do Supabase (URL + publishable key). Estes valores vão
  // de qualquer forma no JavaScript do navegador e são protegidos pelo RLS.
  // O fallback garante o build mesmo se a hospedagem não expuser as variáveis
  // durante o build. NUNCA coloque a secret key (SUPABASE_SERVICE_ROLE_KEY) aqui.
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wvsbtrgwkzdqkjcexdsh.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_7n1rlQmw0m_S3fM_yg3QHw_hkmtKcS6',
  },
};

export default nextConfig;
