-- ============================================
-- SCRIPTS DE CORREÇÃO URGENTE
-- Sistema: Slim Quality
-- Data: 10/01/2026
-- Executor: Kiro AI
-- ============================================

-- ============================================
-- 1. ATIVAR RLS EM COMMISSIONS (SEGURANÇA)
-- ============================================

-- Ativar RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Política: Afiliados veem apenas próprias comissões
CREATE POLICY "Affiliates view own commissions"
  ON commissions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM affiliates WHERE id = affiliate_id
    )
  );

-- Política: Admins veem todas
CREATE POLICY "Admins view all commissions"
  ON commissions FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Política: Sistema pode inserir
CREATE POLICY "System can insert commissions"
  ON commissions FOR INSERT
  WITH CHECK (true);

-- Política: Sistema pode atualizar
CREATE POLICY "System can update commissions"
  ON commissions FOR UPDATE
  USING (true);

-- ============================================
-- 2. GERAR CÓDIGOS DE REFERÊNCIA
-- ============================================

-- Gerar códigos únicos de 6 caracteres para afiliados existentes
UPDATE affiliates 
SET referral_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 6))
WHERE referral_code IS NULL OR referral_code = '';

-- Inserir códigos na tabela referral_codes
INSERT INTO referral_codes (affiliate_id, code, is_active, created_at, updated_at)
SELECT 
  id,
  referral_code,
  true,
  NOW(),
  NOW()
FROM affiliates
WHERE referral_code IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM referral_codes WHERE affiliate_id = affiliates.id
  );

-- Verificar resultado
SELECT 
  a.name,
  a.email,
  a.referral_code,
  rc.code as code_in_table,
  rc.is_active
FROM affiliates a
LEFT JOIN referral_codes rc ON a.id = rc.affiliate_id
ORDER BY a.created_at;

-- ============================================
-- 3. VERIFICAR AFILIADOS SEM WALLET
-- ============================================

-- Listar afiliados sem wallet_id
SELECT 
  id,
  name,
  email,
  wallet_id,
  status,
  created_at
FROM affiliates
WHERE wallet_id IS NULL OR wallet_id = '';

-- AÇÃO MANUAL NECESSÁRIA:
-- Solicitar wallet_id de: Maria Edurda Carraro (renusdev@gmail.com)

-- ============================================
-- 4. CRIAR FUNÇÃO DE GERAÇÃO AUTOMÁTICA DE CÓDIGO
-- ============================================

-- Função para gerar código único
CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Gerar código de 6 caracteres
    new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6));
    
    -- Verificar se já existe
    SELECT EXISTS(
      SELECT 1 FROM affiliates WHERE referral_code = new_code
    ) INTO code_exists;
    
    -- Se não existe, retornar
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. CRIAR TRIGGER PARA GERAR CÓDIGO AUTOMATICAMENTE
-- ============================================

-- Função do trigger
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Se não tem código, gerar
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' THEN
    NEW.referral_code := generate_unique_referral_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_referral_code ON affiliates;
CREATE TRIGGER trigger_auto_generate_referral_code
  BEFORE INSERT ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_referral_code();

-- ============================================
-- 6. CRIAR TRIGGER PARA INSERIR EM REFERRAL_CODES
-- ============================================

-- Função do trigger
CREATE OR REPLACE FUNCTION auto_insert_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir código na tabela referral_codes
  INSERT INTO referral_codes (affiliate_id, code, is_active, created_at, updated_at)
  VALUES (NEW.id, NEW.referral_code, true, NOW(), NOW())
  ON CONFLICT (code) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_auto_insert_referral_code ON affiliates;
CREATE TRIGGER trigger_auto_insert_referral_code
  AFTER INSERT ON affiliates
  FOR EACH ROW
  EXECUTE FUNCTION auto_insert_referral_code();

-- ============================================
-- 7. VERIFICAR PEDIDOS SEM AFILIADO
-- ============================================

-- Listar pedidos sem afiliado vinculado
SELECT 
  id,
  order_number,
  customer_name,
  total_cents,
  status,
  referral_code,
  affiliate_n1_id,
  created_at
FROM orders
WHERE affiliate_n1_id IS NULL
ORDER BY created_at DESC;

-- ============================================
-- 8. VERIFICAR COMISSÕES PENDENTES
-- ============================================

-- Pedidos pagos sem comissões
SELECT 
  o.id,
  o.order_number,
  o.total_cents,
  o.status,
  o.affiliate_n1_id,
  COUNT(c.id) as comissoes_geradas
FROM orders o
LEFT JOIN commissions c ON o.id = c.order_id
WHERE o.status IN ('paid', 'completed')
GROUP BY o.id
HAVING COUNT(c.id) = 0;

-- ============================================
-- 9. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índice para busca por referral_code
CREATE INDEX IF NOT EXISTS idx_orders_referral_code 
  ON orders(referral_code) 
  WHERE referral_code IS NOT NULL;

-- Índice para busca por afiliado
CREATE INDEX IF NOT EXISTS idx_orders_affiliate_n1 
  ON orders(affiliate_n1_id) 
  WHERE affiliate_n1_id IS NOT NULL;

-- Índice para comissões por afiliado
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate 
  ON commissions(affiliate_id, status);

-- Índice para comissões por pedido
CREATE INDEX IF NOT EXISTS idx_commissions_order 
  ON commissions(order_id);

-- ============================================
-- 10. CRIAR VIEW PARA DASHBOARD DE AFILIADOS
-- ============================================

CREATE OR REPLACE VIEW vw_affiliate_dashboard AS
SELECT 
  a.id,
  a.name,
  a.email,
  a.referral_code,
  a.wallet_id,
  a.status,
  a.total_clicks,
  a.total_conversions,
  a.total_commissions_cents,
  
  -- Contadores reais
  (SELECT COUNT(*) FROM referral_clicks WHERE affiliate_id = a.id) as real_clicks,
  (SELECT COUNT(*) FROM referral_conversions WHERE affiliate_id = a.id) as real_conversions,
  (SELECT COALESCE(SUM(commission_value_cents), 0) FROM commissions WHERE affiliate_id = a.id) as real_commissions_cents,
  
  -- Comissões por status
  (SELECT COALESCE(SUM(commission_value_cents), 0) FROM commissions WHERE affiliate_id = a.id AND status = 'calculated') as pending_cents,
  (SELECT COALESCE(SUM(commission_value_cents), 0) FROM commissions WHERE affiliate_id = a.id AND status = 'paid') as paid_cents,
  
  -- Rede
  (SELECT COUNT(*) FROM affiliates WHERE referred_by = a.id) as direct_referrals,
  
  a.created_at
FROM affiliates a
WHERE a.deleted_at IS NULL;

-- ============================================
-- 11. ATUALIZAR CONTADORES DE AFILIADOS
-- ============================================

-- Função para atualizar contadores
CREATE OR REPLACE FUNCTION update_affiliate_counters(affiliate_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE affiliates
  SET 
    total_clicks = (SELECT COUNT(*) FROM referral_clicks WHERE affiliate_id = affiliate_uuid),
    total_conversions = (SELECT COUNT(*) FROM referral_conversions WHERE affiliate_id = affiliate_uuid),
    total_commissions_cents = (SELECT COALESCE(SUM(commission_value_cents), 0) FROM commissions WHERE affiliate_id = affiliate_uuid),
    updated_at = NOW()
  WHERE id = affiliate_uuid;
END;
$$ LANGUAGE plpgsql;

-- Atualizar contadores de todos os afiliados
DO $$
DECLARE
  aff RECORD;
BEGIN
  FOR aff IN SELECT id FROM affiliates WHERE deleted_at IS NULL
  LOOP
    PERFORM update_affiliate_counters(aff.id);
  END LOOP;
END $$;

-- ============================================
-- 12. VERIFICAÇÃO FINAL
-- ============================================

-- Verificar RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('affiliates', 'commissions', 'orders')
ORDER BY tablename;

-- Verificar códigos de referência
SELECT 
  COUNT(*) as total_afiliados,
  COUNT(referral_code) as com_codigo,
  COUNT(*) - COUNT(referral_code) as sem_codigo
FROM affiliates
WHERE deleted_at IS NULL;

-- Verificar wallets
SELECT 
  COUNT(*) as total_afiliados,
  COUNT(wallet_id) as com_wallet,
  COUNT(*) - COUNT(wallet_id) as sem_wallet
FROM affiliates
WHERE deleted_at IS NULL;

-- Verificar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'affiliates'
ORDER BY trigger_name;

-- ============================================
-- FIM DOS SCRIPTS DE CORREÇÃO URGENTE
-- ============================================

-- PRÓXIMOS PASSOS MANUAIS:
-- 1. Solicitar wallet_id de Maria Edurda Carraro
-- 2. Cadastrar URL do webhook no painel Asaas
-- 3. Testar fluxo completo end-to-end
-- 4. Verificar Edge Functions deployed
