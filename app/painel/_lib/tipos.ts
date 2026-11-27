// Tipos mínimos das tabelas usadas pelo painel (até gerarmos os tipos do Supabase).
export type Papel = 'admin' | 'vendedor';

export type Etapa = {
  id: string;
  empresa_id: string;
  nome: string;
  cor: string;
  ordem: number;
  /** Chance padrão de fechar nesta etapa (0-100). */
  probabilidade?: number | null;
  /** Dias sem atividade para o lead aparecer como "parado" (null = sem aviso). */
  dias_parado?: number | null;
};

export type Situacao = 'aberto' | 'ganho' | 'perdido';

export type Lead = {
  id: string;
  empresa_id: string;
  nome: string;
  email?: string | null;
  telefone?: string | null;
  origem?: string | null;
  /** Campanha e anúncio de onde o lead veio (Meta Lead Ads, Click-to-WhatsApp, utm do site). */
  campanha?: string | null;
  anuncio?: string | null;
  etapa_id?: string | null;
  vendedor_id?: string | null;
  vendedor?: { nome?: string | null } | null;
  valor?: number | null;
  created_at: string;
  situacao?: Situacao;
  motivo_perda?: string | null;
  fechado_em?: string | null;
  /** Chance própria deste negócio; sem ela vale a da etapa. */
  probabilidade?: number | null;
  /** CPF ou CNPJ. */
  documento?: string | null;
  etapa_desde?: string;
  ultima_atividade_em?: string;
  chave_telefone?: string | null;
  /** LGPD: base legal do tratamento, consentimento, oposição e anonimização. */
  base_legal?: BaseLegal | null;
  consentimento_em?: string | null;
  nao_contatar?: boolean;
  anonimizado_em?: string | null;
};

export type BaseLegal = 'consentimento' | 'contrato' | 'legitimo_interesse' | 'obrigacao_legal';

/** Linha do registro de acessos (logs_auditoria). */
export type RegistroAcesso = {
  id: string;
  created_at: string;
  usuario_id?: string | null;
  acao: string;
  entidade: string;
  entidade_id?: string | null;
  detalhes?: string | null;
};

export type TipoAtividade = 'whatsapp' | 'ligacao' | 'email' | 'etapa' | 'ganho' | 'perdido' | 'reaberto' | 'webhook' | 'importacao' | 'distribuicao';

export type Atividade = {
  id: string;
  lead_id: string;
  tipo: TipoAtividade;
  descricao?: string | null;
  created_at: string;
  usuario_id?: string | null;
};

export type ModeloMensagem = { id: string; etapa_id?: string | null; titulo: string; texto: string; ordem: number };

/** Linha pronta para importar (vinda do CSV já mapeado). */
export type LinhaImportacao = { nome: string; email: string | null; telefone: string | null; origem: string; valor: number; documento: string | null };

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
  segmento?: string | null;
  /** Motivos oferecidos ao marcar perdido; null = lista padrão. */
  motivos_perda?: string[] | null;
  /** Relatório mensal por e-mail (dia 1): ligado e e-mails extras além dos admins. */
  relatorio_email_ativo?: boolean;
  relatorio_emails_extras?: string[];
  /** Roleta: leads de integrações sem responsável vão para o próximo da vez. */
  distribuicao_ativa?: boolean;
};

/** Quem participa da roleta e quando recebeu o último lead. */
export type MembroRoleta = { perfil_id: string; participa: boolean; ultimo_lead_em: string | null; recebidos: number };
/** Origem com fila própria (ex.: Google Ads só para dois vendedores). */
export type RegraRoleta = { id?: string; origem: string; membros: string[] };

export type EnvioRelatorio = { id: string; mes: string; tipo: 'mensal' | 'previa'; destinatarios: number; erro?: string | null; enviado_em: string };

/** Meta mensal de vendas: de um vendedor ou da empresa toda (usuario_id nulo). mes = AAAA-MM-01. */
export type Meta = { id: string; empresa_id?: string; usuario_id: string | null; mes: string; valor: number | null; quantidade: number | null };

/** Mudança de etapa (gravada pelo banco a cada troca). */
export type Movimento = { lead_id: string; de_etapa_id: string | null; para_etapa_id: string | null; created_at: string };
