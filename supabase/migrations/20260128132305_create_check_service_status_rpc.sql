-- Migration: RPC de Consulta de Status de Serviço
-- Created: 2026-01-28
-- Phase: 1.3 - Integração API

BEGIN;

-- RPC para consulta externa de status
-- Pode ser chamada via POST /rest/v1/rpc/check_service_status
CREATE OR REPLACE FUNCTION public.check_service_status(
    p_affiliate_id UUID,
    p_service_type TEXT DEFAULT 'agente_ia'
)
RETURNS TABLE (
    is_active BOOLEAN,
    status service_status,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (s.status = 'active' AND (s.expires_at IS NULL OR s.expires_at > NOW())) as is_active,
        s.status,
        s.expires_at,
        EXTRACT(DAY FROM (s.expires_at - NOW()))::INTEGER as days_remaining
    FROM public.affiliate_services s
    WHERE s.affiliate_id = p_affiliate_id
    AND s.service_type = p_service_type
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para documentação da API
COMMENT ON FUNCTION public.check_service_status IS 'Retorna o status atual de uma assinatura de serviço para um afiliado';

COMMIT;
