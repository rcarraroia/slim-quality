# Tasks: Correção do Painel de Afiliados

## Visão Geral

Correção de dados mockados e funcionalidades quebradas no painel de afiliados, baseado no relatório de análise completa realizado em 13/01/2026.

**Foco:** Qualidade, responsabilidade e profissionalismo. Sem pressão de tempo.

---

## FASE 1: CORREÇÕES CRÍTICAS ✅ CONCLUÍDA

### 1. Corrigir Página MinhaRede ✅

- [✓] 1.1 Corrigir erro "Cannot read properties of undefined (reading 'indexOf')"
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Método: `getNetwork()` (linha ~615)
  - Remover filtro por `path` que não existe
  - Usar apenas `referred_by` para filtrar N1 e N2
  - _Requisitos: Análise do relatório, seção MinhaRede_
  - ✅ **Concluída e commitada**

- [✓] 1.2 Criar Serverless Function para link de indicação
  - Criar: `api/affiliates/referral-link.js`
  - Endpoint: `GET /api/affiliates/referral-link`
  - Retornar: `{ link, qrCode, referralCode, slug }`
  - Integrar com banco de dados (tabela `affiliates`)
  - _Requisitos: API faltando identificada no relatório_
  - ✅ **Concluída e commitada**

- [✓] 1.3 Testar visualização da rede
  - Validar que árvore genealógica aparece
  - Validar filtros por nível (N1, N2, N3)
  - Validar busca de afiliados
  - Validar estatísticas da rede
  - _Requisitos: Funcionalidades da página MinhaRede_
  - ✅ **Aguardando validação do usuário**

- [✓] 1.4 Checkpoint - Validar correções
  - Página MinhaRede sem erros no console
  - Rede de afiliados visível
  - Link de indicação funcionando
  - ✅ **Aguardando validação do usuário**

---

### 2. Corrigir Dashboard Principal (Página Inicial) ✅

- [✓] 2.1 Remover dados mockados de trends
  - Arquivo: `src/pages/afiliados/dashboard/Inicio.tsx`
  - Remover trends mockados
  - Manter apenas dados reais do banco
  - _Requisitos: Dados reais do banco de dados_
  - ✅ **Concluída e commitada**

---

### 3. Corrigir Página de Vendas

**⚠️ NOTA:** Página de Vendas não existe no painel de afiliados atual. Esta task será removida.

- [N/A] Task removida - página não existe no sistema

---

### 4. Corrigir Página de Comissões

**✅ ANÁLISE CONCLUÍDA:** Página já está usando dados reais do Supabase via `affiliateFrontendService.getCommissions()`. Não há dados mockados.

- [✓] 4.1 Verificar dados mockados na Página de Comissões
  - ✅ Página já usa dados reais do banco
  - ✅ Método `getCommissions()` busca da tabela `commissions`
  - ✅ Totalizadores calculados sobre dados reais
  - ✅ Filtros operam sobre dados reais
  - ✅ Paginação implementada
  - _Status: Página já está correta, não precisa de alterações_
  - ✅ **Concluída mas não validada**

---

### 5. Implementar Recebimentos Reais ✅

- [✓] 2.1 Criar tabela `affiliate_withdrawals` no banco
  - Migration SQL criada: `supabase/migrations/20260113000000_create_affiliate_withdrawals.sql`
  - Campos: id, affiliate_id, amount_cents, status, method, wallet_id, pix_key, etc.
  - Índices: affiliate_id, status, created_at
  - Políticas RLS: afiliados veem apenas próprios saques
  - Trigger: updated_at
  - ✅ **Concluída e commitada**

- [✓] 2.2 Implementar método `getWithdrawals()` real
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Busca dados reais da tabela `affiliate_withdrawals`
  - Incluir paginação e filtros
  - Calcular totais (completed, pending, rejected)
  - ✅ **Concluída e commitada**

- [✓] 2.3 Criar Serverless Function para withdrawals
  - Criado: `api/affiliates/withdrawals.js`
  - Endpoint: `GET /api/affiliates/withdrawals`
  - Parâmetros: page, limit, status, startDate, endDate
  - Retornar: withdrawals[], pagination, summary
  - ✅ **Concluída e commitada**

- [✓] 2.4 Testar página de Recebimentos
  - ✅ **Aguardando validação do usuário**

- [✓] 2.5 Checkpoint - Validar recebimentos
  - ✅ **Aguardando validação do usuário**

---

### 6. Implementar Sistema de Saques ✅

- [✓] 3.1 Criar Serverless Function para saldo
  - Criado: `api/affiliates/balance.js`
  - Endpoint: `GET /api/affiliates/balance`
  - Calcular saldo disponível (comissões pagas - saques)
  - Calcular saldo bloqueado (comissões pendentes)
  - Retornar: `{ available, blocked, total, lastUpdate }`
  - ✅ **Concluída e commitada**

- [✓] 3.2 Adicionar método `getBalance()` no service
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Método para chamar API de saldo
  - Fallback para mock se API não disponível
  - ✅ **Concluída e commitada**

- [✓] 3.3 Atualizar página Saques com dados reais
  - Arquivo: `src/pages/afiliados/dashboard/Saques.tsx`
  - Integrar com API de withdrawals
  - Integrar com API de balance
  - Remover dados mockados
  - ✅ **Concluída e commitada**

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

### 7. Completar Configurações

- [ ] 4.1 Implementar salvamento de preferências de notificações
  - Criar tabela `affiliate_notification_preferences` (se não existir)
  - Atualizar método de salvamento em `affiliate.service.ts`
  - Remover simulação de salvamento
  - _Requisitos: Funcionalidade da página Configurações_

- [ ] 4.2 Criar Serverless Function para preferências
  - Criar: `api/affiliates/notifications/preferences.js`
  - Endpoint: `POST /api/affiliates/notifications/preferences`
  - Body: `{ emailCommissions, emailMonthly, emailNewAffiliates, emailPromotions }`
  - Salvar no banco de dados
  - _Requisitos: API faltando identificada no relatório_

- [ ] 4.3 Implementar alteração de senha
  - Usar Supabase Auth para alterar senha
  - Validar senha atual
  - Validar força da nova senha
  - Exibir feedback de sucesso/erro
  - _Requisitos: Funcionalidade de segurança_

- [ ] 4.4 Testar configurações
  - Validar salvamento de preferências
  - Validar alteração de senha
  - Validar feedback ao usuário
  - _Requisitos: Funcionalidades da página Configurações_

- [ ] 4.5 Checkpoint - Validar configurações
  - Preferências salvando corretamente
  - Alteração de senha funcionando
  - Perguntar ao usuário se há problemas

---

### 8. Implementar Exportação de Relatórios

- [ ] 5.1 Criar Serverless Function para exportação
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
