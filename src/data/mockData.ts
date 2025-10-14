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
    ultimaMensagem: "Pode enviar o link de pagamento? Quero o modelo Casal com PIX.",
    status: "negociando" as const,
    hora: "08:42",
    tags: ["Modelo Casal", "Pagamento"],
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
    ultimaMensagem: "Tenho interesse no modelo Casal. Meu marido tem problemas de circulação.",
    status: "ativa" as const,
    hora: "Ontem",
    tags: ["Modelo Casal", "Circulação"],
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
    valor: 4290,
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
    produto: "Slim Quality Casal",
    valor: 3690,
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
    valor: 2990,
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
    valor: 4290,
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
    produto: "Slim Quality Casal",
    valor: 3690,
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
    preco: 2990,
    descricao: "Ideal para moradores de apartamentos compactos e quartos de solteiro",
    estoque: 28,
    vendasMes: 15,
    maisVendido: false,
    ativo: true,
    imagem: ""
  },
  {
    id: 2,
    nome: "Slim Quality Casal Padrão",
    dimensoes: { largura: 138, comprimento: 188, altura: 28 },
    preco: 3690,
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
    preco: 4290,
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
