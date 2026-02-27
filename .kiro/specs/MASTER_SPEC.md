# MASTER SPEC - Sistema de Afiliados Individual/Logista
## Slim Quality - Especificação Mestre do Projeto

**Versão:** 1.0  
**Data de Criação:** 24/02/2026  
**Status:** Ativo  
**Projeto:** Slim Quality - Expansão do Sistema de Afiliados

---

## 📋 ÍNDICE

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Contexto de Negócio](#contexto-de-negócio)
3. [Glossário Completo](#glossário-completo)
4. [Regras de Negócio Globais](#regras-de-negócio-globais)
5. [Decisões Arquiteturais](#decisões-arquiteturais)
6. [As 5 Etapas do Projeto](#as-5-etapas-do-projeto)
7. [Dependências Entre Etapas](#dependências-entre-etapas)
8. [Riscos e Mitigações](#riscos-e-mitigações)

---

## 🎯 VISÃO GERAL DO PROJETO

### Objetivo Principal

Expandir o sistema de afiliados do Slim Quality para suportar dois perfis distintos de afiliados:

- **Individual**: Pessoa física revendedora (perfil atual)
- **Logista**: Loja física parceira (novo perfil)

### Motivação

O sistema atual suporta apenas afiliados individuais (pessoas físicas). A expansão para incluir lojistas físicos permitirá:

1. Ampliar a rede de distribuição através de lojas físicas parceiras
2. Criar uma vitrine pública de descoberta de lojistas
3. Oferecer produtos exclusivos para o perfil Logista
4. Implementar sistema de monetização diferenciado (mensalidade para Logistas)
5. Manter controle financeiro rigoroso através de status de wallet

### Escopo Total

O projeto está dividido em 5 etapas sequenciais e interdependentes:

1. **ETAPA 1**: Base de dados e tipos de afiliados
2. **ETAPA 2**: Configuração financeira (Wallet)
3. **ETAPA 3**: Categoria Show Row (produtos exclusivos)
4. **ETAPA 4**: Perfil da loja e vitrine pública
5. **ETAPA 5**: Monetização (adesão e mensalidade)


---

## 🏢 CONTEXTO DE NEGÓCIO

### Sobre o Slim Quality

**Segmento:** E-commerce de colchões magnéticos terapêuticos  
**Modelo:** B2C + Sistema de Afiliados Multinível (3 níveis)  
**Proposta de Valor:** Venda consultiva focada em resolver problemas de saúde

### Produtos Principais

| Modelo | Preço | Público-Alvo |
|--------|-------|--------------|
| Solteiro | R$ 3.190,00 | Uso individual |
| Padrão | R$ 3.290,00 | Casal (mais vendido) |
| Queen | R$ 3.490,00 | Casal conforto |
| King | R$ 4.890,00 | Casal premium |

### Sistema de Comissões Atual

**Estrutura de Split (30% do valor da venda):**

- 70% → Fábrica (Slim Quality)
- 30% → Sistema de Comissões:
  - 15% → Afiliado N1 (vendedor direto)
  - 3% → Afiliado N2 (indicado do N1)
  - 2% → Afiliado N3 (indicado do N2)
  - 5% → Renum (gestor)
  - 5% → JB (gestor)

**Regra de Redistribuição:** Quando não há rede completa, os percentuais não utilizados são redistribuídos igualmente entre Renum e JB.

### Integração Asaas

**Gateway de Pagamento:** Asaas  
**Funcionalidades:**
- Recebimento de pagamentos (PIX e Cartão)
- Split automático de comissões
- Gestão de Wallet IDs dos afiliados

**Wallet IDs:**
- Cada participante tem uma Wallet ID única no Asaas
- Fábrica, Renum e JB têm Wallet IDs fixas
- Afiliados fornecem suas Wallet IDs no cadastro


---

## 📖 GLOSSÁRIO COMPLETO

### Termos de Negócio

- **Affiliate (Afiliado)**: Usuário cadastrado no programa de afiliados do Slim Quality
- **Individual**: Tipo de afiliado pessoa física que revende produtos
- **Logista**: Tipo de afiliado loja física parceira que revende produtos
- **Wallet**: Carteira digital do Asaas para recebimento de comissões
- **Wallet ID**: Identificador único da carteira no Asaas (formato: `wal_XXXXX`)
- **Split**: Divisão automática do pagamento entre múltiplas carteiras
- **N1, N2, N3**: Níveis da rede de afiliados (N1 = direto, N2 = indicado do N1, N3 = indicado do N2)
- **Renum e JB**: Gestores do sistema que recebem comissões fixas
- **BIA**: Assistente IA que conduz negociações via WhatsApp/N8N

### Termos Técnicos

- **Affiliate_Type**: Campo ENUM com valores 'individual' ou 'logista'
- **Financial_Status**: Campo ENUM com valores 'financeiro_pendente' ou 'ativo'
- **Product_Category**: Campo ENUM de categorias de produtos
- **Show_Row**: Categoria de produto exclusiva para Logistas
- **CNPJ**: Cadastro Nacional de Pessoa Jurídica (14 dígitos)
- **CPF**: Cadastro de Pessoa Física (11 dígitos)
- **RLS**: Row Level Security (políticas de segurança do Supabase)
- **Migration**: Script SQL para alteração de estrutura do banco de dados
- **PostGIS**: Extensão do PostgreSQL para dados geoespaciais
- **Geocodificação**: Conversão de endereço em coordenadas lat/lng
- **API CEP Aberto**: API gratuita para geocodificação via CEP

### Termos de Arquitetura

- **Supabase**: Plataforma de banco de dados PostgreSQL hospedado
- **Vercel Serverless Functions**: Backend em JavaScript/ESM na pasta `/api`
- **React/Vite**: Framework frontend
- **shadcn/ui**: Biblioteca de componentes UI
- **Asaas API**: API do gateway de pagamento


---

## ⚖️ REGRAS DE NEGÓCIO GLOBAIS

### RN-01: Status Financeiro do Afiliado

**Regra:** Todo afiliado possui um status financeiro que controla sua participação no sistema.

**Estados:**
- `financeiro_pendente`: Cadastrado mas sem wallet configurada
- `ativo`: Wallet configurada e pronto para operar

**Comportamentos:**

1. **QUANDO** afiliado é cadastrado, **ENTÃO** status = `financeiro_pendente`
2. **QUANDO** afiliado configura wallet com sucesso, **ENTÃO** status muda para `ativo`
3. **QUANDO** status = `financeiro_pendente`, **ENTÃO**:
   - Não participa de split de comissões
   - Não tem link de indicação liberado
   - Vê mensagem orientando configuração de wallet
4. **QUANDO** status = `ativo`, **ENTÃO**:
   - Participa de split de comissões
   - Link de indicação liberado
   - Acesso completo ao painel

**Aplicável a:** Todos os afiliados (Individual e Logista)

---

### RN-02: Tipos de Afiliado

**Regra:** O sistema suporta dois tipos distintos de afiliados com funcionalidades específicas.

**Tipos:**
- `individual`: Pessoa física revendedora
- `logista`: Loja física parceira

**Diferenças:**

| Característica | Individual | Logista |
|----------------|-----------|---------|
| Documento | CPF (11 dígitos) | CNPJ (14 dígitos) |
| Produtos Show Row | ❌ Sem acesso | ✅ Acesso completo |
| Perfil de Loja | ❌ Não tem | ✅ Tem |
| Vitrine Pública | ❌ Não aparece | ✅ Pode aparecer |
| Mensalidade | ❌ Não paga | ✅ Paga mensalidade |
| Taxa de Adesão | ✅ Paga | ✅ Paga |

**Aplicável a:** Todo o sistema

---

### RN-03: Validação de Documentos

**Regra:** Documentos (CPF/CNPJ) devem ser validados antes de aceitar cadastro.

**Validações Obrigatórias:**

1. **CPF (Individual):**
   - Exatamente 11 dígitos numéricos
   - Dígitos verificadores válidos
   - Não pode ter todos os dígitos iguais (ex: 111.111.111-11)

2. **CNPJ (Logista):**
   - Exatamente 14 dígitos numéricos
   - Dígitos verificadores válidos
   - Não pode ter todos os dígitos iguais (ex: 11.111.111/1111-11)

3. **Unicidade:**
   - Cada documento só pode ser cadastrado uma vez no sistema

**Aplicável a:** Cadastro de afiliados (ETAPA 1)


---

### RN-04: Configuração de Wallet

**Regra:** Afiliados devem configurar sua Wallet ID do Asaas para receber comissões.

**Dois Fluxos Disponíveis:**

1. **Fluxo 1 - "Já tenho conta Asaas":**
   - Afiliado informa Wallet ID manualmente
   - Sistema valida formato (wal_XXXXX)
   - Wallet ID salva no banco

2. **Fluxo 2 - "Criar conta Asaas":**
   - Afiliado preenche formulário com dados obrigatórios
   - Sistema chama API Asaas `/v3/accounts`
   - Wallet ID retornada é salva automaticamente

**Campos Obrigatórios (Fluxo 2):**
- Nome, Email, CPF ou CNPJ
- Celular, Renda/Faturamento mensal
- Endereço, Número, Bairro, CEP

**Comportamento Pós-Configuração:**
- Status muda automaticamente de `financeiro_pendente` para `ativo`
- Link de indicação é liberado
- Afiliado passa a participar de splits

**Aplicável a:** Todos os afiliados (ETAPA 2)

---

### RN-05: Acesso à Categoria Show Row

**Regra:** Produtos da categoria Show Row são exclusivos para afiliados Logistas.

**Controle de Acesso em 3 Camadas:**

1. **Layout (Menu):**
   - Verificar `affiliate_type = 'logista'` antes de exibir item no menu
   - Verificar se existe pelo menos 1 produto ativo na categoria

2. **Página:**
   - Validar tipo de afiliado ao carregar
   - Redirecionar se não for Logista

3. **RLS (Banco de Dados):**
   - Política de segurança impede query de produtos `show_row` para afiliados não Logistas

**Comportamentos:**

- **QUANDO** `affiliate_type = 'individual'`, **ENTÃO**:
  - Menu Show Row não aparece
  - Página Show Row redireciona
  - Query de produtos Show Row retorna vazio

- **QUANDO** `affiliate_type = 'logista'`, **ENTÃO**:
  - Menu Show Row aparece (se houver produtos ativos)
  - Página Show Row carrega normalmente
  - Query de produtos Show Row retorna dados

**Aplicável a:** Categoria Show Row (ETAPA 3)


---

### RN-06: Visibilidade na Vitrine Pública

**Regra:** Logistas podem aparecer na vitrine pública se atenderem requisitos mínimos.

**Requisitos para Aparecer:**

1. `affiliate_type = 'logista'`
2. Switch "Aparecer na Vitrine" = ativado
3. Perfil minimamente preenchido:
   - Nome da Loja (obrigatório)
   - Cidade (obrigatório)
   - Estado (obrigatório)
   - Banner (obrigatório)

**Comportamentos:**

- **Logista novo:** Switch desativado por padrão (invisível)
- **Sem banner:** Não pode ativar switch
- **Inadimplente:** Switch desativado automaticamente

**Aplicável a:** Vitrine pública (ETAPA 4)

---

### RN-07: Monetização e Inadimplência

**Regra:** Sistema cobra taxa de adesão e mensalidade com controle de inadimplência.

**Cobranças:**

1. **Taxa de Adesão:**
   - Cobrada de TODOS os afiliados (Individual e Logista)
   - No momento do cadastro
   - Valor configurável pelo admin
   - Sem pagamento = cadastro não concluído

2. **Mensalidade Recorrente:**
   - Cobrada APENAS de Logistas
   - Referente ao benefício da vitrine pública
   - Valor configurável pelo admin
   - Integração com Asaas para cobrança

**Controle de Inadimplência:**

- **QUANDO** Logista fica inadimplente, **ENTÃO**:
  - Switch "Aparecer na Vitrine" desativado automaticamente
  - Logista desaparece da vitrine pública
  - Acesso ao painel mantido (pode regularizar)

- **QUANDO** Logista regulariza pagamento, **ENTÃO**:
  - Pode reativar switch manualmente
  - Volta a aparecer na vitrine

**Comissionamento:**
- Taxa de adesão e mensalidades são receitas comissionáveis
- Regras específicas de comissionamento serão definidas antes da implementação da ETAPA 5

**Aplicável a:** Sistema de monetização (ETAPA 5)


---

## 🏗️ DECISÕES ARQUITETURAIS

### DA-01: Backend em Vercel Serverless Functions

**Decisão:** Todo o backend usa Vercel Serverless Functions em JavaScript/ESM.

**Detalhes:**
- **Localização:** Pasta `/api` na raiz do projeto
- **Formato:** JavaScript/ESM (NÃO TypeScript)
- **Padrão:** Cada arquivo é uma Serverless Function independente
- **Roteamento:** Via query parameter `action`
- **CORS:** Configurado em cada função
- **Referência:** `api/affiliates.js` é o padrão obrigatório

**Justificativa:**
- Deploy automático via Git push
- Escalabilidade automática
- Sem necessidade de gerenciar servidores
- Integração nativa com Vercel

**Impacto:** Todas as novas rotas de API devem seguir este padrão.

---

### DA-02: Banco de Dados Supabase PostgreSQL

**Decisão:** Usar Supabase como plataforma de banco de dados.

**Detalhes:**
- **SGBD:** PostgreSQL 15.x
- **Plataforma:** Supabase (hospedado)
- **Project ID:** vtynmmtuvxreiwcxxlma
- **Segurança:** Row Level Security (RLS) em todas as tabelas
- **Migrations:** Versionadas em `supabase/migrations/`

**Extensões Habilitadas:**
- PostGIS (para geolocalização na ETAPA 4)

**Justificativa:**
- PostgreSQL robusto e confiável
- RLS para segurança granular
- PostGIS para funcionalidades geoespaciais
- Supabase facilita gestão e backups

**Impacto:** Todas as alterações de schema devem ser via migrations SQL.

---

### DA-03: Padrão "Agente IA" para Categoria Show Row

**Decisão:** Categoria Show Row segue exatamente o padrão da categoria `ferramenta_ia` (Agente IA).

**Detalhes:**
- **Controle de Visibilidade:** 3 camadas (Layout, Página, RLS)
- **Lógica de Menu:** Verificar tipo de afiliado + existência de produtos ativos
- **Redirecionamento:** Página redireciona se acesso não autorizado
- **RLS:** Política impede query não autorizada

**Justificativa:**
- Padrão já testado e funcionando
- Consistência na arquitetura
- Reduz risco de bugs
- Facilita manutenção

**Impacto:** ETAPA 3 deve replicar exatamente a implementação de `ferramenta_ia`.


---

### DA-04: PostGIS para Geolocalização

**Decisão:** Usar extensão PostGIS do Supabase para funcionalidades geoespaciais.

**Detalhes:**
- **Extensão:** PostGIS (habilitar se não estiver ativa)
- **Geocodificação:** API CEP Aberto (gratuita, retorna lat/lng pelo CEP)
- **Armazenamento:** Coordenadas lat/lng salvas no banco
- **Busca por Raio:** Função `ST_Distance` do PostGIS

**Fluxo de Geocodificação:**
1. Logista preenche endereço no painel
2. Sistema extrai CEP do endereço
3. Chama API CEP Aberto com o CEP
4. Recebe lat/lng da API
5. Salva coordenadas no banco

**Busca por Raio:**
- Usa `ST_Distance` para calcular distância entre pontos
- Ordena resultados por proximidade
- Raios disponíveis: 25km / 50km / 100km / 200km / Todo Brasil

**Justificativa:**
- PostGIS é padrão da indústria para dados geoespaciais
- API CEP Aberto é gratuita e confiável
- Performance superior a cálculos em JavaScript

**Impacto:** ETAPA 4 depende de PostGIS habilitado no Supabase.

---

### DA-05: Dois Fluxos de Configuração de Wallet

**Decisão:** Oferecer dois fluxos independentes para configuração de Wallet ID.

**Fluxos:**

1. **Fluxo Manual ("Já tenho conta Asaas"):**
   - Afiliado informa Wallet ID manualmente
   - Sistema valida formato
   - Salva no banco

2. **Fluxo Automático ("Criar conta Asaas"):**
   - Afiliado preenche formulário
   - Sistema cria subconta via API Asaas
   - Wallet ID retornada é salva automaticamente

**Justificativa:**
- Flexibilidade para afiliados que já têm conta Asaas
- Facilita onboarding para novos afiliados
- Reduz fricção no cadastro
- Não força criação de conta duplicada

**Impacto:** ETAPA 2 deve implementar ambos os fluxos de forma independente.

---

### DA-06: Design System shadcn/ui

**Decisão:** Usar componentes shadcn/ui para toda a interface.

**Detalhes:**
- **Biblioteca:** shadcn/ui
- **Variáveis CSS:** Tokens de design centralizados
- **Componentes:** Button, Dialog, Card, etc.
- **Documentação:** `.context/docs/design-system.md`

**Regras:**
- NUNCA usar cores hardcoded
- SEMPRE usar componentes shadcn/ui
- SEMPRE usar variáveis CSS
- SEMPRE seguir padrões de espaçamento

**Justificativa:**
- Consistência visual em todo o sistema
- Manutenibilidade
- Acessibilidade built-in
- Reduz tempo de desenvolvimento

**Impacto:** Todas as interfaces devem seguir o design system.


---

## 📦 AS 5 ETAPAS DO PROJETO

### ETAPA 1 — Base de Dados e Tipos de Afiliados

**Objetivo:** Criar a fundação estrutural que todas as etapas seguintes dependem.

**Escopo:**

1. **Banco de Dados:**
   - Adicionar campo `affiliate_type` (ENUM: 'individual', 'logista')
   - Adicionar campo `financial_status` (ENUM: 'financeiro_pendente', 'ativo')
   - Estender ENUM `product_category` com valor 'show_row'
   - Criar índices apropriados
   - Migration para afiliados existentes (23 registros)

2. **Formulário de Cadastro:**
   - Seleção de tipo (Individual ou Logista)
   - Campo CNPJ condicional (quando Logista)
   - Validação de CPF/CNPJ
   - Manter campos existentes

3. **API de Cadastro:**
   - Validação de tipo e documento
   - Criação com status `financeiro_pendente`
   - Tratamento de erros

4. **Validadores:**
   - Parser de CPF/CNPJ
   - Validador de dígitos verificadores
   - Formatador de documentos

**Entregáveis:**
- Migration SQL aplicada
- Formulário de cadastro atualizado
- API de cadastro validando tipos
- Validadores de CPF/CNPJ funcionando

**Critérios de Conclusão:**
- ✅ Todos os 10 requirements implementados
- ✅ Migration aplicada com sucesso
- ✅ 23 afiliados existentes migrados corretamente
- ✅ Formulário funcionando para ambos os tipos
- ✅ Validação de CPF e CNPJ funcionando
- ✅ Zero erros de TypeScript/ESLint

**Especificação Detalhada:** `.kiro/specs/etapa-1-tipos-afiliados/`


---

### ETAPA 2 — Configuração Financeira (Wallet)

**Objetivo:** Permitir que afiliados configurem sua conta de recebimento no Asaas.

**Escopo:**

1. **Painel do Afiliado:**
   - Seção "Configurações Financeiras"
   - Dois fluxos independentes:
     - Fluxo 1: Informar Wallet ID manualmente
     - Fluxo 2: Criar conta Asaas via API
   - Validação de formato de Wallet ID
   - Mensagem orientando configuração (quando pendente)

2. **Integração Asaas:**
   - Endpoint para validar Wallet ID
   - Endpoint para criar subconta (POST /v3/accounts)
   - Tratamento de erros da API
   - Salvar Wallet ID retornada

3. **Mudança de Status:**
   - Atualizar `financial_status` de 'financeiro_pendente' para 'ativo'
   - Liberar link de indicação
   - Habilitar participação em splits

4. **Restrições:**
   - Bloquear link de indicação quando pendente
   - Bloquear participação em splits quando pendente
   - Exibir mensagem clara no painel

**Campos Obrigatórios (Fluxo 2):**
- Nome, Email, CPF ou CNPJ
- Celular, Renda/Faturamento mensal
- Endereço, Número, Bairro, CEP

**Entregáveis:**
- Seção "Configurações Financeiras" no painel
- Fluxo 1 (manual) funcionando
- Fluxo 2 (API Asaas) funcionando
- Mudança automática de status
- Restrições aplicadas corretamente

**Critérios de Conclusão:**
- ✅ Ambos os fluxos funcionando
- ✅ Validação de Wallet ID funcionando
- ✅ Integração com API Asaas funcionando
- ✅ Status mudando automaticamente
- ✅ Link de indicação liberado após configuração
- ✅ Restrições aplicadas corretamente

**Especificação Detalhada:** `.kiro/specs/etapa-2-wallet/` (a ser criada)


---

### ETAPA 3 — Categoria Show Row

**Objetivo:** Criar categoria de produtos exclusiva para Logistas.

**Escopo:**

1. **Utilizar ENUM Existente:**
   - Usar valor 'show_row' já adicionado na ETAPA 1
   - Não criar novo ENUM

2. **Replicar Padrão "Agente IA":**
   - Analisar implementação de `ferramenta_ia`
   - Replicar exatamente o mesmo padrão
   - Manter consistência arquitetural

3. **Controle de Visibilidade (3 Camadas):**
   
   **Camada 1 - Layout (Menu):**
   - Verificar `affiliate_type = 'logista'`
   - Verificar existência de produtos ativos
   - Exibir item no menu apenas se ambas condições verdadeiras

   **Camada 2 - Página:**
   - Validar tipo de afiliado ao carregar
   - Redirecionar se não for Logista
   - Exibir mensagem de acesso negado

   **Camada 3 - RLS (Banco):**
   - Política de segurança no Supabase
   - Impedir query de produtos 'show_row' para não Logistas
   - Retornar vazio para afiliados Individual

4. **Painel Administrativo:**
   - Adicionar suporte ao cadastro de produtos Show Row
   - Formulário de criação/edição
   - Listagem de produtos Show Row

**Comportamentos:**

- **Afiliado Individual:**
  - Menu Show Row não aparece
  - Página Show Row redireciona
  - Query retorna vazio

- **Afiliado Logista:**
  - Menu Show Row aparece (se houver produtos)
  - Página Show Row carrega normalmente
  - Query retorna produtos

**Entregáveis:**
- Categoria Show Row funcionando
- Controle de visibilidade em 3 camadas
- Painel admin com suporte a Show Row
- RLS aplicada corretamente

**Critérios de Conclusão:**
- ✅ Padrão "Agente IA" replicado corretamente
- ✅ 3 camadas de controle funcionando
- ✅ Afiliados Individual sem acesso
- ✅ Afiliados Logista com acesso completo
- ✅ RLS testada e funcionando
- ✅ Painel admin funcionando

**Especificação Detalhada:** `.kiro/specs/etapa-3-show-row/` (a ser criada)


---

### ETAPA 4 — Perfil da Loja e Vitrine Pública

**Objetivo:** Permitir que Logistas configurem perfil e apareçam em vitrine pública.

**Escopo:**

1. **Painel do Logista - Seção "Perfil da Loja":**
   - Nome da Loja (obrigatório)
   - Endereço completo
   - Cidade (obrigatório)
   - Estado (obrigatório)
   - Telefone/WhatsApp da loja
   - Upload de Logomarca
   - Upload de Banner (obrigatório)
   - Switch "Aparecer na Vitrine" (padrão: desativado)

2. **Validações de Perfil:**
   - Perfil mínimo: nome, cidade, estado, banner
   - Switch só pode ser ativado se perfil mínimo preenchido
   - Banner é obrigatório para visibilidade

3. **Vitrine Pública:**
   
   **Página:**
   - Acessível pelo menu principal do site
   - Pública (sem necessidade de login)
   
   **Busca:**
   - Campo de busca por nome da loja
   - Filtro por cidade
   - Filtro por estado
   
   **Geolocalização:**
   - Solicitar permissão de localização ao visitante
   - Se aceito: exibir lojas num raio padrão de 50km
   - Ordenar por proximidade (mais próxima primeiro)
   - Raios ajustáveis: 25km / 50km / 100km / 200km / Todo Brasil
   - Se negado: exibir todas as lojas ordenadas por estado/cidade
   
   **Layout:**
   - Grid de cards (4-5 colunas)
   - Cada card: banner, nome, cidade/estado, botão
   - Botão "Comprar Desta Loja"
   - Responsivo (mobile, tablet, desktop)

4. **Redirecionamento:**
   - Botão redireciona para site com `?ref=slug_do_lojista`
   - Exibir mensagem: "Você está comprando diretamente da fábrica indicado pela loja [NOME]"
   - Rastrear origem da venda

5. **Geolocalização Técnica:**
   
   **PostGIS:**
   - Habilitar extensão PostGIS no Supabase
   - Criar coluna para coordenadas (geography type)
   
   **Geocodificação:**
   - API CEP Aberto como primária
   - Extrair CEP do endereço
   - Chamar API: `https://www.cepaberto.com/api/v3/cep?cep={CEP}`
   - Receber lat/lng
   - Salvar no banco quando Logista preenche endereço
   
   **Busca por Raio:**
   - Usar função `ST_Distance` do PostGIS
   - Calcular distância entre ponto do visitante e lojas
   - Filtrar por raio selecionado
   - Ordenar por distância

**Entregáveis:**
- Seção "Perfil da Loja" no painel Logista
- Vitrine pública funcionando
- Busca por nome/cidade/estado
- Geolocalização com raios ajustáveis
- PostGIS configurado
- Geocodificação via API CEP Aberto
- Grid de cards responsivo

**Critérios de Conclusão:**
- ✅ Perfil da loja funcionando
- ✅ Upload de imagens funcionando
- ✅ Switch de visibilidade funcionando
- ✅ Vitrine pública acessível
- ✅ Busca funcionando
- ✅ Geolocalização funcionando
- ✅ PostGIS configurado e testado
- ✅ API CEP Aberto integrada
- ✅ Redirecionamento com ref funcionando

**Especificação Detalhada:** `.kiro/specs/etapa-4-vitrine/` (a ser criada)


---

### ETAPA 5 — Monetização (Adesão e Mensalidade)

**Objetivo:** Implementar cobrança de taxa de adesão e mensalidade recorrente.

**Escopo:**

1. **Taxa de Adesão:**
   - Cobrada de TODOS os afiliados (Individual e Logista)
   - No momento do cadastro
   - Valor configurável pelo admin
   - Integração com Asaas para cobrança
   - Sem pagamento = cadastro não concluído

2. **Mensalidade Recorrente:**
   - Cobrada APENAS de Logistas
   - Referente ao benefício da vitrine pública
   - Valor configurável pelo admin
   - Cobrança automática via Asaas
   - Controle de inadimplência

3. **Painel Administrativo:**
   - Configuração de valores (adesão e mensalidade)
   - Sem necessidade de alteração de código
   - Interface para ajustar valores
   - Histórico de alterações

4. **Controle de Inadimplência:**
   
   **Webhook Asaas:**
   - Receber notificações de inadimplência
   - Processar status de pagamento
   - Atualizar status do Logista
   
   **Ações Automáticas:**
   - Logista inadimplente: desativar switch "Aparecer na Vitrine"
   - Logista desaparece da vitrine automaticamente
   - Acesso ao painel mantido (pode regularizar)
   - Após regularização: Logista pode reativar switch manualmente

5. **Comissionamento:**
   - Taxa de adesão é receita comissionável
   - Mensalidades são receitas comissionáveis
   - Regras específicas de comissionamento a definir
   - Integração com sistema de comissões existente

6. **Notificações:**
   - Email de cobrança
   - Email de inadimplência
   - Email de regularização
   - Notificações no painel

**Entregáveis:**
- Taxa de adesão funcionando
- Mensalidade recorrente funcionando
- Painel admin de configuração
- Controle de inadimplência
- Webhook Asaas processando
- Suspensão automática de vitrine
- Notificações funcionando

**Critérios de Conclusão:**
- ✅ Taxa de adesão cobrando corretamente
- ✅ Mensalidade recorrente funcionando
- ✅ Valores configuráveis pelo admin
- ✅ Webhook Asaas processando
- ✅ Inadimplência suspendendo vitrine
- ✅ Regularização reativando acesso
- ✅ Comissionamento integrado
- ✅ Notificações funcionando

**Especificação Detalhada:** `.kiro/specs/etapa-5-monetizacao/` (a ser criada)

**Nota Importante:** As regras específicas de comissionamento sobre taxa de adesão e mensalidades serão definidas em conversa específica antes da implementação desta etapa.


---

## 🔗 DEPENDÊNCIAS ENTRE ETAPAS

### Diagrama de Dependências

```
ETAPA 1 (Base de Dados)
    ↓
    ├─→ ETAPA 2 (Wallet)
    │       ↓
    ├─→ ETAPA 3 (Show Row)
    │       ↓
    └─→ ETAPA 4 (Vitrine)
            ↓
        ETAPA 5 (Monetização)
```

### Dependências Detalhadas

#### ETAPA 2 depende de ETAPA 1:

**O que precisa:**
- Campo `financial_status` existir no banco
- Campo `affiliate_type` existir no banco
- Afiliados já terem tipo definido

**Por quê:**
- Mudança de status de 'financeiro_pendente' para 'ativo'
- Validação de tipo para campos obrigatórios (CPF vs CNPJ)
- Restrições baseadas em status

**Bloqueador:** Não pode iniciar ETAPA 2 sem ETAPA 1 completa.

---

#### ETAPA 3 depende de ETAPA 1:

**O que precisa:**
- Valor 'show_row' existir no ENUM `product_category`
- Campo `affiliate_type` existir no banco
- Afiliados já terem tipo definido

**Por quê:**
- Produtos Show Row usam categoria 'show_row'
- Controle de acesso baseado em `affiliate_type`
- RLS valida tipo de afiliado

**Bloqueador:** Não pode iniciar ETAPA 3 sem ETAPA 1 completa.

---

#### ETAPA 4 depende de ETAPA 1:

**O que precisa:**
- Campo `affiliate_type` existir no banco
- Apenas Logistas terem acesso

**Por quê:**
- Perfil de loja é exclusivo para Logistas
- Vitrine exibe apenas Logistas
- Validações baseadas em tipo

**Bloqueador:** Não pode iniciar ETAPA 4 sem ETAPA 1 completa.

---

#### ETAPA 5 depende de ETAPA 1 e ETAPA 4:

**O que precisa de ETAPA 1:**
- Campo `affiliate_type` existir no banco
- Diferenciação entre Individual e Logista

**O que precisa de ETAPA 4:**
- Switch "Aparecer na Vitrine" existir
- Vitrine pública funcionando

**Por quê:**
- Taxa de adesão para todos os tipos
- Mensalidade apenas para Logistas
- Inadimplência suspende vitrine (precisa do switch)

**Bloqueador:** Não pode iniciar ETAPA 5 sem ETAPA 1 e ETAPA 4 completas.


---

### Ordem de Implementação Obrigatória

**SEQUÊNCIA FIXA:**

1. **ETAPA 1** → Implementar e estabilizar completamente
2. **ETAPA 2** → Implementar e estabilizar completamente
3. **ETAPA 3** → Implementar e estabilizar completamente (pode ser paralela à ETAPA 2)
4. **ETAPA 4** → Implementar e estabilizar completamente
5. **ETAPA 5** → Implementar e estabilizar completamente

**REGRAS:**

- ✅ Uma etapa só começa após a anterior estar estável e testada
- ✅ ETAPA 2 e ETAPA 3 podem ser paralelas (ambas dependem apenas de ETAPA 1)
- ❌ NUNCA pular etapas
- ❌ NUNCA implementar etapas fora de ordem
- ❌ NUNCA iniciar próxima etapa com a anterior incompleta

**VALIDAÇÃO DE CONCLUSÃO:**

Cada etapa só é considerada completa quando:
- ✅ Todos os requirements implementados
- ✅ Todos os testes passando
- ✅ Zero erros de TypeScript/ESLint
- ✅ Funcionalidades testadas em ambiente de desenvolvimento
- ✅ Documentação atualizada
- ✅ Code review aprovado


---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Perda de Dados Durante Migrations

**Probabilidade:** Média  
**Impacto:** Crítico  
**Afeta:** ETAPA 1

**Descrição:**
- Migration pode falhar e corromper dados
- 23 afiliados existentes podem ser perdidos
- Estrutura do banco pode ficar inconsistente

**Mitigações:**
1. **Backup obrigatório** antes de qualquer migration
2. **Migration com rollback** automático em caso de erro
3. **Testar migration** em ambiente de desenvolvimento primeiro
4. **Validar contagem** de registros antes e depois
5. **Migration idempotente** (pode ser executada múltiplas vezes)

**Plano de Contingência:**
- Restaurar backup se migration falhar
- Corrigir migration e tentar novamente
- Validar integridade dos dados após restauração

---

### Risco 2: Quebra de Funcionalidades Existentes

**Probabilidade:** Média  
**Impacto:** Alto  
**Afeta:** Todas as etapas

**Descrição:**
- Alterações podem quebrar sistema atual
- Afiliados existentes podem perder acesso
- Sistema de comissões pode parar de funcionar

**Mitigações:**
1. **Valores padrão** para novos campos
2. **Testes de regressão** antes de cada deploy
3. **Deploy gradual** (feature flags)
4. **Monitoramento** de erros em produção
5. **Rollback rápido** se necessário

**Plano de Contingência:**
- Rollback imediato se funcionalidade crítica quebrar
- Hotfix prioritário para correção
- Comunicação com afiliados afetados

---

### Risco 3: API Asaas Indisponível

**Probabilidade:** Baixa  
**Impacto:** Alto  
**Afeta:** ETAPA 2, ETAPA 5

**Descrição:**
- API Asaas pode ficar indisponível
- Criação de subcontas pode falhar
- Validação de Wallet ID pode falhar

**Mitigações:**
1. **Retry automático** com backoff exponencial
2. **Timeout configurável** nas chamadas
3. **Fallback para fluxo manual** se API falhar
4. **Cache de validações** bem-sucedidas
5. **Monitoramento** de disponibilidade da API

**Plano de Contingência:**
- Usar apenas fluxo manual temporariamente
- Processar criações pendentes quando API voltar
- Notificar afiliados sobre indisponibilidade


---

### Risco 4: Validação de CNPJ Incorreta

**Probabilidade:** Média  
**Impacto:** Médio  
**Afeta:** ETAPA 1

**Descrição:**
- Algoritmo de validação pode ter bugs
- CNPJs válidos podem ser rejeitados
- CNPJs inválidos podem ser aceitos

**Mitigações:**
1. **Usar algoritmo padrão** de validação de CNPJ
2. **Testes com CNPJs reais** (válidos e inválidos)
3. **Testes com casos edge** (todos dígitos iguais, etc.)
4. **Validação dupla** (frontend e backend)
5. **Logs detalhados** de validações rejeitadas

**Plano de Contingência:**
- Corrigir algoritmo se bugs forem encontrados
- Permitir override manual pelo admin em casos especiais
- Revalidar CNPJs cadastrados após correção

---

### Risco 5: Geocodificação Imprecisa

**Probabilidade:** Média  
**Impacto:** Médio  
**Afeta:** ETAPA 4

**Descrição:**
- API CEP Aberto pode retornar coordenadas imprecisas
- CEPs novos podem não estar na base
- Busca por raio pode retornar resultados incorretos

**Mitigações:**
1. **Validar coordenadas** retornadas pela API
2. **Fallback para busca sem geolocalização** se API falhar
3. **Permitir correção manual** de coordenadas pelo Logista
4. **Cache de geocodificações** bem-sucedidas
5. **Monitoramento** de precisão das coordenadas

**Plano de Contingência:**
- Usar API alternativa se CEP Aberto falhar consistentemente
- Permitir busca apenas por cidade/estado
- Implementar geocodificação manual pelo admin

---

### Risco 6: Inadimplência Não Detectada

**Probabilidade:** Baixa  
**Impacto:** Alto  
**Afeta:** ETAPA 5

**Descrição:**
- Webhook Asaas pode falhar
- Inadimplência pode não ser processada
- Logista inadimplente pode continuar na vitrine

**Mitigações:**
1. **Retry de webhooks** com backoff exponencial
2. **Verificação periódica** de status de pagamento
3. **Logs detalhados** de processamento de webhooks
4. **Alertas** para webhooks falhando
5. **Validação manual** periódica pelo admin

**Plano de Contingência:**
- Processar inadimplências manualmente se webhook falhar
- Suspender vitrine manualmente se necessário
- Implementar verificação batch diária de status


---

## 📚 REFERÊNCIAS E DOCUMENTAÇÃO

### Documentos de Steering

- **product.md**: Contexto de negócio do Slim Quality
- **structure.md**: Arquitetura do sistema
- **tech.md**: Stack técnica e padrões
- **AGENTS.md**: Regras e padrões de desenvolvimento

### Especificações das Etapas

- **ETAPA 1**: `.kiro/specs/etapa-1-tipos-afiliados/`
  - requirements.md (✅ Aprovado)
  - design.md (⏳ Pendente)
  - tasks.md (⏳ Pendente)

- **ETAPA 2**: `.kiro/specs/etapa-2-wallet/` (⏳ A criar)
- **ETAPA 3**: `.kiro/specs/etapa-3-show-row/` (⏳ A criar)
- **ETAPA 4**: `.kiro/specs/etapa-4-vitrine/` (⏳ A criar)
- **ETAPA 5**: `.kiro/specs/etapa-5-monetizacao/` (⏳ A criar)

### Arquivos de Referência

**Backend:**
- `api/affiliates.js` - Padrão de Serverless Function
- `supabase/migrations/` - Migrations SQL

**Frontend:**
- `src/pages/auth/CadastroAfiliado.tsx` - Formulário de cadastro
- `src/services/affiliates.service.ts` - Serviço de afiliados
- `.context/docs/design-system.md` - Design system

### APIs Externas

- **Asaas API**: https://docs.asaas.com
  - POST /v3/accounts - Criar subconta
  - GET /v3/wallets/{id} - Validar Wallet ID
  - Webhooks de pagamento e inadimplência

- **API CEP Aberto**: https://www.cepaberto.com
  - GET /api/v3/cep?cep={CEP} - Geocodificação

### Banco de Dados

- **Supabase Project**: vtynmmtuvxreiwcxxlma
- **PostgreSQL**: 15.x
- **Extensões**: PostGIS (para ETAPA 4)


---

## 🎯 CRITÉRIOS DE SUCESSO DO PROJETO

### Critérios Técnicos

- ✅ Todas as 5 etapas implementadas e estáveis
- ✅ Zero erros de TypeScript/ESLint em produção
- ✅ Todos os testes passando
- ✅ Migrations aplicadas com sucesso
- ✅ Integrações externas funcionando (Asaas, CEP Aberto)
- ✅ RLS aplicada e testada em todas as tabelas
- ✅ Performance adequada (< 2s para queries principais)
- ✅ Documentação completa e atualizada

### Critérios de Negócio

- ✅ Afiliados podem se cadastrar como Individual ou Logista
- ✅ Afiliados podem configurar Wallet ID (manual ou automático)
- ✅ Logistas têm acesso exclusivo a produtos Show Row
- ✅ Logistas podem configurar perfil de loja
- ✅ Vitrine pública exibindo Logistas ativos
- ✅ Geolocalização funcionando com raios ajustáveis
- ✅ Taxa de adesão sendo cobrada corretamente
- ✅ Mensalidade recorrente funcionando para Logistas
- ✅ Inadimplência suspendendo vitrine automaticamente
- ✅ Sistema de comissões funcionando para ambos os tipos

### Critérios de Qualidade

- ✅ Código seguindo padrões do projeto (AGENTS.md)
- ✅ Design system aplicado consistentemente
- ✅ Acessibilidade básica implementada
- ✅ Responsividade em mobile, tablet e desktop
- ✅ Tratamento de erros adequado
- ✅ Logs estruturados para debugging
- ✅ Segurança (RLS, validações, sanitização)

### Critérios de Experiência do Usuário

- ✅ Cadastro intuitivo e rápido
- ✅ Configuração de wallet clara e simples
- ✅ Painel de Logista organizado e funcional
- ✅ Vitrine pública atraente e fácil de usar
- ✅ Busca e filtros funcionando bem
- ✅ Mensagens de erro claras e acionáveis
- ✅ Feedback visual para ações do usuário
- ✅ Performance percebida como rápida


---

## 📝 NOTAS IMPORTANTES

### Para Desenvolvedores

1. **SEMPRE ler este MASTER_SPEC.md no início de cada sessão** antes de qualquer trabalho
2. **SEMPRE consultar AGENTS.md** para padrões de código e arquitetura
3. **SEMPRE usar Supabase Power** para análise de banco (nunca confiar apenas em migrations)
4. **SEMPRE seguir a ordem de implementação** das etapas
5. **NUNCA pular validações** de conclusão de etapa
6. **NUNCA implementar fora do escopo** definido em cada etapa

### Para Especificações Individuais

Cada etapa deve ter seus próprios arquivos (requirements.md, design.md, tasks.md) que:

1. **Referenciam este MASTER_SPEC.md** como documento mestre
2. **Detalham apenas o escopo** da etapa específica
3. **Não repetem** regras globais (apenas referenciam)
4. **Incluem** apenas decisões específicas da etapa
5. **Mantêm** consistência com este documento

### Para Manutenção

Este documento deve ser atualizado quando:

1. **Novas regras de negócio globais** forem definidas
2. **Decisões arquiteturais** forem alteradas
3. **Dependências entre etapas** mudarem
4. **Novos riscos** forem identificados
5. **Escopo de etapas** for ajustado

**Responsável:** Equipe de desenvolvimento  
**Frequência:** Conforme necessário  
**Versionamento:** Manter histórico de alterações


---

## 📊 STATUS DO PROJETO

### Etapas Concluídas

- ✅ **ETAPA 1 - Requirements**: Aprovado (24/02/2026)

### Etapas em Andamento

- 🔄 **ETAPA 1 - Design**: Em criação
- 🔄 **ETAPA 1 - Tasks**: Pendente

### Etapas Pendentes

- ⏳ **ETAPA 2**: Não iniciada
- ⏳ **ETAPA 3**: Não iniciada
- ⏳ **ETAPA 4**: Não iniciada
- ⏳ **ETAPA 5**: Não iniciada

### Próximos Passos

1. Criar design.md da ETAPA 1
2. Criar tasks.md da ETAPA 1
3. Implementar ETAPA 1
4. Validar e estabilizar ETAPA 1
5. Criar especificações da ETAPA 2

---

## 🔄 HISTÓRICO DE ALTERAÇÕES

### Versão 1.0 - 24/02/2026

**Criação Inicial:**
- Documento MASTER_SPEC.md criado
- Todas as 5 etapas documentadas
- Regras de negócio globais definidas
- Decisões arquiteturais documentadas
- Dependências entre etapas mapeadas
- Riscos e mitigações identificados

**Aprovações:**
- Requirements da ETAPA 1 aprovado pelo usuário

---

## 📞 CONTATOS E SUPORTE

### Equipe do Projeto

**Desenvolvimento:**
- Kiro AI (Agente de Desenvolvimento)
- Renato Carraro (Product Owner)

**Gestores de Negócio:**
- Renum (Gestor)
- JB (Gestor)

### Suporte Técnico

**Dúvidas sobre:**
- Arquitetura: Consultar AGENTS.md
- Negócio: Consultar product.md
- Etapas: Consultar este MASTER_SPEC.md
- Implementação: Consultar especificações individuais

---

**FIM DO DOCUMENTO MASTER_SPEC.md**

**Este é o documento de referência central para todo o projeto.**  
**Consulte sempre no início de cada sessão de trabalho.**

