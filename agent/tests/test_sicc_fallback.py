"""
Testes de fallback do sistema SICC
"""
import pytest
from unittest.mock import patch, AsyncMock
from src.api.main import process_message_with_graph


@pytest.mark.asyncio
async def test_fallback_when_graph_fails():
    """
    Testa se fallback funciona quando graph falha.
    Deve usar SICCService como fallback.
    """
    # Simular falha do graph
    with patch('src.graph.builder.build_graph', side_effect=Exception("Graph compilation error")):
        # Mock do SICCService para não fazer chamadas reais
        with patch('src.services.sicc.sicc_service.SICCService.process_message', new_callable=AsyncMock) as mock_sicc:
            mock_sicc.return_value = {
                'response': 'Resposta do fallback SICCService',
                'success': True
            }
            
            # Processar mensagem
            response = await process_message_with_graph(
                message="Teste de fallback",
                phone="5511999999999"
            )
            
            # Validações
            assert response is not None
            assert response != ""
            assert "dificuldades técnicas" not in response.lower()
            
            # Verificar que SICCService foi chamado
            mock_sicc.assert_called_once()
            
    print("✅ Fallback para SICCService funcionando corretamente")


@pytest.mark.asyncio
async def test_graph_success_no_fallback():
    """
    Testa que quando graph funciona, não usa fallback
    """
    # Mock do graph funcionando
    with patch('src.graph.builder.build_graph') as mock_build:
        mock_graph = AsyncMock()
        mock_graph.ainvoke.return_value = {
            "messages": [
                AsyncMock(content="Mensagem do usuário"),
                AsyncMock(content="Resposta do graph")
            ]
        }
        mock_build.return_value = mock_graph
        
        # Mock do SICCService (não deve ser chamado)
        with patch('src.services.sicc.sicc_service.SICCService.process_message', new_callable=AsyncMock) as mock_sicc:
            # Processar mensagem
            response = await process_message_with_graph(
                message="Teste sem fallback",
                phone="5511999999999"
            )
            
            # Validações
            assert response == "Resposta do graph"
            
            # Verificar que SICCService NÃO foi chamado
            mock_sicc.assert_not_called()
            
    print("✅ Graph funciona sem usar fallback")


@pytest.mark.asyncio
async def test_complete_failure_returns_error_message():
    """
    Testa que se graph E fallback falharem, retorna mensagem de erro amigável
    """
    # Simular falha do graph
    with patch('src.graph.builder.build_graph', side_effect=Exception("Graph error")):
        # Simular falha do SICCService também
        with patch('src.services.sicc.sicc_service.SICCService.process_message', side_effect=Exception("SICC error")):
            # Processar mensagem
            response = await process_message_with_graph(
                message="Teste de falha completa",
                phone="5511999999999"
            )
            
            # Validações
            assert response is not None
            assert response != ""
            assert "dificuldades técnicas" in response.lower() or "erro" in response.lower()
            
    print("✅ Falha completa retorna mensagem de erro amigável")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
