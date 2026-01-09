-- Adicionar coluna referred_by para rede multinível de afiliados
-- Esta coluna armazena o ID do afiliado que indicou este afiliado (N1 -> N2 -> N3)

ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES affiliates(id);

-- Criar índice para performance em queries de rede
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by ON affiliates(referred_by);

-- Comentário explicativo
COMMENT ON COLUMN affiliates.referred_by IS 'ID do afiliado que indicou este afiliado (para rede multinível N1->N2->N3)';;
