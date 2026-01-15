# PRIORIDADE 3: TORNAR NODES CONFIGURÁVEIS

**Data de Criação:** 14/01/2026  
**Status:** 🟡 Pendente  
**Tempo Estimado:** 75 minutos  
**Complexidade:** Média  

---

## ⚠️ REGRA UNIVERSAL - LEITURA OBRIGATÓRIA

**ANTES DE INICIAR QUALQUER TAREFA DESTE DOCUMENTO:**

🔴 **OBRIGATÓRIO LER E SEGUIR:**
`.kiro/steering/analise-preventiva-obrigatoria.md`

**PROCESSO OBRIGATÓRIO:**
1. ✅ Análise Preventiva (5-10 min) - ANTES de implementar
2. ✅ Implementação Focada (15-30 min) - Seguindo o plano
3. ✅ Teste Eficiente (5-15 min) - Máximo 2 tentativas

**❌ PROIBIDO:**
- Começar a implementar sem análise prévia
- Gastar mais de 1 hora em uma única tarefa
- Ficar em loop de teste-correção por mais de 30 minutos

**Esta regra se aplica a TODAS as tarefas abaixo!**

---

## 🎯 OBJETIVO

Permitir que administradores configurem dinamicamente os sub-agentes (Router, Discovery, Sales, Support) através do painel administrativo, sem necessidade de alterar código.

---

## 📋 ESCOPO

### O QUE SERÁ IMPLEMENTADO:

✅ **Configuração Dinâmica de Sub-Agentes:**
- System prompts personalizados por agente
- Temperatura (criatividade: 0.0 - 2.0)
- Max tokens (tamanho da resposta: 100 - 4000)
- Modelo LLM (gpt-4o, gpt-4o-mini, claude-sonnet)
- Habilitar/desabilitar agentes

✅ **Persistência no Banco:**
- Adicionar campos à tabela `sub_agents`
- Valores padrão para cada agente
- Validações de integridade

✅ **Cache de Performance:**
- Cache em memória (TTL: 5 minutos)
- Fallback para valores padrão se banco falhar

✅ **API REST:**
- Endpoints CRUD para gerenciar sub-agentes
- Validação de dados
- Restauração de padrões

✅ **Interface no Painel:**
- Seção de configuração de sub-agentes
- Formulários de edição
- Botão "Restaurar Padrões"
- Chat de teste com configurações personalizadas

---

## 🚫 O QUE NÃO ESTÁ NO ESCOPO:

❌ Guardrails (validações avançadas de resposta)
❌ Fine-Tuning (treinamento de modelos)
❌ Histórico de alterações de configuração
❌ Permissões granulares por usuário

---

## 📊 ANÁLISE TÉCNICA

### SITUAÇÃO ATUAL:

**Banco de Dados:**
- ✅ Tabela `sub_agents` existe
- ❌ Faltam campos: `system_prompt`, `model`, `temperature`, `max_tokens`
- ✅ Campo `configuration` (JSONB) existe mas não é usado

**Backend:**
- ✅ Nodes funcionam com valores hardcoded
- ❌ Não há cache de configurações
- ❌ Não há endpoints para sub-agentes

**Frontend:**
- ✅ Página `AgenteConfiguracao.tsx` existe
- ❌ Só configura agente geral, não sub-agentes

### ARQUIVOS A MODIFICAR:

**Backend (7 arquivos):**
1. `supabase/migrations/XXXXX_alter_sub_agents_add_config_fields.sql` (novo)
2. `agent/src/services/config_cache.py` (novo)
3. `agent/src/graph/nodes/router.py` (modificar)
4. `agent/src/graph/nodes/discovery.py` (modificar)
5. `agent/src/graph/nodes/sales.py` (modificar)
6. `agent/src/graph/nodes/support.py` (modificar)
7. `agent/src/api/agent.py` (adicionar endpoints)

**Frontend (2 arquivos):**
8. `src/pages/dashboard/agente/AgenteConfiguracao.tsx` (modificar)
9. `src/services/agent.service.ts` (adicionar métodos)

---

## 🔄 ESTRATÉGIA DE IMPLEMENTAÇÃO

---

## ⚠️ REGRA UNIVERSAL OBRIGATÓRIA

**ANTES DE INICIAR QUALQUER TAREFA ABAIXO, É OBRIGATÓRIO:**

### 📋 EXECUTAR ANÁLISE PREVENTIVA COMPLETA

Seguir rigorosamente o processo definido em:
`.kiro/steering/analise-preventiva-obrigatoria.md`

**CHECKLIST OBRIGATÓRIO ANTES DE CADA TAREFA:**
- [ ] Ler TODOS os arquivos relacionados à tarefa
- [ ] Entender EXATAMENTE o que precisa ser implementado
- [ ] Identificar dependências e integrações necessárias
- [ ] Verificar padrões de código existentes no projeto
- [ ] Identificar possíveis pontos de erro ANTES de implementar
- [ ] Planejar estrutura de arquivos e funções
- [ ] Definir estratégia de testes ANTES de implementar

**TEMPO MÁXIMO POR ANÁLISE:** 10 minutos

**❌ PROIBIDO:** Começar a implementar sem análise prévia completa!

---

### FASE 1: BANCO DE DADOS (15 min)

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 1.1, executar:**
- [ ] Ler migration existente: `supabase/migrations/20251228174400_create_sub_agents.sql`
- [ ] Verificar estrutura atual da tabela `sub_agents`
- [ ] Identificar campos que precisam ser adicionados
- [ ] Verificar constraints e defaults necessários
- [ ] Planejar SQL da migration
- [ ] Identificar riscos (downtime, dados existentes)

**Tarefa 1.1: Criar Migration**
- Adicionar campos à tabela `sub_agents`
- Definir constraints e defaults
- Criar índices se necessário

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (2 min)
**ANTES de iniciar Tarefa 1.2, executar:**
- [ ] Verificar dados padrão necessários para cada agente
- [ ] Definir system prompts adequados
- [ ] Validar valores de temperatura e tokens
- [ ] Planejar INSERT com ON CONFLICT

**Tarefa 1.2: Popular Dados Padrão**
- Inserir configurações para Router Agent
- Inserir configurações para Discovery Agent
- Inserir configurações para Sales Agent
- Inserir configurações para Support Agent

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (3 min)
**ANTES de iniciar Tarefa 1.3, executar:**
- [ ] Verificar acesso ao Supabase Power
- [ ] Planejar validação da estrutura
- [ ] Definir queries de verificação
- [ ] Preparar rollback se necessário

**Tarefa 1.3: Executar Migration**
- Aplicar no Supabase via Power
- Validar estrutura criada
- Verificar dados inseridos

---

### FASE 2: BACKEND (30 min)

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 2.1, executar:**
- [ ] Verificar se já existe sistema de cache no projeto
- [ ] Estudar padrão de cache do SICC (se existir)
- [ ] Definir estrutura do cache (dict, TTL, invalidação)
- [ ] Planejar função `get_sub_agent_config()`
- [ ] Identificar pontos de falha (banco offline)
- [ ] Definir estratégia de fallback

**Tarefa 2.1: Criar Sistema de Cache (10 min)**
- Criar `agent/src/services/config_cache.py`
- Implementar cache em memória com TTL
- Implementar função `get_sub_agent_config(agent_type: str)`
- Implementar função `invalidate_cache(agent_type: str)`

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 2.2, executar:**
- [ ] Ler código atual dos 4 nodes
- [ ] Identificar onde estão os valores hardcoded
- [ ] Verificar padrão de inicialização do LLM
- [ ] Planejar integração com cache
- [ ] Definir valores de fallback
- [ ] Identificar imports necessários

**Tarefa 2.2: Modificar Nodes (10 min)**
- Modificar `router.py` para usar config do banco
- Modificar `discovery.py` para usar config do banco
- Modificar `sales.py` para usar config do banco
- Modificar `support.py` para usar config do banco
- Implementar fallback para valores padrão

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 2.3, executar:**
- [ ] Ler arquivo `agent/src/api/agent.py` existente
- [ ] Verificar padrão de endpoints existentes
- [ ] Definir schemas de request/response
- [ ] Planejar validações (Pydantic)
- [ ] Identificar erros possíveis
- [ ] Definir estrutura de resposta

**Tarefa 2.3: Criar Endpoints API (10 min)**
- `GET /api/agent/sub-agents` - Listar todos
- `GET /api/agent/sub-agents/{id}` - Buscar um
- `PUT /api/agent/sub-agents/{id}` - Atualizar
- `POST /api/agent/sub-agents/{id}/reset` - Restaurar padrões
- Adicionar validações (temperatura 0-2, tokens 100-4000)

---

### FASE 3: FRONTEND (30 min)

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 3.1, executar:**
- [ ] Ler componentes UI existentes (Card, Input, Slider)
- [ ] Verificar padrão de componentes no projeto
- [ ] Definir props do componente
- [ ] Planejar validações visuais
- [ ] Identificar estados (loading, error, success)
- [ ] Definir estrutura de dados

**Tarefa 3.1: Criar Componente SubAgentCard (10 min)**
- Criar componente reutilizável
- Props: agent (dados), onSave, onReset
- Campos: system_prompt, model, temperature, max_tokens
- Validações visuais

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (5 min)
**ANTES de iniciar Tarefa 3.2, executar:**
- [ ] Ler `AgenteConfiguracao.tsx` existente
- [ ] Verificar estrutura da página
- [ ] Planejar onde adicionar seção de sub-agentes
- [ ] Definir layout (grid, tabs, accordion?)
- [ ] Planejar estados (loading, saving)
- [ ] Identificar hooks necessários

**Tarefa 3.2: Modificar Página AgenteConfiguracao (15 min)**
- Adicionar seção "Configuração de Sub-Agentes"
- Renderizar 4 cards (Router, Discovery, Sales, Support)
- Implementar salvamento individual
- Implementar restauração de padrões
- Feedback visual (toast)

#### ⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA (3 min)
**ANTES de iniciar Tarefa 3.3, executar:**
- [ ] Ler `agent.service.ts` existente
- [ ] Verificar padrão de métodos (async/await)
- [ ] Definir assinaturas dos métodos
- [ ] Planejar tratamento de erros
- [ ] Verificar uso do apiClient

**Tarefa 3.3: Criar Service Frontend (5 min)**
- Adicionar métodos em `agent.service.ts`
- `getSubAgents()` - Listar todos
- `getSubAgent(id)` - Buscar um
- `updateSubAgent(id, data)` - Atualizar
- `resetSubAgent(id)` - Restaurar padrões

---

## 🧪 ESTRATÉGIA DE TESTES

### TESTES BACKEND:

**Teste 1: Cache de Configurações**
```python
# Testar carregamento do cache
config = await get_sub_agent_config("sales")
assert config.model == "gpt-4o"
assert config.temperature == 0.7

# Testar TTL do cache (5 minutos)
# Testar invalidação manual
```

**Teste 2: Fallback**
```python
# Simular falha no banco
# Verificar se usa valores padrão hardcoded
# Sistema não deve quebrar
```

**Teste 3: Validações**
```python
# Testar temperatura fora do range (0-2)
# Testar tokens fora do range (100-4000)
# Testar modelo inválido
```

### TESTES FRONTEND:

**Teste 4: Carregamento**
- Abrir página de configuração
- Verificar se carrega 4 sub-agentes
- Verificar valores atuais

**Teste 5: Salvamento**
- Modificar temperatura de um agente
- Salvar
- Recarregar página
- Verificar se mudança persistiu

**Teste 6: Restauração**
- Modificar configuração
- Clicar em "Restaurar Padrões"
- Verificar se voltou aos valores originais

### TESTES INTEGRAÇÃO:

**Teste 7: End-to-End**
1. Modificar system prompt do Sales Agent no painel
2. Enviar mensagem de venda via WhatsApp
3. Verificar logs mostrando config carregada do banco
4. Verificar se resposta usa novo prompt

---

## 📝 ESTRUTURA DA MIGRATION

```sql
-- ===================================
-- MIGRATION: Adicionar campos de configuração aos sub-agentes
-- Data: 14/01/2026
-- ===================================

-- Adicionar novos campos
ALTER TABLE sub_agents 
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS model VARCHAR(50) DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7 
    CHECK (temperature >= 0 AND temperature <= 2),
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2000 
    CHECK (max_tokens >= 100 AND max_tokens <= 4000);

-- Inserir/atualizar configurações padrão
INSERT INTO sub_agents (agent_name, domain, system_prompt, model, temperature, max_tokens, learning_threshold, max_patterns) 
VALUES
    (
        'Router Agent', 
        'router', 
        'Você é um classificador de intenções para vendas de colchões da Slim Quality. Classifique a mensagem em: discovery, sales ou support.',
        'gpt-4o',
        0.3,
        500,
        0.7,
        50
    ),
    (
        'Discovery Agent', 
        'discovery', 
        'Você é a BIA, assistente virtual da Slim Quality. Seu objetivo é qualificar leads, entender problemas de saúde e sono, e educar sobre os benefícios dos colchões magnéticos.',
        'gpt-4o',
        0.7,
        2000,
        0.7,
        100
    ),
    (
        'Sales Agent', 
        'sales', 
        'Você é a BIA, consultora de vendas da Slim Quality. Seu objetivo é recomendar o colchão ideal, negociar condições e fechar vendas de forma consultiva.',
        'gpt-4o',
        0.7,
        2000,
        0.75,
        150
    ),
    (
        'Support Agent', 
        'support', 
        'Você é a BIA, suporte pós-venda da Slim Quality. Seu objetivo é resolver dúvidas sobre garantia, frete, troca e problemas com pedidos.',
        'gpt-4o',
        0.5,
        2000,
        0.65,
        80
    )
ON CONFLICT (agent_name) DO UPDATE SET
    system_prompt = EXCLUDED.system_prompt,
    model = EXCLUDED.model,
    temperature = EXCLUDED.temperature,
    max_tokens = EXCLUDED.max_tokens,
    learning_threshold = EXCLUDED.learning_threshold,
    max_patterns = EXCLUDED.max_patterns,
    updated_at = NOW();

-- Comentários
COMMENT ON COLUMN sub_agents.system_prompt IS 'Prompt do sistema para o sub-agente';
COMMENT ON COLUMN sub_agents.model IS 'Modelo LLM a ser usado (gpt-4o, gpt-4o-mini, claude-sonnet)';
COMMENT ON COLUMN sub_agents.temperature IS 'Temperatura do modelo (0.0-2.0, quanto maior mais criativo)';
COMMENT ON COLUMN sub_agents.max_tokens IS 'Máximo de tokens na resposta (100-4000)';
```

---

## ⚠️ PONTOS DE RISCO

### RISCOS TÉCNICOS:

**Risco 1: Performance**
- **Problema:** Buscar config do banco a cada mensagem pode ser lento
- **Mitigação:** Cache em memória com TTL de 5 minutos
- **Impacto:** Baixo

**Risco 2: Fallback**
- **Problema:** Se banco falhar, sistema para de funcionar
- **Mitigação:** Manter valores padrão hardcoded como fallback
- **Impacto:** Médio

**Risco 3: Validação**
- **Problema:** Valores inválidos podem quebrar o agente
- **Mitigação:** Validar no backend antes de salvar
- **Impacto:** Alto

**Risco 4: Migration**
- **Problema:** Alterar tabela existente pode causar downtime
- **Mitigação:** Usar ALTER TABLE com valores DEFAULT
- **Impacto:** Baixo

### RISCOS DE NEGÓCIO:

**Risco 5: Configuração Errada**
- **Problema:** Admin pode configurar mal e quebrar agente
- **Mitigação:** Botão "Restaurar Padrões" + Validações
- **Impacto:** Médio

**Risco 6: Testes**
- **Problema:** Mudanças podem afetar qualidade das respostas
- **Mitigação:** Ambiente de teste no painel (já existe!)
- **Impacto:** Baixo

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Tarefa | Tempo Estimado |
|------|--------|----------------|
| **1** | Migration + Dados | 15 min |
| **2** | Backend (cache + nodes + API) | 30 min |
| **3** | Frontend (UI + integração) | 30 min |
| **TOTAL** | | **75 minutos** |

⚠️ **ATENÇÃO:** Excede limite de 55 min por tarefa da análise preventiva!

**SOLUÇÃO:** Dividir em 2 entregas:
- **Entrega 1:** Fase 1 + Fase 2 (45 min) - Backend funcional
- **Entrega 2:** Fase 3 (30 min) - Interface no painel

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### PRÉ-IMPLEMENTAÇÃO:
- [x] Análise preventiva completa realizada
- [x] Arquivos relacionados identificados
- [x] Padrões existentes analisados
- [x] Pontos de risco mapeados
- [x] Estratégia de implementação definida
- [x] Estratégia de testes definida

### FASE 1 - BANCO DE DADOS:
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Ler migration existente e planejar
- [ ] Migration criada
- [ ] Campos adicionados à tabela
- [ ] Dados padrão inseridos
- [ ] Migration executada no Supabase
- [ ] Estrutura validada

### FASE 2 - BACKEND:
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Estudar padrão de cache
- [ ] Sistema de cache implementado
- [ ] Função `get_sub_agent_config()` criada
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Ler código dos nodes
- [ ] Router node modificado
- [ ] Discovery node modificado
- [ ] Sales node modificado
- [ ] Support node modificado
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Verificar padrão de endpoints
- [ ] Endpoints API criados
- [ ] Validações implementadas
- [ ] Testes backend executados

### FASE 3 - FRONTEND:
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Estudar componentes UI
- [ ] Componente SubAgentCard criado
- [ ] ⚠️ **ANÁLISE PREVENTIVA (5 min)** - Ler página existente
- [ ] Página AgenteConfiguracao modificada
- [ ] ⚠️ **ANÁLISE PREVENTIVA (3 min)** - Verificar service existente
- [ ] Service frontend atualizado
- [ ] Testes frontend executados
- [ ] Teste end-to-end realizado

### PÓS-IMPLEMENTAÇÃO:
- [ ] Commit realizado
- [ ] Push para repositório
- [ ] Rebuild no EasyPanel solicitado
- [ ] Validação em produção
- [ ] Documentação atualizada

### ⏱️ CONTROLE DE TEMPO:
- [ ] Fase 1 concluída em < 15 min
- [ ] Fase 2 concluída em < 30 min
- [ ] Fase 3 concluída em < 30 min
- [ ] Tempo total < 75 min
- [ ] Nenhuma tarefa individual > 55 min

---

## 📚 REFERÊNCIAS

**Arquivos Relacionados:**
- `supabase/migrations/20251228174400_create_sub_agents.sql` (tabela existente)
- `src/pages/dashboard/agente/AgenteConfiguracao.tsx` (painel existente)
- `agent/src/graph/nodes/router.py` (node a modificar)
- `agent/src/graph/nodes/discovery.py` (node a modificar)
- `agent/src/graph/nodes/sales.py` (node a modificar)
- `agent/src/graph/nodes/support.py` (node a modificar)
- `agent/src/api/agent.py` (API a estender)

**Steering Files:**
- `.kiro/steering/analise-preventiva-obrigatoria.md`
- `.kiro/steering/product.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/tech.md`

---

## 🚀 PRÓXIMOS PASSOS (APÓS ESTA IMPLEMENTAÇÃO)

**Sprint 2: Guardrails (50 min)**
- Sistema de validação de respostas
- Regras de segurança configuráveis
- Interface para configurar guardrails

**Sprint 3: Fine-Tuning (75 min)**
- Integração com OpenAI fine-tuning
- Upload de datasets
- Versionamento de modelos

---

**Status:** 🟡 Aguardando autorização para iniciar implementação  
**Última Atualização:** 14/01/2026
