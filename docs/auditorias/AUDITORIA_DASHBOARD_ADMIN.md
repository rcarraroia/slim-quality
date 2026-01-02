# Auditoria Técnica: Dashboard Admin - Slim Quality

**Data:** 28/12/2025
**Escopo:** Mapeamento de integração backend (Supabase/API) vs. Frontend (Mock/Static)
**Metodologia:** Análise estática de código-fonte (`.tsx`), inspeção de chamadas ao Supabase SDK e monitoramento lógico de handlers.

---

## 📊 Resumo Executivo

A auditoria cobriu 11 menus principais e 6 submenus do Dashboard Administrativo. O sistema apresenta uma disparidade significativa de maturidade entre os módulos:

- **Maduros (80-100% integrados):** Produtos, Conversas, Analytics e Gestão de Comissões de Afiliados.
- **Intermediários (50-80% integrados):** Vendas, Lista de Afiliados, Clientes e Agendamentos.
- **Superficiais (0-20% integrados/Mockados):** "Meu Agente" (IA), Automações e Configurações Gerais.

| Nível de Integração | Menus/Funcionalidades |
| :--- | :--- |
| ✅ **Integrado** | Produtos, Conversas (Realtime), Analytics, Comissões, Solicitações de Saque. |
| ⚠️ **Parcial** | Vendas, Lista de Afiliados, Clientes, Agendamentos. |
| 🔴 **Mockado** | Meu Agente (Overview/SICC/Metricas), Automações, Configurações. |

---

## 🔍 Detalhamento por Menu

### 1. 👥 Afiliados
- **Status Geral:** ⚠️ Parcialmente Integrado
- **✅ Integrado:** Lista principal, aprovação de comissões, processamento de saques (Withdrawals), contagem de rede.
- **⚠️ Mockado:** Campos `cidade` (N/A), `nível` (fixo 1) e `saldo pendente` (fixo 0) no mapeamento do serviço.
- **🔴 Não Implementado:** Exportação de CSV.
- **Endpoints:** `supabase.from('affiliates')`, `supabase.from('commissions')`, `supabase.from('withdrawals')`.
- **Arquivos:** `ListaAfiliados.tsx`, `GestaoComissoes.tsx`, `Solicitacoes.tsx`.

### 2. 💰 Vendas
- **Status Geral:** ⚠️ Parcialmente Integrado
- **✅ Integrado:** Lista de vendas real, joins com clientes e itens de pedido. Métricas de faturamento e ticket médio.
- **⚠️ Mockado:** Taxa de conversão (34,2%) é estática. Filtro de período não afeta a query.
- **🔴 Não Implementado:** Edição de status, envio de comprovante e exportação de CSV.
- **Endpoints:** `supabase.from('orders')`, `supabase.from('order_items')`.
- **Arquivos:** `Vendas.tsx`.

### 3. 🤖 Meu Agente (Módulo IA)
- **Status Geral:** 🔴 Mockado (Casca Visual)
- **⚠️ Mockado:** Overview (Uptime, latência, conversas recentes), SICC (Configurações de threshold, métricas de aprendizado), Métricas Gerais (gráficos de uso), Aprendizados (Fila de aprovação estática).
- **✅ Parcial:** "Integrações (MCP)" possui lógica de busca em `/api/mcp/status`, sugerindo integração com um serviço de gateway separado.
- **Bugs Detectados:** Todos os botões de "Salvar" e "Testar" apenas disparam logs de console ou toasts de sucesso simulados.
- **Arquivos:** `AgenteIA.tsx`, `AgenteConfiguracao.tsx`, `AgenteSicc.tsx`, `AgenteMcp.tsx`.

### 4. 💬 Conversas
- **Status Geral:** ✅ Integrado
- **Funcionalidades:** Suporte a Realtime via Supabase, rastreamento de canais (WhatsApp, Site, Email).
- **Endpoints:** `supabase.from('conversations')`.
- **Arquivos:** `Conversas.tsx`, `useRealtimeConversations.ts`.

### 5. 📦 Produtos
- **Status Geral:** ✅ Integrado (CRUD Completo)
- **Funcionalidades:** Criação, edição, exclusão lógica, upload de imagens para Supabase Storage.
- **Endpoints:** `supabase.from('products')`, `supabase.from('product_images')`, Storage Bucket `product-images`.
- **Arquivos:** `Produtos.tsx`.

### 6. 📊 Analytics
- **Status Geral:** ✅ Integrado
- **Funcionalidades:** Gráficos de receita baseados em dados reais de `orders`, cálculo de LTV por cliente.
- **Arquivos:** `Analytics.tsx`.

### 7. 👤 Clientes
- **Status Geral:** ⚠️ Parcialmente Integrado
- **✅ Integrado:** Lista real de clientes e LTV.
- **🔴 Mockado:** Taxa de recompra (0%). Ações de "Ver detalhes" e "Editar" não possuem interface implementada (apenas toast).
- **Arquivos:** `Clientes.tsx`.

### 8. 📅 Agendamentos
- **Status Geral:** ✅ Integrado (Visualização)
- **✅ Integrado:** Calendário reflete dados reais da tabela `appointments`.
- **🔴 Não Implementado:** Criação de novos agendamentos (botão sem handler).
- **Arquivos:** `Agendamentos.tsx`.

### 9. ⚙️ Configurações / Automações
- **Status Geral:** 🔴 Mockado
- **Detalhamento:** São telas puramente visuais. O gerenciamento de usuários usa `mockUsers`, e as configurações de pagamento (Asaas/Split) são apenas templates sem persistência.
- **Arquivos:** `Automacoes.tsx`, `Configuracoes.tsx`.

---

## 🛠️ Endpoints de Backend Detectados

1.  **Supabase Tables:**
    - `affiliates`, `commissions`, `withdrawals`, `referrals`
    - `orders`, `order_items`, `products`, `product_images`
    - `customers`, `conversations`, `appointments`
2.  **API Interna (Routes):**
    - `/api/mcp/status` (GET)
    - `/api/mcp/test/:id` (POST)
    - `/api/affiliates/dashboard` (Referenciado em serviços)

---

## 🐞 Bugs e Inconsistências Críticas

1.  **Módulo Meu Agente:** Totalmente desconectado do backend. Mudanças de prompt ou temperatura não têm efeito real.
2.  **Filtros de Data:** Em "Vendas" e "Clientes", os filtros visuais de data não alteram as queries enviadas ao Supabase.
3.  **Ações de Botão:** Inúmeros botões de "Exportar CSV", "Salvar" e "Editar" em múltiplos menus estão sem implementação lógica.

---

## 🏁 Conclusão e Recomendações

O esqueleto do Dashboard está pronto e visualmente impecável. A prioridade de desenvolvimento deve ser a integração do módulo **Meu Agente (Fase 4)** e a conclusão dos handlers de ação em **Vendas** e **Clientes** para tornar o sistema operacional além da simples visualização de dados.

> [!IMPORTANT]
> Esta auditoria não realizou alterações no código. Recomenda-se uma sessão de Sprint focada exclusivamente em "Wiring" (conexão) dos handlers de UI aos serviços de backend já existentes.
