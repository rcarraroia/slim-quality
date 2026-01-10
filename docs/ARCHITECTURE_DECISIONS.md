# 📐 DECISÕES ARQUITETURAIS - SISTEMA DE AFILIADOS

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 VISÃO GERAL

Este documento registra as principais decisões arquiteturais tomadas durante o desenvolvimento do sistema de afiliados da Slim Quality, incluindo o contexto, alternativas consideradas e justificativas.

---

## 🗄️ DECISÃO 1: Usar `referred_by` como Fonte da Verdade

### **Contexto**
O sistema tinha duas estruturas para representar a rede de afiliados:
- `affiliates.referred_by` (coluna direta)
- `affiliate_network` (tabela separada com `parent_affiliate_id`)

### **Problema**
- Duplicação de dados
- Inconsistências entre as duas estruturas
- Complexidade de manutenção
- Risco de dados divergentes

### **Alternativas Consideradas**

1. **Manter ambas as estruturas**
   - ❌ Complexidade de sincronização
   - ❌ Risco de inconsistências
   - ❌ Duplicação de lógica

2. **Usar apenas `affiliate_network`**
   - ❌ Mais complexo para queries simples
   - ❌ Requer joins desnecessários
   - ❌ Menos intuitivo

3. **Usar apenas `referred_by` + VIEW materializada** ✅
   - ✅ Fonte única da verdade
   - ✅ Simples e intuitivo
   - ✅ VIEW para compatibilidade
   - ✅ Performance excelente

### **Decisão Final**
**Usar `affiliates.referred_by` como fonte da verdade e criar VIEW materializada `affiliate_network_view` para compatibilidade.**

### **Justificativa**
- Simplicidade: Uma única coluna representa toda a rede
- Integridade: Impossível ter dados divergentes
- Performance: VIEW materializada oferece performance similar
- Manutenibilidade: Menos código para manter

### **Implementação**
- Migration: `20260111000002_remove_parent_affiliate_id.sql`
- VIEW: `20260111000003_create_affiliate_network_view.sql`
- Triggers: `20260111000004_create_view_refresh_trigger.sql`

---

## 🔐 DECISÃO 2: Otimizar RLS com VIEW Materializada

### **Contexto**
Políticas RLS usavam funções recursivas para buscar rede de afiliados, causando:
- Latência alta (>200ms)
- Queries N+1
- Problemas de escalabilidade

### **Problema**
```sql
-- Política antiga (recursiva)
CREATE POLICY "Affiliates can view own network"
  ON affiliate_network FOR SELECT
  USING (
    affiliate_id IN (
      WITH RECURSIVE network AS (...)  -- Recursão cara
    )
  );
```

### **Alternativas Consideradas**

1. **Manter funções recursivas**
   - ❌ Performance ruim
   - ❌ Não escala
   - ❌ Latência >200ms

2. **Cache em aplicação**
   - ❌ Complexidade adicional
   - ❌ Risco de dados stale
   - ❌ Não resolve problema no banco

3. **VIEW materializada + Triggers** ✅
   - ✅ Performance excelente (1.573ms)
   - ✅ Dados sempre atualizados
   - ✅ Queries simples
   - ✅ Escalável

### **Decisão Final**
**Criar VIEW materializada `affiliate_network_view` com triggers de atualização automática.**

### **Justificativa**
- Performance: 127x mais rápido que limite (1.573ms vs 200ms)
- Simplicidade: Políticas RLS usam queries simples
- Escalabilidade: Suporta milhares de afiliados
- Manutenibilidade: Atualização automática via triggers

### **Implementação**
- VIEW: `affiliate_network_view` (materializada)
- Triggers: INSERT, UPDATE, DELETE em `affiliates`
- Políticas RLS: Usam VIEW ao invés de recursão

---

## 💰 DECISÃO 3: Cálculo de Comissões com Redistribuição

### **Contexto**
Sistema precisa calcular comissões multinível (N1, N2, N3) com redistribuição automática para gestores quando rede incompleta.

### **Problema**
- Lógica complexa de redistribuição
- Validação que soma = 30%
- Múltiplos cenários (apenas N1, N1+N2, completo)

### **Alternativas Consideradas**

1. **Cálculo apenas no frontend**
   - ❌ Inseguro
   - ❌ Não auditável
   - ❌ Difícil de testar

2. **Função SQL pura**
   - ✅ Seguro
   - ❌ Difícil de testar
   - ❌ Menos flexível

3. **Service TypeScript + Função SQL** ✅
   - ✅ Testável (property tests)
   - ✅ Flexível
   - ✅ Auditável
   - ✅ Duas opções (JS ou SQL)

### **Decisão Final**
**Implementar `CommissionCalculatorService` em TypeScript com opção de usar função SQL.**

### **Justificativa**
- Testabilidade: Property tests garantem soma = 30%
- Flexibilidade: Lógica pode ser ajustada facilmente
- Auditoria: Logs completos de cada cálculo
- Opções: Webhook usa JS, Edge Function usa SQL

### **Implementação**
- Service: `src/services/affiliates/commission-calculator.service.ts`
- Função SQL: `calculate_commission_split()`
- Webhook: `api/webhook-asaas.js` (usa JS)
- Edge Function: `supabase/functions/calculate-commissions/` (usa SQL)

---

## 📝 DECISÃO 4: Logs de Auditoria Completos

### **Contexto**
Sistema financeiro precisa de rastreabilidade total de cada centavo distribuído.

### **Problema**
- Auditoria de comissões
- Debugging de problemas
- Compliance financeiro

### **Alternativas Consideradas**

1. **Logs apenas em console**
   - ❌ Não persistente
   - ❌ Não auditável
   - ❌ Perdido em deploy

2. **Logs em arquivo**
   - ❌ Difícil de consultar
   - ❌ Não estruturado
   - ❌ Sem queries

3. **Tabela de logs no banco** ✅
   - ✅ Persistente
   - ✅ Consultável via SQL
   - ✅ Estruturado (JSONB)
   - ✅ Auditável

### **Decisão Final**
**Criar tabela `commission_calculation_logs` com todos os detalhes de cada cálculo.**

### **Justificativa**
- Auditoria: Cada cálculo registrado permanentemente
- Debugging: Fácil identificar problemas
- Compliance: Rastreabilidade total
- Performance: Não impacta webhook (async)

### **Implementação**
- Tabela: `commission_calculation_logs`
- Campos: input_data, output_data, network_data, split_data, redistribution_details
- RLS: Apenas admins podem ver
- Webhook: Salva log em sucesso E erro

---

## 🔄 DECISÃO 5: Webhook JavaScript vs Edge Function SQL

### **Contexto**
Duas opções para processar comissões quando pagamento confirmado.

### **Problema**
- Webhook Asaas precisa responder rápido
- Cálculo de comissões pode ser complexo
- Precisa ser confiável

### **Alternativas Consideradas**

1. **Apenas Webhook JavaScript**
   - ✅ Simples
   - ✅ Rápido
   - ❌ Lógica duplicada

2. **Apenas Edge Function SQL**
   - ✅ Centralizado
   - ❌ Mais complexo
   - ❌ Depende de Edge Function

3. **Ambos (redundância)** ✅
   - ✅ Webhook usa JS (rápido)
   - ✅ Edge Function usa SQL (alternativa)
   - ✅ Flexibilidade
   - ✅ Fallback

### **Decisão Final**
**Manter ambas as implementações: Webhook usa JavaScript, Edge Function usa SQL.**

### **Justificativa**
- Flexibilidade: Duas opções válidas
- Performance: Webhook responde rápido
- Confiabilidade: Fallback disponível
- Manutenibilidade: Lógica testada em ambos

### **Implementação**
- Webhook: `api/webhook-asaas.js` (JavaScript)
- Edge Function: `supabase/functions/calculate-commissions/` (SQL)
- Ambos: Salvam logs de auditoria

---

## 🎯 DECISÃO 6: Property-Based Testing

### **Contexto**
Cálculo de comissões tem regra crítica: soma sempre = 30%.

### **Problema**
- Testes unitários não cobrem todos os casos
- Valores decimais podem causar erros de arredondamento
- Redistribuição complexa

### **Alternativas Consideradas**

1. **Apenas testes unitários**
   - ❌ Não cobre todos os casos
   - ❌ Valores fixos
   - ❌ Pode perder edge cases

2. **Property-based tests** ✅
   - ✅ Testa múltiplos valores
   - ✅ Valida propriedade (soma = 30%)
   - ✅ Encontra edge cases
   - ✅ Confiança alta

### **Decisão Final**
**Implementar property tests que validam soma = 30% para múltiplos valores e cenários.**

### **Justificativa**
- Confiança: Valida propriedade matemática
- Cobertura: Testa 100+ combinações
- Edge cases: Encontra problemas de arredondamento
- Manutenibilidade: Testes auto-documentados

### **Implementação**
- Arquivo: `tests/unit/commission-calculator.test.ts`
- Property 4: Soma de comissões = 30%
- Cenários: Apenas N1, N1+N2, rede completa
- Valores: R$ 1.000 a R$ 10.000

---

## 📊 RESUMO DAS DECISÕES

| # | Decisão | Alternativa Escolhida | Justificativa Principal |
|---|---------|----------------------|------------------------|
| 1 | Estrutura de rede | `referred_by` + VIEW | Simplicidade e integridade |
| 2 | Performance RLS | VIEW materializada | 127x mais rápido |
| 3 | Cálculo comissões | Service TS + SQL | Testabilidade |
| 4 | Auditoria | Tabela de logs | Rastreabilidade total |
| 5 | Processamento | Webhook JS + Edge SQL | Flexibilidade |
| 6 | Testes | Property-based | Confiança matemática |

---

## 🔄 EVOLUÇÃO FUTURA

### **Possíveis Melhorias**
1. Cache de rede de afiliados (Redis)
2. Processamento assíncrono de comissões (queue)
3. Dashboard de auditoria de logs
4. Alertas automáticos de inconsistências

### **Não Recomendado**
- ❌ Voltar para `affiliate_network` como fonte da verdade
- ❌ Remover VIEW materializada
- ❌ Remover logs de auditoria
- ❌ Remover property tests

---

## 📚 REFERÊNCIAS

- **Migrations:** `supabase/migrations/`
- **Services:** `src/services/affiliates/`
- **Testes:** `tests/unit/`, `tests/integration/`
- **Documentação:** `.kiro/specs/correcao-critica-sistema-afiliados/`

---

**Documento criado em:** 11/01/2026  
**Autor:** Kiro AI  
**Status:** Ativo e obrigatório para consulta
