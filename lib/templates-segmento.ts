/**
 * Templates por segmento: funil (com chance de fechar e prazo de "parado"),
 * motivos de perda e mensagens prontas de WhatsApp. O superadmin escolhe um ao
 * criar a empresa; o cliente pode ajustar tudo depois em Configurações.
 * Nas mensagens, `etapa` é o índice da etapa (0 = primeira) ou null = qualquer etapa.
 */
export type EtapaTemplate = { nome: string; cor: string; probabilidade: number | null; dias_parado: number | null };
export type MensagemTemplate = { etapa: number | null; titulo: string; texto: string };
export type TemplateSegmento = {
  id: string;
  nome: string;
  descricao: string;
  etapas: EtapaTemplate[];
  motivos: string[];
  mensagens: MensagemTemplate[];
};

const AMARELO = '#c99a06', AZUL = '#5d73e0', ROXO = '#8a5cd1', CORAL = '#da4c3c', LARANJA = '#e07a2e', VERDE = '#1f8f4e';

export const MOTIVOS_PADRAO = ['Preço', 'Sem resposta', 'Escolheu concorrente', 'Sem orçamento', 'Não era o momento'];

export const TEMPLATES: TemplateSegmento[] = [
  {
    id: 'geral',
    nome: 'Geral',
    descricao: 'Funil simples para qualquer negócio que vende por conversa.',
    etapas: [
      { nome: 'Aguardando contato', cor: AMARELO, probabilidade: 10, dias_parado: 2 },
      { nome: 'Em atendimento', cor: AZUL, probabilidade: 30, dias_parado: 5 },
      { nome: 'Proposta enviada', cor: CORAL, probabilidade: 60, dias_parado: 7 },
      { nome: 'Venda concluída', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: MOTIVOS_PADRAO,
    mensagens: [
      { etapa: 0, titulo: 'Primeiro contato', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Vi seu interesse e queria entender melhor o que você procura. Podemos conversar?' },
      { etapa: 2, titulo: 'Retorno da proposta', texto: 'Oi, {primeiro_nome}! Conseguiu ver a proposta que enviei? Se quiser ajustar algo, é só me falar.' },
      { etapa: null, titulo: 'Retomar contato', texto: 'Oi, {primeiro_nome}, tudo bem? Passando para saber se ainda posso te ajudar com o que conversamos.' },
    ],
  },
  {
    id: 'clinica',
    nome: 'Clínicas e saúde',
    descricao: 'Consultórios, clínicas, estética e odontologia: do contato à consulta realizada.',
    etapas: [
      { nome: 'Novo contato', cor: AMARELO, probabilidade: 10, dias_parado: 1 },
      { nome: 'Avaliação agendada', cor: AZUL, probabilidade: 40, dias_parado: 3 },
      { nome: 'Orçamento apresentado', cor: CORAL, probabilidade: 60, dias_parado: 5 },
      { nome: 'Tratamento fechado', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: ['Preço', 'Faltou à avaliação', 'Convênio não aceito', 'Distância', 'Sem resposta', 'Não era o momento'],
    mensagens: [
      { etapa: 0, titulo: 'Boas-vindas', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Recebemos seu contato. Qual o melhor dia e horário para sua avaliação?' },
      { etapa: 1, titulo: 'Confirmar avaliação', texto: 'Oi, {primeiro_nome}! Passando para confirmar sua avaliação na {empresa}. Podemos manter o horário combinado?' },
      { etapa: 2, titulo: 'Retorno do orçamento', texto: 'Oi, {primeiro_nome}! Ficou alguma dúvida sobre o orçamento do tratamento? Temos opções de pagamento que posso te explicar.' },
      { etapa: null, titulo: 'Remarcar', texto: 'Oi, {primeiro_nome}, sentimos sua falta! Quer remarcar sua avaliação? Tenho horários nesta semana.' },
    ],
  },
  {
    id: 'imobiliaria',
    nome: 'Imobiliárias',
    descricao: 'Venda e locação: do interesse no imóvel ao contrato assinado.',
    etapas: [
      { nome: 'Novo interessado', cor: AMARELO, probabilidade: 5, dias_parado: 1 },
      { nome: 'Qualificação', cor: AZUL, probabilidade: 15, dias_parado: 3 },
      { nome: 'Visita agendada', cor: ROXO, probabilidade: 35, dias_parado: 5 },
      { nome: 'Proposta', cor: CORAL, probabilidade: 60, dias_parado: 7 },
      { nome: 'Contrato assinado', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: ['Preço do imóvel', 'Financiamento negado', 'Comprou com outra imobiliária', 'Desistiu de mudar', 'Localização', 'Sem resposta'],
    mensagens: [
      { etapa: 0, titulo: 'Interesse no imóvel', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Vi seu interesse no imóvel. Você procura para comprar ou alugar, e em qual região?' },
      { etapa: 2, titulo: 'Confirmar visita', texto: 'Oi, {primeiro_nome}! Confirmando nossa visita ao imóvel. Te envio a localização certinha?' },
      { etapa: 3, titulo: 'Retorno da proposta', texto: 'Oi, {primeiro_nome}! Tive retorno do proprietário sobre a sua proposta. Podemos conversar agora?' },
      { etapa: null, titulo: 'Novas opções', texto: 'Oi, {primeiro_nome}! Chegaram imóveis novos no perfil que você procura. Quer que eu te mande as opções?' },
    ],
  },
  {
    id: 'escola',
    nome: 'Escolas e cursos',
    descricao: 'Escolas, idiomas e cursos livres: do interesse à matrícula.',
    etapas: [
      { nome: 'Interessado', cor: AMARELO, probabilidade: 10, dias_parado: 2 },
      { nome: 'Visita ou aula experimental', cor: AZUL, probabilidade: 40, dias_parado: 4 },
      { nome: 'Proposta de matrícula', cor: CORAL, probabilidade: 65, dias_parado: 5 },
      { nome: 'Matriculado', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: ['Mensalidade', 'Horário não serve', 'Escolheu outra escola', 'Distância', 'Adiou para o próximo período', 'Sem resposta'],
    mensagens: [
      { etapa: 0, titulo: 'Primeiro contato', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Que bom ter seu interesse! Quer agendar uma visita ou aula experimental?' },
      { etapa: 1, titulo: 'Depois da visita', texto: 'Oi, {primeiro_nome}! Obrigado pela visita. O que achou? Posso te passar as condições de matrícula?' },
      { etapa: 2, titulo: 'Últimas vagas', texto: 'Oi, {primeiro_nome}! As vagas da turma estão acabando. Quer garantir a sua?' },
    ],
  },
  {
    id: 'servicos',
    nome: 'Serviços para empresas',
    descricao: 'Agências, consultorias, contabilidade e TI: venda consultiva com reunião e proposta.',
    etapas: [
      { nome: 'Lead novo', cor: AMARELO, probabilidade: 5, dias_parado: 2 },
      { nome: 'Reunião agendada', cor: AZUL, probabilidade: 20, dias_parado: 5 },
      { nome: 'Diagnóstico', cor: ROXO, probabilidade: 35, dias_parado: 7 },
      { nome: 'Proposta enviada', cor: CORAL, probabilidade: 55, dias_parado: 7 },
      { nome: 'Negociação', cor: LARANJA, probabilidade: 75, dias_parado: 5 },
      { nome: 'Contrato fechado', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: ['Preço', 'Sem orçamento agora', 'Escolheu concorrente', 'Decidiu fazer internamente', 'Projeto adiado', 'Sem resposta'],
    mensagens: [
      { etapa: 0, titulo: 'Primeiro contato', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Recebi seu contato e gostaria de entender o seu cenário. Tem 20 minutos esta semana?' },
      { etapa: 1, titulo: 'Confirmar reunião', texto: 'Oi, {primeiro_nome}! Confirmando nossa reunião. Te envio o link?' },
      { etapa: 3, titulo: 'Retorno da proposta', texto: 'Oi, {primeiro_nome}! Conseguiu avaliar a proposta? Posso ajustar escopo ou prazos se precisar.' },
      { etapa: null, titulo: 'Retomar', texto: 'Oi, {primeiro_nome}, tudo bem? Faz um tempo que conversamos. O projeto ainda está nos planos?' },
    ],
  },
  {
    id: 'varejo',
    nome: 'Lojas e varejo',
    descricao: 'Lojas físicas e online que atendem pelo WhatsApp: orçamento rápido e pós-venda.',
    etapas: [
      { nome: 'Novo atendimento', cor: AMARELO, probabilidade: 15, dias_parado: 1 },
      { nome: 'Orçamento enviado', cor: CORAL, probabilidade: 45, dias_parado: 2 },
      { nome: 'Aguardando pagamento', cor: LARANJA, probabilidade: 80, dias_parado: 2 },
      { nome: 'Venda concluída', cor: VERDE, probabilidade: 100, dias_parado: null },
    ],
    motivos: ['Preço', 'Frete', 'Sem estoque', 'Prazo de entrega', 'Comprou em outra loja', 'Sem resposta'],
    mensagens: [
      { etapa: 0, titulo: 'Atendimento', texto: 'Olá, {primeiro_nome}! Aqui é {vendedor}, da {empresa}. Como posso te ajudar hoje?' },
      { etapa: 1, titulo: 'Orçamento', texto: 'Oi, {primeiro_nome}! Segue o orçamento que você pediu. Quer que eu reserve para você?' },
      { etapa: 2, titulo: 'Lembrete de pagamento', texto: 'Oi, {primeiro_nome}! Seu pedido está separado. Assim que o pagamento cair, já envio. Precisa do link de novo?' },
      { etapa: null, titulo: 'Pós-venda', texto: 'Oi, {primeiro_nome}! Seu pedido chegou bem? Qualquer coisa, é só chamar.' },
    ],
  },
];

export const templatePorId = (id?: string | null) => TEMPLATES.find((t) => t.id === id) ?? null;
export const nomeSegmento = (id?: string | null) => templatePorId(id)?.nome ?? 'Sem segmento';
