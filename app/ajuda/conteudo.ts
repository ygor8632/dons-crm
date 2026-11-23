/**
 * Conteúdo da central de ajuda. Cada capítulo tem um id usado no endereço
 * (/ajuda#leads) e pelo botão "?" do painel, que abre o capítulo da tela atual.
 * Imagens em /public/ajuda (geradas da demonstração).
 */
export type Artigo = {
  id: string;
  titulo: string;
  resumo: string;
  /** Só o administrador vê ou faz. */
  admin?: boolean;
  passos?: string[];
  itens?: { t: string; d: string }[];
  dica?: string;
  imagem?: { src: string; alt: string; retrato?: boolean };
};
export type Capitulo = { id: string; titulo: string; descricao: string; artigos: Artigo[] };

export const CAPITULOS: Capitulo[] = [
  {
    id: 'comecar',
    titulo: 'Primeiros passos',
    descricao: 'Entrar, se localizar no painel e deixar o CRM com a sua cara.',
    artigos: [
      {
        id: 'primeiro-acesso',
        titulo: 'Primeiro acesso pelo convite',
        resumo: 'Você recebe um e-mail de convite. Por ele você cria a senha e informa seu nome.',
        passos: [
          'Abra o e-mail "convite" e toque no link. Ele vale por pouco tempo; se expirar, peça outro ao administrador.',
          'Escreva seu nome (é como a equipe vai te ver) e crie uma senha com 8 caracteres ou mais, com letras e números.',
          'Toque em Salvar senha nova. Você entra direto no painel.',
          'Nas próximas vezes, entre pelo endereço do CRM com o e-mail e a senha.',
        ],
        dica: 'Esqueceu a senha? Na tela de login, toque em "Esqueci a senha" e siga o link que chega por e-mail.',
        imagem: { src: '/ajuda/login.jpg', alt: 'Tela de login com e-mail, senha e o link Esqueci a senha.' },
      },
      {
        id: 'navegacao',
        titulo: 'Como o painel é organizado',
        resumo: 'Três níveis de navegação: as seções na lateral, as abas de cada seção e o topo.',
        itens: [
          { t: 'Barra lateral (no celular, embaixo)', d: 'As seções: Visão geral, Leads, Relatórios, Equipe, Integrações e Configurações. O botão + cria um lead de qualquer tela.' },
          { t: 'Abas da seção', d: 'Cada seção tem visões, como Hoje, Kanban, Lista e Tarefas em Leads. No computador ficam na pílula flutuante embaixo; no celular, no topo do conteúdo.' },
          { t: 'Topo', d: 'Seu nome e o menu (perfil, tema, sair), a busca de leads por nome, telefone ou e-mail, o botão "?" desta ajuda e o sino com os follow-ups atrasados e do dia.' },
        ],
        imagem: { src: '/ajuda/visao-geral.jpg', alt: 'Painel com a barra lateral, as abas, a busca, o botão de ajuda e o sino.' },
      },
      {
        id: 'seu-nome',
        titulo: 'Seu nome e o tema escuro',
        resumo: 'Seu nome aparece na saudação, nas anotações e na lista da equipe.',
        passos: [
          'Toque no seu nome, no canto superior esquerdo, e escolha "Meu perfil e nome".',
          'Escreva o nome em "Seu nome" e toque em Salvar.',
          'No mesmo menu, "Usar vidro fumê" liga o tema escuro neste aparelho.',
        ],
        imagem: { src: '/ajuda/perfil.jpg', alt: 'Tela Meu perfil com o campo Seu nome, o e-mail, a aparência e o app no celular.' },
      },
      {
        id: 'app-celular',
        titulo: 'Instalar o app no celular',
        resumo: 'O CRM vira um ícone na tela inicial, com o nome e o logo da sua empresa, e abre em tela cheia.',
        passos: [
          'Android e computador: toque em "Instalar app" no aviso do topo do painel ou em Configurações › Perfil. Também funciona pelo menu do navegador › Instalar app.',
          'iPhone: abra o CRM no Safari, toque em Compartilhar e escolha "Adicionar à Tela de Início".',
          'No iPhone, o app pede o login uma vez, separado do Safari.',
        ],
        dica: 'Sem internet, o app mostra um aviso e um botão para tentar de novo. Nada é perdido: os dados ficam no servidor.',
        imagem: { src: '/ajuda/app-celular.jpg', alt: 'Convite para instalar o app no iPhone com o passo a passo do Safari.', retrato: true },
      },
    ],
  },
  {
    id: 'leads',
    titulo: 'Leads e o dia a dia',
    descricao: 'Onde a equipe passa o dia: a tela Hoje, o funil, a ficha de cada contato e o WhatsApp.',
    artigos: [
      {
        id: 'hoje',
        titulo: 'Tela Hoje: o que fazer agora',
        resumo: 'Reúne tudo o que pede atenção, para o vendedor começar o dia sem procurar.',
        itens: [
          { t: 'Atrasados', d: 'Follow-ups que passaram da hora. "Reagendar todos" joga para amanhã, 3 dias ou 1 semana; "Adiar" move um só para amanhã.' },
          { t: 'Para hoje', d: 'Retornos marcados para hoje. Toque no círculo para concluir.' },
          { t: 'Sem próximo passo', d: 'Leads em negociação sem nenhum follow-up. Os botões "WhatsApp amanhã", "Ligar em 2 dias" e "Retorno em 1 semana" agendam com um toque.' },
          { t: 'Parados', d: 'Leads sem nenhuma atividade além do prazo da etapa (definido em Configurações › Funil).' },
        ],
        imagem: { src: '/ajuda/hoje.jpg', alt: 'Tela Hoje com os blocos Atrasados, Para hoje, Sem próximo passo e Parados.' },
      },
      {
        id: 'kanban',
        titulo: 'Kanban: o funil em colunas',
        resumo: 'Cada coluna é uma etapa. Arraste o card para mudar de etapa ou use o menu ⋯.',
        itens: [
          { t: 'Topo da coluna', d: 'Quantos leads, o valor total e o valor provável (valor × chance de fechar da etapa).' },
          { t: 'Avisos no card', d: '"Follow-up atrasado", "Follow-up hoje", "Sem próximo passo", "Parado há N dias" e "Não contatar".' },
          { t: 'Ordem dos cards', d: 'Primeiro os atrasados, depois os de hoje, os sem próximo passo e por último os agendados para depois.' },
          { t: 'Menu ⋯', d: 'Mover para outra etapa, marcar como ganho ou como perdido. Funciona no celular e pelo teclado.' },
        ],
        imagem: { src: '/ajuda/kanban.jpg', alt: 'Kanban com as colunas do funil, totais, valor provável e avisos nos cards.' },
      },
      {
        id: 'ganho-perdido',
        titulo: 'Marcar ganho ou perdido',
        resumo: 'Fechar o lead deixa os relatórios certos e limpa o funil.',
        passos: [
          'No card, toque em ⋯ e escolha "Marcar como ganho" ou "Marcar como perdido…". Também dá pela ficha do lead.',
          'Ao marcar perdido, escolha o motivo (Preço, Sem resposta…) ou "Outro" e escreva. O motivo vai para o relatório de perdas.',
          'Ganho vai para a última etapa. Perdido sai do Kanban e fica em Lista › Perdidos.',
          'Errou? Use "Desfazer" no aviso que aparece, ou "Reabrir negociação" no menu ⋯ ou na ficha.',
        ],
        imagem: { src: '/ajuda/motivo-perda.jpg', alt: 'Janela "Por que não fechou?" com os motivos de perda.' },
      },
      {
        id: 'novo-lead',
        titulo: 'Cadastrar um lead',
        resumo: 'Só o nome é obrigatório. O CRM avisa se o contato já existe.',
        passos: [
          'Toque em + (ou "Novo lead").',
          'Preencha nome, WhatsApp e origem. Em "Mais detalhes" ficam e-mail, valor, CPF/CNPJ, base legal e responsável.',
          'Se o WhatsApp, e-mail ou CPF/CNPJ já estiver em outro lead, aparece "Parece que já existe" com o botão para abrir a ficha dele.',
          'Toque em Salvar lead. Ele entra na primeira etapa do funil.',
        ],
        imagem: { src: '/ajuda/novo-lead.jpg', alt: 'Cadastro rápido com o aviso de contato que já existe.' },
      },
      {
        id: 'ficha',
        titulo: 'Ficha do lead',
        resumo: 'Toque no nome do lead para abrir tudo sobre ele.',
        itens: [
          { t: 'Topo', d: 'Etapa, chance de fechar (a da etapa ou uma própria deste negócio), WhatsApp, Ganho e Perdido.' },
          { t: 'Anotações', d: 'Registre ligações, combinados e objeções. Só quem escreveu ou o administrador apaga.' },
          { t: 'Follow-ups', d: 'Agende o próximo retorno com data e hora. Ele aparece em Hoje, em Tarefas e no sino.' },
          { t: 'Histórico', d: 'Linha do tempo com mudanças de etapa, mensagens de WhatsApp, anotações, follow-ups concluídos e a entrada do lead.' },
          { t: 'Privacidade', d: 'Base legal, "Não contatar" e, para o administrador, exportar ou apagar os dados do contato.' },
        ],
        imagem: { src: '/ajuda/ficha.jpg', alt: 'Ficha do lead com a aba Histórico aberta.' },
      },
      {
        id: 'whatsapp',
        titulo: 'WhatsApp com mensagens prontas',
        resumo: 'O botão de WhatsApp abre a conversa já com o texto, e o envio fica no histórico.',
        passos: [
          'No card, na lista ou na ficha, toque no ícone do WhatsApp.',
          'Escolha uma mensagem pronta. As da etapa do lead aparecem primeiro, já com o nome dele preenchido.',
          'O WhatsApp abre com o texto. Revise e envie por lá.',
          'O envio fica registrado no histórico do lead e conta como atividade (ele deixa de aparecer como parado).',
        ],
        dica: 'As mensagens são cadastradas pelo administrador em Configurações › Mensagens.',
        imagem: { src: '/ajuda/whatsapp.jpg', alt: 'Menu do WhatsApp com as mensagens prontas preenchidas com o nome do lead.' },
      },
      {
        id: 'proximo-passo',
        titulo: 'Próximo passo sugerido',
        resumo: 'Depois de mudar a etapa ou concluir um follow-up, o CRM oferece agendar o próximo retorno.',
        passos: [
          'Ao mover um lead ou concluir um follow-up, aparece um aviso no canto da tela.',
          'Se o lead ficou sem próximo passo, toque em "WhatsApp amanhã", "Ligar em 2 dias" ou "Retorno em 1 semana".',
          'O aviso some sozinho e nunca aparece para lead ganho ou perdido.',
        ],
        imagem: { src: '/ajuda/proximo-passo.jpg', alt: 'Aviso com Desfazer e as sugestões de próximo passo.' },
      },
      {
        id: 'lista-tarefas',
        titulo: 'Lista e Tarefas',
        resumo: 'A Lista mostra todos os leads em tabela; Tarefas, todos os follow-ups.',
        itens: [
          { t: 'Lista', d: 'Filtre por etapa e por situação: Em aberto, Ganhos, Perdidos ou Todos. Mude a etapa direto na tabela.' },
          { t: 'Tarefas', d: 'Follow-ups agrupados em Atrasados, Hoje, Próximos e Concluídos.' },
        ],
        imagem: { src: '/ajuda/lista.jpg', alt: 'Lista de leads filtrada pelos perdidos, com o motivo de cada um.' },
      },
    ],
  },
  {
    id: 'visao-geral',
    titulo: 'Visão geral',
    descricao: 'O resumo do funil para abrir o dia.',
    artigos: [
      {
        id: 'indicadores',
        titulo: 'Indicadores e gráficos',
        resumo: 'Valor em pipeline (só negócios em aberto) e o valor provável, leads no mês, vendas, conversão, leads por mês, distribuição do funil, origens e próximos follow-ups.',
        dica: 'A aba Atividade mostra os leads que entraram por último.',
        imagem: { src: '/ajuda/visao-geral.jpg', alt: 'Visão geral com os indicadores e os gráficos.' },
      },
    ],
  },
  {
    id: 'relatorios',
    titulo: 'Relatórios e metas',
    descricao: 'Quanto o time vendeu, onde a venda escapa e como está cada vendedor.',
    artigos: [
      {
        id: 'desempenho',
        titulo: 'Desempenho',
        resumo: 'Vendido, negócios ganhos, taxa de ganho e tempo médio até a venda, comparados com o período anterior.',
        itens: [
          { t: 'Período e vendedor', d: 'Este mês, mês passado, 90 dias ou este ano; time todo ou uma pessoa. O vendedor vê só os próprios números.' },
          { t: 'Conversão por etapa', d: 'Quantos leads chegaram a cada etapa.' },
          { t: 'Tempo por etapa', d: 'Quantos dias, em média, o lead fica em cada etapa.' },
          { t: 'Perdas e origens', d: 'Os motivos de perda mais comuns e as origens que mais vendem.' },
        ],
        imagem: { src: '/ajuda/desempenho.jpg', alt: 'Relatório de desempenho com indicadores, conversão por etapa e perdas.' },
      },
      {
        id: 'metas',
        titulo: 'Metas do mês',
        resumo: 'Meta em reais e/ou em número de vendas, para o time e para cada pessoa.',
        admin: true,
        passos: [
          'Em Relatórios › Metas, escolha o mês nas setas.',
          'Preencha a meta do time e a de cada vendedor. Salva sozinho ao sair do campo.',
          '"Copiar metas do mês anterior" repete as metas do mês passado.',
          'O cartão da meta mostra onde o time deveria estar hoje e aparece também na Visão geral.',
        ],
        imagem: { src: '/ajuda/metas.jpg', alt: 'Tela de metas com a meta do time e de cada vendedor.' },
      },
      {
        id: 'mensal',
        titulo: 'Relatório mensal: por e-mail e em PDF',
        resumo: 'Todo dia 1, às 8h, o resumo do mês que fechou chega por e-mail com o logo e a cor da empresa. Também dá para imprimir ou salvar em PDF.',
        passos: [
          'Em Relatórios › Relatório mensal, o cartão "Envio por e-mail" liga ou desliga o envio. Começa ligado.',
          'Os administradores sempre recebem. Inclua até 5 e-mails extras, como o do dono ou da diretoria.',
          '"Enviar prévia para mim" manda o relatório do mês escolhido só para você, para conferir antes.',
          'Para PDF: escolha o mês e toque em "Imprimir ou salvar PDF" › "Salvar como PDF".',
        ],
        dica: 'O e-mail sai de suporte@donstech.com.br. Na primeira vez, confira a caixa de spam e marque como "não é spam".',
        imagem: { src: '/ajuda/mensal.jpg', alt: 'Relatório mensal com logo, resumo e o que mudou no mês.' },
      },
    ],
  },
  {
    id: 'equipe',
    titulo: 'Equipe',
    descricao: 'Quem usa o CRM e o que cada pessoa vê.',
    artigos: [
      {
        id: 'convidar',
        titulo: 'Convidar e gerenciar a equipe',
        resumo: 'O administrador convida por e-mail e define o papel de cada pessoa.',
        admin: true,
        itens: [
          { t: 'Convidar', d: 'Em Equipe, toque em "Convidar vendedor" e informe o e-mail. A pessoa recebe o link para criar a senha.' },
          { t: 'Administrador', d: 'Vê todos os leads, distribui, configura marca, funil, mensagens, metas e privacidade.' },
          { t: 'Vendedor', d: 'Vê os leads dele e os sem dono, e os próprios números nos relatórios.' },
          { t: 'Remover', d: 'Segure o botão de remover até completar. O acesso é cortado na hora; os leads continuam na empresa.' },
        ],
        imagem: { src: '/ajuda/equipe.jpg', alt: 'Lista da equipe com os papéis de cada pessoa.' },
      },
    ],
  },
  {
    id: 'integracoes',
    titulo: 'Trazer leads',
    descricao: 'Planilha que você já tem e formulários do site entrando sozinhos.',
    artigos: [
      {
        id: 'importar',
        titulo: 'Importar uma planilha',
        resumo: 'CSV do Excel ou do Google Planilhas, com prévia e sem repetidos.',
        admin: true,
        passos: [
          'Em Integrações › Importar planilha, escolha o arquivo .csv. Se precisar, baixe a planilha modelo.',
          'Em "1. Colunas", confirme o que é cada coluna (Nome, WhatsApp, E-mail, Valor…). O CRM já sugere.',
          'Em "2. Conferir", veja quantos contatos são novos e quais já existem. Os repetidos ficam de fora.',
          'Toque em Importar. Dá para desfazer pelo aviso logo depois.',
        ],
        dica: 'No Excel: Arquivo › Salvar como › CSV UTF-8.',
        imagem: { src: '/ajuda/importar.jpg', alt: 'Importação com as colunas mapeadas e a prévia dos repetidos.' },
      },
      {
        id: 'webhook',
        titulo: 'Leads do site pelo webhook',
        resumo: 'O formulário do site envia os dados e o lead aparece na primeira etapa, na hora.',
        admin: true,
        passos: [
          'Em Integrações › Webhook, copie o endereço da sua empresa.',
          'Passe para quem cuida do site: o formulário envia nome, telefone, e-mail, origem e valor nesse endereço.',
          'Se a pessoa marcar a caixa de autorização, envie também "consentimento": true para registrar a base legal.',
          'Contato repetido (mesmo WhatsApp ou e-mail de um lead em aberto) vai para o histórico do lead existente, sem duplicar.',
        ],
        dica: 'O endereço é secreto: quem tiver ele consegue criar leads na sua empresa.',
        imagem: { src: '/ajuda/webhook.jpg', alt: 'Tela do webhook com o endereço e o exemplo de envio.' },
      },
    ],
  },
  {
    id: 'configuracoes',
    titulo: 'Configurações',
    descricao: 'Marca, funil, mensagens e privacidade. Quase tudo aqui é do administrador.',
    artigos: [
      {
        id: 'marca',
        titulo: 'Marca e ícone do app',
        resumo: 'Nome, cor, logo e imagem de fundo do painel da equipe.',
        admin: true,
        passos: [
          'Em Configurações › Marca, ajuste o nome e a cor e toque em Salvar.',
          'Envie o logo (PNG, JPEG ou WebP). O ícone do app no celular é atualizado junto.',
          'Opcional: uma imagem de fundo ampla e sem texto.',
          'Em "App no celular", veja a prévia do ícone. "Refazer ícone com o logo" serve para logos enviados antes do app existir.',
        ],
        imagem: { src: '/ajuda/marca.jpg', alt: 'Configurações de marca com nome, cor e logo.' },
      },
      {
        id: 'funil',
        titulo: 'Etapas do funil e motivos de perda',
        resumo: 'A ordem das etapas é a ordem das colunas do Kanban. A última conta como venda.',
        admin: true,
        itens: [
          { t: 'Chance', d: 'Probabilidade de fechar quem está na etapa. É ela que calcula o valor provável.' },
          { t: 'Parado após', d: 'Dias sem atividade até o lead ganhar o aviso "parado" e entrar na tela Hoje.' },
          { t: 'Nova etapa', d: 'Escolha a cor, escreva o nome e toque em Adicionar. Para excluir, segure o botão.' },
          { t: 'Motivos de perda', d: 'As opções que aparecem ao marcar um lead como perdido. "Outro" sempre fica disponível.' },
        ],
        imagem: { src: '/ajuda/funil.jpg', alt: 'Etapas do funil com chance e prazo de parado.' },
      },
      {
        id: 'mensagens',
        titulo: 'Mensagens prontas',
        resumo: 'Textos de WhatsApp que a equipe envia com um toque.',
        admin: true,
        passos: [
          'Em Configurações › Mensagens, toque em Nova.',
          'Dê um nome, escolha a etapa em que ela aparece primeiro e escreva o texto.',
          'Use {primeiro_nome}, {nome}, {empresa} e {vendedor}: o texto sai preenchido para cada pessoa. A prévia mostra como chega.',
        ],
        imagem: { src: '/ajuda/mensagens.jpg', alt: 'Editor de mensagem pronta com variáveis e prévia.' },
      },
      {
        id: 'privacidade',
        titulo: 'Privacidade e LGPD',
        resumo: 'Por que cada contato está no CRM, quem acessou e como atender um pedido do titular.',
        itens: [
          { t: 'Base legal', d: 'Na ficha › Privacidade: consentimento (com data), pedido de orçamento ou contrato, legítimo interesse ou obrigação legal.' },
          { t: 'Não contatar', d: 'Quando a pessoa pede para não receber mensagens: o WhatsApp fica bloqueado e ela sai da tela Hoje.' },
          { t: 'Exportar dados (admin)', d: 'Baixa um arquivo com tudo o que o CRM guarda do contato, para enviar a ele.' },
          { t: 'Apagar dados pessoais (admin)', d: 'Remove nome, contatos, CPF/CNPJ e anotações. Os números do funil continuam. Não dá para desfazer.' },
          { t: 'Registro de acessos (admin)', d: 'Em Configurações › Privacidade: quem abriu, exportou ou apagou cada contato. Ninguém altera essas linhas.' },
        ],
        dica: 'A LGPD dá até 15 dias para responder o pedido completo do titular.',
        imagem: { src: '/ajuda/privacidade.jpg', alt: 'Tela Privacidade e LGPD com contadores e o registro de acessos.' },
      },
    ],
  },
  {
    id: 'perguntas',
    titulo: 'Dúvidas frequentes',
    descricao: 'O que mais perguntam ao suporte.',
    artigos: [
      { id: 'faq-nao-vejo-lead', titulo: 'Não estou vendo um lead que existe', resumo: 'Vendedores veem só os leads deles e os sem dono. Peça ao administrador para atribuir o lead a você. Confira também o filtro da Lista: perdidos ficam em Lista › Perdidos.' },
      { id: 'faq-duplicado', titulo: 'Entrou um lead repetido', resumo: 'O CRM barra repetidos pelo mesmo WhatsApp, e-mail ou CPF/CNPJ no cadastro, na importação e no webhook. Se passou um com dados diferentes, marque o repetido como perdido com o motivo "Outro: duplicado".' },
      { id: 'faq-link', titulo: 'O link do convite ou da senha expirou', resumo: 'Na tela de login, toque em "Esqueci a senha" e informe seu e-mail. Chega um link novo.' },
      { id: 'faq-sumiu', titulo: 'Movi um lead errado', resumo: 'Use "Desfazer" no aviso que aparece logo depois. Se já passou, mova de volta pelo menu ⋯ ou reabra a negociação.' },
      { id: 'faq-suporte', titulo: 'Como falo com o suporte?', resumo: 'Pelo WhatsApp da Dons (botão abaixo). Diga o nome da empresa e, se puder, mande um print da tela.' },
    ],
  },
];
