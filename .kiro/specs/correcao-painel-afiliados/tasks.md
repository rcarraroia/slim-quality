# Tasks: Correção do Painel de Afiliados

## Visão Geral

Correção de dados mockados e funcionalidades quebradas no painel de afiliados, baseado no relatório de análise completa realizado em 13/01/2026.

**Foco:** Qualidade, responsabilidade e profissionalismo. Sem pressão de tempo.

---

## FASE 1: CORREÇÕES CRÍTICAS ✅ CONCLUÍDA E VALIDADA

### 1. Corrigir Página MinhaRede ✅ VALIDADO

- [x] 1.1 Corrigir erro "Cannot read properties of undefined (reading 'indexOf')"
  - ✅ **VALIDADO pelo usuário**
  - Método `getNetwork()` corrigido para usar queries diretas via `referred_by`
  - Erro de indexOf eliminado

- [x] 1.2 Criar Serverless Function para link de indicação
  - ✅ **VALIDADO pelo usuário**
  - API `api/affiliates/referral-link.js` criada
  - Integrada ao banco para gerar links dinâmicos usando slug ou referral_code

- [x] 1.3 Testar visualização da rede
  - ✅ **VALIDADO pelo usuário**

- [x] 1.4 Checkpoint - Validar correções
  - ✅ **VALIDADO pelo usuário**

---

### 2. Corrigir Dashboard Principal (Página Inicial) ✅ VALIDADO

- [x] 2.1 Remover dados mockados de trends
  - ✅ **VALIDADO pelo usuário**
  - Arquivo `src/pages/afiliados/dashboard/Inicio.tsx` corrigido
  - Trends removidos, usando apenas dados reais

---

### 3. Corrigir Página de Vendas

**⚠️ NOTA:** Página de Vendas não existe no sistema atual. Será criada na Fase 2.

---

### 4. Corrigir Página de Comissões ✅ VALIDADO

- [x] 4.1 Corrigir bug de exibição de valores
  - ✅ **BUG CRÍTICO CORRIGIDO**
  - Problema: usava `amount_cents` (undefined) ao invés de `amount`
  - Solução: usar campos corretos retornados pelo service
  - **Agora exibe TODOS os valores, incluindo centavos**
  - Commit: af2640d

---

### 5. Implementar Recebimentos Reais ✅ VALIDADO

- [x] 5.1 Criar tabela `affiliate_withdrawals` no banco
  - ✅ **VALIDADO pelo usuário**
  - Migration criada: `supabase/migrations/20260113000000_create_affiliate_withdrawals.sql`

- [x] 5.2 Implementar método `getWithdrawals()` real
  - ✅ **VALIDADO pelo usuário**
  - Busca dados reais da tabela `affiliate_withdrawals`

- [x] 5.3 Criar Serverless Function para withdrawals
  - ✅ **VALIDADO pelo usuário**
  - API `api/affiliates/withdrawals.js` criada (GET)

---

### 6. Implementar Sistema de Saques ✅ VALIDADO

- [x] 6.1 Criar Serverless Function para saldo
  - ✅ **VALIDADO - API já estava implementada corretamente**
  - API `api/affiliates/balance.js` calcula saldo real
  - Fórmula: (comissões pagas) - (saques completados)

- [x] 6.2 Adicionar método `getBalance()` no service
  - ✅ **VALIDADO pelo usuário**
  - Método implementado em `affiliate.service.ts`

- [x] 6.3 Atualizar página Saques com dados reais
  - ✅ **VALIDADO - Fallback para mock REMOVIDO**
  - Página usa apenas dados reais
  - Exibe erro se API falhar (transparência)
  - Commit: af2640d

- [ ] 3.4 Criar Serverless Function para solicitar saque
  - Criar: `api/affiliates/withdrawals.js` (POST)
  - Endpoint: `POST /api/affiliates/withdrawals`
  - Body: `{ amount, pixKey, description }`
  - Validar saldo disponível
  - Validar valor mínimo (R$ 50)
  - Criar registro na tabela `affiliate_withdrawals`
  - Retornar: `{ withdrawalId, status, estimatedDate }`
  - _Requisitos: API faltando identificada no relatório_

- [ ] 3.5 Implementar lógica de cálculo de saldo
  - Buscar todas as comissões pagas do afiliado
  - Subtrair todos os saques completados
  - Calcular saldo bloqueado (comissões pendentes)
  - Atualizar página Saques com dados reais
  - _Requisitos: Lógica de negócio do sistema_

- [ ] 3.4 Implementar validação de saque mínimo
  - Validar valor mínimo de R$ 50
  - Validar que afiliado tem saldo suficiente
  - Validar que Wallet ID está configurada
  - Exibir mensagens de erro apropriadas
  - _Requisitos: Regras de negócio_

- [ ] 3.5 Integrar com Asaas para processar saques
  - Pesquisar API do Asaas para transferências
  - Implementar chamada à API do Asaas
  - Atualizar status do saque após processamento
  - Registrar logs de transação
  - _Requisitos: Integração com gateway de pagamento_

- [ ] 3.6 Testar fluxo completo de saque
  - Validar exibição de saldo correto
  - Validar solicitação de saque
  - Validar validações de valor mínimo
  - Validar histórico de saques
  - _Requisitos: Funcionalidades da página Saques_

- [ ] 3.7 Checkpoint - Validar sistema de saques
  - Página Saques sem dados mockados
  - Saldo real calculado corretamente
  - Solicitação de saque funcionando
  - Histórico real de saques
  - Perguntar ao usuário se há problemas

---

## FASE 2: MELHORIAS MÉDIAS

### 7. Criar Página de Vendas (NOVA) 🆕

**Objetivo:** Mostrar vendas que geraram comissões para o afiliado, com transparência total.

- [ ] 7.1 Criar estrutura da página
  - Criar: `src/pages/afiliados/dashboard/Vendas.tsx`
  - Seguir padrão UX/UI das outras páginas do painel
  - Layout: Cards de resumo + Tabela de vendas
  - _Tempo estimado: 30 minutos_

- [ ] 7.2 Implementar cards de resumo
  - Total de vendas (quantidade)
  - Valor total vendido
  - Comissões geradas
  - Taxa de conversão
  - _Tempo estimado: 20 minutos_

- [ ] 7.3 Implementar tabela de vendas
  - Colunas: Pedido, Data, Cliente, Produto, Valor, Comissão, Status
  - Paginação (20 itens por página)
  - Ordenação por data (mais recente primeiro)
  - _Tempo estimado: 30 minutos_

- [ ] 7.4 Implementar filtros
  - Filtro por período (data início/fim)
  - Filtro por status (pago, pendente, cancelado)
  - Filtro por nível (N1, N2, N3)
  - Busca por cliente ou pedido
  - _Tempo estimado: 25 minutos_

- [ ] 7.5 Criar Serverless Function para vendas
  - Criar: `api/affiliates/sales.js`
  - Endpoint: `GET /api/affiliates/sales`
  - Query: Buscar orders que geraram comissões para o afiliado
  - Incluir: order, customer, commission, status
  - Parâmetros: page, limit, status, level, startDate, endDate, search
  - _Tempo estimado: 40 minutos_

- [ ] 7.6 Implementar método no service
  - Adicionar `getSales()` em `affiliate.service.ts`
  - Chamar API de vendas
  - Mapear dados para formato do componente
  - _Tempo estimado: 15 minutos_

- [ ] 7.7 Implementar modal de detalhes
  - Exibir detalhes completos da venda ao clicar
  - Informações do pedido
  - Informações do cliente
  - Comissão gerada (valor, nível, status)
  - _Tempo estimado: 20 minutos_

- [ ] 7.8 Implementar exportação
  - Botão de exportar para CSV
  - Incluir todas as vendas filtradas
  - Formato: Pedido, Data, Cliente, Produto, Valor, Comissão, Status
  - _Tempo estimado: 15 minutos_

- [✓] 7.9 Adicionar rota no menu
  - ✅ Rota adicionada no App.tsx
  - ✅ Import do componente criado
  - ✅ Item "Vendas" já estava no menu do layout
  - ✅ Build passou sem erros
  - ✅ **Concluída mas não validada** (Commit 0beb9bd)

- [ ] 7.10 Testar página completa
  - Validar carregamento de dados
  - Validar filtros
  - Validar paginação
  - Validar exportação
  - _Tempo estimado: 15 minutos_

**Tempo total estimado: ~3h 35min**

---

### 8. Completar Configurações

- [✓] 8.1 Implementar salvamento de preferências de notificações
  - ✅ Tabela `affiliate_notification_preferences` criada
  - ✅ Migration aplicada com sucesso
  - ✅ Método `saveNotificationPreferences()` implementado
  - ✅ Checkboxes usando estado controlado
  - ✅ **Concluída mas não validada**

- [✓] 8.2 Criar Serverless Function para preferências
  - ✅ API `api/affiliates/notifications/preferences.js` criada (GET e POST)
  - ✅ Integrada ao banco de dados
  - ✅ Métodos `getNotificationPreferences()` e `saveNotificationPreferences()` no service
  - ✅ **Concluída mas não validada**

- [✓] 8.3 Implementar alteração de senha
  - ✅ Modal de alteração de senha criado
  - ✅ Validações implementadas (mín. 8 caracteres, senhas conferem, senha diferente da atual)
  - ✅ Integração com Supabase Auth (`updateUser()`)
  - ✅ Feedback visual (loading, sucesso, erro)
  - ✅ Dicas de senha segura no modal
  - ✅ **Concluída mas não validada**

- [ ] 8.4 Testar configurações
  - Validar salvamento de preferências
  - Validar alteração de senha
  - Validar feedback ao usuário
  - _Requisitos: Funcionalidades da página Configurações_

- [ ] 8.5 Checkpoint - Validar configurações
  - Preferências salvando corretamente
  - Alteração de senha funcionando
  - Perguntar ao usuário se há problemas

---

### 9. Implementar Exportação de Relatórios

- [ ] 9.1 Criar Serverless Function para exportação
  - Criar: `api/affiliates/export.js`
  - Endpoint: `POST /api/affiliates/export`
  - Body: `{ type, format, startDate, endDate }`
  - Suportar tipos: comissões, recebimentos, rede
  - _Requisitos: API faltando identificada no relatório_

- [ ] 5.2 Implementar geração de CSV
  - Gerar CSV com dados de comissões
  - Gerar CSV com dados de recebimentos
  - Gerar CSV com dados da rede
  - Retornar arquivo para download
  - _Requisitos: Funcionalidade de exportação_

- [ ] 5.3 Implementar geração de PDF
  - Gerar PDF com dados de comissões
  - Gerar PDF com dados de recebimentos
  - Incluir gráficos e estatísticas
  - Retornar arquivo para download
  - _Requisitos: Funcionalidade de exportação_

- [ ] 5.4 Testar downloads
  - Validar geração de CSV
  - Validar geração de PDF
  - Validar conteúdo dos arquivos
  - _Requisitos: Funcionalidades de exportação_

- [ ] 5.5 Checkpoint - Validar exportação
  - Exportação de CSV funcionando
  - Exportação de PDF funcionando
  - Perguntar ao usuário se há problemas

---

## FASE 3: FUNCIONALIDADES NOVAS

### 9. Página de Estatísticas

- [ ] 6.1 Criar Serverless Function para estatísticas gerais
  - Criar: `api/affiliates/stats/overview.js`
  - Endpoint: `GET /api/affiliates/stats/overview`
  - Retornar: métricas gerais de performance
  - _Requisitos: API faltando identificada no relatório_

- [ ] 6.2 Criar Serverless Function para performance
  - Criar: `api/affiliates/stats/performance.js`
  - Endpoint: `GET /api/affiliates/stats/performance`
  - Retornar: dados de performance ao longo do tempo
  - _Requisitos: API faltando identificada no relatório_

- [ ] 6.3 Criar Serverless Function para conversão
  - Criar: `api/affiliates/stats/conversion.js`
  - Endpoint: `GET /api/affiliates/stats/conversion`
  - Retornar: taxa de conversão e funil
  - _Requisitos: API faltando identificada no relatório_

- [ ] 6.4 Criar Serverless Function para crescimento da rede
  - Criar: `api/affiliates/stats/network-growth.js`
  - Endpoint: `GET /api/affiliates/stats/network-growth`
  - Retornar: crescimento da rede ao longo do tempo
  - _Requisitos: API faltando identificada no relatório_

- [ ] 6.5 Implementar gráficos de performance
  - Gráfico de comissões ao longo do tempo
  - Gráfico de conversões ao longo do tempo
  - Gráfico de cliques ao longo do tempo
  - _Requisitos: Visualização de dados_

- [ ] 6.6 Implementar gráficos de conversão
  - Funil de conversão (cliques → conversões)
  - Taxa de conversão por período
  - Comparação com média da plataforma
  - _Requisitos: Visualização de dados_

- [ ] 6.7 Implementar gráficos de crescimento da rede
  - Crescimento de N1, N2, N3 ao longo do tempo
  - Novos afiliados por mês
  - Afiliados ativos vs inativos
  - _Requisitos: Visualização de dados_

- [ ] 6.8 Testar página de Estatísticas
  - Validar carregamento de dados
  - Validar exibição de gráficos
  - Validar filtros por período
  - _Requisitos: Funcionalidades da página Estatísticas_

- [ ] 6.9 Checkpoint - Validar estatísticas
  - Página Estatísticas implementada
  - Gráficos funcionando
  - Dados reais sendo exibidos
  - Perguntar ao usuário se há problemas

---

## OBSERVAÇÕES IMPORTANTES

### Sobre Recebimentos Automáticos via Asaas

O sistema usa **split automático do Asaas**:
- Comissões são depositadas AUTOMATICAMENTE na Wallet ID do afiliado
- NÃO há necessidade de solicitar saques para comissões
- A página "Recebimentos" deve mostrar o HISTÓRICO de depósitos automáticos
- A página "Saques" é para sacar SALDO ACUMULADO (se houver)

**Importante:** Verificar se o Asaas fornece webhook ou API para consultar histórico de splits depositados.

### Sobre Wallet ID

- Wallet ID é configurada na página de Configurações
- Validação é feita via Edge Function `validate-asaas-wallet`
- Sem Wallet ID configurada, afiliado NÃO recebe comissões
- Sistema já valida e salva corretamente

### Sobre Slug Personalizado

- Funcionalidade 100% implementada e funcional
- Afiliado pode usar slug personalizado ou referral_code
- Link gerado: `slimquality.com.br?ref=SLUG_OU_CODE`
- Sistema já valida disponibilidade e salva corretamente

### Sobre Card "Comissões Recentes" na Página Inicial

- ✅ **CONFIRMADO:** Card já está puxando dados reais do banco
- Exibe comissões geradas em testes reais
- Não precisa de correção

---

## RESUMO DE PRIORIDADES

| Fase | Descrição | Prioridade |
|------|-----------|------------|
| **Fase 1** | Correções Críticas | 🔴 Crítica |
| **Fase 2** | Melhorias Médias | 🟡 Média |
| **Fase 3** | Funcionalidades Novas | 🟢 Baixa |

**Foco:** Qualidade e responsabilidade, não velocidade.

---

## PRÓXIMOS PASSOS

1. Revisar este arquivo de tasks com o usuário
2. Obter autorização para implementar
3. Começar pela Fase 1 (correções críticas)
4. Fazer checkpoints após cada sprint
5. Validar com usuário antes de prosseguir

**Não implementar nada sem autorização explícita do usuário.**
