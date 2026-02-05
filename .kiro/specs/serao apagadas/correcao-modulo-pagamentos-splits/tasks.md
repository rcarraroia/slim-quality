# ✅ TASKS: Correção do Módulo de Pagamentos e Splits Asaas

**Data de Criação:** 16/01/2026  
**Baseado em:** requirements.md + design.md  
**Status:** Aguardando Início

---

## 📋 REGRAS IMPORTANTES

### Documentos de Referência Obrigatórios

Antes de iniciar QUALQUER tarefa, ler:

- **`.kiro/steering/analise-preventiva-obrigatoria.md`** - Análise prévia obrigatória (10 min máximo)
- **`.kiro/steering/compromisso-honestidade.md`** - Honestidade sobre status real
- **`.kiro/steering/verificacao-banco-real.md`** - Verificar banco antes de mudanças
- **`.kiro/steering/funcionalidade-sobre-testes.md`** - Funcionalidade > Testes

### Ferramentas Disponíveis

- **Supabase Power MCP** - Acesso ao banco de dados real
- **Asaas MCP** - Consulta à documentação oficial do Asaas
- **Vercel MCP** - Deploy e gerenciamento do projeto

### Protocolo de Execução

1. **ANÁLISE PRÉVIA** - Ler arquivos, entender contexto, planejar
2. **IMPLEMENTAÇÃO** - Seguir o plano, usar padrões existentes
3. **TESTE** - Máximo 2 tentativas, reportar se não funcionar
4. **VALIDAÇÃO** - Solicitar aprovação do usuário antes de prosseguir


---

## 🔴 FASE 1: TAREFAS CRÍTICAS

### 1. Criar Shared Utilities - split-config.ts

**Prioridade:** 🔴 Crítica  
**Dependências:** Nenhuma

#### Subtarefas:

- [x] 1.1 Criar arquivo `supabase/functions/shared/split-config.ts`
  - Definir interfaces `SplitConfiguration` e `AsaasSplit`
  - Implementar função `getSplitConfiguration`
  - Implementar função `formatSplitsForAsaas`
  - Implementar função `validateWalletIds`
  - Implementar função `calculateSplitAmounts`
  - Adicionar tratamento de erros
  - Adicionar logs estruturados

- [x] 1.2 Criar arquivo `supabase/functions/shared/types.ts`
  - Adicionar tipos para splits
  - Atualizar `CreatePaymentData` com campo `split`
  - Adicionar tipos para eventos de webhook
  - Exportar todas as interfaces

- [ ] 1.3 Criar testes unitários
  - Testar `getSplitConfiguration` sem afiliado
  - Testar `getSplitConfiguration` com afiliado
  - Testar `getSplitConfiguration` para filiação vs serviço
  - Testar `formatSplitsForAsaas` para pagamento à vista
  - Testar `formatSplitsForAsaas` para parcelamento
  - Testar remoção de COMADEMIG dos splits
  - Testar validações de percentuais
  - Testar validações de valores mínimos

**Critérios de Aceitação:**
- ✅ Arquivo criado e compilando sem erros
- ✅ Todas as funções implementadas
- ✅ Testes unitários passando (cobertura >= 80%)
- ✅ Documentação inline completa
- ✅ Validado com Supabase Power MCP

**Ferramentas:**
- Supabase Power MCP para verificar tabelas `affiliates`
- Asaas MCP para consultar documentação de splits


---

### 2. Modificar asaas-create-pix-payment

**Prioridade:** 🔴 Crítica  
**Dependências:** Tarefa 1

#### Subtarefas:

- [x] 2.1 Integrar com split-config.ts
  - Importar `getSplitConfiguration` e `formatSplitsForAsaas`
  - Adicionar lógica para buscar configuração de split
  - Adicionar lógica para formatar splits
  - Adicionar validações antes de enviar

- [x] 2.2 Adicionar campo `split` no payload
  - Atualizar interface `CreatePaymentData`
  - Adicionar campo `split` no objeto de pagamento
  - Garantir que splits são enviados corretamente

- [x] 2.3 Remover chamadas para asaas-configure-split
  - Remover código que chama `asaas-configure-split`
  - Remover código que chama `asaas-process-splits`
  - Adicionar comentário explicando mudança

- [x] 2.4 Adicionar função para salvar splits localmente
  - Criar função `saveSplitsLocally`
  - Salvar em `asaas_splits` com status 'pending'
  - Vincular ao pagamento criado

- [x] 2.5 Testar em sandbox
  - Criar pagamento PIX sem afiliado
  - Criar pagamento PIX com afiliado
  - Verificar splits criados no Asaas via MCP
  - Verificar dados salvos no Supabase via Power

**Critérios de Aceitação:**
- ✅ Pagamentos PIX criados com campo `split`
- ✅ Splits salvos localmente em `asaas_splits`
- ✅ Splits visíveis no Asaas (verificar via MCP)
- ✅ Código antigo removido
- ✅ Testes em sandbox bem-sucedidos

**Ferramentas:**
- Supabase Power MCP para verificar dados salvos
- Asaas MCP para verificar splits criados


---

### 3. Modificar asaas-process-card

**Prioridade:** 🔴 Crítica  
**Dependências:** Tarefa 1

#### Subtarefas:

- [x] 3.1 Integrar com split-config.ts
  - Importar funções necessárias
  - Adicionar lógica para buscar configuração
  - Adicionar lógica para formatar splits

- [x] 3.2 Implementar suporte a totalFixedValue
  - Detectar se é parcelamento (installmentCount > 1)
  - Usar `totalFixedValue` para parcelamentos
  - Usar `fixedValue` para pagamentos à vista
  - Adicionar validações

- [x] 3.3 Adicionar campo `split` no payload
  - Atualizar objeto de pagamento
  - Passar `installmentCount` para `formatSplitsForAsaas`
  - Garantir formato correto

- [x] 3.4 Remover chamadas antigas
  - Remover código de configuração manual
  - Adicionar comentários explicativos

- [x] 3.5 Testar em sandbox
  - Pagamento à vista sem afiliado
  - Pagamento à vista com afiliado
  - Pagamento parcelado (3x) sem afiliado
  - Pagamento parcelado (12x) com afiliado
  - Verificar uso correto de totalFixedValue

**Critérios de Aceitação:**
- ✅ Pagamentos cartão criados com split
- ✅ Parcelamentos usam `totalFixedValue`
- ✅ Pagamentos à vista usam `fixedValue`
- ✅ Splits salvos localmente
- ✅ Testes em sandbox bem-sucedidos

**Ferramentas:**
- Asaas MCP para consultar documentação de parcelamentos
- Supabase Power MCP para verificar dados


---

### 4. Adicionar Suporte a totalFixedValue

**Prioridade:** 🔴 Crítica  
**Dependências:** Tarefa 3

#### Subtarefas:

- [x] 4.1 Atualizar função formatSplitsForAsaas
  - Adicionar parâmetro `installmentCount`
  - Implementar lógica de decisão
  - Adicionar testes específicos

- [x] 4.2 Documentar comportamento
  - Adicionar comentários explicando quando usar cada campo
  - Criar exemplos de uso
  - Atualizar documentação do design.md

- [x] 4.3 Validar com diferentes cenários
  - Testar com 1 parcela (deve usar fixedValue)
  - Testar com 3 parcelas (deve usar totalFixedValue)
  - Testar com 12 parcelas (deve usar totalFixedValue)
  - Testar com percentualValue (não muda)

**Critérios de Aceitação:**
- ✅ Função detecta parcelamento corretamente
- ✅ Usa campo apropriado baseado em installmentCount
- ✅ Testes cobrindo todos os cenários
- ✅ Documentação atualizada

**Ferramentas:**
- Asaas MCP para validar comportamento esperado


---

## 🟡 FASE 2: TAREFAS IMPORTANTES

### 5. Modificar asaas-create-subscription

**Prioridade:** 🟡 Importante  
**Dependências:** Tarefa 1

#### Subtarefas:

- [x] 5.1 Criar pagamento inicial com split
  - Adicionar lógica para criar pagamento inicial
  - Integrar com split-config.ts
  - Usar data de hoje como dueDate
  - Salvar pagamento inicial localmente

- [x] 5.2 Manter split na assinatura recorrente
  - Garantir que assinatura também tem split
  - Usar mesma configuração do pagamento inicial
  - Validar consistência

- [x] 5.3 Atualizar fluxo de criação
  - Criar pagamento inicial ANTES da assinatura
  - Aguardar confirmação do pagamento inicial
  - Só então criar assinatura recorrente
  - Adicionar tratamento de erros

- [x] 5.4 Testar fluxo completo
  - Criar assinatura sem afiliado
  - Criar assinatura com afiliado
  - Verificar pagamento inicial com split
  - Verificar assinatura com split
  - Confirmar que ambos têm mesma configuração

**Critérios de Aceitação:**
- ✅ Pagamento inicial criado COM split
- ✅ Assinatura criada COM split
- ✅ Ambos usam mesma configuração
- ✅ Fluxo testado em sandbox
- ✅ Comissões geradas para pagamento inicial

**Ferramentas:**
- Asaas MCP para consultar documentação de assinaturas
- Supabase Power MCP para verificar dados


---

### 6. Atualizar asaas-webhook

**Prioridade:** 🟡 Importante  
**Dependências:** Tarefas 2, 3, 5

#### Subtarefas:

- [x] 6.1 Adicionar handler para TRANSFER_DONE
  - Criar função `handleTransferEvent`
  - Buscar split local pelo asaas_split_id
  - Atualizar status para 'completed'
  - Registrar data de processamento
  - Chamar `registerAffiliateCommission` se for afiliado

- [x] 6.2 Adicionar handler para TRANSFER_FAILED
  - Atualizar status para 'failed'
  - Salvar mensagem de erro
  - Enviar notificação de falha
  - Adicionar logs detalhados

- [x] 6.3 Adicionar handler para TRANSFER_CANCELLED
  - Atualizar status para 'cancelled'
  - Adicionar logs
  - Enviar notificação

- [x] 6.4 Simplificar handlePaymentReceived
  - Remover processamento manual de splits
  - Adicionar log informando que splits serão processados pelo Asaas
  - Manter apenas atualização de status do pagamento

- [x] 6.5 Testar eventos de webhook
  - Simular evento TRANSFER_DONE
  - Simular evento TRANSFER_FAILED
  - Simular evento TRANSFER_CANCELLED
  - Verificar atualizações no banco
  - Verificar comissões registradas

**Critérios de Aceitação:**
- ✅ Webhook processa eventos TRANSFER_*
- ✅ Status dos splits atualizados corretamente
- ✅ Comissões registradas automaticamente
- ✅ Processamento manual removido
- ✅ Logs estruturados implementados

**Ferramentas:**
- Supabase Power MCP para verificar atualizações
- Asaas MCP para consultar formato dos eventos


---

### 7. Deprecar Edge Functions Manuais

**Prioridade:** 🟡 Importante  
**Dependências:** Tarefas 2, 3, 5, 6

#### Subtarefas:

- [x] 7.1 Marcar asaas-configure-split como deprecated
  - Adicionar warning no início da função
  - Adicionar log informando deprecação
  - Atualizar documentação
  - Manter código funcional por 30 dias

- [x] 7.2 Marcar asaas-process-splits como deprecated
  - Adicionar warning no início da função
  - Adicionar log informando deprecação
  - Atualizar documentação
  - Manter código funcional por 30 dias

- [x] 7.3 Criar migration guide
  - Documentar mudanças realizadas
  - Explicar nova abordagem
  - Fornecer exemplos de migração
  - Adicionar FAQ

- [x] 7.4 Atualizar documentação do sistema
  - Atualizar README das Edge Functions
  - Atualizar diagramas de fluxo
  - Atualizar guia de desenvolvimento
  - Adicionar notas de deprecação

**Critérios de Aceitação:**
- ✅ Functions marcadas como deprecated
- ✅ Warnings adicionados nos logs
- ✅ Migration guide criado
- ✅ Documentação atualizada
- ✅ Período de transição de 30 dias definido

**Ferramentas:**
- Nenhuma ferramenta específica necessária


---

## 🟢 FASE 3: MELHORIAS

### 8. Consolidar Tabelas de Assinaturas

**Prioridade:** 🟢 Melhoria  
**Dependências:** Nenhuma (pode ser feita em paralelo)

#### Subtarefas:

- [ ] 8.1 Verificar uso de asaas_subscriptions
  - Usar Supabase Power MCP para verificar dados
  - Buscar referências no código
  - Identificar se tabela ainda é usada
  - Documentar achados

- [ ] 8.2 Criar migration se necessário
  - Se tabela não é usada, criar migration para remover
  - Se há dados, criar migration para migrar
  - Adicionar rollback
  - Testar em ambiente de desenvolvimento

- [ ] 8.3 Atualizar tipos TypeScript
  - Remover tipos relacionados à tabela removida
  - Atualizar imports
  - Verificar compilação

- [ ] 8.4 Atualizar documentação
  - Atualizar diagrama do banco
  - Atualizar documentação de tabelas
  - Adicionar nota sobre consolidação

**Critérios de Aceitação:**
- ✅ Verificação completa realizada
- ✅ Migration criada (se necessário)
- ✅ Dados migrados sem perda
- ✅ Tipos TypeScript atualizados
- ✅ Documentação atualizada

**Ferramentas:**
- Supabase Power MCP para verificar e migrar dados


---

### 9. Implementar Testes Automatizados

**Prioridade:** 🟢 Melhoria  
**Dependências:** Todas as tarefas anteriores

#### Subtarefas:

- [ ] 9.1 Testes unitários para split-config.ts
  - Testar getSplitConfiguration (já feito na tarefa 1.3)
  - Testar formatSplitsForAsaas (já feito na tarefa 1.3)
  - Testar validateWalletIds
  - Testar calculateSplitAmounts
  - Cobertura >= 80%

- [ ] 9.2 Testes de integração para Edge Functions
  - Testar asaas-create-pix-payment com split
  - Testar asaas-process-card com split
  - Testar asaas-process-card com parcelamento
  - Testar asaas-create-subscription com split
  - Usar mocks para API do Asaas

- [ ] 9.3 Testes de webhook
  - Testar evento PAYMENT_RECEIVED
  - Testar evento TRANSFER_DONE
  - Testar evento TRANSFER_FAILED
  - Testar evento TRANSFER_CANCELLED
  - Testar idempotência

- [ ] 9.4 Testes de edge cases
  - Pagamento sem afiliado
  - Afiliado sem wallet_id
  - Valor menor que mínimo
  - Percentuais inválidos
  - Wallet ID inválido

- [ ] 9.5 Configurar CI/CD
  - Adicionar testes ao pipeline
  - Configurar execução automática
  - Adicionar relatório de cobertura
  - Bloquear merge se testes falharem

**Critérios de Aceitação:**
- ✅ Cobertura de testes >= 80%
- ✅ Todos os testes passando
- ✅ Testes rodando em CI/CD
- ✅ Edge cases cobertos
- ✅ Documentação de testes criada

**Ferramentas:**
- Nenhuma ferramenta MCP específica necessária


---

### 10. Criar Documentação Completa

**Prioridade:** 🟢 Melhoria  
**Dependências:** Todas as tarefas anteriores

#### Subtarefas:

- [ ] 10.1 Criar diagrama de sequência
  - Fluxo completo de pagamento com split
  - Fluxo de webhook
  - Fluxo de assinatura
  - Usar Mermaid ou ferramenta similar

- [ ] 10.2 Documentar Edge Functions
  - Documentar cada função modificada
  - Adicionar exemplos de request/response
  - Documentar parâmetros e retornos
  - Adicionar notas sobre mudanças

- [ ] 10.3 Criar guia de troubleshooting
  - Problemas comuns e soluções
  - Como verificar splits no Asaas
  - Como verificar dados no Supabase
  - Como reprocessar splits manualmente

- [ ] 10.4 Criar FAQ
  - Por que mudamos a abordagem?
  - Qual a diferença entre fixedValue e totalFixedValue?
  - Como funciona o split automático?
  - O que fazer se split não for criado?
  - Como testar em sandbox?

- [ ] 10.5 Atualizar README principal
  - Adicionar seção sobre splits
  - Adicionar links para documentação
  - Atualizar arquitetura geral
  - Adicionar badges de status

**Critérios de Aceitação:**
- ✅ Diagrama de sequência criado
- ✅ Todas as Edge Functions documentadas
- ✅ Guia de troubleshooting completo
- ✅ FAQ com pelo menos 10 perguntas
- ✅ README atualizado

**Ferramentas:**
- Nenhuma ferramenta MCP específica necessária


---

## 📊 RESUMO DE TAREFAS

### Por Fase

| Fase | Tarefas | Prioridade |
|------|---------|------------|
| Fase 1 - Críticas | 4 tarefas | 🔴 Alta |
| Fase 2 - Importantes | 3 tarefas | 🟡 Média |
| Fase 3 - Melhorias | 3 tarefas | 🟢 Baixa |
| **TOTAL** | **10 tarefas** | - |

### Por Tipo

| Tipo | Quantidade |
|------|------------|
| Implementação | 7 tarefas |
| Testes | 1 tarefa |
| Documentação | 1 tarefa |
| Manutenção | 1 tarefa |

### Cronograma Sugerido

**Fase 1 - Críticas:**
- Tarefa 1 (Shared Utilities)
- Tarefa 2 (PIX Payment)
- Tarefa 3 (Card Payment)
- Tarefa 4 (totalFixedValue)

**Fase 2 - Importantes:**
- Tarefa 5 (Subscriptions)
- Tarefa 6 (Webhook)
- Tarefa 7 (Deprecation)

**Fase 3 - Melhorias:**
- Tarefa 8 (Consolidação)
- Tarefa 9 (Testes)
- Tarefa 10 (Documentação)


---

## ✅ CHECKLIST DE VALIDAÇÃO

### Antes de Iniciar Cada Tarefa

- [ ] Li o arquivo `analise-preventiva-obrigatoria.md`?
- [ ] Li os arquivos relacionados à tarefa?
- [ ] Entendi exatamente o que precisa ser implementado?
- [ ] Identifiquei padrões existentes para seguir?
- [ ] Planejei a estrutura de implementação?
- [ ] Identifiquei possíveis pontos de erro?
- [ ] Defini estratégia de teste?

### Durante a Implementação

- [ ] Estou seguindo o plano da análise?
- [ ] Estou usando padrões existentes?
- [ ] Estou implementando tratamento de erros?
- [ ] Estou dentro do limite de tempo (30 min)?
- [ ] Estou mantendo funcionalidade completa?

### Após Implementação

- [ ] Testei a funcionalidade implementada?
- [ ] Verifiquei dados no Supabase via Power MCP?
- [ ] Verifiquei no Asaas via MCP (se aplicável)?
- [ ] Documentei o que foi feito?
- [ ] Estou dentro do limite de 2 tentativas de correção?
- [ ] Vou solicitar validação do usuário?

### Antes de Marcar como Concluída

- [ ] Funcionalidade está operacional?
- [ ] Código compila sem erros?
- [ ] Testes passando (se aplicável)?
- [ ] Dados salvos corretamente no banco?
- [ ] Integração com Asaas funcionando?
- [ ] Documentação atualizada?
- [ ] Usuário validou a implementação?


---

## 🚨 REGRAS DE EXECUÇÃO

### Limites de Tentativas

- **Máximo 2 tentativas** de correção por problema
- Se não funcionar na 2ª tentativa: **PARAR e reportar ao usuário**
- Não ficar em loop de teste-correção-teste

### Quando Reportar Problemas

- Após 2 tentativas de correção sem sucesso
- Quando encontrar bloqueador técnico
- Quando precisar de decisão de arquitetura
- Quando precisar de credenciais/configurações
- Quando houver dúvida sobre requisitos

### Prioridades

1. **🥇 PRIORIDADE MÁXIMA:** Sistema funcionando 100% como projetado
2. **🥈 PRIORIDADE ALTA:** Correção de problemas técnicos
3. **🥉 PRIORIDADE MÉDIA:** Testes passando COM funcionalidade completa
4. **🏅 PRIORIDADE BAIXA:** Documentação e otimizações

---

## 📝 TEMPLATE DE RELATÓRIO POR TAREFA

Após cada tarefa, fornecer:

```markdown
## ✅ Tarefa X - [Nome da Tarefa]

### 📝 O que foi implementado:
- Arquivos criados: [lista]
- Arquivos modificados: [lista]
- Integrações realizadas: [lista]

### 🔗 Verificações Realizadas:
- ✅ Supabase Power MCP: [o que foi verificado]
- ✅ Asaas MCP: [o que foi consultado]
- ✅ Testes: [o que foi testado]

### 🧪 Resultado dos Testes:
**Passos:**
1. [passo 1]
2. [passo 2]

**Resultado:**
- ✅ [sucesso 1]
- ✅ [sucesso 2]
- ⚠️ [problema encontrado, se houver]

### 📸 Evidências:
- Dados no Supabase: [descrição]
- Dados no Asaas: [descrição]
- Logs: [trechos relevantes]

### ⏭️ Próximos Passos:
[Próxima tarefa ou dependências]

### 🎯 Status: AGUARDANDO SUA VALIDAÇÃO
Por favor, valide a implementação e confirme se posso prosseguir.
```

---

## 🎯 CRITÉRIOS DE SUCESSO GERAL

### Métricas Quantitativas

- [ ] Redução de 40% nos pontos de falha (10 → 6)
- [ ] Redução de 66% nas chamadas à API (3+ → 1)
- [ ] Tempo de processamento reduzido em 30%
- [ ] Zero erros de split em produção por 30 dias
- [ ] Cobertura de testes >= 80%

### Métricas Qualitativas

- [ ] Código mais legível e manutenível
- [ ] Alinhamento com documentação oficial do Asaas
- [ ] Feedback positivo da equipe
- [ ] Facilidade de onboarding de novos desenvolvedores
- [ ] Documentação completa e clara

---

## 📚 REFERÊNCIAS

- **Análise Original:** `../../ANALISE_MODULO_PAGAMENTOS_SPLITS_ASAAS.md`
- **Requirements:** `requirements.md`
- **Design:** `design.md`
- **Documentação Asaas:** Acessível via Asaas MCP
- **Banco de Dados:** Acessível via Supabase Power MCP

---

## ✅ APROVAÇÃO

**Status:** Aguardando Início  
**Criado por:** Kiro AI  
**Data:** 16/01/2026  
**Revisado por:** _Pendente_  
**Aprovado por:** _Pendente_

---

**SPEC COMPLETA E PRONTA PARA EXECUÇÃO**

**Próximo Passo:** Aguardar aprovação do usuário para iniciar implementação.
