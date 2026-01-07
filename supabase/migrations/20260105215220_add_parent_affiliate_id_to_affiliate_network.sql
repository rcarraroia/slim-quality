-- Adicionar coluna parent_affiliate_id como alias de parent_id
-- Mantém compatibilidade com código existente

ALTER TABLE affiliate_network 
ADD COLUMN IF NOT EXISTS parent_affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE;

-- Copiar dados de parent_id para parent_affiliate_id
UPDATE affiliate_network 
SET parent_affiliate_id = parent_id
WHERE parent_affiliate_id IS NULL;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_network_parent_affiliate_id 
ON affiliate_network(parent_affiliate_id);

-- Comentário explicativo
COMMENT ON COLUMN affiliate_network.parent_affiliate_id IS 'Alias de parent_id para compatibilidade com código existente';;
