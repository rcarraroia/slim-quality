-- Migration: Split Dinâmico e Redistribuição Catch-all
-- Created: 2026-01-28
-- Phase: 1.2 - Lógica de Comissionamento

BEGIN;

-- Função auxiliar para buscar Wallet IDs das configurações
CREATE OR REPLACE FUNCTION get_asaas_wallet(p_key TEXT)
RETURNS TEXT AS $$
DECLARE
    v_wallet_id TEXT;
BEGIN
    -- Tenta buscar na app_settings, se não existir busca em variáveis de ambiente simuladas (segredos do Supabase)
    SELECT value INTO v_wallet_id FROM public.app_settings WHERE key = p_key;
    
    -- Se não configurado na tabela, retorna o default (deve ser configurado via segredos no processador)
    RETURN COALESCE(v_wallet_id, '');
END;
$$ LANGUAGE plpgsql;

-- Função Principal de Split Atualizada
CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_order_total_cents INTEGER;
  v_product_category product_category;
  
  -- Configurações de Split
  v_factory_percentage DECIMAL(5,2) := 70.00;
  v_commission_percentage DECIMAL(5,2) := 30.00;
  
  -- Recebedores
  v_main_receiver_wallet TEXT;
  
  -- Afiliados
  v_n1_id UUID; v_n2_id UUID; v_n3_id UUID;
  v_n1_val INTEGER := 0; v_n2_val INTEGER := 0; v_n3_val INTEGER := 0;
  
  -- Gestores e Redistribuição
  v_mgr_base_perc DECIMAL(5,2) := 5.00; -- Slim Quality 5%, JB 5%
  v_unallocated_perc DECIMAL(5,2) := 0;
  v_mgr_final_perc DECIMAL(5,2);
  v_slim_val INTEGER; v_jb_val INTEGER;
  
  v_redistribution_details JSONB;
BEGIN
  -- 1. Buscar Categoria do Produto e Dados do Pedido
  -- Assume-se um produto por pedido para simplificar o split inicial (padrão do sistema)
  SELECT 
    o.total_cents, 
    o.affiliate_n1_id,
    p.category
  INTO v_order_total_cents, v_n1_id, v_product_category
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.id = p_order_id AND o.deleted_at IS NULL
  LIMIT 1;

  IF v_order_total_cents IS NULL THEN
    RAISE EXCEPTION 'Order or Product Category not found for order: %', p_order_id;
  END IF;

  -- 2. Definir Destinatário dos 70% (Fábrica vs Renum)
  IF v_product_category = 'ferramenta_ia' THEN
    v_main_receiver_wallet := get_asaas_wallet('ASAAS_WALLET_RENUM');
  ELSE
    v_main_receiver_wallet := get_asaas_wallet('ASAAS_WALLET_FACTORY');
  END IF;

  -- 3. Buscar Rede de Afiliados
  IF v_n1_id IS NOT NULL THEN
    v_n1_val := ROUND(v_order_total_cents * 0.15); -- N1 ganha 15% sempre
    
    -- Buscar N2 e N3 na árvore
    SELECT n2.affiliate_id, n3.affiliate_id INTO v_n2_id, v_n3_id
    FROM affiliate_network n1
    LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
    LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
    WHERE n1.affiliate_id = (SELECT id FROM affiliates WHERE user_id = v_n1_id);

    -- Comissões N2 (3%)
    IF v_n2_id IS NOT NULL THEN
      v_n2_val := ROUND(v_order_total_cents * 0.03);
    ELSE
      v_unallocated_perc := v_unallocated_perc + 3.00;
    END IF;

    -- Comissões N3 (2%)
    IF v_n3_id IS NOT NULL THEN
      v_n3_val := ROUND(v_order_total_cents * 0.02);
    ELSE
      v_unallocated_perc := v_unallocated_perc + 2.00;
    END IF;
  ELSE
    -- Sem afiliado, os 20% (15+3+2) vão para redistribuição
    v_unallocated_perc := 20.00;
  END IF;

  -- 4. Calcular Valores Gestores (Bônus Catch-all)
  v_mgr_final_perc := v_mgr_base_perc + (v_unallocated_perc / 2);
  v_slim_val := ROUND(v_order_total_cents * v_mgr_final_perc / 100);
  v_jb_val := ROUND(v_order_total_cents * v_mgr_final_perc / 100);

  v_redistribution_details := jsonb_build_object(
    'unallocated_commission', v_unallocated_perc,
    'bonus_per_manager', v_unallocated_perc / 2,
    'product_category', v_product_category
  );

  -- 5. Registrar Split
  INSERT INTO commission_splits (
    order_id, total_order_value_cents,
    factory_percentage, factory_value_cents,
    commission_percentage, commission_value_cents,
    n1_affiliate_id, n1_value_cents,
    n2_affiliate_id, n2_value_cents,
    n3_affiliate_id, n3_value_cents,
    renum_percentage, renum_value_cents,
    jb_percentage, jb_value_cents,
    redistribution_applied, redistribution_details,
    status
  ) VALUES (
    p_order_id, v_order_total_cents,
    v_factory_percentage, ROUND(v_order_total_cents * 0.70),
    v_commission_percentage, (v_order_total_cents - ROUND(v_order_total_cents * 0.70)),
    (SELECT id FROM affiliates WHERE user_id = v_n1_id), v_n1_val,
    v_n2_id, v_n2_val,
    v_n3_id, v_n3_val,
    v_mgr_final_perc, v_slim_val, -- Renum_value no split original é o manager Slim
    v_mgr_final_perc, v_jb_val,
    (v_unallocated_perc > 0), v_redistribution_details,
    'calculated'
  ) RETURNING id INTO v_split_id;

  RETURN v_split_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
