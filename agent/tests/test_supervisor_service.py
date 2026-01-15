"""
Testes unitários para SupervisorService
"""
import pytest
from src.services.sicc.supervisor_service import SupervisorService, get_supervisor_service


@pytest.fixture
def supervisor():
    """Fixture do SupervisorService"""
    return SupervisorService()


@pytest.fixture
def high_confidence_pattern():
    """Padrão com alta confiança"""
    return {
        "id": "pattern_001",
        "trigger": "cliente pergunta sobre preço",
        "confidence": 0.85,
        "description": "Cliente interessado em preço"
    }


@pytest.fixture
def low_confidence_pattern():
    """Padrão com baixa confiança"""
    return {
        "id": "pattern_002",
        "trigger": "cliente menciona colchão",
        "confidence": 0.45,
        "description": "Menção genérica a colchão"
    }


@pytest.fixture
def threshold_pattern():
    """Padrão no limite do threshold"""
    return {
        "id": "pattern_003",
        "trigger": "cliente quer comprar",
        "confidence": 0.70,
        "description": "Intenção de compra"
    }


class TestAutoApprove:
    """Testes para método auto_approve"""
    
    @pytest.mark.asyncio
    async def test_approve_high_confidence(self, supervisor):
        """Deve aprovar padrão com alta confiança"""
        result = await supervisor.auto_approve(0.85, 0.7)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_reject_low_confidence(self, supervisor):
        """Deve rejeitar padrão com baixa confiança"""
        result = await supervisor.auto_approve(0.45, 0.7)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_approve_at_threshold(self, supervisor):
        """Deve aprovar padrão exatamente no threshold"""
        result = await supervisor.auto_approve(0.70, 0.7)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_reject_below_threshold(self, supervisor):
        """Deve rejeitar padrão abaixo do threshold"""
        result = await supervisor.auto_approve(0.69, 0.7)
        assert result is False
    
    @pytest.mark.asyncio
    async def test_invalid_confidence_score(self, supervisor):
        """Deve lançar erro para confidence inválido"""
        with pytest.raises(ValueError):
            await supervisor.auto_approve(1.5, 0.7)
        
        with pytest.raises(ValueError):
            await supervisor.auto_approve(-0.1, 0.7)
    
    @pytest.mark.asyncio
    async def test_invalid_threshold(self, supervisor):
        """Deve lançar erro para threshold inválido"""
        with pytest.raises(ValueError):
            await supervisor.auto_approve(0.8, 1.5)
        
        with pytest.raises(ValueError):
            await supervisor.auto_approve(0.8, -0.1)


class TestEvaluateLearning:
    """Testes para método evaluate_learning"""
    
    @pytest.mark.asyncio
    async def test_approve_high_confidence_no_conflicts(self, supervisor, high_confidence_pattern):
        """Deve aprovar padrão com alta confiança e sem conflitos"""
        result = await supervisor.evaluate_learning(high_confidence_pattern, 0.7)
        
        assert result["approved"] is True
        assert result["confidence"] == 0.85
        assert "Aprovado automaticamente" in result["reason"]
        assert isinstance(result["conflicts"], list)
    
    @pytest.mark.asyncio
    async def test_reject_low_confidence(self, supervisor, low_confidence_pattern):
        """Deve rejeitar padrão com baixa confiança"""
        result = await supervisor.evaluate_learning(low_confidence_pattern, 0.7)
        
        assert result["approved"] is False
        assert result["confidence"] == 0.45
        assert "abaixo do threshold" in result["reason"]
        assert result["conflicts"] == []
    
    @pytest.mark.asyncio
    async def test_approve_at_threshold(self, supervisor, threshold_pattern):
        """Deve aprovar padrão exatamente no threshold"""
        result = await supervisor.evaluate_learning(threshold_pattern, 0.7)
        
        assert result["approved"] is True
        assert result["confidence"] == 0.70
    
    @pytest.mark.asyncio
    async def test_custom_threshold(self, supervisor, high_confidence_pattern):
        """Deve respeitar threshold customizado"""
        # Com threshold alto, deve rejeitar
        result = await supervisor.evaluate_learning(high_confidence_pattern, 0.9)
        assert result["approved"] is False
        
        # Com threshold baixo, deve aprovar
        result = await supervisor.evaluate_learning(high_confidence_pattern, 0.5)
        assert result["approved"] is True
    
    @pytest.mark.asyncio
    async def test_missing_confidence(self, supervisor):
        """Deve tratar padrão sem confidence como 0.0"""
        pattern = {"id": "test", "trigger": "test"}
        result = await supervisor.evaluate_learning(pattern, 0.7)
        
        assert result["approved"] is False
        assert result["confidence"] == 0.0
    
    @pytest.mark.asyncio
    async def test_error_handling(self, supervisor):
        """Deve tratar erros graciosamente"""
        # Padrão None deve retornar erro
        result = await supervisor.evaluate_learning(None, 0.7)
        
        assert result["approved"] is False
        assert "Erro na avaliação" in result["reason"]
        assert result["confidence"] == 0.0


class TestValidatePatternConflicts:
    """Testes para método validate_pattern_conflicts"""
    
    @pytest.mark.asyncio
    async def test_no_conflicts_empty_existing(self, supervisor, high_confidence_pattern):
        """Não deve detectar conflitos com lista vazia"""
        result = await supervisor.validate_pattern_conflicts(
            high_confidence_pattern,
            []
        )
        
        assert result.has_conflicts is False
        assert len(result.conflict_details) == 0
        assert result.severity_score == 0.0
    
    @pytest.mark.asyncio
    async def test_empty_new_pattern(self, supervisor):
        """Deve tratar padrão vazio"""
        result = await supervisor.validate_pattern_conflicts(
            None,
            []
        )
        
        assert result.has_conflicts is False
        assert len(result.conflict_details) == 0


class TestSingleton:
    """Testes para singleton"""
    
    def test_get_supervisor_service_singleton(self):
        """Deve retornar mesma instância"""
        service1 = get_supervisor_service()
        service2 = get_supervisor_service()
        
        assert service1 is service2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
