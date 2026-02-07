# Requisitos: Módulo de Pagamento e Split Independente (Agente IA)

## 🎯 Objetivo
Implementar um sistema de cobrança recorrente e distribuição de comissões para o Agente IA, hospedado na infraestrutura da Slim Quality, garantindo que a **Renum** seja a principal beneficiária (70%) do valor arrecadado.

## 📋 Regras de Negócio

### 1. Categorização e Tipo de Cobrança
- **`category` (ENUM)**: Define o tipo do produto (`colchao`, `ferramenta_ia`, `servico_digital`). O valor `ferramenta_ia` dispara o redirecionamento de 70% para a Renum.
- **`is_subscription` (BOOLEAN)**: Define se o produto é de cobrança recorrente automatizada.

### 2. Regra de Split (70/30 Invertido)
- **Principal (70%)**: Destinado à Wallet ID da **Renum** (se `category = 'ferramenta_ia'`).
- **Pool de Comissões (30%)**: Distribuído entre Afiliados (N1, N2, N3) e Managers.

### 3. Redistribuição (Catch-all)
- Se **N2** não existir: Os 3% de comissão de N2 são divididos igualmente entre **Slim Quality (Manager)** e **JB (Manager)**.
- Se **N3** não existir: Os 2% de comissão de N3 são divididos igualmente entre **Slim Quality (Manager)** e **JB (Manager)**.
- Se **N1** não existir (Venda Direta Admin): Os 20% totais de afiliados (15+3+2) vão para os Managers (10% cada).

### 4. Gestão Admin e Visibilidade
- **Cadastro**: O produto "Agente IA" é cadastrado via painel admin padrão como qualquer outro produto.
- **Toggle Global**: Deve existir um switch em "Configurações Gerais" no Admin: `"Habilitar venda do Agente IA para afiliados"`.
- **Filtro de Catálogo**: Produtos com `category = 'ferramenta_ia'` **NUNCA** devem aparecer no catálogo de vendas físicas. Eles aparecem apenas na aba "Ferramentas" do dashboard, e somente se o Toggle Global for `ON`.

### 5. Ciclo de Vida do Serviço
- O serviço é ativado mediante confirmação de pagamento (`PAYMENT_RECEIVED`) do Asaas.
- Deve haver um período de validade (ex: 30 dias) controlado pelo módulo.

## ✅ Critérios de Aceite
- [ ] O split de 70% deve cair na conta da Renum em faturas do Agente.
- [ ] O sistema de colchões deve continuar funcionando com 70% para a Fábrica.
- [ ] Afiliados devem ver suas comissões do Agente no dashboard existente.
- [ ] O Agente Multi-Tenant deve conseguir consultar o status da assinatura via API.
