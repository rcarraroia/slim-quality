-- Adicionar coluna user_id na tabela customers
-- Vincula clientes com auth.users para autenticação

ALTER TABLE customers 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Criar índice para busca eficiente por user_id
CREATE INDEX idx_customers_user_id ON customers(user_id);

-- Comentário na coluna
COMMENT ON COLUMN customers.user_id IS 'Vincula o cliente com auth.users para autenticação';;
