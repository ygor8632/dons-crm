// Tipos mínimos das tabelas usadas pelo painel (até gerarmos os tipos do Supabase).
export type Papel = 'admin' | 'vendedor';

export type Etapa = { id: string; empresa_id: string; nome: string; cor: string; ordem: number };

export type Lead = {
  id: string;
  empresa_id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  origem?: string | null;
  etapa_id?: string | null;
  vendedor_id?: string | null;
  vendedor?: { nome?: string | null } | null;
  valor?: number | null;
  created_at: string;
};

export type Membro = { id: string; empresa_id: string; nome?: string | null; email?: string | null; role?: Papel | 'superadmin' | null };

export type Tarefa = {
  id: string;
  lead_id: string;
  empresa_id?: string;
  vendedor_id?: string | null;
  descricao: string;
  data_vencimento: string;
  concluida: boolean;
};

export type Anotacao = { id: string; texto: string; created_at: string; perfis?: { nome?: string | null } | null };

export type Empresa = {
  id: string;
  nome: string;
  ativo: boolean;
  webhook_token?: string | null;
  cor_primaria?: string | null;
  logo_url?: string | null;
  cor_fundo_logo?: string | null;
  fundo_url?: string | null;
};
