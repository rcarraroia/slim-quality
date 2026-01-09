-- Desabilitar trigger temporariamente
ALTER TABLE affiliates DISABLE TRIGGER protect_critical_fields_affiliates;

-- Ativar o afiliado
UPDATE affiliates 
SET status = 'active', updated_at = NOW() 
WHERE id = '6ba7dc86-7832-44db-849b-b647b925a65b';

-- Reabilitar trigger
ALTER TABLE affiliates ENABLE TRIGGER protect_critical_fields_affiliates;;
