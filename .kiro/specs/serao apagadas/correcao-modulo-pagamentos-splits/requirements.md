# 📋 REQUIREMENTS: Correção do Módulo de Pagamentos e Splits Asaas

**Data de Criação:** 16/01/2026  
**Prioridade:** Alta  
**Tipo:** Correção Arquitetural + Otimização  
**Baseado em:** ANALISE_MODULO_PAGAMENTOS_SPLITS_ASAAS.md

---

## 🎯 VISÃO GERAL

### Problema Identificado

O sistema atual de pagamentos e splits funciona, mas usa uma abordagem mais complexa do que o necessário, não seguindo as melhores práticas da documentação oficial do Asaas. Isso resulta em:

- **Mais pontos de falha:** 10 etapas vs 6 etapas recomendadas
- **Mais chamadas à API:** 3+ chamadas vs 1 chamada recomendada
- **Maior complexidade:** Processamento manual de splits ao invés de automático
- **Inconsistências:** Pagamento inicial de assinaturas sem split

### Objetivo

Refatorar o módulo de pagamentos e splits para seguir as melhores práticas do Asaas, reduzindo complexidade, pontos de falha e melhorando a manutenibilidade do código.

### Benefícios Esperados

- ✅ **40% menos pontos de falha** (10 → 6 etapas)
- ✅ **66% menos chamadas à API** (3+ → 1 chamada)
- ✅ **Código mais simples** e fácil de manter
- ✅ **Processamento automático** de splits pelo Asaas
- ✅ **Alinhamento com documentação oficial** do Asaas

---

## 👥 STAKEHOLDERS

- **Usuários Finais:** Médicos veterinários, zootecnistas fazendo pagamentos
- **Afiliados:** Recebem comissões automaticamente
- **COMADEMIG:** Recebe pagamentos diretamente
- **RENUM:** Recebe via split
- **Equipe de Desenvolvimento:** Código mais simples de manter

---

## 📊 USER STORIES

### 🔴 CRÍTICAS (Prioridade Alta)

#### US-1: Split Automático em Pagamentos PIX

**Como** usuário fazendo pagamento via PIX  
**Quero** que os splits sejam configurados automaticamente na criação do pagamento  
**Para que** o processamento seja mais rápido e confiável

**Critérios de Aceitação:**
- [ ] Campo `split` é enviado na criação do pagamento PIX
- [ ] Splits incluem COMADEMIG, RENUM e Afiliado (se houver)
- [ ] Percentuais corretos por tipo de serviço (filiação: 40/40/20, serviços: 60/40)
- [ ] Asaas processa splits automaticamente quando pagamento é confirmado
- [ ] Webhook recebe eventos `TRANSFER_*` do Asaas
- [ ] Não é necessário chamar Edge Functions de configuração manual

**Regras de Negócio:**
- Splits devem ser calculados ANTES da criação do pagamento
- COMADEMIG recebe diretamente (não precisa wallet)
- RENUM e Afiliado precisam de wallet_id válido
- Se não houver afiliado, apenas COMADEMIG e RENUM recebem

---

#### US-2: Split Automático em Pagamentos com Cartão

**Como** usuário fazendo pagamento com cartão  
**Quero** que os splits sejam configurados automaticamente  
**Para que** o processamento seja consistente com PIX

**Critérios de Aceitação:**
- [ ] Campo `split` é enviado na criação do pagamento com cartão
- [ ] Suporte a parcelamento com `totalFixedValue`
- [ ] Splits calculados sobre valor total, não por parcela
- [ ] Validação de wallet_id antes de enviar
- [ ] Tratamento de erro se wallet inválido

**Regras de Negócio:**
- Para parcelamento (installmentCount > 1), usar `totalFixedValue`
- Para pagamento à vista, usar `fixedValue` ou `percentualValue`
- Splits devem somar 100% do valor

---

#### US-3: Suporte a totalFixedValue em Parcelamentos

**Como** desenvolvedor  
**Quero** usar `totalFixedValue` em pagamentos parcelados  
**Para que** o valor seja dividido corretamente entre as parcelas

**Critérios de Aceitação:**
- [ ] Função `formatSplitsForAsaas` detecta parcelamento
- [ ] Se `installmentCount > 1`, usa `totalFixedValue`
- [ ] Se `installmentCount = 1`, usa `fixedValue`
- [ ] Documentação clara sobre quando usar cada campo
- [ ] Testes cobrindo ambos os cenários

**Regras de Negócio:**
- `totalFixedValue` = valor total a ser dividido entre parcelas
- `fixedValue` = valor fixo por cobrança
- Não misturar os dois no mesmo split

---

### 🟡 IMPORTANTES (Prioridade Média)

#### US-4: Split no Pagamento Inicial de Assinaturas

**Como** usuário criando assinatura  
**Quero** que o pagamento inicial também tenha split configurado  
**Para que** as comissões sejam geradas desde o início

**Critérios de Aceitação:**
- [ ] Pagamento inicial criado COM split
- [ ] Assinatura recorrente criada COM split
- [ ] Ambos usam mesma configuração de split
- [ ] Webhook processa ambos corretamente
- [ ] Comissões registradas para pagamento inicial

**Regras de Negócio:**
- Pagamento inicial e renovações devem ter mesma configuração de split
- Se afiliado indicou, ambos devem gerar comissão
- Status da assinatura só muda para 'active' após confirmação do pagamento inicial

---

#### US-5: Simplificação do Processamento no Webhook

**Como** sistema  
**Quero** processar eventos de split recebidos do Asaas  
**Para que** não seja necessário processamento manual

**Critérios de Aceitação:**
- [ ] Webhook recebe eventos `TRANSFER_DONE`, `TRANSFER_FAILED`, `TRANSFER_CANCELLED`
- [ ] Atualiza status dos splits baseado nos eventos
- [ ] Remove processamento manual de splits
- [ ] Mantém registro de comissões para afiliados
- [ ] Logs estruturados de todos os eventos

**Regras de Negócio:**
- Eventos de split são enviados pelo Asaas após confirmação do pagamento
- Status deve ser atualizado atomicamente
- Erros não devem pausar o webhook

---

#### US-6: Deprecação de Edge Functions Manuais

**Como** desenvolvedor  
**Quero** remover Edge Functions de processamento manual  
**Para que** o código seja mais simples e fácil de manter

**Critérios de Aceitação:**
- [ ] `asaas-configure-split` marcada como deprecated
- [ ] `asaas-process-splits` marcada como deprecated
- [ ] Documentação atualizada explicando nova abordagem
- [ ] Código comentado mas não removido (para referência)
- [ ] Testes atualizados para nova abordagem

**Regras de Negócio:**
- Manter functions por 30 dias para casos especiais
- Após 30 dias, remover completamente
- Criar migration guide para desenvolvedores

---

### 🟢 MELHORIAS (Prioridade Baixa)

#### US-7: Consolidação de Tabelas de Assinaturas

**Como** desenvolvedor  
**Quero** usar apenas uma tabela para assinaturas  
**Para que** não haja duplicação de dados

**Critérios de Aceitação:**
- [ ] Verificar se `asaas_subscriptions` ainda é usada
- [ ] Se não, criar migration para remover
- [ ] Atualizar documentação do banco
- [ ] Verificar se há dados que precisam ser migrados
- [ ] Atualizar tipos TypeScript

**Regras de Negócio:**
- Não perder dados existentes
- Fazer backup antes de remover
- Testar em ambiente de desenvolvimento primeiro

---

#### US-8: Testes Automatizados

**Como** desenvolvedor  
**Quero** testes automatizados para splits  
**Para que** mudanças futuras não quebrem funcionalidades

**Critérios de Aceitação:**
- [ ] Testes unitários para cálculo de splits
- [ ] Testes de integração para criação de pagamento com split
- [ ] Testes de webhook para eventos de split
- [ ] Testes de edge cases (sem afiliado, parcelamento, etc)
- [ ] Cobertura mínima de 80%

**Regras de Negócio:**
- Testes devem rodar em CI/CD
- Não usar dados de produção
- Usar mocks para API do Asaas

---

#### US-9: Documentação do Fluxo de Splits

**Como** desenvolvedor novo no projeto  
**Quero** documentação clara do fluxo de splits  
**Para que** eu entenda como o sistema funciona

**Critérios de Aceitação:**
- [ ] Diagrama de sequência do fluxo completo
- [ ] Documentação de cada Edge Function
- [ ] Exemplos de payloads de request/response
- [ ] Troubleshooting guide
- [ ] FAQ sobre splits

**Regras de Negócio:**
- Documentação deve estar no repositório
- Atualizar quando houver mudanças
- Incluir exemplos práticos

---

## 🔧 REQUISITOS TÉCNICOS

### Edge Functions a Modificar

1. **asaas-create-pix-payment**
   - Adicionar campo `split` no payload
   - Integrar com `getSplitConfiguration`
   - Remover chamada para `asaas-configure-split`

2. **asaas-process-card**
   - Adicionar campo `split` no payload
   - Implementar lógica de `totalFixedValue`
   - Remover chamada para `asaas-configure-split`

3. **asaas-create-subscription**
   - Criar pagamento inicial COM split
   - Manter split na assinatura recorrente
   - Garantir consistência entre ambos

4. **asaas-webhook**
   - Adicionar handlers para eventos `TRANSFER_*`
   - Simplificar processamento de splits
   - Remover processamento manual

### Arquivos Compartilhados a Criar

1. **shared/split-config.ts**
   - `getSplitConfiguration(affiliateCode?, serviceType?)`
   - `formatSplitsForAsaas(config, installmentCount?)`
   - `calculateSplitAmounts(totalValue, config)`

2. **shared/types.ts**
   - Adicionar tipos para splits
   - Atualizar `CreatePaymentData` com campo `split`
   - Adicionar tipos para eventos de webhook

### Banco de Dados

- Nenhuma alteração necessária nas tabelas
- Possível remoção de `asaas_subscriptions` (US-7)

---

## 📏 CRITÉRIOS DE SUCESSO

### Métricas Quantitativas

- [ ] Redução de 40% nos pontos de falha (10 → 6)
- [ ] Redução de 66% nas chamadas à API (3+ → 1)
- [ ] Tempo de processamento reduzido em 30%
- [ ] Zero erros de split em produção por 30 dias

### Métricas Qualitativas

- [ ] Código mais legível e manutenível
- [ ] Alinhamento com documentação oficial do Asaas
- [ ] Feedback positivo da equipe de desenvolvimento
- [ ] Facilidade de onboarding de novos desenvolvedores

---

## 🚫 FORA DO ESCOPO

- Mudanças na interface do usuário
- Alteração de percentuais de split
- Novos métodos de pagamento
- Integração com outros gateways
- Mudanças no sistema de afiliados (apenas integração)

---

## 🔗 DEPENDÊNCIAS

### Externas
- API do Asaas (v3)
- Documentação oficial do Asaas
- Webhooks do Asaas configurados

### Internas
- Sistema de afiliados funcionando
- Tabela `affiliates` com `asaas_wallet_id`
- Variável de ambiente `RENUM_WALLET_ID`
- Edge Functions existentes

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Quebrar Pagamentos Existentes
**Probabilidade:** Média  
**Impacto:** Alto  
**Mitigação:**
- Testar extensivamente em sandbox
- Deploy gradual (feature flag)
- Manter código antigo como fallback
- Monitorar logs após deploy

### Risco 2: Splits Não Processados pelo Asaas
**Probabilidade:** Baixa  
**Impacto:** Alto  
**Mitigação:**
- Validar wallet_ids antes de enviar
- Implementar retry logic
- Alertas automáticos para falhas
- Processamento manual como backup

### Risco 3: Inconsistência de Dados Durante Migração
**Probabilidade:** Média  
**Impacto:** Médio  
**Mitigação:**
- Fazer backup completo antes
- Testar migration em ambiente de dev
- Executar em horário de baixo tráfego
- Ter plano de rollback pronto

---

## 📅 CRONOGRAMA ESTIMADO

### Fase 1: Críticas (1 semana)
- US-1: Split em PIX (2 dias)
- US-2: Split em Cartão (2 dias)
- US-3: totalFixedValue (1 dia)
- Testes e validação (2 dias)

### Fase 2: Importantes (1 semana)
- US-4: Split em Assinaturas (2 dias)
- US-5: Webhook simplificado (2 dias)
- US-6: Deprecação de functions (1 dia)
- Testes e validação (2 dias)

### Fase 3: Melhorias (1 semana)
- US-7: Consolidação de tabelas (2 dias)
- US-8: Testes automatizados (2 dias)
- US-9: Documentação (1 dia)
- Revisão final (2 dias)

**Total Estimado:** 3 semanas (15 dias úteis)

---

## 📚 REFERÊNCIAS

- [Análise Completa do Módulo](../../ANALISE_MODULO_PAGAMENTOS_SPLITS_ASAAS.md)
- [Documentação Oficial Asaas - Payments](https://docs.asaas.com/reference/criar-nova-cobranca)
- [Documentação Oficial Asaas - Subscriptions](https://docs.asaas.com/reference/criar-nova-assinatura)
- [Documentação Oficial Asaas - Splits](https://docs.asaas.com/docs/split-de-pagamento)
- [Documentação Oficial Asaas - Webhooks](https://docs.asaas.com/docs/webhooks)

---

## ✅ APROVAÇÃO

**Status:** Aguardando Aprovação  
**Criado por:** Kiro AI  
**Data:** 16/01/2026  
**Revisado por:** _Pendente_  
**Aprovado por:** _Pendente_

---

**Próximo Passo:** Criar arquivo `design.md` com detalhamento técnico da implementação.
