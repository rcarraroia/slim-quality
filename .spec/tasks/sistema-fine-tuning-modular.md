# 🎓 SISTEMA DE FINE-TUNING MODULAR - SLIM QUALITY

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

---

## 📋 INFORMAÇÕES DO DOCUMENTO

**Criado em:** 16/01/2026  
**Status:** ANÁLISE COMPLETA  
**Prioridade:** 🟡 MÉDIA (Após Guardrails)  
**Tempo Estimado Total:** 35-45 horas  
**Arquitetura:** MODULAR (Pipeline Independente)

---

## 🎯 OBJETIVO

Implementar sistema modular de fine-tuning para otimizar o modelo LLM da BIA com base em conversas reais de produção, melhorando:
- Qualidade das respostas
- Consistência do tom consultivo
- Conhecimento específico sobre produtos
- Redução de custos (modelo menor fine-tunado)
- Performance (respostas mais rápidas)

**ARQUITETURA:** Sistema implementado como **pipeline independente** que coleta dados de produção, prepara datasets, treina modelos e avalia resultados.

---

## 📚 REFERÊNCIAS OBRIGATÓRIAS

**TODAS as tarefas devem seguir:**
- `.kiro/steering/analise-preventiva-obrigatoria.md` - Análise antes de implementar
- `.kiro/steering/compromisso-honestidade.md` - Testar tudo antes de reportar
- `.kiro/steering/funcionalidade-sobre-testes.md` - Funcionalidade > Testes
- `.kiro/steering/verificacao-banco-real.md` - Usar Power Supabase

**Documentação LangChain Consultada:**
- Fine-tuning Models: https://docs.langchain.com/oss/javascript/integrations/chat/openai
- Datasets: https://docs.langchain.com/langsmith/manage-datasets
- Evaluation: https://docs.langchain.com/langsmith/evaluate-chatbot-tutorial
- Annotation Queues: https://docs.langchain.com/langsmith/annotation-queues
- Production Traces: https://docs.langchain.com/langsmith/rules

---

## 🔍 ANÁLISE DO ESTADO ATUAL

### ✅ **O QUE JÁ EXISTE:**

#### 1. **Coleta de Conversas em Produção**
**Arquivo:** `agent/src/api/main.py` (função `save_whatsapp_conversation`)

**Estrutura de Dados:**
```python
# Tabelas Supabase já existentes:
- customers (id, name, email, phone, source, status)
- conversations (id, customer_id, channel, status, subject, session_id)
- messages (id, conversation_id, content, sender_type, sender_id, created_at)
```

**Dados Coletados:**
- ✅ Todas as mensagens de clientes (WhatsApp + Site)
- ✅ Todas as respostas da BIA
- ✅ Timestamp de cada mensagem
- ✅ Canal de origem (whatsapp/site)
- ✅ Contexto da conversa (conversation_id)

**Volume Estimado:**
- ~50-100 conversas/dia (estimativa inicial)
- ~500-1000 mensagens/dia
- Dados suficientes para fine-tuning após 30-60 dias

#### 2. **Sistema de IA Configurável**
**Arquivo:** `agent/src/services/ai_service.py`

**Características:**
- ✅ Suporte a múltiplos provedores (OpenAI, Claude, Gemini)
- ✅ Fallback automático entre modelos
- ✅ Configuração de temperatura e tokens
- ✅ Fácil trocar modelo (basta mudar config)

**Modelos Atuais:**
- OpenAI: gpt-4o (principal)
- Claude: claude-sonnet-4-5 (opcional)
- Gemini: gemini-pro (fallback)



### ❌ **O QUE NÃO EXISTE (GAPS IDENTIFICADOS):**

#### 1. **Sistema de Feedback/Avaliação**
- ❌ Sem coleta de feedback de usuários
- ❌ Sem avaliação de qualidade das respostas
- ❌ Sem métricas de satisfação
- ❌ Sem anotação humana de conversas

#### 2. **Pipeline de Preparação de Dados**
- ❌ Sem extração de conversas para formato de treino
- ❌ Sem limpeza e normalização de dados
- ❌ Sem validação de qualidade dos dados
- ❌ Sem split treino/validação/teste

#### 3. **Sistema de Fine-Tuning**
- ❌ Sem integração com OpenAI Fine-tuning API
- ❌ Sem gerenciamento de jobs de treino
- ❌ Sem versionamento de modelos
- ❌ Sem avaliação automática de modelos

#### 4. **Sistema de Deploy de Modelos**
- ❌ Sem A/B testing de modelos
- ❌ Sem rollback automático
- ❌ Sem monitoramento de performance
- ❌ Sem comparação de custos

---

## 🏗️ ARQUITETURA PROPOSTA

### **ESTRUTURA DE PASTAS**
```
agent/src/fine_tuning/
├── __init__.py
├── data_collector.py           # Coleta dados do Supabase
├── data_processor.py            # Prepara dados para treino
├── dataset_builder.py           # Cria datasets OpenAI format
├── training_manager.py          # Gerencia jobs de fine-tuning
├── model_evaluator.py           # Avalia modelos treinados
├── model_deployer.py            # Deploy e A/B testing
├── feedback_collector.py        # Coleta feedback de usuários
└── config.py                    # Configurações do sistema
```

### **FLUXO COMPLETO**
```
1. COLETA DE DADOS (Contínua)
   ↓
   Conversas salvas no Supabase
   ↓
2. PREPARAÇÃO DE DADOS (Semanal/Mensal)
   ↓
   Extração → Limpeza → Validação → Split
   ↓
3. FINE-TUNING (Sob demanda)
   ↓
   Upload Dataset → Treino → Validação
   ↓
4. AVALIAÇÃO (Automática)
   ↓
   Métricas → Comparação → Aprovação
   ↓
5. DEPLOY (Manual/Automático)
   ↓
   A/B Testing → Monitoramento → Rollout
```

---

## 📊 ANÁLISE DE VIABILIDADE

### **PRÓS DO FINE-TUNING:**

#### 1. **Qualidade**
- ✅ Respostas mais consistentes com o tom da BIA
- ✅ Melhor conhecimento sobre produtos específicos
- ✅ Menos "alucinações" sobre preços e especificações
- ✅ Respostas mais naturais em português BR

#### 2. **Custo**
- ✅ Modelo menor fine-tunado pode substituir GPT-4
- ✅ Redução de ~70% no custo por token
- ✅ Exemplo: GPT-3.5-turbo fine-tunado vs GPT-4
  - GPT-4: $0.03/1K tokens input, $0.06/1K output
  - GPT-3.5 FT: $0.012/1K input, $0.016/1K output
  - **Economia: ~60-70%**

#### 3. **Performance**
- ✅ Respostas mais rápidas (modelo menor)
- ✅ Menos tokens necessários (respostas mais diretas)
- ✅ Latência reduzida em ~30-40%

#### 4. **Controle**
- ✅ Modelo proprietário (dados não vazam)
- ✅ Comportamento mais previsível
- ✅ Menos dependência de prompts complexos

### **CONTRAS DO FINE-TUNING:**

#### 1. **Complexidade**
- ❌ Requer pipeline de dados robusto
- ❌ Necessita avaliação contínua
- ❌ Manutenção de múltiplas versões
- ❌ Curva de aprendizado técnica

#### 2. **Custo Inicial**
- ❌ Custo de treino: ~$8-20 por job (GPT-3.5)
- ❌ Tempo de desenvolvimento: 35-45 horas
- ❌ Infraestrutura de avaliação

#### 3. **Dados**
- ❌ Requer volume mínimo (~500-1000 exemplos)
- ❌ Qualidade dos dados é crítica
- ❌ Necessita anotação humana
- ❌ Tempo para coletar dados (30-60 dias)

#### 4. **Manutenção**
- ❌ Retreino periódico necessário
- ❌ Monitoramento de drift
- ❌ Atualização com novos produtos/preços

---

## 💡 RECOMENDAÇÕES

### **QUANDO IMPLEMENTAR FINE-TUNING:**

#### ✅ **IMPLEMENTAR SE:**
1. Volume de conversas > 1000/mês
2. Custos de API > $500/mês
3. Qualidade das respostas precisa melhorar
4. Tem equipe para manter o sistema
5. Dados de produção têm boa qualidade

#### ❌ **NÃO IMPLEMENTAR SE:**
1. Volume de conversas < 500/mês
2. Custos de API < $200/mês
3. Prompts atuais funcionam bem
4. Equipe pequena/sem tempo
5. Dados de produção têm baixa qualidade

### **ALTERNATIVAS MAIS SIMPLES:**

#### 1. **Otimização de Prompts (0-5 horas)**
- Melhorar system prompt atual
- Adicionar few-shot examples
- Usar prompt caching (OpenAI)
- **Economia: 20-30% sem fine-tuning**

#### 2. **RAG com Base de Conhecimento (10-15 horas)**
- Criar base de conhecimento sobre produtos
- Usar embeddings para busca
- Injetar contexto relevante no prompt
- **Melhora qualidade sem retreino**

#### 3. **Modelo Menor com Prompts Melhores (5-10 horas)**
- Usar GPT-3.5-turbo ao invés de GPT-4
- Otimizar prompts para modelo menor
- Adicionar validações de saída
- **Economia: 60-70% imediata**

---

## 🎯 DECISÃO RECOMENDADA

### **FASE 1: PREPARAÇÃO (AGORA - 3 meses)**
**Tempo:** 10-15 horas  
**Prioridade:** 🟢 BAIXA

**Ações:**
1. ✅ Implementar coleta de feedback de usuários
2. ✅ Criar sistema de anotação de conversas
3. ✅ Coletar dados de qualidade por 60-90 dias
4. ✅ Otimizar prompts atuais
5. ✅ Implementar métricas de qualidade

**Resultado:** Base sólida de dados + prompts otimizados

---

### **FASE 2: AVALIAÇÃO (Após 3 meses)**
**Tempo:** 5-10 horas  
**Prioridade:** 🟡 MÉDIA

**Ações:**
1. ✅ Analisar volume e qualidade dos dados
2. ✅ Calcular ROI do fine-tuning
3. ✅ Comparar custos atual vs projetado
4. ✅ Decidir se vale a pena continuar

**Resultado:** Decisão informada sobre fine-tuning

---

### **FASE 3: IMPLEMENTAÇÃO (Se aprovado)**
**Tempo:** 20-25 horas  
**Prioridade:** 🟡 MÉDIA

**Ações:**
1. ✅ Implementar pipeline de dados
2. ✅ Treinar primeiro modelo
3. ✅ Avaliar e comparar com baseline
4. ✅ Deploy gradual com A/B testing

**Resultado:** Modelo fine-tunado em produção

---

## 📊 ESTIMATIVAS FINAIS

### **RESUMO DE TEMPO POR FASE:**

| Fase | Descrição | Tempo Estimado | Prioridade |
|------|-----------|----------------|------------|
| **FASE 1** | Sistema de Feedback e Coleta | 10-15 horas | 🟢 BAIXA |
| **FASE 2** | Pipeline de Dados | 15-20 horas | 🟡 MÉDIA |
| **FASE 3** | Fine-Tuning e Avaliação | 10-15 horas | 🟡 MÉDIA |
| **FASE 4** | Deploy e Monitoramento | 5-10 horas | 🟡 MÉDIA |
| **TOTAL** | **Sistema Completo** | **40-60 horas** | - |

### **CUSTOS ESTIMADOS:**

#### **Custos de Desenvolvimento:**
- Tempo de desenvolvimento: 40-60 horas
- Custo por hora (estimado): R$ 100-150/hora
- **Total desenvolvimento: R$ 4.000 - R$ 9.000**

#### **Custos de Operação (Mensal):**
- Fine-tuning jobs (2-4x/mês): ~$20-40/mês
- Inferência com modelo fine-tunado: ~$100-200/mês (depende do volume)
- Armazenamento de datasets: ~$5-10/mês
- **Total operação: ~$125-250/mês (R$ 625-1.250)**

#### **ROI ESPERADO:**

**Cenário Atual (sem fine-tuning):**
- Modelo: GPT-4
- Custo estimado: $0.03/1K input + $0.06/1K output
- Volume: ~10K mensagens/mês
- Tokens médios: 500 input + 300 output por mensagem
- **Custo mensal: ~$330/mês (R$ 1.650)**

**Cenário com Fine-Tuning:**
- Modelo: GPT-3.5-turbo fine-tunado
- Custo estimado: $0.012/1K input + $0.016/1K output
- Volume: ~10K mensagens/mês
- Tokens médios: 400 input + 250 output (respostas mais diretas)
- **Custo mensal: ~$88/mês (R$ 440)**

**Economia Mensal: ~$242/mês (R$ 1.210)**  
**Payback: 3-7 meses**

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### **ANTES DE COMEÇAR:**
- [ ] Verificar volume de conversas atual (> 500/mês?)
- [ ] Analisar custos de API atual (> $200/mês?)
- [ ] Avaliar qualidade das conversas existentes
- [ ] Confirmar que dados têm boa qualidade
- [ ] Obter aprovação para investimento inicial
- [ ] Definir equipe responsável pela manutenção

### **FASE 1 - FEEDBACK E COLETA:**
- [ ] Implementar FeedbackCollector
- [ ] Criar API endpoints de feedback
- [ ] Integrar com WhatsApp e site
- [ ] Implementar AnnotationQueue
- [ ] Criar dashboard de anotação
- [ ] Implementar QualityMetrics
- [ ] Configurar alertas de qualidade
- [ ] Testar coleta de feedback em produção
- [ ] Coletar dados por 60-90 dias

### **FASE 2 - PIPELINE DE DADOS:**
- [ ] Implementar DataCollector
- [ ] Implementar DataProcessor
- [ ] Implementar DatasetBuilder
- [ ] Implementar QualityValidator
- [ ] Testar pipeline completo com dados reais
- [ ] Validar formato OpenAI
- [ ] Criar primeiro dataset de treino
- [ ] Revisar qualidade do dataset

### **FASE 3 - FINE-TUNING:**
- [ ] Implementar TrainingManager
- [ ] Configurar credenciais OpenAI
- [ ] Fazer upload do primeiro dataset
- [ ] Criar primeiro job de fine-tuning
- [ ] Monitorar progresso do treino
- [ ] Implementar ModelEvaluator
- [ ] Avaliar modelo treinado
- [ ] Comparar com baseline (GPT-4)
- [ ] Calcular ROI real

### **FASE 4 - DEPLOY:**
- [ ] Implementar ModelDeployer
- [ ] Configurar A/B testing
- [ ] Deploy canary (5% tráfego)
- [ ] Implementar PerformanceMonitor
- [ ] Monitorar métricas por 7 dias
- [ ] Aumentar tráfego gradualmente (25%, 50%, 100%)
- [ ] Configurar alertas de degradação
- [ ] Documentar processo de rollback

### **PÓS-IMPLEMENTAÇÃO:**
- [ ] Documentar processo completo
- [ ] Treinar equipe no uso do sistema
- [ ] Estabelecer rotina de retreino (mensal/trimestral)
- [ ] Configurar monitoramento contínuo
- [ ] Criar runbook de troubleshooting
- [ ] Planejar próximas iterações

---

## 🎯 CRITÉRIOS DE SUCESSO

### **MÉTRICAS TÉCNICAS:**
- ✅ **Perplexity:** < 2.5 (baseline: ~3.0)
- ✅ **BLEU Score:** > 0.6 (baseline: ~0.5)
- ✅ **Latência:** < 2s (baseline: ~3s)
- ✅ **Taxa de erro:** < 1% (baseline: ~2%)

### **MÉTRICAS DE NEGÓCIO:**
- ✅ **Satisfação do usuário:** > 85% (baseline: ~75%)
- ✅ **Taxa de conversão:** Aumento de 10-20%
- ✅ **Custo por conversa:** Redução de 60-70%
- ✅ **Tempo de resposta:** Redução de 30-40%

### **MÉTRICAS DE QUALIDADE:**
- ✅ **Consistência do tom:** > 90%
- ✅ **Precisão de informações:** > 95%
- ✅ **Respostas no escopo:** > 98%
- ✅ **Alucinações:** < 2%

---

## 🚀 PRÓXIMOS PASSOS RECOMENDADOS

### **CURTO PRAZO (0-3 meses):**

#### 1. **Implementar FASE 1 (Feedback e Coleta)**
**Prioridade:** 🟢 BAIXA  
**Tempo:** 10-15 horas  
**Objetivo:** Começar a coletar dados de qualidade

**Ações:**
- Implementar sistema de feedback (👍/👎)
- Criar fila de anotação
- Configurar métricas de qualidade
- Coletar dados por 60-90 dias

**Resultado Esperado:**
- Base sólida de 500-1000 conversas anotadas
- Métricas de qualidade estabelecidas
- Entendimento claro dos problemas atuais

---

#### 2. **Otimizar Prompts Atuais (Paralelo)**
**Prioridade:** 🟢 ALTA  
**Tempo:** 5-10 horas  
**Objetivo:** Melhorar qualidade imediatamente

**Ações:**
- Analisar conversas com feedback negativo
- Melhorar system prompt
- Adicionar few-shot examples
- Implementar prompt caching

**Resultado Esperado:**
- Melhora de 20-30% na qualidade
- Redução de 20-30% nos custos
- Ganho rápido sem fine-tuning

---

### **MÉDIO PRAZO (3-6 meses):**

#### 3. **Avaliar Viabilidade do Fine-Tuning**
**Prioridade:** 🟡 MÉDIA  
**Tempo:** 5-10 horas  
**Objetivo:** Decisão informada sobre continuar

**Ações:**
- Analisar volume e qualidade dos dados coletados
- Calcular ROI real com dados atuais
- Comparar custos atual vs projetado
- Decidir se vale a pena implementar FASE 2-4

**Resultado Esperado:**
- Decisão clara: implementar ou não
- Plano de ação definido
- Budget aprovado (se implementar)

---

#### 4. **Implementar FASE 2-4 (Se Aprovado)**
**Prioridade:** 🟡 MÉDIA  
**Tempo:** 30-45 horas  
**Objetivo:** Sistema completo de fine-tuning

**Ações:**
- Implementar pipeline de dados
- Treinar primeiro modelo
- Avaliar e comparar com baseline
- Deploy gradual com A/B testing

**Resultado Esperado:**
- Modelo fine-tunado em produção
- Redução de 60-70% nos custos
- Melhora de 10-20% na qualidade

---

### **LONGO PRAZO (6-12 meses):**

#### 5. **Otimização Contínua**
**Prioridade:** 🟡 MÉDIA  
**Tempo:** Contínuo  
**Objetivo:** Manter e melhorar sistema

**Ações:**
- Retreino mensal/trimestral
- Monitoramento de drift
- Atualização com novos produtos
- Expansão de casos de uso

**Resultado Esperado:**
- Sistema sempre atualizado
- Qualidade mantida ou melhorada
- Custos otimizados continuamente

---

## 📚 REFERÊNCIAS E RECURSOS

### **Documentação Oficial:**
- [OpenAI Fine-tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [LangChain Fine-tuning](https://docs.langchain.com/oss/javascript/integrations/chat/openai)
- [LangSmith Datasets](https://docs.langchain.com/langsmith/manage-datasets)
- [LangSmith Evaluation](https://docs.langchain.com/langsmith/evaluate-chatbot-tutorial)
- [LangSmith Annotation Queues](https://docs.langchain.com/langsmith/annotation-queues)

### **Artigos e Tutoriais:**
- [Fine-tuning Best Practices (OpenAI)](https://platform.openai.com/docs/guides/fine-tuning/preparing-your-dataset)
- [Evaluating LLMs (LangChain)](https://blog.langchain.dev/evaluating-llms/)
- [Production LLM Monitoring](https://www.langchain.com/blog/production-llm-monitoring)

### **Ferramentas Úteis:**
- [OpenAI Tokenizer](https://platform.openai.com/tokenizer) - Contar tokens
- [LangSmith](https://smith.langchain.com/) - Monitoramento e avaliação
- [Weights & Biases](https://wandb.ai/) - Tracking de experimentos

### **Exemplos de Código:**
- [OpenAI Fine-tuning Examples](https://github.com/openai/openai-cookbook/tree/main/examples/fine-tuning)
- [LangChain Fine-tuning Examples](https://github.com/langchain-ai/langchain/tree/master/cookbook)

---

## 🔄 ALTERNATIVAS E COMPARAÇÕES

### **OPÇÃO 1: Fine-Tuning Completo (Este Documento)**
**Prós:**
- ✅ Melhor qualidade possível
- ✅ Maior redução de custos (60-70%)
- ✅ Modelo proprietário
- ✅ Respostas mais rápidas

**Contras:**
- ❌ Maior complexidade
- ❌ Maior tempo de implementação (40-60h)
- ❌ Requer manutenção contínua
- ❌ Investimento inicial alto

**Quando usar:**
- Volume > 1000 conversas/mês
- Custos API > $500/mês
- Equipe disponível para manutenção

---

### **OPÇÃO 2: Otimização de Prompts**
**Prós:**
- ✅ Implementação rápida (5-10h)
- ✅ Sem custos adicionais
- ✅ Melhora imediata
- ✅ Fácil manutenção

**Contras:**
- ❌ Melhora limitada (20-30%)
- ❌ Não reduz custos significativamente
- ❌ Depende de prompts complexos

**Quando usar:**
- Volume < 500 conversas/mês
- Custos API < $200/mês
- Equipe pequena

---

### **OPÇÃO 3: RAG com Base de Conhecimento**
**Prós:**
- ✅ Implementação média (10-15h)
- ✅ Melhora qualidade sem retreino
- ✅ Fácil atualizar conhecimento
- ✅ Reduz alucinações

**Contras:**
- ❌ Não reduz custos de API
- ❌ Adiciona latência
- ❌ Requer manutenção da base

**Quando usar:**
- Problema principal é precisão de informações
- Produtos/preços mudam frequentemente
- Complementar ao fine-tuning

---

### **OPÇÃO 4: Modelo Menor + Prompts Otimizados**
**Prós:**
- ✅ Implementação rápida (5-10h)
- ✅ Redução imediata de custos (60-70%)
- ✅ Sem fine-tuning necessário
- ✅ Respostas mais rápidas

**Contras:**
- ❌ Qualidade pode ser inferior
- ❌ Requer prompts muito bem otimizados
- ❌ Pode precisar mais iterações

**Quando usar:**
- Custos são prioridade máxima
- Qualidade atual é aceitável
- Quer ganho rápido

---

## 🎯 RECOMENDAÇÃO FINAL

### **ESTRATÉGIA RECOMENDADA (FASEADA):**

#### **FASE 0: AGORA (0-1 mês)**
**Ação:** Implementar OPÇÃO 4 (Modelo Menor + Prompts)  
**Tempo:** 5-10 horas  
**Resultado:** Redução imediata de 60-70% nos custos

#### **FASE 1: CURTO PRAZO (1-3 meses)**
**Ação:** Implementar coleta de feedback e dados  
**Tempo:** 10-15 horas  
**Resultado:** Base de dados para decisão futura

#### **FASE 2: MÉDIO PRAZO (3-6 meses)**
**Ação:** Avaliar viabilidade do fine-tuning  
**Tempo:** 5-10 horas  
**Resultado:** Decisão informada sobre continuar

#### **FASE 3: LONGO PRAZO (6-12 meses)**
**Ação:** Implementar fine-tuning completo (se aprovado)  
**Tempo:** 30-45 horas  
**Resultado:** Sistema otimizado e proprietário

---

## 📝 NOTAS FINAIS

### **IMPORTANTE:**
- ⚠️ Fine-tuning NÃO é solução mágica
- ⚠️ Qualidade dos dados é CRÍTICA
- ⚠️ Requer manutenção contínua
- ⚠️ ROI depende do volume de uso

### **ANTES DE IMPLEMENTAR:**
1. ✅ Otimizar prompts atuais primeiro
2. ✅ Coletar dados de qualidade por 60-90 dias
3. ✅ Calcular ROI real com dados atuais
4. ✅ Garantir equipe para manutenção
5. ✅ Obter aprovação de budget

### **SUCESSO DEPENDE DE:**
- 📊 Volume suficiente de dados (> 500 conversas)
- 🎯 Qualidade dos dados coletados
- 👥 Equipe dedicada à manutenção
- 💰 Budget para operação contínua
- 🔄 Processo de retreino estabelecido

---

**DOCUMENTO COMPLETO E PRONTO PARA IMPLEMENTAÇÃO**

**Criado em:** 16/01/2026  
**Última atualização:** 16/01/2026  
**Status:** ✅ COMPLETO  
**Próxima revisão:** Após implementação da FASE 1

---

## 📋 PLANO DETALHADO DE IMPLEMENTAÇÃO

### **FASE 1: SISTEMA DE FEEDBACK E COLETA (10-15h)**

#### **TAREFA 1.1: Feedback Collector**
**Arquivo:** `agent/src/fine_tuning/feedback_collector.py`  
**Tempo:** 3-4 horas

**Funcionalidades:**
```python
class FeedbackCollector:
    """
    Coleta feedback de usuários sobre respostas da BIA
    
    Métodos de coleta:
    - Reações rápidas (👍/👎)
    - Avaliação de 1-5 estrelas
    - Comentários textuais
    - Flags de problemas
    """
    
    async def collect_reaction(self, message_id: str, reaction: str):
        """Salva reação rápida (thumbs up/down)"""
        
    async def collect_rating(self, conversation_id: str, rating: int, comment: str):
        """Salva avaliação completa da conversa"""
        
    async def flag_problem(self, message_id: str, problem_type: str, details: str):
        """Marca mensagem com problema para revisão"""
```

**Integração:**
- API endpoint: `/api/feedback`
- Webhook do WhatsApp (reações)
- Widget no site

**Validação:**
- [ ] Feedback é salvo no Supabase
- [ ] Métricas são calculadas
- [ ] Dashboard exibe feedback

---

#### **TAREFA 1.2: Annotation Queue**
**Arquivo:** `agent/src/fine_tuning/annotation_queue.py`  
**Tempo:** 4-5 horas

**Funcionalidades:**
```python
class AnnotationQueue:
    """
    Fila de conversas para anotação humana
    
    Critérios de seleção:
    - Conversas com feedback negativo
    - Conversas longas (> 10 mensagens)
    - Conversas com palavras-chave específicas
    - Amostragem aleatória (10%)
    """
    
    async def add_to_queue(self, conversation_id: str, priority: int, reason: str):
        """Adiciona conversa à fila de anotação"""
        
    async def get_next_for_review(self, reviewer_id: str):
        """Retorna próxima conversa para revisar"""
        
    async def submit_annotation(self, conversation_id: str, annotations: Dict):
        """Salva anotações do revisor"""
```

**Interface:**
- Dashboard de anotação
- Critérios de qualidade
- Aprovação/rejeição de conversas

**Validação:**
- [ ] Conversas são adicionadas automaticamente
- [ ] Revisores conseguem anotar
- [ ] Anotações são salvas corretamente

---

#### **TAREFA 1.3: Métricas de Qualidade**
**Arquivo:** `agent/src/fine_tuning/quality_metrics.py`  
**Tempo:** 3-4 horas

**Funcionalidades:**
```python
class QualityMetrics:
    """
    Calcula métricas de qualidade das conversas
    
    Métricas:
    - Taxa de satisfação (feedback positivo/total)
    - Tempo médio de resposta
    - Taxa de resolução (conversa completa)
    - Taxa de abandono
    - Qualidade do tom (via LLM)
    """
    
    async def calculate_satisfaction_rate(self, period: str):
        """Calcula taxa de satisfação no período"""
        
    async def calculate_resolution_rate(self, period: str):
        """Calcula taxa de resolução"""
        
    async def analyze_conversation_quality(self, conversation_id: str):
        """Analisa qualidade de uma conversa específica"""
```

**Dashboard:**
- Gráficos de métricas
- Alertas de queda de qualidade
- Comparação temporal

**Validação:**
- [ ] Métricas são calculadas corretamente
- [ ] Dashboard exibe dados
- [ ] Alertas funcionam

---

### **FASE 2: PIPELINE DE DADOS (15-20h)**

#### **TAREFA 2.1: Data Collector**
**Arquivo:** `agent/src/fine_tuning/data_collector.py`  
**Tempo:** 3-4 horas

**Funcionalidades:**
```python
class DataCollector:
    """
    Coleta conversas do Supabase para fine-tuning
    
    Filtros:
    - Apenas conversas completas
    - Com feedback positivo (>= 4 estrelas)
    - Sem problemas flagados
    - Período específico
    """
    
    async def collect_conversations(self, filters: Dict) -> List[Conversation]:
        """Coleta conversas do Supabase"""
        
    async def export_to_jsonl(self, conversations: List, output_path: str):
        """Exporta para formato JSONL"""
```

**Validação:**
- [ ] Conversas são coletadas corretamente
- [ ] Filtros funcionam
- [ ] Export JSONL está correto

---

#### **TAREFA 2.2: Data Processor**
**Arquivo:** `agent/src/fine_tuning/data_processor.py`  
**Tempo:** 5-6 horas

**Funcionalidades:**
```python
class DataProcessor:
    """
    Processa e limpa dados para fine-tuning
    
    Processamentos:
    - Remove PII (telefones, emails)
    - Normaliza formatação
    - Remove conversas incompletas
    - Valida qualidade
    - Balanceia dataset
    """
    
    async def clean_conversation(self, conversation: Dict) -> Dict:
        """Limpa e normaliza conversa"""
        
    async def remove_pii(self, text: str) -> str:
        """Remove informações pessoais"""
        
    async def validate_quality(self, conversation: Dict) -> bool:
        """Valida se conversa tem qualidade suficiente"""
```

**Validação:**
- [ ] PII é removido
- [ ] Conversas são normalizadas
- [ ] Qualidade é validada

---

#### **TAREFA 2.3: Dataset Builder**
**Arquivo:** `agent/src/fine_tuning/dataset_builder.py`  
**Tempo:** 4-5 horas

**Funcionalidades:**
```python
class DatasetBuilder:
    """
    Cria datasets no formato OpenAI
    
    Formato:
    {
        "messages": [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
    }
    """
    
    async def build_training_dataset(self, conversations: List) -> str:
        """Cria dataset de treino"""
        
    async def build_validation_dataset(self, conversations: List) -> str:
        """Cria dataset de validação"""
        
    async def split_dataset(self, conversations: List, train_ratio: float = 0.8):
        """Divide em treino/validação"""
```

**Validação:**
- [ ] Formato OpenAI está correto
- [ ] Split treino/validação funciona
- [ ] Datasets são válidos

---

#### **TAREFA 2.4: Quality Validator**
**Arquivo:** `agent/src/fine_tuning/quality_validator.py`  
**Tempo:** 3-4 horas

**Funcionalidades:**
```python
class QualityValidator:
    """
    Valida qualidade do dataset antes do treino
    
    Validações:
    - Tamanho mínimo (500 exemplos)
    - Diversidade de tópicos
    - Balanceamento de tipos de conversa
    - Qualidade das respostas
    - Formato correto
    """
    
    async def validate_dataset(self, dataset_path: str) -> Dict:
        """Valida dataset completo"""
        
    async def check_diversity(self, conversations: List) -> float:
        """Verifica diversidade de tópicos"""
        
    async def check_balance(self, conversations: List) -> Dict:
        """Verifica balanceamento"""
```

**Validação:**
- [ ] Validações funcionam
- [ ] Relatório é gerado
- [ ] Problemas são identificados

---

### **FASE 3: FINE-TUNING E AVALIAÇÃO (10-15h)**

#### **TAREFA 3.1: Training Manager**
**Arquivo:** `agent/src/fine_tuning/training_manager.py`  
**Tempo:** 5-6 horas

**Funcionalidades:**
```python
class TrainingManager:
    """
    Gerencia jobs de fine-tuning na OpenAI
    
    Funcionalidades:
    - Upload de datasets
    - Criação de jobs
    - Monitoramento de progresso
    - Download de modelos
    - Versionamento
    """
    
    async def upload_dataset(self, dataset_path: str) -> str:
        """Upload dataset para OpenAI"""
        
    async def create_fine_tuning_job(self, dataset_id: str, config: Dict) -> str:
        """Cria job de fine-tuning"""
        
    async def monitor_job(self, job_id: str) -> Dict:
        """Monitora progresso do job"""
        
    async def get_model_id(self, job_id: str) -> str:
        """Obtém ID do modelo treinado"""
```

**Integração:**
- OpenAI Fine-tuning API
- Supabase (logs e versionamento)
- Notificações (email/WhatsApp)

**Validação:**
- [ ] Upload funciona
- [ ] Job é criado
- [ ] Monitoramento funciona
- [ ] Modelo é obtido

---

#### **TAREFA 3.2: Model Evaluator**
**Arquivo:** `agent/src/fine_tuning/model_evaluator.py`  
**Tempo:** 5-6 horas

**Funcionalidades:**
```python
class ModelEvaluator:
    """
    Avalia modelos fine-tunados
    
    Métricas:
    - Perplexity
    - BLEU score
    - Similaridade semântica
    - Qualidade do tom (LLM-as-judge)
    - Custo por conversa
    - Latência
    """
    
    async def evaluate_model(self, model_id: str, test_dataset: str) -> Dict:
        """Avalia modelo completo"""
        
    async def compare_models(self, model_a: str, model_b: str) -> Dict:
        """Compara dois modelos"""
        
    async def calculate_roi(self, model_id: str, baseline: str) -> Dict:
        """Calcula ROI do fine-tuning"""
```

**Validação:**
- [ ] Métricas são calculadas
- [ ] Comparação funciona
- [ ] ROI é calculado corretamente

---

### **FASE 4: DEPLOY E MONITORAMENTO (5-10h)**

#### **TAREFA 4.1: Model Deployer**
**Arquivo:** `agent/src/fine_tuning/model_deployer.py`  
**Tempo:** 3-4 horas

**Funcionalidades:**
```python
class ModelDeployer:
    """
    Deploy de modelos fine-tunados
    
    Estratégias:
    - Canary deployment (5% tráfego)
    - A/B testing (50/50)
    - Blue-green deployment
    - Rollback automático
    """
    
    async def deploy_canary(self, model_id: str, traffic_percent: float):
        """Deploy canary com % de tráfego"""
        
    async def deploy_ab_test(self, model_a: str, model_b: str):
        """Deploy A/B testing"""
        
    async def rollback(self, to_model: str):
        """Rollback para modelo anterior"""
```

**Validação:**
- [ ] Deploy canary funciona
- [ ] A/B testing funciona
- [ ] Rollback funciona

---

#### **TAREFA 4.2: Performance Monitor**
**Arquivo:** `agent/src/fine_tuning/performance_monitor.py`  
**Tempo:** 2-3 horas

**Funcionalidades:**
```python
class PerformanceMonitor:
    """
    Monitora performance de modelos em produção
    
    Métricas:
    - Taxa de satisfação
    - Latência média
    - Custo por conversa
    - Taxa de erro
    - Drift detection
    """
    
    async def monitor_model(self, model_id: str) -> Dict:
        """Monitora modelo em produção"""
        
    async def detect_drift(self, model_id: str) -> bool:
        """Detecta drift de performance"""
        
    async def alert_if_degraded(self, model_id: str):
        """Alerta se performance degradar"""
```

**Validação:**
- [ ] Monitoramento funciona
- [ ] Drift é detectado
- [ ] Alertas são enviados

---

