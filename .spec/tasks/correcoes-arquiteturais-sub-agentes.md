# CORREÇÕES ARQUITETURAIS - SUB-AGENTES

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 PROTOCOLOS OBRIGATÓRIOS

### 🔍 ANÁLISE PREVENTIVA OBRIGATÓRIA
**Referência:** `.kiro/steering/analise-preventiva-obrigatoria.md`

**ANTES DE CADA TAREFA:**
- ✅ Análise preventiva completa (máximo 10 minutos)
- ✅ Leitura de TODOS os arquivos relacionados
- ✅ Identificação de padrões existentes no projeto
- ✅ Planejamento da estrutura de implementação
- ✅ Definição de estratégia de testes
- ✅ Limite máximo: 55 minutos por tarefa

### 🗄️ VERIFICAÇÃO DE BANCO OBRIGATÓRIA
**Referência:** `.kiro/steering/verificacao-banco-real.md`

**ANTES DE QUALQUER INTERVENÇÃO NO BANCO:**
- ✅ Ativar Power: Supabase Hosted Development
- ✅ Verificar estrutura atual das tabelas
- ✅ Contar registros existentes
- ✅ Analisar relacionamentos e políticas RLS
- ✅ Documentar estado atual antes da mudança
- ✅ Criar estratégia de rollback se necessário

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **REDUNDÂNCIA ARQUITETURAL**
- ❌ Router Agent é desnecessário - Agente Principal já faz roteamento
- ❌ Interface mostra 4 sub-agentes quando deveria mostrar apenas 3
- ❌ Lógica de classificação duplicada entre Agente Principal e Router

### 2. **DÉBITO TÉCNICO NO SERVICE LAYER**
- ❌ `src/services/agent.service.ts` incompleto
- ❌ Métodos faltantes: `getSubAgents()`, `updateSubAgent()`, `resetSubAgent()`
- ❌ `AgenteConfiguracao.tsx` faz chamadas diretas ao `apiClient`
- ❌ Violação do padrão arquitetural do projeto

---

## 🎯 TAREFAS DE CORREÇÃO

### **TAREFA 1: ANÁLISE PREVENTIVA - ARQUITETURA ATUAL**

#### **PROTOCOLO OBRIGATÓRIO:**
```markdown
## ANÁLISE PREVENTIVA - TAREFA 1

### 1. ENTENDIMENTO DA TAREFA
- Analisar arquitetura atual dos sub-agentes
- Identificar redundâncias e problemas arquiteturais
- Mapear dependências entre componentes

### 2. DEPENDÊNCIAS E INTEGRAÇÕES
- Frontend: AgenteConfiguracao.tsx, SubAgentCard.tsx
- Backend: agent.py, config_cache.py, nodes (router, discovery, sales, support)
- Banco: tabela sub_agents
- Service: agent.service.ts (incompleto)

### 3. PADRÕES EXISTENTES
- Outros services seguem padrão: métodos async, tratamento de erro, tipagem
- Componentes usam services ao invés de apiClient direto
- Estrutura de 3 camadas: API → Service → Component

### 4. PONTOS DE RISCO IDENTIFICADOS
- Remover Router pode quebrar funcionalidades existentes
- Alterar banco pode afetar cache e configurações
- Refatorar service pode quebrar interface

### 5. ESTRATÉGIA DE IMPLEMENTAÇÃO
1. Verificar banco atual via Power Supabase
2. Analisar código do Agente Principal
3. Mapear uso do Router Agent
4. Planejar remoção segura

### 6. ESTRATÉGIA DE TESTE
- Verificar se Agente Principal já faz classificação
- Testar interface após remoção do Router
- Validar funcionamento dos 3 sub-agentes restantes
```

**ARQUIVOS A ANALISAR:**
- `src/pages/dashboard/agente/AgenteConfiguracao.tsx`
- `src/components/SubAgentCard.tsx`
- `src/services/agent.service.ts`
- `agent/src/graph/nodes/router.py`
- `agent/src/graph/nodes/discovery.py`
- `agent/src/graph/nodes/sales.py`
- `agent/src/graph/nodes/support.py`
- `agent/src/services/config_cache.py`

---

### **TAREFA 2: VERIFICAÇÃO DO BANCO - SUB_AGENTS**

#### **PROTOCOLO OBRIGATÓRIO:**
```markdown
## VERIFICAÇÃO DO BANCO DE DADOS - SUB_AGENTS

### Método de Acesso:
- ✅ Power: Supabase Hosted Development ativado
- ✅ Conexão com projeto estabelecida

### Tabelas Verificadas:
- [ ] sub_agents: [EXISTE] - [X registros]
  - [ ] Router Agent (id=1): [EXISTE/NÃO EXISTE]
  - [ ] Discovery Agent (id=2): [EXISTE/NÃO EXISTE]
  - [ ] Sales Agent (id=3): [EXISTE/NÃO EXISTE]
  - [ ] Support Agent (id=4): [EXISTE/NÃO EXISTE]

### Estrutura Atual:
- Campos: id, name, type, is_active, system_prompt, model, temperature, max_tokens
- Políticas RLS: [VERIFICAR]
- Relacionamentos: [VERIFICAR]

### Dados Existentes:
- [LISTAR CONFIGURAÇÕES ATUAIS DE CADA AGENTE]

### Ações Necessárias:
- [ ] Remover Router Agent (id=1) se confirmado redundante
- [ ] Manter Discovery, Sales, Support
- [ ] Atualizar IDs se necessário

### Riscos Identificados:
- Cache pode ter referências ao Router
- Interface pode quebrar com mudança de IDs
- Configurações podem ser perdidas
```

---

### **TAREFA 3: REMOÇÃO DO ROUTER AGENT**

#### **ANÁLISE PREVENTIVA OBRIGATÓRIA:**
```markdown
## ANÁLISE PREVENTIVA - TAREFA 3

### 1. ENTENDIMENTO DA TAREFA
- Remover Router Agent do banco de dados
- Remover referências no código backend
- Atualizar interface para mostrar apenas 3 sub-agentes

### 2. DEPENDÊNCIAS E INTEGRAÇÕES
- Banco: DELETE na tabela sub_agents
- Cache: config_cache.py pode ter referências
- Backend: router.py pode ser usado em outros lugares
- Frontend: Interface precisa ser atualizada

### 3. PADRÕES EXISTENTES
- Remoções no banco via Power Supabase
- Updates de cache automáticos
- Interface reativa aos dados do backend

### 4. PONTOS DE RISCO IDENTIFICADOS
- Cache pode retornar erro se buscar Router
- Interface pode quebrar se esperar 4 agentes
- Logs podem referenciar Router Agent

### 5. ESTRATÉGIA DE IMPLEMENTAÇÃO
1. Verificar uso do Router no código
2. Remover do banco via Power Supabase
3. Limpar cache se necessário
4. Testar interface

### 6. ESTRATÉGIA DE TESTE
- Verificar se interface carrega corretamente
- Testar se cache funciona sem Router
- Validar se 3 agentes aparecem na interface
```

**AÇÕES:**
1. **VERIFICAÇÃO DE USO:**
   - Buscar referências ao Router Agent no código
   - Verificar se é usado em algum fluxo crítico

2. **REMOÇÃO DO BANCO:**
   - Conectar via Power Supabase
   - `DELETE FROM sub_agents WHERE type = 'router'`
   - Verificar se remoção foi bem-sucedida

3. **LIMPEZA DE CÓDIGO:**
   - Remover `agent/src/graph/nodes/router.py` se não usado
   - Atualizar imports se necessário

4. **TESTE DA INTERFACE:**
   - Verificar se mostra apenas 3 sub-agentes
   - Testar funcionalidades de edição

---

### **TAREFA 4: COMPLETAR SERVICE LAYER**

#### **ANÁLISE PREVENTIVA OBRIGATÓRIA:**
```markdown
## ANÁLISE PREVENTIVA - TAREFA 4

### 1. ENTENDIMENTO DA TAREFA
- Implementar métodos faltantes em agent.service.ts
- Refatorar AgenteConfiguracao.tsx para usar service
- Seguir padrão arquitetural do projeto

### 2. DEPENDÊNCIAS E INTEGRAÇÕES
- Service: agent.service.ts (incompleto)
- Component: AgenteConfiguracao.tsx (usa apiClient direto)
- API: endpoints em agent/src/api/agent.py
- Types: interfaces TypeScript

### 3. PADRÕES EXISTENTES
- Outros services: async/await, try/catch, tipagem forte
- Estrutura: métodos públicos, tratamento de erro, retorno tipado
- Naming: camelCase para métodos, PascalCase para tipos

### 4. PONTOS DE RISCO IDENTIFICADOS
- Refatoração pode quebrar funcionalidade existente
- Tipos podem não estar corretos
- Error handling pode ser inconsistente

### 5. ESTRATÉGIA DE IMPLEMENTAÇÃO
1. Analisar outros services como referência
2. Implementar métodos faltantes
3. Refatorar componente gradualmente
4. Testar cada método individualmente

### 6. ESTRATÉGIA DE TESTE
- Testar cada método do service isoladamente
- Verificar se componente funciona após refatoração
- Validar tratamento de erros
```

**MÉTODOS A IMPLEMENTAR:**
```typescript
// Em src/services/agent.service.ts
async getSubAgents(): Promise<SubAgent[]>
async updateSubAgent(id: number, data: Partial<SubAgent>): Promise<SubAgent>
async resetSubAgent(id: number): Promise<SubAgent>
```

**REFATORAÇÃO:**
- Substituir chamadas diretas ao `apiClient` por métodos do service
- Manter funcionalidade existente
- Melhorar tratamento de erros

---

### **TAREFA 5: VALIDAÇÃO FINAL**

#### **ANÁLISE PREVENTIVA OBRIGATÓRIA:**
```markdown
## ANÁLISE PREVENTIVA - TAREFA 5

### 1. ENTENDIMENTO DA TAREFA
- Validar que todas as correções funcionam
- Testar interface completa
- Verificar se arquitetura está correta

### 2. DEPENDÊNCIAS E INTEGRAÇÕES
- Frontend: Interface deve mostrar 3 sub-agentes
- Backend: APIs devem funcionar corretamente
- Banco: Deve ter apenas 3 registros ativos
- Cache: Deve funcionar sem Router

### 3. PADRÕES EXISTENTES
- Testes manuais via interface
- Verificação de logs para erros
- Validação de funcionalidades críticas

### 4. PONTOS DE RISCO IDENTIFICADOS
- Interface pode ter bugs após mudanças
- Cache pode ter problemas
- Funcionalidades podem estar quebradas

### 5. ESTRATÉGIA DE IMPLEMENTAÇÃO
1. Teste completo da interface
2. Verificação de logs
3. Teste de cada funcionalidade
4. Documentação das mudanças

### 6. ESTRATÉGIA DE TESTE
- Abrir painel administrativo
- Navegar para tab Sub-Agentes
- Testar edição de cada agente
- Verificar salvamento e reset
```

**CHECKLIST DE VALIDAÇÃO:**
- [ ] Interface mostra apenas 3 sub-agentes (Discovery, Sales, Support)
- [ ] Edição de configurações funciona
- [ ] Botões "Salvar" e "Restaurar Padrões" funcionam
- [ ] Não há erros no console
- [ ] Cache funciona corretamente
- [ ] Service layer segue padrão do projeto

---

## 📊 RESUMO EXECUTIVO

### **PROBLEMAS A CORRIGIR:**
1. ❌ Router Agent redundante (Agente Principal já faz roteamento)
2. ❌ Service layer incompleto (violação de padrão arquitetural)
3. ❌ Interface mostra 4 agentes ao invés de 3

### **SOLUÇÕES PLANEJADAS:**
1. ✅ Remover Router Agent do banco e interface
2. ✅ Completar agent.service.ts com métodos faltantes
3. ✅ Refatorar componente para usar service
4. ✅ Manter apenas Discovery, Sales, Support

### **RESULTADO ESPERADO:**
- ✅ Arquitetura limpa e sem redundâncias
- ✅ Service layer completo seguindo padrões
- ✅ Interface mostrando apenas 3 sub-agentes relevantes
- ✅ Funcionalidade mantida e melhorada

### **TEMPO ESTIMADO TOTAL:**
- Tarefa 1 (Análise): 10 minutos
- Tarefa 2 (Verificação Banco): 10 minutos  
- Tarefa 3 (Remoção Router): 15 minutos
- Tarefa 4 (Service Layer): 15 minutos
- Tarefa 5 (Validação): 5 minutos
- **TOTAL: 55 minutos**

---

## 🔒 COMPROMISSOS

### **SEGUIR RIGOROSAMENTE:**
- ✅ Análise preventiva antes de cada tarefa
- ✅ Verificação de banco antes de alterações
- ✅ Limites de tempo por tarefa (máximo 55min total)
- ✅ Padrões arquiteturais do projeto
- ✅ Funcionalidade completa sobre testes que passam

### **REPORTAR SE:**
- 🚨 Qualquer tarefa exceder limite de tempo
- 🚨 Problemas não previstos na análise
- 🚨 Necessidade de alterações não planejadas
- 🚨 Riscos identificados durante implementação

---

**Data de Criação:** 14/01/2026  
**Status:** PRONTO PARA EXECUÇÃO  
**Prioridade:** ALTA - Correção de débito técnico crítico