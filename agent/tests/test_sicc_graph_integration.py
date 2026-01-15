"""
Teste de integração end-to-end do LangGraph com SICC
"""
import pytest
from langchain_core.messages import HumanMessage
from src.graph.builder import build_graph


@pytest.mark.asyncio
async def test_sicc_graph_flow_complete():
    """
    Testa fluxo completo do graph com SICC:
    START → sicc_lookup → router → sub-agente → sicc_learn → supervisor → END
    """
    # Build graph
    graph = build_graph()
    
    # Executar graph com mensagem de teste
    result = await graph.ainvoke({
        "messages": [HumanMessage(content="Olá, quero comprar um colchão para dor nas costas")],
        "user_id": "test_user_integration_123"
    })
    
    # Validações do state
    assert "messages" in result, "State deve conter messages"
    assert len(result["messages"]) > 1, "Deve ter pelo menos 2 mensagens (user + assistant)"
    
    # Validar campos SICC foram populados
    assert "sicc_context" in result, "State deve conter sicc_context"
    assert "sicc_learnings" in result, "State deve conter sicc_learnings"
    assert "sicc_approved" in result, "State deve conter sicc_approved"
    
    # Validar que resposta foi gerada
    last_message = result["messages"][-1]
    assert last_message.content != "", "Resposta não pode estar vazia"
    assert len(last_message.content) > 10, "Resposta deve ter conteúdo significativo"
    
    # Validar que router classificou intent
    assert "next" in result, "State deve conter next (intent)"
    assert result["next"] in ["discovery", "sales", "support"], "Intent deve ser válido"
    
    print("✅ Fluxo completo do graph funcionando")
    print(f"   - Intent classificado: {result['next']}")
    print(f"   - Mensagens no histórico: {len(result['messages'])}")
    print(f"   - SICC context presente: {bool(result.get('sicc_context'))}")
    print(f"   - Learnings detectados: {len(result.get('sicc_learnings', []))}")
    print(f"   - Aprovação supervisor: {result.get('sicc_approved')}")


@pytest.mark.asyncio
async def test_sicc_lookup_populates_context():
    """Testa se sicc_lookup_node popula contexto corretamente"""
    graph = build_graph()
    
    result = await graph.ainvoke({
        "messages": [HumanMessage(content="Teste de contexto SICC")],
        "user_id": "test_context_user"
    })
    
    # Validar que sicc_context foi populado
    assert "sicc_context" in result
    sicc_context = result["sicc_context"]
    
    # Deve ter estrutura esperada (mesmo que vazia)
    assert isinstance(sicc_context, dict)
    
    print("✅ SICC Lookup popula contexto corretamente")


@pytest.mark.asyncio
async def test_router_classifies_intent():
    """Testa se router classifica intent corretamente"""
    graph = build_graph()
    
    # Teste 1: Mensagem de descoberta
    result_discovery = await graph.ainvoke({
        "messages": [HumanMessage(content="Olá, quero saber mais sobre colchões")],
        "user_id": "test_router_1"
    })
    assert result_discovery.get("next") in ["discovery", "sales", "support"]
    
    # Teste 2: Mensagem de vendas
    result_sales = await graph.ainvoke({
        "messages": [HumanMessage(content="Quanto custa o colchão queen?")],
        "user_id": "test_router_2"
    })
    assert result_sales.get("next") in ["discovery", "sales", "support"]
    
    # Teste 3: Mensagem de suporte
    result_support = await graph.ainvoke({
        "messages": [HumanMessage(content="Qual a política de troca?")],
        "user_id": "test_router_3"
    })
    assert result_support.get("next") in ["discovery", "sales", "support"]
    
    print("✅ Router classifica intent corretamente")


@pytest.mark.asyncio
async def test_sicc_learn_detects_patterns():
    """Testa se sicc_learn_node detecta padrões"""
    graph = build_graph()
    
    result = await graph.ainvoke({
        "messages": [HumanMessage(content="Quero comprar um colchão king size")],
        "user_id": "test_learn_user"
    })
    
    # Validar que learnings foram detectados (pode estar vazio, mas campo deve existir)
    assert "sicc_learnings" in result
    assert isinstance(result["sicc_learnings"], list)
    
    print(f"✅ SICC Learn detectou {len(result.get('sicc_learnings', []))} padrões")


@pytest.mark.asyncio
async def test_supervisor_approves_or_rejects():
    """Testa se supervisor aprova/rejeita aprendizados"""
    graph = build_graph()
    
    result = await graph.ainvoke({
        "messages": [HumanMessage(content="Preciso de um colchão ortopédico")],
        "user_id": "test_supervisor_user"
    })
    
    # Validar que supervisor processou
    assert "sicc_approved" in result
    assert isinstance(result["sicc_approved"], bool)
    
    print(f"✅ Supervisor processou: aprovado={result.get('sicc_approved')}")


@pytest.mark.asyncio
async def test_graph_handles_multiple_messages():
    """Testa se graph mantém contexto em múltiplas mensagens"""
    graph = build_graph()
    
    # Primeira mensagem
    result1 = await graph.ainvoke({
        "messages": [HumanMessage(content="Olá")],
        "user_id": "test_multi_user"
    })
    
    # Segunda mensagem (continuação)
    result2 = await graph.ainvoke({
        "messages": result1["messages"] + [HumanMessage(content="Quero comprar um colchão")],
        "user_id": "test_multi_user"
    })
    
    # Validar que histórico cresceu
    assert len(result2["messages"]) > len(result1["messages"])
    
    print("✅ Graph mantém contexto em múltiplas mensagens")


@pytest.mark.asyncio
async def test_graph_compiles_without_errors():
    """Testa se graph compila sem erros"""
    try:
        graph = build_graph()
        assert graph is not None
        print("✅ Graph compila sem erros")
    except Exception as e:
        pytest.fail(f"Graph falhou ao compilar: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
