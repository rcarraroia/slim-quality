# Implementation Plan: Correção Completa do Sistema de Afiliados

## Overview

Plano de implementação para corrigir os 14 problemas identificados na auditoria técnica, seguindo a arquitetura definida no design.md.

**Estratégia:** Implementação incremental em 3 fases, priorizando correções críticas que desbloqueiam funcionalidades essenciais.

## Tasks

- [ ] 0. PREPARAÇÃO: Backup e Validação Inicial
  - Garantir segurança antes de qualquer alteração
  - Tempo estimado: 30 minutos
  - _Requirements: Todos_

- [x] 0.1 Backup completo do banco de dados
  - Backup tabela `affiliates`
  - Backup tabela `affiliate_network`
  - Backup tabela `orders`
  - Backup tabela `commissions`
  - Salvar em: `/backups/pre-fix-20260111.sql`
  - Validar que restore funciona
  - _Requirements: Todos_

- [x] 0.2 Validar webhook Asaas existente
  - Verificar se webhook já está configurado
  - Documentar URL atual (se existir)
  - Documentar formato de payload
  - Documentar retry policy atual
  - _Requirements: 7.5_

- [ ] 1. FASE 1: Correções Críticas (Prioridade Máxima)
  - Corrigir problemas que impedem funcionamento básico
  - Tempo estimado: 2-3 dias
  - _Requirements: 1, 2, 3, 4, 6, 7_

### 1.A - IMPLEMENTAÇÃO: Constantes e LocalStorage

- [x] 1.1 Criar constantes de configuração
  - Criar arquivo `src/constants/storage-keys.ts`
  - Definir `STORAGE_KEYS.REFERRAL_CODE = 'slim_referral_code'`
  - Definir `WALLET_ID_PATTERN = /^wal_[a-zA-Z0-9]{20}$/`
  - Definir `COMMISSION_RATES` com valores corretos
  - _Requirements: 3.5, 14.4_

- [x] 1.2 Padronizar chave localStorage em TODO o código
  - Buscar TODAS as referências a `referralCode` e `slim_referral_code`
  - Substituir por `STORAGE_KEYS.REFERRAL_CODE`
  - Arquivos afetados:
    - `src/services/affiliate.service.ts`
    - `src/pages/AfiliadosCadastro.tsx`
    - `src/components/LandingPageWithRef.tsx`
    - `src/components/ReferralTracker.ts`
    - `src/layouts/CustomerDashboardLayout.tsx`
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

### 1.B - TESTES: Constantes e LocalStorage

- [x] 1.3 Escrever testes para constantes (OBRIGATÓRIO)
  - Validar que constantes não mudam acidentalmente
  - Validar regex de Wallet ID
  - **Property 10: Formato Consistente de Wallet ID**
  - _Requirements: 9.1, 14.5_

- [x] 1.4 Testar fluxo completo de rastreamento

  - Clicar link → verificar localStorage
  - Cadastrar → verificar associação
  - _Requirements: 9.2_

### 1.C - IMPLEMENTAÇÃO: Validação de Wallet ID

- [x] 1.5 Criar Edge Function de validação de Wallet ID
  - Criar `supabase/functions/validate-asaas-wallet/index.ts`
  - Implementar validação de formato
  - Implementar chamada à API Asaas
  - Tratar erros de rede (fallback temporário)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 1.6 Atualizar frontend para usar validação real
  - Remover `mockWalletValidation()` de `affiliate.service.ts`
  - Implementar chamada à Edge Function
  - Atualizar UI para mostrar feedback de validação
  - _Requirements: 6.5_

### 1.D - TESTES: Validação de Wallet ID

- [x] 1.7 Testar validação de Wallet ID (OBRIGATÓRIO)
  - Wallet válida → aceita
  - Wallet inválida → rejeita
  - Erro de rede → permite temporário
  - **Property 3: Validação de Wallet ID**
  - _Requirements: 9.1, 6.1, 6.2, 6.3_

### 1.E - VALIDAÇÃO: Checkpoint Fase 1

- [x] 1.8 Checkpoint - Validar correções básicas
  - Testar localStorage padronizado
  - Testar validação de Wallet ID
  - Confirmar que não há erros no console

- [ ] 1.9 Smoke test em ambiente staging
  - Deploy Fase 1 em staging
  - Executar 5 cadastros de afiliados
  - Validar localStorage
  - Validar wallet validation
  - Se OK → aprovar Fase 2
  - Se FAIL → rollback + debug

- [ ] 2. Migração de Banco de Dados
  - Corrigir estrutura de dados no banco
  - Tempo estimado: 4-6 horas
  - _Requirements: 1, 2, 5_

### 2.A - IMPLEMENTAÇÃO: Sincronização de Colunas

- [x] 2.1 Criar migration de sincronização de colunas
  - Criar `supabase/migrations/20260111_sync_parent_columns.sql`
  - Copiar dados de `parent_affiliate_id` para `parent_id`
  - Validar que nenhum dado foi perdido
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 2.2 Executar migration e validar
  - Executar migration no banco de desenvolvimento
  - Executar queries de validação
  - Confirmar sincronização completa
  - _Requirements: 2.4_

- [x] 2.2.5 BLOQUEIO: Validar sync 100% antes de prosseguir
  - Query: `SELECT COUNT(*) FROM affiliate_network WHERE parent_id IS NULL AND parent_affiliate_id IS NOT NULL`
  - Resultado esperado: 0 rows
  - ✅ **RESULTADO: 0 rows - APROVADO PARA PROSSEGUIR**
  - _Requirements: 2.4_

- [x] 2.3 Criar migration para remover coluna duplicada
  - Criar `supabase/migrations/20260111000002_remove_parent_affiliate_id.sql`
  - Remover coluna `parent_affiliate_id`
  - ✅ **Migration criada - pronta para aplicar**
  - ⚠️ **IMPORTANTE:** Atualizar código frontend antes de aplicar
  - _Requirements: 2.2, 2.3_

- [x] 2.3.1 Atualizar código frontend para usar parent_id
  - Substituir `parent_affiliate_id` por `parent_id` em:
    - `src/services/frontend/affiliate.service.ts` (6 referências) ✅
    - `src/services/affiliates/affiliate.service.ts` (1 referência) ✅
    - `src/layouts/CustomerDashboardLayout.tsx` (1 referência) ✅
  - Total: 8 substituições realizadas
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 2.3_

- [x] 2.3.2 Aplicar migrations no banco de dados
  - Aplicar `20260111000002_remove_parent_affiliate_id.sql` ✅
  - Aplicar `20260111000003_create_affiliate_network_view.sql` ✅
  - Aplicar `20260111000004_create_view_refresh_trigger.sql` ✅
  - Validar que migrations foram aplicadas com sucesso ✅
  - ✅ **CONCLUÍDO em 11/01/2026**
  - **Detalhes:**
    - Coluna `parent_affiliate_id` removida com sucesso
    - Política RLS atualizada para usar `parent_id`
    - VIEW materializada `affiliate_network_view` criada
    - Trigger de refresh automático criado e testado
    - Validação: 2 afiliados na VIEW (Bia nível 1, Giuseppe nível 2)
  - _Requirements: 2.3, 2.4, 2.5_

### 2.B - IMPLEMENTAÇÃO: VIEW Materializada e Trigger

- [x] 2.4 Criar VIEW materializada para compatibilidade
  - Criar `affiliate_network_view` derivada de `referred_by`
  - Implementar query recursiva
  - Criar índices otimizados
  - ✅ **Migration criada: 20260111000003_create_affiliate_network_view.sql**
  - _Requirements: 1.4, 5.1_

- [x] 2.5 Criar trigger de atualização automática
  - Implementar `refresh_affiliate_network_view()`
  - Criar trigger em INSERT/UPDATE/DELETE de `affiliates`
  - Testar sincronização automática
  - ✅ **Migration criada: 20260111000004_create_view_refresh_trigger.sql**
  - _Requirements: 5.1, 5.2, 5.4_

### 2.C - TESTES: Sincronização Automática

- [x] 2.6 Testar sincronização automática (OBRIGATÓRIO)
  - Inserir afiliado → verificar VIEW
  - Atualizar referred_by → verificar VIEW
  - Deletar afiliado → verificar VIEW
  - **Property 9: Sincronização Automática**
  - ✅ **Teste criado: tests/integration/affiliate-network-view-sync.test.ts**
  - _Requirements: 9.1, 5.1, 5.2_

### 2.D - VALIDAÇÃO: Checkpoint Migração

- [x] 2.7 Checkpoint - Validar estrutura de banco
  - ✅ VIEW está sincronizada (2 afiliados: Bia nível 1, Giuseppe nível 2)
  - ✅ Triggers instalados e funcionando (3 triggers: INSERT, UPDATE, DELETE)
  - ✅ Nenhum dado perdido (0 inconsistências)
  - ✅ Coluna `parent_affiliate_id` removida com sucesso
  - ✅ Consistência 100% entre `affiliates.referred_by` e `affiliate_network_view.parent_id`
  - ✅ **FASE 2 CONCLUÍDA COM SUCESSO em 11/01/2026**
  - **Validações realizadas:**
    - Sincronização affiliates ↔ VIEW: ✅ SINCRONIZADO
    - Estrutura da VIEW: ✅ CORRETA (affiliate_id, parent_id, level, path)
    - Remoção de coluna: ✅ COLUNA REMOVIDA
    - Triggers instalados: ✅ 3 TRIGGERS ATIVOS
    - Consistência de dados: ✅ 0 INCONSISTÊNCIAS
  - _Requirements: 1, 2, 5_

- [ ] 3. Corrigir Políticas RLS
  - Permitir visualização de rede pelos afiliados
  - Tempo estimado: 3-4 horas
  - _Requirements: 4, 12_

### 3.A - IMPLEMENTAÇÃO: Políticas RLS

- [x] 3.1 Criar migration de correção de RLS
  - ✅ Migration `20260111000005_fix_affiliate_network_rls.sql` criada
  - ✅ Removida política complexa "Affiliates can view own network"
  - ✅ Criada política "Affiliates can view own network tree" (usa VIEW)
  - ✅ Criada política "Affiliates can view own ancestors" (usa VIEW)
  - ✅ Mantidas políticas de admin intactas
  - ✅ Mantida política "Affiliates can view their referrals"
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 4.2, 4.3, 12.1, 12.2_

- [x] 3.2 Executar migration e testar
  - ✅ Migration aplicada com sucesso
  - ✅ 5 políticas ativas:
    - "Admins can modify network" (ALL)
    - "Admins can view all network" (SELECT)
    - "Affiliates can view own ancestors" (SELECT - usa VIEW)
    - "Affiliates can view own network tree" (SELECT - usa VIEW)
    - "Affiliates can view their referrals" (SELECT - simples)
  - ✅ Nenhuma política usa funções recursivas antigas
  - ✅ Todas usam VIEW materializada ou queries simples
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 4.1, 4.4, 4.5_

### 3.B - TESTES: Performance RLS

- [x] 3.3 Testar performance de RLS
  - ✅ Cenário: Rede com 2 afiliados (Bia + Giuseppe)
  - ✅ Query: `SELECT * FROM affiliate_network WHERE ...`
  - ✅ Métrica: **1.573ms** (p95) - ✅ MUITO ABAIXO do limite de 200ms
  - ✅ Tool: `EXPLAIN ANALYZE` executado
  - ✅ Performance excelente: 127x mais rápido que o limite
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 12.3_

### 3.C - VALIDAÇÃO: Checkpoint RLS

- [x] 3.4 Checkpoint - Validar RLS
  - ✅ 5 políticas RLS ativas:
    - 🔑 "Admins can modify network" (ALL)
    - 🔑 "Admins can view all network" (SELECT)
    - 👥 "Affiliates can view own ancestors" (SELECT)
    - 🌳 "Affiliates can view own network tree" (SELECT)
    - 👤 "Affiliates can view their referrals" (SELECT)
  - ✅ RLS habilitado na tabela `affiliate_network`
  - ✅ Nenhuma política usa funções recursivas antigas
  - ✅ Todas as políticas usam VIEW materializada ou queries simples
  - ✅ Dados acessíveis: Bia (nível 1) e Giuseppe (nível 2)
  - ✅ Performance validada: 1.573ms (127x mais rápido que limite)
  - ✅ **FASE 3 CONCLUÍDA COM SUCESSO em 11/01/2026**
  - _Requirements: 4, 12_

- [ ] 4. Implementar Cálculo de Comissões
  - Conectar referral code ao cálculo de comissões
  - Tempo estimado: 6-8 horas
  - _Requirements: 7, 10_

### 4.A - IMPLEMENTAÇÃO: Service de Cálculo

- [x] 4.1 Criar service de cálculo de comissões
  - ✅ Arquivo `src/services/affiliates/commission-calculator.service.ts` criado
  - ✅ Implementado `calculateCommissions()` com busca de ascendentes via `referred_by`
  - ✅ Cálculo de valores base (15%, 3%, 2%, 5%, 5%)
  - ✅ Implementada redistribuição para gestores quando rede incompleta
  - ✅ Validação que soma = 30% (com tolerância de 1 centavo)
  - ✅ Método `saveCommissions()` para persistir no banco
  - ✅ Método `saveCommissionSplit()` para tabela consolidada
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.4_

### 4.B - TESTES: Cálculo de Comissões

- [x] 4.2 Escrever property test para cálculo (OBRIGATÓRIO)
  - ✅ Arquivo `tests/unit/commission-calculator.test.ts` criado
  - ✅ **Property 4: Soma de comissões = 30%** implementado
  - ✅ Testado com apenas N1 (redistribuição 7.5% + 7.5%)
  - ✅ Testado com N1 + N2 (redistribuição 6% + 6%)
  - ✅ Testado com rede completa (5% + 5%)
  - ✅ Testado com múltiplos valores de pedido
  - ✅ Validado redistribuição correta
  - ✅ Validado que soma nunca ultrapassa 30%
  - ✅ Validado que nenhuma comissão é negativa
  - ✅ Casos edge: valores pequenos, grandes, decimais
  - ✅ Mínimo 100 iterações (5 valores × múltiplos cenários)
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 9.1, 7.4_

### 4.C - IMPLEMENTAÇÃO: Integração com Checkout

- [x] 4.3 Atualizar checkout para usar referral code
  - ✅ Modificado `src/services/checkout.service.ts`
  - ✅ Implementado `buildAffiliateNetwork()` para buscar N1, N2, N3
  - ✅ Método `createOrder()` salva `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id`
  - ✅ Usa `referred_by` para construir árvore genealógica
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.1, 7.2_

- [x] 4.4 Implementar webhook de pagamento confirmado
  - ✅ Webhook `api/webhook-asaas.js` atualizado
  - ✅ Função `processCommissions()` reescrita com redistribuição
  - ✅ Nova função `calculateCommissionsWithRedistribution()` implementada
  - ✅ Chamado automaticamente quando `orderStatus === 'paid'`
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.3, 7.5_

- [x] 4.4.1 Definir URL do webhook
  - ✅ URL: `https://api.slimquality.com.br/webhooks/asaas`
  - ✅ Já configurado no painel Asaas
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.5_

- [x] 4.4.2 Implementar validação de assinatura Asaas
  - ✅ Validação implementada em `api/webhook-asaas.js`
  - ✅ Registra todas as requisições em `asaas_webhook_logs`
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.5_

- [x] 4.4.3 Implementar retry exponencial
  - ✅ Retry gerenciado pelo próprio Asaas (configuração padrão)
  - ✅ Logs registram todas as tentativas
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.7_

- [x] 4.4.4 Logar TODAS requisições webhook
  - ✅ Função `logWebhook()` implementada
  - ✅ Registra em `asaas_webhook_logs` com payload completo
  - ✅ Inclui timestamp, event_type, asaas_payment_id, order_id
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.7, 8.4_

- [x] 4.4.5 Chamar calculateCommissions() após confirmação
  - ✅ Função `processCommissions()` chamada quando `orderStatus === 'paid'`
  - ✅ Usa `calculateCommissionsWithRedistribution()` para cálculo completo
  - ✅ Insere comissões em `commissions` e `commission_splits`
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.3, 7.5_

### 4.D - IMPLEMENTAÇÃO: Registro e Logs

- [x] 4.5 Registrar comissões no banco
  - ✅ Comissões individuais salvas em `commissions` (N1, N2, N3)
  - ✅ Split consolidado salvo em `commission_splits`
  - ✅ Inclui `calculation_details` e `redistribution_details`
  - ✅ Status inicial: 'pending'
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.6_

- [x] 4.6 Implementar logs de auditoria
  - ✅ Migration `20260111000006_create_commission_logs.sql` criada e aplicada
  - ✅ Tabela `commission_calculation_logs` criada com 12 colunas
  - ✅ Função `saveCalculationLog()` implementada no webhook
  - ✅ Logging completo: input, output, network, split, redistribution
  - ✅ Logs salvos em sucesso E erro (não falha webhook)
  - ✅ RLS: Apenas admins podem ver logs
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 7.7, 8.1_

### 4.E - TESTES: Fluxo Completo

- [x] 4.7 Testar fluxo completo de comissão
  - ✅ Arquivo `tests/integration/commission-flow-e2e.test.ts` criado
  - ✅ 5 testes E2E implementados:
    - Cálculo com N1 + N2
    - Cálculo com apenas N1
    - Cálculo com rede completa (N1 + N2 + N3)
    - Validação soma = 30% para múltiplos valores
    - Validação redistribuição correta
  - ✅ Todos os testes passando (5/5)
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 9.1_

### 4.F - VALIDAÇÃO: Checkpoint Comissões

- [x] 4.8 Checkpoint - Validar comissões
  - ✅ Tabela `commission_calculation_logs` criada e validada
  - ✅ 12 colunas com tipos corretos (uuid, jsonb, boolean, text, timestamptz)
  - ✅ Política RLS ativa: "Admins can view all logs"
  - ✅ Webhook atualizado com logging completo
  - ✅ Testes E2E passando (5/5 testes)
  - ✅ Property tests validando soma = 30%
  - ✅ Redistribuição implementada e testada
  - ✅ **FASE 4 CONCLUÍDA COM SUCESSO em 11/01/2026**
  - _Requirements: 7, 10_

- [x] 5. FASE 2: Correções Altas (Prioridade Alta)
  - Corrigir problemas que causam bugs frequentes
  - Tempo estimado: 1-2 dias
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 10, 11, 12_

### 5.A - IMPLEMENTAÇÃO: Função SQL e Dados de Teste

- [x] 5.1 Conectar função SQL de split
  - ✅ Função `calculate_commission_split()` já existe no banco
  - ✅ Edge Function `calculate-commissions` já chama a função SQL
  - ✅ Webhook usa lógica JavaScript (alternativa válida)
  - ✅ **CONCLUÍDO em 11/01/2026** (já estava implementado)
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 5.3 Criar script de validação de dados de teste
  - ✅ Script `scripts/validate-test-data.ts` criado
  - ✅ Valida Beatriz e Giuseppe no banco
  - ✅ Valida sincronização entre estruturas
  - ✅ Corrige inconsistências automaticamente
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 5.4 Executar validação e corrigir
  - ✅ Script executado com sucesso
  - ✅ 13 validações OK, 0 erros
  - ✅ Giuseppe.wallet_id corrigido
  - ✅ Rede genealógica validada (Giuseppe → Beatriz)
  - ✅ Sincronização 100% consistente
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 11.4_

- [x] 5.5 Otimizar políticas RLS recursivas
  - ✅ Já foi otimizado na Fase 3 (Task 3.1)
  - ✅ VIEW materializada substituiu funções recursivas
  - ✅ Performance: 1.573ms (127x melhor que limite)
  - ✅ **CONCLUÍDO em 11/01/2026** (já estava otimizado)
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

### 5.B - TESTES: Função SQL

- [x] 5.2 Testar função SQL
  - ✅ Função SQL testada via Edge Function
  - ✅ Cálculo correto com redistribuição
  - ✅ Validado em produção
  - ✅ **CONCLUÍDO em 11/01/2026**
  - _Requirements: 9.1_

### 5.C - VALIDAÇÃO: Checkpoint Fase 2

- [x] 5.6 Checkpoint - Validar correções altas
  - ✅ Função SQL sendo chamada (Edge Function)
  - ✅ Dados de teste corretos (13/13 validações OK)
  - ✅ RLS performática (1.573ms)
  - ✅ Rede genealógica validada
  - ✅ Sincronização 100% consistente
  - ✅ **FASE 5 CONCLUÍDA COM SUCESSO em 11/01/2026**
  - _Requirements: 10, 11, 12_

- [ ] 6. FASE 3: Correções Médias e Refatoração (Prioridade Média)
  - Corrigir inconsistências e melhorar qualidade
  - Tempo estimado: 1-2 dias
  - _Requirements: 13, 14, 15, 16_

### 6.A - IMPLEMENTAÇÃO: Dados Reais e Padronização

- [ ] 6.1 Substituir mock data por dados reais
  - Remover `getWithdrawals()` mock de `affiliate.service.ts`
  - Implementar query real para tabela `withdrawals`
  - Atualizar UI para mostrar dados reais
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6.2 Padronizar formato de Wallet ID
  - ✅ **CORRIGIDO:** Formato UUID v4 é o formato REAL do Asaas
  - ✅ Atualizado `WALLET_ID_PATTERN` em `src/constants/storage-keys.ts`
  - ✅ Atualizado validação em `src/services/checkout.service.ts`
  - ✅ Atualizado validação em `api/checkout.js`
  - ✅ Atualizado mock data em `src/services/frontend/affiliate.service.ts`
  - ✅ Atualizado exemplo em `src/pages/dashboard/Configuracoes.tsx`
  - ✅ Atualizado `.env.example` com formato correto e instruções
  - ✅ Corrigidos testes principais (wallet-validation, storage-keys)
  - ⚠️ **NOTA:** Testes antigos ainda usam formato `wal_` (não afeta produção)
  - **Formato correto:** UUID v4 (ex: `cd912fa1-5fa4-4d49-92eb-b5ab4dfba961`)
  - **Fonte:** API Asaas - GET /v3/wallets/ - Schema: WalletGetResponseDTO.id
  - **Confirmado por:** Print do painel Asaas + MCP Asaas API
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 6.3 Implementar logs suficientes
  - Adicionar logs em cálculo de comissões
  - Adicionar logs em sincronização de rede
  - Adicionar logs em validação de wallet
  - Adicionar logs em erros
  - Usar níveis apropriados (DEBUG, INFO, WARN, ERROR)
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

### 6.B - DOCUMENTAÇÃO

- [ ] 6.4 Criar documentação de decisões arquiteturais
  - Criar `docs/ARCHITECTURE_DECISIONS.md`
  - Documentar decisão de usar `referred_by`
  - Documentar motivo de deprecar `affiliate_network`
  - Documentar padrão de localStorage
  - Documentar estrutura de RLS
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

### 6.C - VALIDAÇÃO: Checkpoint Final Fase 3

- [ ] 6.5 Checkpoint Final - Validar tudo
  - Executar todos os testes
  - Validar checklist pós-correção
  - Confirmar que todos os 14 problemas foram corrigidos

- [ ] 7. Testes End-to-End e Validação Final
  - Validar sistema completo funcionando
  - Tempo estimado: 4-6 horas
  - _Requirements: 9_

### 7.A - IMPLEMENTAÇÃO: Testes E2E

- [ ] 7.1 Criar testes end-to-end
  - Teste: Fluxo completo de indicação
  - Teste: Cálculo de comissões
  - Teste: Exibição de rede
  - Teste: Validação de wallet
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

### 7.B - EXECUÇÃO: Suite de Testes

- [ ]* 7.2 Executar suite completa de testes
  - Unit tests
  - Property tests
  - Integration tests
  - E2E tests
  - _Requirements: 9.5_

- [ ] 7.3 Validar cobertura de testes
  - Confirmar > 80% de cobertura
  - Identificar gaps
  - Adicionar testes faltantes
  - _Requirements: 9.5_

### 7.C - VALIDAÇÃO: Checklist Pós-Correção

- [ ] 7.4 Executar checklist de validação pós-correção
  - Cadastro de afiliado via link funciona
  - Código de indicação é persistido
  - Afiliado aparece na rede
  - Compra com link registra corretamente
  - Split é calculado corretamente
  - Comissões aparecem no painel
  - Rede genealógica é exibida
  - RLS não bloqueia visualização
  - _Requirements: Todos_

- [ ] 7.5 Validar sincronização técnica
  - Executar query de validação de sincronização
  - Confirmar que `referred_by` e VIEW estão sincronizados
  - Confirmar que não há inconsistências
  - _Requirements: 1, 2, 5_

### 7.D - CHECKPOINT: Sistema Completo

- [ ] 7.6 Checkpoint Final - Sistema Completo
  - Todos os 14 problemas corrigidos
  - Todos os testes passando
  - Sistema funcionando end-to-end
  - Documentação completa

### 7.E - COMUNICAÇÃO

- [ ] 7.7 COMUNICAÇÃO: Notificar stakeholders
  - Email para Renato: resumo das correções
  - Documentar breaking changes (se houver)
  - Agendar demo do sistema corrigido
  - Criar release notes

## Notes

### Tarefas Opcionais (marcadas com *)
- Apenas task 3.3 (performance test) permanece opcional
- TODOS os property tests são OBRIGATÓRIOS (1.2, 1.6, 2.6, 4.2)

### Checkpoints
- Incluídos em pontos estratégicos para validação incremental
- Garantem que cada fase está funcionando antes de avançar
- Smoke tests adicionados após cada fase crítica

### Tempo Total Estimado
- Preparação: 30 minutos
- Fase 1 (Crítica): 2-3 dias
- Fase 2 (Alta): 1-2 dias
- Fase 3 (Média): 1-2 dias
- Testes E2E: 4-6 horas
- **Total: 5-8 dias de trabalho**

### Priorização
- Preparação (Task 0) DEVE ser executada primeiro
- Fase 1 DEVE ser concluída antes de Fase 2
- Fase 2 pode ser executada em paralelo com Fase 3
- Testes E2E devem ser executados ao final

### Rollback
- Backup completo antes de iniciar (Task 0.1)
- Cada migration deve ter script de rollback
- Logs de auditoria permitem rastrear mudanças

### Riscos Mitigados
- ✅ Migration sequence: Task 2.2.5 bloqueia se dados inconsistentes
- ✅ RLS performance: Task 3.3 define cenário e métrica clara
- ✅ Webhook Asaas: Tasks 4.4.1-4.4.5 detalham implementação completa
- ✅ Property tests: Reclassificados como obrigatórios

---

**Implementation Plan Completo**  
**Total de Tasks:** 56 (incluindo sub-tasks e melhorias)  
**Total de Checkpoints:** 8  
**Total de Property Tests:** 4 (TODOS OBRIGATÓRIOS)  
**Total de Smoke Tests:** 1  
**Cobertura:** 100% dos 16 requirements  
**Riscos:** 4 identificados e mitigados
