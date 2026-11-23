// Só no servidor: usa a secret key do Supabase (via getSupabaseAdmin).
import { getSupabaseAdmin } from '@/utils/supabase/admin';
import { COR_PADRAO, hexValido } from '@/lib/marca';

/** Nome fixo do ícone do app no bucket privado `marca` (pasta = id da empresa). */
export const ARQUIVO_ICONE = 'icone-app.png';

export type MarcaApp = { id: string | null; nome: string; cor: string; versao: string; icone: string | null };

export const MARCA_PADRAO: MarcaApp = { id: null, nome: 'Dons CRM', cor: COR_PADRAO, versao: 'padrao-1', icone: null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marca pública do app de uma empresa: só nome, cor e ícone (o que vai na tela
 * inicial do celular). Empresa inexistente ou suspensa cai na marca padrão.
 * Com `comIcone`, devolve o PNG do ícone como data URI.
 */
export async function carregarMarcaApp(empresaId: string, comIcone = false): Promise<MarcaApp> {
  if (!UUID.test(empresaId)) return MARCA_PADRAO;
  let admin;
  try { admin = getSupabaseAdmin(); } catch { return MARCA_PADRAO; }

  const { data: emp } = await admin.from('empresas').select('id, nome, cor_primaria, ativo').eq('id', empresaId).maybeSingle();
  if (!emp || emp.ativo === false) return MARCA_PADRAO;

  const { data: arquivos } = await admin.storage.from('marca').list(empresaId, { search: ARQUIVO_ICONE, limit: 1 });
  const arq = arquivos?.find((a) => a.name === ARQUIVO_ICONE);
  const cor = hexValido(emp.cor_primaria) ? emp.cor_primaria : COR_PADRAO;
  const versao = [cor, emp.nome, arq?.updated_at ?? 'sem-icone'].join('|');

  let icone: string | null = null;
  if (comIcone && arq) {
    const { data: blob } = await admin.storage.from('marca').download(`${empresaId}/${ARQUIVO_ICONE}`);
    if (blob) icone = `data:image/png;base64,${Buffer.from(await blob.arrayBuffer()).toString('base64')}`;
  }
  return { id: emp.id, nome: emp.nome || 'CRM', cor, versao: hash(versao), icone };
}

/** Hash curto e estável para versionar as URLs dos ícones. */
function hash(texto: string) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/** Nome curto para baixo do ícone (até ~12 caracteres). */
export function nomeCurto(nome: string) {
  if (nome.length <= 12) return nome;
  const primeira = nome.split(/\s+/)[0];
  return primeira.length <= 12 ? primeira : nome.slice(0, 12);
}

const SUFIXOS = /^(ltda|me|epp|eireli|s\/?a|sa|mei|cia|& ?cia|e|de|da|do|das|dos)\.?$/i;

export function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter((p) => p && !SUFIXOS.test(p));
  const usar = partes.length ? partes : nome.trim().split(/\s+/);
  return ((usar[0]?.[0] ?? 'C') + (usar.length > 1 ? usar[usar.length - 1][0] : usar[0]?.[1] ?? '')).toUpperCase();
}
