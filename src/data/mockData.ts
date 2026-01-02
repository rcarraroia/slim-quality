// Mock data para o dashboard

export const mockConversas = [
  {
    id: 1,
    nome: "Maria Silva",
    avatar: "",
    ultimaMensagem: "Gostaria de saber sobre o modelo Queen. Sofro com dores na lombar há anos...",
    status: "ativa" as const,
    hora: "10:34",
    tags: ["Dor na Coluna", "Modelo Queen"],
    problema: "Dores na Lombar"
  },
  {
    id: 2,
    nome: "João Pereira",
    avatar: "",
    ultimaMensagem: "Qual a garantia do colchão? E vocês fazem entrega em quanto tempo?",
    status: "aguardando" as const,
    hora: "09:15",
    tags: ["Garantia", "Entrega"],
    problema: "Dúvidas Gerais"
  },
  {
    id: 3,
    nome: "Ana Costa",
    avatar: "",
    ultimaMensagem: "Pode enviar o link de pagamento? Quero o modelo Padrão com PIX.",
    status: "negociando" as const,
    hora: "08:42",
    tags: ["Modelo Padrão", "Pagamento"],
    problema: "Negociação"
  },
  {
    id: 4,
    nome: "Carlos Santos",
    avatar: "",
    ultimaMensagem: "Vocês entregam em Belo Horizonte? Quanto fica o frete?",
    status: "ativa" as const,
    hora: "Ontem",
    tags: ["Entrega", "Frete"],
    problema: "Logística"
  },
  {
    id: 5,
    nome: "Beatriz Lima",
    avatar: "",
    ultimaMensagem: "Tenho interesse no modelo Padrão. Meu marido tem problemas de circulação.",
    status: "ativa" as const,
    hora: "Ontem",
    tags: ["Modelo Padrão", "Circulação"],
    problema: "Má Circulação"
  },
  {
    id: 6,
    nome: "Roberto Souza",
    avatar: "",
    ultimaMensagem: "Sofro de insônia crônica. O colchão realmente ajuda?",
    status: "ativa" as const,
    hora: "Ontem",
    tags: ["Insônia"],
    problema: "Insônia"
  },
  {
    id: 7,
    nome: "Fernanda Costa",
    avatar: "",
    ultimaMensagem: "Qual a diferença entre Queen e King? Nosso quarto tem 3,5m.",
    status: "aguardando" as const,
    hora: "Há 2 dias",
    tags: ["Queen", "King"],
    problema: "Dúvida sobre Tamanho"
  },
  {
    id: 8,
    nome: "Paulo Santos",
    avatar: "",
    ultimaMensagem: "Comprei semana passada. Quando chega?",
    status: "finalizada" as const,
    hora: "Há 2 dias",
    tags: ["Pós-venda"],
    problema: "Acompanhamento"
  }
];

export const mockVendas = [
  {
    id: 1047,
    data: "12/Out/25",
    cliente: "Maria Silva",
    produto: "Slim Quality Queen",
    valor: 3490, // Novo preço Queen
    pagamento: "12x Cartão",
    status: "pago" as const,
    email: "maria.silva@email.com",
    telefone: "(31) 99999-9999",
    cidade: "Belo Horizonte - MG",
    dimensoes: "158x198x28cm",
    endereco: "Rua das Flores, 123 - Savassi"
  },
  {
    id: 1046,
    data: "12/Out/25",
    cliente: "Roberto Lima",
    produto: "Slim Quality Padrão", // Renomeado
    valor: 3290, // Novo preço Padrão
    pagamento: "PIX",
    status: "pendente" as const,
    email: "roberto.lima@email.com",
    telefone: "(11) 98888-8888",
    cidade: "São Paulo - SP",
    dimensoes: "138x188x28cm",
    endereco: "Av. Paulista, 1000 - Bela Vista"
  },
  {
    id: 1045,
    data: "11/Out/25",
    cliente: "Fernanda Costa",
    produto: "Slim Quality King",
    valor: 4890,
    pagamento: "12x Cartão",
    status: "pago" as const,
    email: "fernanda.costa@email.com",
    telefone: "(21) 97777-7777",
    cidade: "Rio de Janeiro - RJ",
    dimensoes: "193x203x28cm",
    endereco: "Rua Ipanema, 456 - Copacabana"
  },
  {
    id: 1044,
    data: "11/Out/25",
    cliente: "Paulo Santos",
    produto: "Slim Quality Solteiro",
    valor: 3190, // Novo preço Solteiro
    pagamento: "À vista",
    status: "pago" as const,
    email: "paulo.santos@email.com",
    telefone: "(31) 96666-6666",
    cidade: "Belo Horizonte - MG",
    dimensoes: "88x188x28cm",
    endereco: "Rua da Paz, 789 - Centro"
  },
  {
    id: 1043,
    data: "10/Out/25",
    cliente: "Juliana Rocha",
    produto: "Slim Quality Queen",
    valor: 3490, // Novo preço Queen
    pagamento: "10x Cartão",
    status: "enviado" as const,
    email: "juliana.rocha@email.com",
    telefone: "(31) 95555-5555",
    cidade: "Contagem - MG",
    dimensoes: "158x198x28cm",
    endereco: "Av. Brasil, 321 - Industrial"
  },
  {
    id: 1042,
    data: "10/Out/25",
    cliente: "André Oliveira",
    produto: "Slim Quality Padrão", // Renomeado
    valor: 3290, // Novo preço Padrão
    pagamento: "6x Cartão",
    status: "pago" as const,
    email: "andre.oliveira@email.com",
    telefone: "(11) 94444-4444",
    cidade: "Campinas - SP",
    dimensoes: "138x188x28cm",
    endereco: "Rua Campinas, 654 - Centro"
  }
];

export const mockProdutos = [
  {
    id: 1,
    nome: "Slim Quality Solteiro",
    dimensoes: { largura: 88, comprimento: 188, altura: 28 },
    preco: 3190, // Novo preço
    descricao: "Ideal para moradores de apartamentos compactos e quartos de solteiro",
    estoque: 28,
    vendasMes: 15,
    maisVendido: false,
    ativo: true,
    imagem: ""
  },
  {
    id: 2,
    nome: "Slim Quality Padrão", // Renomeado
    dimensoes: { largura: 138, comprimento: 188, altura: 28 },
    preco: 3290, // Novo preço
    descricao: "Casais em quartos padrão, máximo custo-benefício",
    estoque: 42,
    vendasMes: 87,
    maisVendido: true,
    ativo: true,
    imagem: ""
  },
  {
    id: 3,
    nome: "Slim Quality Queen",
    dimensoes: { largura: 158, comprimento: 198, altura: 28 },
    preco: 3490, // Novo preço
    descricao: "Casais que valorizam mais espaço para dormir confortavelmente",
    estoque: 31,
    vendasMes: 54,
    maisVendido: false,
    ativo: true,
    imagem: ""
  },
  {
    id: 4,
    nome: "Slim Quality King",
    dimensoes: { largura: 193, comprimento: 203, altura: 28 },
    preco: 4890,
    descricao: "Quem busca máximo luxo, conforto e espaço disponível",
    estoque: 18,
    vendasMes: 32,
    maisVendido: false,
    ativo: true,
    imagem: ""
  }
];

// Mock data para Afiliados
export const mockAfiliados = [
  {
    id: "A001",
    nome: "Carlos Mendes",
    email: "carlos.mendes@email.com",
    totalComissoes: 12450.00,
    saldoDisponivel: 3200.00,
  }
];

// Mock data para Clientes (Fase 4)
export const mockClientes = [
  {
    id: 347,
    nome: "Maria Silva",
    email: "maria@email.com",
    telefone: "(31) 99999-8888",
    cidade: "Belo Horizonte - MG",
    status: "ativo" as const,
    origem: "Site",
    ultimaCompra: "12/Out/25",
    ltv: 3490, // Atualizado
    cpf: "123.456.789-00",
    dataNascimento: "1985-03-15",
    endereco: "Rua das Flores, 123 - Savassi",
    compras: [
      { data: "12/Out/25", produto: "Queen", valor: 3490, status: "Entregue" }
    ],
    observacoes: "Cliente VIP - gosta de contato via WhatsApp."
  },
  {
    id: 348,
    nome: "João Lima",
    email: "joao@email.com",
    telefone: "(11) 98888-7777",
    cidade: "São Paulo - SP",
    status: "ativo" as const,
    origem: "Afiliado",
    ultimaCompra: "10/Out/25",
    ltv: 8180, // 4890 (King) + 3290 (Padrão)
    cpf: "987.654.321-00",
    dataNascimento: "1990-05-20",
    endereco: "Av. Paulista, 1000 - Bela Vista",
    compras: [
      { data: "10/Out/25", produto: "King", valor: 4890, status: "Entregue" },
      { data: "01/Jan/25", produto: "Padrão", valor: 3290, status: "Entregue" } // Atualizado
    ],
    observacoes: "Cliente de recompra. Interesse em upgrade para King."
  },
  {
    id: 349,
    nome: "Ana Costa",
    email: "ana@email.com",
    telefone: "(21) 97777-6666",
    cidade: "Rio de Janeiro - RJ",
    status: "inativo" as const,
    origem: "WhatsApp",
    ultimaCompra: "15/Ago/25",
    ltv: 3290, // Atualizado
    cpf: "111.222.333-44",
    dataNascimento: "1995-11-01",
    endereco: "Rua Ipanema, 456 - Copacabana",
    compras: [
      { data: "15/Ago/25", produto: "Padrão", valor: 3290, status: "Entregue" } // Atualizado
    ],
    observacoes: "Sem interação há 60 dias. Enviar oferta de reativação."
  },
  {
    id: 350,
    nome: "Carlos Santos",
    email: "carlos@email.com",
    telefone: "(31) 96666-5555",
    cidade: "Contagem - MG",
    status: "lead" as const,
    origem: "Site",
    ultimaCompra: "-",
    ltv: 0,
    cpf: "",
    dataNascimento: "",
    endereco: "",
    compras: [],
    observacoes: "Lead frio. Interagiu com a página de Queen."
  },
];

// Mock data para Agendamentos (Fase 4)
export const mockAgendamentos = [
  {
    id: 1,
    tipo: "Ligação" as const,
    data: "2025-10-17",
    hora: "14:00",
    cliente: "Maria Silva",
    assunto: "Follow-up pós-venda Queen",
    responsavel: "João Admin",
    status: "pendente" as const,
  },
  {
    id: 2,
    tipo: "Reunião" as const,
    data: "2025-10-18",
    hora: "10:00",
    cliente: "João Lima",
    assunto: "Apresentação linha King",
    responsavel: "Vendedor 1",
    status: "pendente" as const,
  },
  {
    id: 3,
    tipo: "WhatsApp" as const,
    data: "2025-10-18",
    hora: "15:30",
    cliente: "Ana Costa",
    assunto: "Interesse em trocar Padrão por Queen", // Atualizado
    responsavel: "João Admin",
    status: "pendente" as const,
  },
  {
    id: 4,
    tipo: "Lembrete" as const,
    data: "2025-10-16",
    hora: "09:00",
    cliente: "Equipe",
    assunto: "Reunião semanal de vendas",
    responsavel: "João Admin",
    status: "concluido" as const,
  },
];

// Mock data para Usuários (Fase 4) - REMOVIDO - Agora usa dados reais do Supabase
// Os usuários agora são gerenciados através da tabela 'profiles' no Supabase
// Super Admin: rcarrarocoach@gmail.com
export const mockUsers: any[] = []; // Array vazio - dados reais vêm do Supabase