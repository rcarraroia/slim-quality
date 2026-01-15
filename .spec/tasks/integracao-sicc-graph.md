# TASK: INTEGRAÇÃO SICC AO LANGGRAPH

**Data de Criação:** 14/01/2026  
**Criado por:** Kiro AI  
**Solicitado por:** Renato Carraro  
**Prioridade:** ALTA  
**Complexidade:** ALTA  

---

## 🎯 OBJETIVO GERAL

Migrar a execução do SICC (Sistema de Inteligência Corporativa Contínua) de processamento externo para dentro do fluxo do LangGraph, aproveitando todos os benefícios da arquitetura (checkpointing, debugging, consistência).

---

## 📊 SITUAÇÃO ATUAL

### ❌ PROBLEMAS IDENTIFICADOS:

1. **SICC executa FORA do LangGraph**
   - `SICCService.process_message()` é chamado diretamente
   - Graph não é usado para processamento SICC
   - Perda de benefícios: checkpointing, streaming, debugging

2. **Nodes SICC existem mas NÃO são usados**
   - `sicc_lookup_node` - Existe mas não está no graph
   - `sicc_learn_node` - Existe mas não está no graph
   - `supervisor_approve_node` - Existe mas não está no graph

3. **SupervisorService incompleto**
   - Método `evaluate_learning()` NÃO EXISTE
   - Código chama método inexistente (linha 421 sicc_service.py)
   - Aprovação automática não funciona completamente

### ✅ O QUE JÁ FUNCIONA:

- SICCService.process_message() funciona (fora do graph)
- Páginas do painel SICC existem e funcionam
- SupervisorService tem `auto_approve()` e `validate_pattern_conflicts()`
- Nodes SICC existem (só não estão integrados)

---

## 📋 ESTRATÉGIA DE MIGRAÇÃO

### ABORDAGEM: Migração Gradual com Fallback


**FASE 1:** Correções Urgentes (SupervisorService)  
**FASE 2:** Integração ao Graph (Nodes + State)  
**FASE 3:** Testes e Validação  
**FASE 4:** Deploy Gradual com Fallback  

**TEMPO ESTIMADO TOTAL:** 4-6 horas

---

## 🔧 FASE 1: CORREÇÕES URGENTES

**Objetivo:** Corrigir SupervisorService para funcionar completamente  
**Tempo Estimado:** 30 minutos  
**Prioridade:** CRÍTICA  

### SUBTASK 1.1: Criar método `evaluate_learning()`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Criar método `evaluate_learning()` no SupervisorService
- [ ] Método deve avaliar se aprendizado deve ser aprovado
- [ ] Retornar Dict com approved, reason, confidence, conflicts

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] Usar `auto_approve()` existente
- [ ] Usar `validate_pattern_conflicts()` existente
- [ ] Será chamado por `sicc_service.py` linha 421

**3. PADRÕES EXISTENTES:**
- [ ] Ler `supervisor_service.py` completo
- [ ] Seguir padrão async def
- [ ] Seguir padrão de logging existente
- [ ] Seguir padrão de tratamento de erros

**4. PONTOS DE RISCO:**
- [ ] Validar parâmetros de entrada
- [ ] Tratar exceções adequadamente
- [ ] Garantir retorno consistente

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Adicionar método após `validate_pattern_conflicts()`
- [ ] Implementar validação de threshold
- [ ] Implementar validação de conflitos
- [ ] Implementar decisão de aprovação
- [ ] Adicionar logging

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com confiança alta (deve aprovar)
- [ ] Testar com confiança baixa (deve rejeitar)
- [ ] Testar no limite do threshold

---

**Arquivo:** `agent/src/services/sicc/supervisor_service.py`

**Implementação:**
```python
async def evaluate_learning(
    self,
    pattern_data: Dict[str, Any],
    confidence_threshold: float = 0.7
) -> Dict[str, Any]:
    """
    Avalia se um aprendizado deve ser aprovado automaticamente
    
    Args:
        pattern_data: Dados do padrão detectado
        confidence_threshold: Threshold mínimo para aprovação
        
    Returns:
        Dict com resultado da avaliação
    """
    try:
        confidence = pattern_data.get("confidence", 0.0)
        
        # 1. Verificar threshold de confiança
        meets_threshold = await self.auto_approve(confidence, confidence_threshold)
        
        if not meets_threshold:
            return {
                "approved": False,
                "reason": f"Confiança {confidence:.2f} abaixo do threshold {confidence_threshold}",
                "confidence": confidence
            }
        
        # 2. Verificar conflitos com padrões existentes
        # (buscar padrões existentes do banco)
        existing_patterns = []  # TODO: Buscar do banco
        
        conflict_analysis = await self.validate_pattern_conflicts(
            new_pattern=pattern_data,
            existing_patterns=existing_patterns
        )
        
        # 3. Decidir baseado em conflitos
        if conflict_analysis.has_conflicts and conflict_analysis.severity_score > 0.8:
            return {
                "approved": False,
                "reason": "Conflitos críticos detectados",
                "confidence": confidence,
                "conflicts": conflict_analysis.conflict_details
            }
        
        # 4. Aprovar
        return {
            "approved": True,
            "reason": "Aprovado automaticamente",
            "confidence": confidence,
            "conflicts": conflict_analysis.conflict_details if conflict_analysis.has_conflicts else []
        }
        
    except Exception as e:
        logger.error(f"Erro ao avaliar aprendizado: {e}")
        return {
            "approved": False,
            "reason": f"Erro na avaliação: {str(e)}",
            "confidence": 0.0
        }
```

**Validação:**
- [ ] Método criado
- [ ] Testes unitários passam
- [ ] Integração com sicc_service.py funciona

---


## 🏗️ FASE 2: INTEGRAÇÃO AO GRAPH

**Objetivo:** Integrar SICC ao fluxo do LangGraph  
**Tempo Estimado:** 2-3 horas  
**Prioridade:** ALTA  

### SUBTASK 2.1: Adicionar campos SICC ao AgentState

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Adicionar 5 campos SICC ao TypedDict AgentState
- [ ] Documentar cada campo adequadamente
- [ ] Manter compatibilidade com campos existentes

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] Verificar imports necessários (Optional, Dict, List)
- [ ] Verificar se TypedDict suporta campos opcionais

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/state.py` completo
- [ ] Seguir padrão de nomenclatura existente
- [ ] Seguir padrão de documentação existente

**4. PONTOS DE RISCO:**
- [ ] Garantir que campos são Optional
- [ ] Não quebrar compatibilidade com código existente

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Adicionar campos após os existentes
- [ ] Adicionar comentário "# CAMPOS SICC"
- [ ] Documentar no docstring

**6. ESTRATÉGIA DE TESTE:**
- [ ] Verificar que código compila
- [ ] Verificar que não há erros de tipo

---

**Arquivo:** `agent/src/graph/state.py`

**Modificação:**
```python
class AgentState(TypedDict):
    messages: List[BaseMessage]
    next: str
    user_id: Optional[str]
    
    # NOVOS CAMPOS SICC:
    sicc_context: Optional[Dict]  # Contexto recuperado (memórias + padrões)
    sicc_patterns: Optional[List]  # Padrões aplicáveis
    sicc_learnings: Optional[List]  # Novos aprendizados detectados
    sicc_approved: Optional[bool]  # Status de aprovação
    customer_context: Optional[Dict]  # Contexto do cliente (histórico)
```

**Validação:**
- [ ] Campos adicionados
- [ ] TypedDict válido
- [ ] Sem erros de tipo

---

### SUBTASK 2.2: Modificar `sicc_lookup_node`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Modificar sicc_lookup_node para popular campos SICC no state
- [ ] Buscar memórias, padrões e histórico do cliente
- [ ] Retornar state atualizado com contexto completo

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] Memory Service (buscar memórias)
- [ ] Behavior Service (buscar padrões)
- [ ] Customer History Service (buscar histórico)

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/nodes/sicc_lookup.py` completo
- [ ] Seguir padrão async def existente
- [ ] Seguir padrão de logging existente
- [ ] Seguir padrão de tratamento de erros

**4. PONTOS DE RISCO:**
- [ ] Services podem não estar disponíveis
- [ ] Queries podem falhar
- [ ] Não bloquear fluxo se houver erro

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Buscar memórias relevantes
- [ ] Buscar padrões aplicáveis
- [ ] Buscar histórico do cliente
- [ ] Popular campos sicc_context, sicc_patterns, customer_context
- [ ] Adicionar try/except robusto

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com mensagem válida
- [ ] Testar com user_id válido
- [ ] Testar comportamento em caso de erro

---

**Arquivo:** `agent/src/graph/nodes/sicc_lookup.py`

**Objetivo:** Buscar contexto SICC e popular state

**Implementação:**
```python
async def sicc_lookup_node(state: AgentState) -> AgentState:
    """
    Busca contexto SICC antes de processar mensagem
    
    - Busca memórias relevantes
    - Busca padrões aplicáveis
    - Busca histórico do cliente
    - Popula state com contexto
    """
    try:
        from src.services.sicc.sicc_service import get_sicc_service
        from src.services.customer_history_service import get_customer_history_service
        
        sicc = get_sicc_service()
        customer_service = get_customer_history_service()
        
        message = state["messages"][-1].content
        user_id = state.get("user_id", "unknown")
        
        # 1. Buscar contexto do cliente
        customer_context = await customer_service.get_customer_context(user_id)
        
        # 2. Buscar memórias relevantes
        memories = await sicc.memory_service.get_relevant_context(
            query=message,
            user_id=user_id,
            limit=5
        )
        
        # 3. Buscar padrões aplicáveis
        patterns = await sicc.behavior_service.find_applicable_patterns(
            message=message,
            context={"user_id": user_id}
        )
        
        # 4. Popular state
        state["sicc_context"] = {
            "memories": memories,
            "patterns": patterns
        }
        state["customer_context"] = customer_context
        
        logger.info(f"SICC Lookup: {len(memories)} memórias, {len(patterns)} padrões")
        
        return state
        
    except Exception as e:
        logger.error(f"Erro no SICC Lookup: {e}")
        # Continuar sem contexto SICC
        state["sicc_context"] = {"memories": [], "patterns": []}
        state["customer_context"] = {}
        return state
```

**Validação:**
- [ ] Node modificado
- [ ] Busca memórias corretamente
- [ ] Busca padrões corretamente
- [ ] Popula state corretamente

---


### SUBTASK 2.3: Modificar `router_node`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Modificar router_node para usar contexto SICC na classificação
- [ ] Incluir memórias e padrões no prompt de classificação
- [ ] Melhorar precisão da classificação de intenção

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] AI Service (gerar classificação)
- [ ] Campos sicc_context e customer_context do state
- [ ] Validação de intent (discovery/sales/support)

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/nodes/router.py` completo
- [ ] Seguir padrão async def existente
- [ ] Seguir padrão de logging existente
- [ ] Seguir padrão de acesso ao state

**4. PONTOS DE RISCO:**
- [ ] AI Service pode falhar
- [ ] Intent pode ser inválido
- [ ] Contexto SICC pode estar vazio
- [ ] Fallback para 'discovery' se houver erro

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Extrair contexto SICC do state
- [ ] Construir prompt enriquecido com contexto
- [ ] Chamar AI Service para classificar
- [ ] Validar intent retornado
- [ ] Popular state["next"] com intent
- [ ] Adicionar logging

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com contexto SICC completo
- [ ] Testar com contexto SICC vazio
- [ ] Testar com intent inválido (deve usar fallback)

---

**Arquivo:** `agent/src/graph/nodes/router.py`

**Objetivo:** Usar contexto SICC para classificar melhor

**Modificação:**
```python
async def router_node(state: AgentState) -> AgentState:
    """
    Classifica intenção usando contexto SICC
    """
    message = state["messages"][-1].content
    sicc_context = state.get("sicc_context", {})
    customer_context = state.get("customer_context", {})
    
    # Construir prompt com contexto SICC
    prompt = f"""Você é o router do sistema de atendimento.

Mensagem do cliente: {message}

Contexto SICC:
- Cliente retornando: {customer_context.get('is_returning_customer', False)}
- Memórias relevantes: {len(sicc_context.get('memories', []))}
- Padrões aplicáveis: {len(sicc_context.get('patterns', []))}

Classifique a intenção em:
- discovery: Lead novo, qualificação inicial
- sales: Interesse em comprar, negociação
- support: Dúvidas, suporte pós-venda

Responda APENAS com: discovery, sales ou support
"""
    
    # Classificar
    from src.services.ai_service import get_ai_service
    ai_service = get_ai_service()
    
    response = await ai_service.generate_text(
        prompt=prompt,
        max_tokens=10,
        temperature=0.3
    )
    
    intent = response.get('text', 'discovery').strip().lower()
    
    # Validar intent
    if intent not in ['discovery', 'sales', 'support']:
        intent = 'discovery'
    
    state["next"] = intent
    logger.info(f"Router: intent={intent}")
    
    return state
```

**Validação:**
- [ ] Router usa contexto SICC
- [ ] Classificação mais precisa
- [ ] Fallback funciona

---

### SUBTASK 2.4: Modificar sub-agentes (discovery/sales/support)

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [x] Modificar 3 sub-agentes (discovery, sales, support)
- [x] Incluir contexto SICC nos prompts de resposta
- [x] Personalizar respostas com memórias e padrões

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [x] AI Service (gerar respostas)
- [x] Campos sicc_context e customer_context do state
- [x] LangChain AIMessage para adicionar resposta

**3. PADRÕES EXISTENTES:**
- [x] Ler `agent/src/graph/nodes/discovery.py` completo
- [x] Ler `agent/src/graph/nodes/sales.py` completo
- [x] Ler `agent/src/graph/nodes/support.py` completo
- [x] Seguir padrão async def existente
- [x] Seguir padrão de construção de prompt
- [x] Seguir padrão de adicionar mensagem ao state

**4. PONTOS DE RISCO:**
- [x] AI Service pode falhar
- [x] Contexto SICC pode estar vazio
- [x] Memórias podem ser muitas (limitar a 3)
- [x] Padrões podem ser muitos (limitar a 2)

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [x] Extrair contexto SICC do state
- [x] Formatar memórias (limitar a 3)
- [x] Formatar padrões (limitar a 2)
- [x] Construir prompt enriquecido
- [x] Chamar AI Service
- [x] Adicionar resposta ao state["messages"]
- [x] Adicionar logging

**6. ESTRATÉGIA DE TESTE:**
- [x] Testar cada sub-agente individualmente
- [x] Testar com contexto SICC completo
- [x] Testar com contexto SICC vazio
- [x] Verificar que resposta é adicionada ao state

---

**Arquivos:** 
- `agent/src/graph/nodes/discovery.py` ✅ CORRIGIDO
- `agent/src/graph/nodes/sales.py` ✅ JÁ ESTAVA CORRETO
- `agent/src/graph/nodes/support.py` ✅ CORRIGIDO

**Objetivo:** Usar contexto SICC nas respostas

**STATUS:** ✅ **COMPLETAMENTE IMPLEMENTADO**

**Implementação:**
- ✅ **discovery.py:** Agora usa contexto SICC (memórias + padrões) para personalizar qualificação
- ✅ **sales.py:** Já estava usando contexto SICC completo
- ✅ **support.py:** Agora usa contexto SICC (memórias + padrões) para personalizar suporte

**Validação:**
- [x] Discovery modificado e usando contexto SICC
- [x] Sales já estava correto
- [x] Support modificado e usando contexto SICC
- [x] Todos usam contexto SICC de forma consistente
- [x] Sem erros de diagnóstico

**Exemplo (sales_node):**
```python
async def sales_node(state: AgentState) -> AgentState:
    """
    Agente de vendas usando contexto SICC
    """
    message = state["messages"][-1].content
    sicc_context = state.get("sicc_context", {})
    customer_context = state.get("customer_context", {})
    
    # Construir prompt com contexto SICC
    memories = sicc_context.get("memories", [])
    patterns = sicc_context.get("patterns", [])
    
    memory_text = "\n".join([m.get("content", "") for m in memories[:3]])
    pattern_text = "\n".join([p.get("description", "") for p in patterns[:2]])
    
    prompt = f"""Você é o agente de vendas da Slim Quality.

Mensagem: {message}

Contexto do Cliente:
- Nome: {customer_context.get('customer_name', 'Cliente')}
- Retornando: {customer_context.get('is_returning_customer', False)}
- Histórico de compras: {customer_context.get('has_purchase_history', False)}

Memórias Relevantes:
{memory_text}

Padrões Aplicáveis:
{pattern_text}

Responda de forma consultiva e personalizada.
"""
    
    # Gerar resposta
    from src.services.ai_service import get_ai_service
    ai_service = get_ai_service()
    
    response = await ai_service.generate_text(
        prompt=prompt,
        max_tokens=500,
        temperature=0.7
    )
    
    response_text = response.get('text', 'Desculpe, não consegui processar.')
    
    # Adicionar resposta ao state
    from langchain_core.messages import AIMessage
    state["messages"].append(AIMessage(content=response_text))
    
    return state
```

**Validação:**
- [ ] Discovery modificado
- [ ] Sales modificado
- [ ] Support modificado
- [ ] Todos usam contexto SICC

---


### SUBTASK 2.5: Modificar `sicc_learn_node`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Modificar sicc_learn_node para detectar padrões na conversa
- [ ] Analisar mensagens completas da conversa
- [ ] Popular campo sicc_learnings no state

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] SICC Learning Service (analyze_conversation_patterns)
- [ ] State messages (histórico completo)
- [ ] Campo next do state (tipo de sub-agente)

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/nodes/sicc_learn.py` completo
- [ ] Ler `agent/src/services/sicc/learning_service.py` (método analyze_conversation_patterns)
- [ ] Seguir padrão async def existente
- [ ] Seguir padrão de logging existente

**4. PONTOS DE RISCO:**
- [ ] Learning Service pode falhar
- [ ] Conversa pode estar vazia
- [ ] Formato de conversation_data deve estar correto
- [ ] Não bloquear fluxo se houver erro

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Extrair mensagens do state
- [ ] Formatar como conversation_data (role + content)
- [ ] Chamar Learning Service
- [ ] Popular state["sicc_learnings"]
- [ ] Adicionar try/except robusto
- [ ] Adicionar logging

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com conversa completa
- [ ] Testar com conversa vazia
- [ ] Testar comportamento em caso de erro

---

**Arquivo:** `agent/src/graph/nodes/sicc_learn.py`

**Objetivo:** Detectar padrões na conversa

**Implementação:**
```python
async def sicc_learn_node(state: AgentState) -> AgentState:
    """
    Detecta padrões na conversa para aprendizado
    """
    try:
        from src.services.sicc.sicc_service import get_sicc_service
        
        sicc = get_sicc_service()
        
        # Analisar conversa completa
        conversation_data = {
            "messages": [
                {"role": "user" if i % 2 == 0 else "assistant", "content": msg.content}
                for i, msg in enumerate(state["messages"])
            ],
            "sub_agent_type": state.get("next", "sales")
        }
        
        # Detectar padrões
        patterns = await sicc.learning_service.analyze_conversation_patterns(
            conversation_data=conversation_data,
            sub_agent_type=conversation_data["sub_agent_type"]
        )
        
        state["sicc_learnings"] = patterns
        
        logger.info(f"SICC Learn: {len(patterns)} padrões detectados")
        
        return state
        
    except Exception as e:
        logger.error(f"Erro no SICC Learn: {e}")
        state["sicc_learnings"] = []
        return state
```

**Validação:**
- [ ] Node modificado
- [ ] Detecta padrões corretamente
- [ ] Popula state com learnings

---

### SUBTASK 2.6: Modificar `supervisor_approve_node`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Modificar supervisor_approve_node para aprovar aprendizados
- [ ] Usar método evaluate_learning() criado na Fase 1
- [ ] Salvar padrões aprovados no banco
- [ ] Popular campo sicc_approved no state

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] SICC Supervisor Service (evaluate_learning)
- [ ] SICC Behavior Service (register_new_pattern)
- [ ] Campo sicc_learnings do state
- [ ] Banco de dados (salvar padrões)

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/nodes/supervisor.py` completo
- [ ] Ler `agent/src/services/sicc/supervisor_service.py` (método evaluate_learning)
- [ ] Ler `agent/src/services/sicc/behavior_service.py` (método register_new_pattern)
- [ ] Seguir padrão async def existente
- [ ] Seguir padrão de logging existente

**4. PONTOS DE RISCO:**
- [ ] Supervisor Service pode falhar
- [ ] Behavior Service pode falhar ao salvar
- [ ] sicc_learnings pode estar vazio
- [ ] Não bloquear fluxo se houver erro

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Extrair learnings do state
- [ ] Iterar sobre cada learning
- [ ] Chamar evaluate_learning() para cada um
- [ ] Se aprovado, chamar register_new_pattern()
- [ ] Contar aprovados/rejeitados
- [ ] Popular state["sicc_approved"]
- [ ] Adicionar try/except robusto
- [ ] Adicionar logging detalhado

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com learnings válidos
- [ ] Testar com learnings vazios
- [ ] Testar comportamento em caso de erro
- [ ] Verificar que padrões são salvos no banco

---

**Arquivo:** `agent/src/graph/nodes/supervisor.py`

**Objetivo:** Aprovar aprendizados automaticamente

**Implementação:**
```python
async def supervisor_approve_node(state: AgentState) -> AgentState:
    """
    Aprova ou rejeita aprendizados automaticamente
    """
    try:
        from src.services.sicc.sicc_service import get_sicc_service
        
        sicc = get_sicc_service()
        learnings = state.get("sicc_learnings", [])
        
        approved_count = 0
        rejected_count = 0
        
        for learning in learnings:
            # Avaliar aprendizado
            result = await sicc.supervisor_service.evaluate_learning(
                pattern_data=learning,
                confidence_threshold=0.7
            )
            
            if result.get("approved", False):
                # Salvar padrão aprovado
                await sicc.behavior_service.register_new_pattern(learning)
                approved_count += 1
                logger.info(f"Padrão aprovado: {learning.get('id')}")
            else:
                rejected_count += 1
                logger.info(f"Padrão rejeitado: {result.get('reason')}")
        
        state["sicc_approved"] = True
        
        logger.info(f"Supervisor: {approved_count} aprovados, {rejected_count} rejeitados")
        
        return state
        
    except Exception as e:
        logger.error(f"Erro no Supervisor: {e}")
        state["sicc_approved"] = False
        return state
```

**Validação:**
- [ ] Node modificado
- [ ] Aprova padrões corretamente
- [ ] Salva no banco

---

### SUBTASK 2.7: Modificar `builder.py`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Adicionar nodes SICC ao graph builder
- [ ] Modificar fluxo: START → sicc_lookup → router → sub-agentes → sicc_learn → supervisor → END
- [ ] Manter nodes existentes funcionando

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] Importar sicc_lookup_node, sicc_learn_node, supervisor_approve_node
- [ ] Usar StateGraph existente
- [ ] Usar checkpointer existente
- [ ] Função route_intent existente

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/graph/builder.py` completo
- [ ] Seguir padrão de add_node existente
- [ ] Seguir padrão de add_edge existente
- [ ] Seguir padrão de add_conditional_edges existente

**4. PONTOS DE RISCO:**
- [ ] Imports dos nodes SICC devem estar corretos
- [ ] Fluxo deve convergir corretamente
- [ ] Não quebrar fluxo existente
- [ ] Graph deve compilar sem erros

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Importar nodes SICC
- [ ] Adicionar nodes SICC ao workflow
- [ ] Mudar entry_point para sicc_lookup
- [ ] Adicionar edges: sicc_lookup → router
- [ ] Adicionar edges: sub-agentes → sicc_learn
- [ ] Adicionar edges: sicc_learn → supervisor
- [ ] Adicionar edge: supervisor → END

**6. ESTRATÉGIA DE TESTE:**
- [ ] Verificar que graph compila
- [ ] Verificar que não há erros de import
- [ ] Verificar que fluxo está correto

---

**Arquivo:** `agent/src/graph/builder.py`

**Objetivo:** Adicionar nodes SICC ao graph

**Modificação:**
```python
def build_graph() -> StateGraph:
    """Constrói o graph com SICC integrado"""
    workflow = StateGraph(AgentState)
    
    # ADICIONAR NODES SICC
    from .nodes.sicc_lookup import sicc_lookup_node
    from .nodes.sicc_learn import sicc_learn_node
    from .nodes.supervisor import supervisor_approve_node
    
    workflow.add_node("sicc_lookup", sicc_lookup_node)
    workflow.add_node("sicc_learn", sicc_learn_node)
    workflow.add_node("supervisor_approve", supervisor_approve_node)
    
    # Nodes existentes
    workflow.add_node("router", router_node)
    workflow.add_node("discovery", discovery_node)
    workflow.add_node("sales", sales_node)
    workflow.add_node("support", support_node)
    
    # NOVO FLUXO COM SICC:
    # START → SICC Lookup → Router → Sub-agentes → SICC Learn → Supervisor → END
    
    workflow.set_entry_point("sicc_lookup")
    workflow.add_edge("sicc_lookup", "router")
    
    # Router → Sub-agentes (condicional)
    workflow.add_conditional_edges(
        "router",
        lambda state: state["next"],
        {
            "discovery": "discovery",
            "sales": "sales",
            "support": "support"
        }
    )
    
    # Sub-agentes → SICC Learn
    workflow.add_edge("discovery", "sicc_learn")
    workflow.add_edge("sales", "sicc_learn")
    workflow.add_edge("support", "sicc_learn")
    
    # SICC Learn → Supervisor
    workflow.add_edge("sicc_learn", "supervisor_approve")
    
    # Supervisor → END
    workflow.add_edge("supervisor_approve", END)
    
    # Compilar com checkpointer
    from .checkpointer import get_checkpointer
    checkpointer = get_checkpointer()
    
    return workflow.compile(checkpointer=checkpointer)
```

**Validação:**
- [ ] Nodes SICC adicionados
- [ ] Fluxo correto
- [ ] Graph compila sem erros

---

### SUBTASK 2.8: Implementar Fallback em `main.py`

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Modificar main.py para usar LangGraph como método principal
- [ ] Implementar fallback de 3 níveis: Graph → SICCService → IA direta
- [ ] Adicionar feature flag USE_SICC_GRAPH para controle
- [ ] Garantir que sistema nunca falha completamente

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] LangGraph builder (build_graph)
- [ ] SICCService (process_message)
- [ ] AI Service (fallback final)
- [ ] Variável de ambiente USE_SICC_GRAPH

**3. PADRÕES EXISTENTES:**
- [ ] Ler `agent/src/api/main.py` completo
- [ ] Identificar onde mensagens são processadas atualmente
- [ ] Seguir padrão async def existente
- [ ] Seguir padrão de logging existente
- [ ] Seguir padrão de tratamento de erros

**4. PONTOS DE RISCO:**
- [ ] Graph pode falhar (precisa fallback)
- [ ] SICCService pode falhar (precisa fallback)
- [ ] Todos os níveis podem falhar (mensagem genérica)
- [ ] Feature flag deve ter valor padrão seguro (false)

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Criar função process_with_sicc_graph()
- [ ] Nível 1: Tentar LangGraph (se feature flag ativa)
- [ ] Nível 2: Fallback para SICCService
- [ ] Nível 3: Fallback para AI Service direto
- [ ] Adicionar logging em cada nível
- [ ] Adicionar try/except em cada nível
- [ ] Retornar mensagem genérica se tudo falhar

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com feature flag true (deve usar graph)
- [ ] Testar com feature flag false (deve usar SICCService)
- [ ] Testar com graph falhando (deve usar fallback)
- [ ] Testar com todos falhando (deve retornar mensagem genérica)

---

**Arquivo:** `agent/src/api/main.py`

**Objetivo:** Usar graph com fallback para SICCService

**Modificação:**
```python
async def process_with_sicc(message: str, phone: str):
    """
    Processa mensagem usando Graph (com fallback para SICCService)
    """
    try:
        # TENTAR GRAPH PRIMEIRO (NOVO)
        logger.info("Tentando processar via LangGraph...")
        
        from src.graph.builder import build_graph
        from langchain_core.messages import HumanMessage
        
        graph = build_graph()
        
        result = await graph.ainvoke({
            "messages": [HumanMessage(content=message)],
            "user_id": phone
        })
        
        # Extrair resposta
        response = result["messages"][-1].content
        
        logger.info("✅ Processado via LangGraph com sucesso")
        return response
        
    except Exception as graph_error:
        # FALLBACK PARA SICCSERVICE (ANTIGO)
        logger.warning(f"⚠️ Graph falhou, usando fallback: {graph_error}")
        
        try:
            from src.services.sicc.sicc_service import SICCService
            
            sicc = SICCService()
            result = await sicc.process_message(
                message=message,
                user_id=phone,
                context={"platform": "whatsapp"}
            )
            
            logger.info("✅ Processado via SICCService (fallback)")
            return result.get('response', 'Desculpe, não consegui processar.')
            
        except Exception as fallback_error:
            logger.error(f"❌ Fallback também falhou: {fallback_error}")
            return "Desculpe, estou com dificuldades técnicas. Pode tentar novamente?"
```

**Validação:**
- [ ] Graph é tentado primeiro
- [ ] Fallback funciona se graph falhar
- [ ] Logs claros de qual método foi usado

---


## 🧪 FASE 3: TESTES E VALIDAÇÃO

**Objetivo:** Validar integração completa  
**Tempo Estimado:** 1 hora  
**Prioridade:** ALTA  

### SUBTASK 3.1: Teste Unitário - SupervisorService

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Criar testes unitários para SupervisorService
- [ ] Testar método evaluate_learning() criado na Fase 1
- [ ] Validar aprovação automática
- [ ] Validar detecção de conflitos

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] pytest (framework de testes)
- [ ] SupervisorService
- [ ] Fixtures de teste (padrões mock)

**3. PADRÕES EXISTENTES:**
- [ ] Verificar se já existem testes em `agent/tests/`
- [ ] Seguir padrão de nomenclatura de testes existentes
- [ ] Seguir padrão de fixtures existentes
- [ ] Usar pytest.mark.asyncio para testes async

**4. PONTOS DE RISCO:**
- [ ] Testes podem falhar se método não estiver correto
- [ ] Fixtures podem precisar de ajustes
- [ ] Banco de dados de teste pode ser necessário

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Criar arquivo `tests/test_supervisor_service.py`
- [ ] Criar fixtures de padrões mock
- [ ] Testar cenário: alta confiança (deve aprovar)
- [ ] Testar cenário: baixa confiança (deve rejeitar)
- [ ] Testar cenário: no limite do threshold
- [ ] Testar cenário: com conflitos críticos

**6. ESTRATÉGIA DE TESTE:**
- [ ] Executar: `pytest tests/test_supervisor_service.py -v`
- [ ] Verificar que todos os testes passam
- [ ] Verificar cobertura de código

---

**Comando:**
```bash
cd agent
python -m pytest tests/test_supervisor_service.py -v
```

**Validações:**
- [ ] `evaluate_learning()` funciona
- [ ] Aprovação automática funciona
- [ ] Detecção de conflitos funciona

---

### SUBTASK 3.2: Teste de Integração - Graph Completo

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Criar teste de integração end-to-end do graph
- [ ] Validar fluxo completo: lookup → router → sub-agente → learn → supervisor
- [ ] Verificar que todos os campos do state são populados corretamente

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] pytest (framework de testes)
- [ ] LangGraph builder
- [ ] LangChain messages (HumanMessage)
- [ ] Todos os nodes do graph

**3. PADRÕES EXISTENTES:**
- [ ] Verificar se já existem testes de integração em `agent/tests/`
- [ ] Seguir padrão de nomenclatura de testes existentes
- [ ] Usar pytest.mark.asyncio para testes async
- [ ] Seguir padrão de assertions existentes

**4. PONTOS DE RISCO:**
- [ ] Graph pode não compilar
- [ ] Nodes podem falhar
- [ ] State pode não ser populado corretamente
- [ ] Teste pode ser lento (timeout)

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Criar arquivo `tests/test_sicc_graph_integration.py`
- [ ] Criar função de teste async
- [ ] Invocar graph com mensagem de teste
- [ ] Validar campos do state (sicc_context, sicc_learnings, sicc_approved)
- [ ] Validar que resposta foi gerada
- [ ] Adicionar assertions claras

**6. ESTRATÉGIA DE TESTE:**
- [ ] Executar: `pytest tests/test_sicc_graph_integration.py -v`
- [ ] Verificar que teste passa
- [ ] Verificar logs do graph

---

**Script de Teste:**
```python
# agent/tests/test_sicc_graph_integration.py

import pytest
from src.graph.builder import build_graph
from langchain_core.messages import HumanMessage

@pytest.mark.asyncio
async def test_sicc_graph_flow():
    """Testa fluxo completo do graph com SICC"""
    
    graph = build_graph()
    
    # Executar graph
    result = await graph.ainvoke({
        "messages": [HumanMessage(content="Olá, quero comprar um colchão")],
        "user_id": "test_user_123"
    })
    
    # Validações
    assert "sicc_context" in result
    assert "sicc_learnings" in result
    assert "sicc_approved" in result
    assert len(result["messages"]) > 1
    assert result["messages"][-1].content != ""
    
    print("✅ Fluxo completo do graph funcionando")
```

**Validações:**
- [ ] Graph executa sem erros
- [ ] SICC Lookup popula contexto
- [ ] Router classifica corretamente
- [ ] Sub-agente responde
- [ ] SICC Learn detecta padrões
- [ ] Supervisor aprova/rejeita

---

### SUBTASK 3.3: Teste de Fallback

**Script de Teste:**
```python
# agent/tests/test_sicc_fallback.py

import pytest
from unittest.mock import patch
from src.api.main import process_with_sicc

@pytest.mark.asyncio
async def test_fallback_when_graph_fails():
    """Testa se fallback funciona quando graph falha"""
    
    # Simular falha do graph
    with patch('src.graph.builder.build_graph', side_effect=Exception("Graph error")):
        response = await process_with_sicc(
            message="Teste",
            phone="5511999999999"
        )
        
        # Deve usar fallback
        assert response != ""
        assert "dificuldades técnicas" not in response.lower()
        
    print("✅ Fallback funcionando corretamente")
```

**Validações:**
- [ ] Fallback ativa quando graph falha
- [ ] SICCService processa corretamente
- [ ] Resposta é retornada

---

### SUBTASK 3.4: Teste End-to-End via Webhook

**Teste Manual:**
1. Enviar mensagem via WhatsApp
2. Verificar logs do container
3. Confirmar que graph foi usado
4. Verificar resposta recebida

**Logs Esperados:**
```
Tentando processar via LangGraph...
SICC Lookup: 3 memórias, 2 padrões
Router: intent=sales
SICC Learn: 1 padrões detectados
Supervisor: 1 aprovados, 0 rejeitados
✅ Processado via LangGraph com sucesso
```

**Validações:**
- [ ] Webhook recebe mensagem
- [ ] Graph processa
- [ ] Resposta é enviada
- [ ] Logs corretos

---

### SUBTASK 3.5: Validar Painel de Aprendizados

**Teste Manual:**
1. Acessar `/dashboard/agente/aprendizados`
2. Verificar se novos aprendizados aparecem
3. Testar aprovação/rejeição manual
4. Verificar métricas

**Validações:**
- [ ] Página carrega sem erros
- [ ] Aprendizados aparecem
- [ ] Filtros funcionam
- [ ] Aprovação manual funciona

---


## 🚀 FASE 4: DEPLOY GRADUAL

**Objetivo:** Deploy seguro em produção  
**Tempo Estimado:** 30 minutos  
**Prioridade:** CRÍTICA  

### SUBTASK 4.1: Deploy com Feature Flag

**📋 ANÁLISE PREVENTIVA OBRIGATÓRIA:**

**1. ENTENDIMENTO DA TAREFA:**
- [ ] Implementar feature flag USE_SICC_GRAPH
- [ ] Controlar uso do graph via variável de ambiente
- [ ] Manter fallback para SICCService sempre disponível
- [ ] Valor padrão deve ser seguro (false)

**2. DEPENDÊNCIAS E INTEGRAÇÕES:**
- [ ] Variável de ambiente USE_SICC_GRAPH
- [ ] Função process_with_sicc em main.py
- [ ] LangGraph builder
- [ ] SICCService

**3. PADRÕES EXISTENTES:**
- [ ] Verificar como outras feature flags são implementadas
- [ ] Seguir padrão de leitura de env vars
- [ ] Seguir padrão de logging de decisões

**4. PONTOS DE RISCO:**
- [ ] Valor padrão deve ser false (seguro)
- [ ] Deve funcionar mesmo se env var não existir
- [ ] Logs devem deixar claro qual caminho foi usado

**5. ESTRATÉGIA DE IMPLEMENTAÇÃO:**
- [ ] Adicionar leitura de USE_SICC_GRAPH no início de main.py
- [ ] Modificar process_with_sicc para verificar flag
- [ ] Adicionar logs claros de qual caminho está sendo usado
- [ ] Testar com flag true e false

**6. ESTRATÉGIA DE TESTE:**
- [ ] Testar com USE_SICC_GRAPH=true
- [ ] Testar com USE_SICC_GRAPH=false
- [ ] Testar sem a variável definida (deve usar false)

---

**Estratégia:** Usar variável de ambiente para controlar

**Modificação em `main.py`:**
```python
import os

USE_GRAPH = os.getenv("USE_SICC_GRAPH", "false").lower() == "true"

async def process_with_sicc(message: str, phone: str):
    """Processa com graph ou fallback baseado em feature flag"""
    
    if USE_GRAPH:
        # Tentar graph
        try:
            logger.info("🚀 Usando LangGraph (feature flag ativada)")
            result = await graph.ainvoke(...)
            return result
        except Exception as e:
            logger.warning(f"Graph falhou, usando fallback: {e}")
            # Fallback para SICCService
    else:
        logger.info("📦 Usando SICCService (feature flag desativada)")
    
    # SICCService (fallback ou padrão)
    sicc = SICCService()
    result = await sicc.process_message(...)
    return result.get('response')
```

**Validações:**
- [ ] Feature flag implementada
- [ ] Padrão é `false` (seguro)
- [ ] Pode ser ativada via env var

---

### SUBTASK 4.2: Deploy Fase 1 - Testes Internos

**Ações:**
1. Deploy com `USE_SICC_GRAPH=false`
2. Validar que tudo funciona como antes
3. Ativar `USE_SICC_GRAPH=true` apenas para número de teste
4. Monitorar logs por 1 hora

**Validações:**
- [ ] Deploy sem erros
- [ ] Sistema funciona normalmente
- [ ] Número de teste usa graph
- [ ] Sem erros críticos

---

### SUBTASK 4.3: Deploy Fase 2 - Rollout Gradual

**Estratégia:** Ativar para % de usuários

**Modificação:**
```python
import random

GRAPH_ROLLOUT_PERCENTAGE = int(os.getenv("GRAPH_ROLLOUT_PERCENTAGE", "0"))

async def process_with_sicc(message: str, phone: str):
    """Rollout gradual do graph"""
    
    # Decidir se usa graph baseado em %
    use_graph = random.randint(1, 100) <= GRAPH_ROLLOUT_PERCENTAGE
    
    if use_graph:
        try:
            logger.info(f"🚀 Usando graph (rollout {GRAPH_ROLLOUT_PERCENTAGE}%)")
            result = await graph.ainvoke(...)
            return result
        except Exception as e:
            logger.warning(f"Graph falhou, fallback: {e}")
    
    # Fallback
    logger.info(f"📦 Usando SICCService (rollout {GRAPH_ROLLOUT_PERCENTAGE}%)")
    sicc = SICCService()
    result = await sicc.process_message(...)
    return result.get('response')
```

**Cronograma:**
- Dia 1: 10% dos usuários
- Dia 2: 25% dos usuários
- Dia 3: 50% dos usuários
- Dia 4: 75% dos usuários
- Dia 5: 100% dos usuários

**Validações:**
- [ ] Rollout gradual funciona
- [ ] Métricas monitoradas
- [ ] Taxa de erro < 1%
- [ ] Performance aceitável

---

### SUBTASK 4.4: Deploy Fase 3 - 100% Graph

**Ações:**
1. Ativar `GRAPH_ROLLOUT_PERCENTAGE=100`
2. Monitorar por 24 horas
3. Se estável, remover fallback (opcional)

**Validações:**
- [ ] 100% usando graph
- [ ] Sistema estável
- [ ] Performance OK
- [ ] Aprendizados funcionando

---


## 📊 MÉTRICAS DE SUCESSO

### KPIs para Validar Integração:

1. **Performance:**
   - Tempo de resposta < 3 segundos (média)
   - Taxa de timeout < 0.5%

2. **Qualidade:**
   - Taxa de erro < 1%
   - Fallback usado < 5% das vezes

3. **Aprendizado:**
   - Padrões detectados > 10 por dia
   - Taxa de aprovação automática > 70%

4. **Experiência:**
   - Respostas mais contextualizadas
   - Clientes retornando reconhecidos

---

## 📋 CHECKLIST FINAL

### Antes de Começar:
- [ ] Arquivo tasks criado e revisado
- [ ] Arquivos a modificar identificados
- [ ] Estratégia de fallback definida
- [ ] Plano de testes definido
- [ ] Cronograma de deploy definido

### Fase 1 - Correções:
- [ ] `evaluate_learning()` implementado
- [ ] Testes unitários passando
- [ ] SupervisorService funcionando

### Fase 2 - Integração:
- [ ] AgentState modificado
- [ ] sicc_lookup_node modificado
- [ ] router_node modificado
- [ ] Sub-agentes modificados
- [ ] sicc_learn_node modificado
- [ ] supervisor_approve_node modificado
- [ ] builder.py modificado
- [ ] main.py com fallback implementado

### Fase 3 - Testes:
- [ ] Testes unitários passando
- [ ] Teste de integração passando
- [ ] Teste de fallback passando
- [ ] Teste end-to-end OK
- [ ] Painel de aprendizados OK

### Fase 4 - Deploy:
- [ ] Feature flag implementada
- [ ] Deploy fase 1 (testes internos) OK
- [ ] Deploy fase 2 (rollout gradual) OK
- [ ] Deploy fase 3 (100%) OK
- [ ] Métricas validadas

---

## 🚨 RISCOS E MITIGAÇÕES

### RISCO 1: Graph mais lento que SICCService
**Mitigação:** Fallback automático + otimização de nodes

### RISCO 2: Bugs no graph quebram sistema
**Mitigação:** Fallback robusto + feature flag

### RISCO 3: Aprendizados não são salvos
**Mitigação:** Logs detalhados + validação no painel

### RISCO 4: Performance degradada
**Mitigação:** Rollout gradual + monitoramento

---

## 📝 NOTAS IMPORTANTES

1. **NÃO REMOVER SICCService.process_message()** - Manter como fallback permanente
2. **TESTAR MUITO antes de 100%** - Rollout gradual é essencial
3. **MONITORAR LOGS** - Identificar problemas rapidamente
4. **VALIDAR PAINEL** - Garantir que aprendizados aparecem
5. **DOCUMENTAR MUDANÇAS** - Atualizar docs após deploy

---

## 🎯 PRÓXIMOS PASSOS APÓS CONCLUSÃO

1. **Implementar Streaming** (Fase 2)
2. **Implementar Human-in-the-Loop** (Fase 2)
3. **Otimizar Performance** (Fase 2)
4. **Adicionar Métricas Avançadas** (Fase 2)
5. **Integrar LangSmith** (Debugging avançado)

---

## 📞 CONTATO E SUPORTE

**Desenvolvedor:** Kiro AI  
**Cliente:** Renato Carraro  
**Data Criação:** 14/01/2026  
**Última Atualização:** 14/01/2026  

**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO

---

**FIM DO DOCUMENTO**
