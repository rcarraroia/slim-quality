# 🛏️ Slim Quality - Sistema de Vendas e Afiliados

Sistema completo de e-commerce de colchões magnéticos terapêuticos com programa de afiliados multinível.

## 📋 Sobre o Projeto

Slim Quality é uma plataforma de vendas consultivas de colchões magnéticos terapêuticos, com foco em resolver problemas de saúde através de tecnologia avançada. O sistema inclui:

- **E-commerce consultivo** (não transacional)
- **Sistema de afiliados multinível** (3 níveis)
- **Split automático de comissões** via Asaas
- **Integração com BIA** (assistente IA via N8N)
- **Dashboard para afiliados**

## 🏗️ Arquitetura

- **Backend:** Node.js 18+ + TypeScript 5.x + Express 4.x
- **Database:** PostgreSQL 15.x (via Supabase)
- **Pagamentos:** Asaas (PIX + Cartão)
- **Automação:** N8N
- **Mensageria:** WhatsApp Business API

## 🚀 Como Começar

### Pré-requisitos

- Node.js 18.x ou superior
- npm 9.x ou superior
- Supabase CLI instalado e configurado
- Conta no Supabase

### Instalação

1. **Clone o repositório**
```bash
git clone [url-do-repositorio]
cd slim-quality
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# Copie o template
cp .env.example .env

# Edite o .env com suas credenciais
# Consulte docs/SUPABASE_CREDENTIALS.md para obter as credenciais
```

4. **Aplique as migrations**
```bash
npm run db:push
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O servidor estará rodando em `http://localhost:3000`

## 📝 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia servidor com hot-reload
npm run build            # Compila TypeScript para JavaScript
npm run start            # Executa versão compilada

# Qualidade de Código
npm run lint             # Verifica código com ESLint
npm run lint:fix         # Corrige problemas do ESLint automaticamente
npm run format           # Formata código com Prettier
npm run format:check     # Verifica formatação sem modificar
npm run type-check       # Verifica tipos TypeScript

# Testes
npm test                 # Executa testes
npm run test:coverage    # Executa testes com cobertura

# Banco de Dados
npm run db:push          # Aplica migrations
npm run db:reset         # Reseta banco de dados
npm run db:dump          # Exporta schema do banco
```

## 📁 Estrutura do Projeto

```
slim-quality-backend/
├── src/
│   ├── api/              # Rotas, controllers, middlewares
│   ├── services/         # Lógica de negócio
│   ├── types/            # Tipos TypeScript
│   ├── utils/            # Utilitários (logger, etc)
│   ├── config/           # Configurações
│   └── server.ts         # Ponto de entrada
├── supabase/
│   ├── migrations/       # Migrations SQL
│   └── functions/        # Edge Functions
├── tests/                # Testes
├── docs/                 # Documentação
└── .kiro/                # Specs e steering files
```

## 📁 Estrutura do Projeto

```
slim-quality/
├── .kiro/
│   └── steering/          # Documentação de contexto para Kiro AI
│       ├── product.md     # Regras de negócio
│       ├── structure.md   # Arquitetura técnica
│       └── tech.md        # Stack e padrões
├── docs/
│   └── SUPABASE_ACCESS.md # Guia de acesso ao banco
├── src/
│   ├── components/        # Componentes React
│   ├── pages/            # Páginas da aplicação
│   ├── layouts/          # Layouts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Bibliotecas e utilitários
│   └── data/             # Dados estáticos
├── public/               # Assets públicos
└── .env.example          # Template de variáveis de ambiente
```

## 🚀 Como Começar

### 1. Clonar o Repositório
```bash
git clone [url-do-repositorio]
cd slim-quality
```

### 2. Instalar Dependências
```bash
npm install
```

### 3. Configurar Variáveis de Ambiente
```bash
# Copiar template
cp .env.example .env

# Editar .env com suas credenciais
# Consulte docs/SUPABASE_ACCESS.md para obter as credenciais
```

### 4. Executar em Desenvolvimento
```bash
npm run dev
```

## 📚 Documentação

### Steering Files (Contexto do Projeto)

Os arquivos em `.kiro/steering/` contêm toda a documentação de contexto do projeto:

- **product.md** - Regras de negócio, sistema de comissões, fluxos de venda
- **structure.md** - Arquitetura do sistema, banco de dados, fluxos críticos
- **tech.md** - Stack técnica, padrões de código, boas práticas

### Guias Técnicos

- **docs/SUPABASE_ACCESS.md** - Como configurar e acessar o Supabase

## 💰 Sistema de Comissões

O sistema implementa split automático de 30% do valor da venda:

- **15%** → Afiliado N1 (vendedor direto)
- **3%** → Afiliado N2 (indicado do N1)
- **2%** → Afiliado N3 (indicado do N2)
- **5%** → Renum (gestor)
- **5%** → JB (gestor)

**Redistribuição:** Quando não há rede completa, os percentuais não utilizados são redistribuídos para os gestores.

## 🛏️ Produtos

| Modelo | Dimensões | Preço |
|--------|-----------|-------|
| Solteiro | 88x188x28cm | R$ 3.190,00 |
| Padrão | 138x188x28cm | R$ 3.290,00 |
| Queen | 158x198x30cm | R$ 3.490,00 |
| King | 193x203x30cm | R$ 4.890,00 |

## 🔐 Segurança

- **RLS (Row Level Security)** ativo em todas as tabelas
- **Validação de entrada** com Zod
- **Rate limiting** em endpoints críticos
- **Credenciais** nunca commitadas (ver .gitignore)

## 🧪 Testes

```bash
# Executar testes
npm run test

# Testes com cobertura
npm run test:coverage
```

## 📦 Build

```bash
# Build para produção
npm run build

# Preview do build
npm run preview
```

## 🤝 Contribuindo

1. Consulte os steering files antes de fazer alterações
2. Siga os padrões definidos em `tech.md`
3. Execute testes antes de commitar
4. Nunca commite credenciais

## 📞 Contato

**Gestores:**
- Renum: [a definir]
- JB: [a definir]

**Técnico:**
- Kiro AI + Equipe Backend

---

**Desenvolvido com ❤️ para revolucionar o sono e a saúde**
