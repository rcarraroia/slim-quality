# Slim Quality - Sistema de Vendas e Afiliados

Sistema completo de e-commerce com programa de afiliados multinível, integração com Asaas e automação via N8N.

## 🚀 Tecnologias

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Banco:** PostgreSQL (Supabase)
- **MCP:** Model Context Protocol para IA
- **Pagamentos:** Asaas API
- **Automação:** N8N + Evolution API

---

## 🏗️ Arquitetura MCP

### **Sistema MCP Operacional:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Gateway   │────│  MCP Supabase   │────│   PostgreSQL    │
│   Port: 8085    │    │   Port: 3005    │    │   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌─────────────────┐
│  Express API    │────│   Frontend      │
│   Port: 3333    │    │   Port: 5173    │
└─────────────────┘    └─────────────────┘
```

### **Portas Configuradas:**
- **MCP Gateway:** 8085
- **MCP Supabase:** 3005  
- **Redis:** 6379
- **Express API:** 3333
- **Frontend:** 5173

---

## 🛠️ Como Rodar o Projeto

### **Pré-requisitos:**
- Node.js 18+ & npm
- Docker & Docker Compose
- Supabase CLI

### **1. Clonar e Instalar:**
```bash
git clone <YOUR_GIT_URL>
cd slim-quality
npm install
```

### **2. Configurar Variáveis:**
```bash
cp .env.example .env
# Editar .env com suas credenciais
```

### **3. Iniciar MCP (Obrigatório):**
```bash
cd agent
docker-compose up -d mcp-gateway mcp-supabase redis
```

### **4. Iniciar Aplicação:**
```bash
# Terminal 1: Backend
npm run server

# Terminal 2: Frontend  
npm run dev
```

---

## 📡 Endpoints MCP

### **MCP Gateway (8085):**
- `GET /health` - Status do sistema
- `GET /tools` - Tools disponíveis
- `POST /execute` - Executar tool

### **MCP Supabase (3005):**
- `GET /health` - Status conexão
- `GET /tools` - Tools Supabase
- `POST /execute` - Query database

### **Tools Disponíveis:**
- `query_database` - Query genérica
- `get_products` - Listar produtos
- `insert_lead` - Inserir lead
- `update_record` - Atualizar registro

---

## 🗄️ Banco de Dados

### **Tabelas Principais:**
- **products** (19 campos) - Catálogo de produtos
- **customers** (21 campos) - Base de clientes
- **orders** - Pedidos e vendas
- **affiliates** - Rede de afiliados
- **conversations** - Chat e atendimento

### **Migrations:**
```bash
supabase migration list
supabase db push
```

---

## 🔧 Desenvolvimento

### **Scripts Disponíveis:**
```bash
npm run dev          # Frontend (Vite)
npm run server       # Backend (Express)
npm run build        # Build produção
npm run preview      # Preview build
```

### **Docker MCP:**
```bash
cd agent
docker-compose build    # Build containers
docker-compose up -d    # Iniciar serviços
docker-compose logs     # Ver logs
docker-compose down     # Parar serviços
```

---

## 📋 Status do Projeto

### ✅ **Bloco 0 - MCP Operacional (CONCLUÍDO)**
- MCP Gateway funcionando
- MCP Supabase integrado
- Schemas validados
- Storage configurado

### 🔄 **Sprint 5.5 - Queries e Imagens (EM ANDAMENTO)**
- Bloco 1: Queries inteligentes
- Bloco 2: Preços dinâmicos  
- Bloco 3: Envio de imagens

---

## 🌐 URLs Importantes

- **Frontend:** http://localhost:5173
- **Backend:** http://localhost:3333
- **MCP Gateway:** http://localhost:8085
- **Dashboard MCP:** http://localhost:5173/dashboard/agente/mcp

---

## 📚 Documentação

- `BLOCO_0_COMPLETO.md` - Arquitetura MCP
- `.kiro/steering/` - Regras de desenvolvimento
- `docs/` - Documentação técnica

---

## 🤝 Contribuição

Este projeto segue padrões rigorosos de desenvolvimento:
- Análise preventiva obrigatória
- Máximo 55min por task
- Evidências documentadas
- Testes funcionais

---

**Projeto:** Slim Quality  
**Status:** Desenvolvimento Ativo  
**Última Atualização:** 02/01/2026
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8889ffaf-97e0-4bb3-99da-1933727a3973) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
