# Design Técnico: Módulo de Pagamento e Split Independente

## 🏗 Arquitetura
O módulo residirá no banco de dados e backend da **Slim Quality** para aproveitar a rede de afiliados existente, mas terá rotas e regras específicas para o Agente IA.

## 🗄 Alterações no Banco de Dados (Schema)

### 1. Tabela `products`
- `category`: `product_category` (ENUM: 'colchao', 'ferramenta_ia', 'servico_digital'). Default 'colchao'.
- `is_subscription`: `BOOLEAN`. Default `FALSE`.

### 2. Tabela `settings` (ou `feature_flags`)
- `key`: `'enable_agent_sales'`.
- `value`: `'true'` ou `'false'`.
- Objetivo: Toggle global no Admin para visibilidade na aba "Ferramentas".

### 2. Nova Tabela: `affiliate_services`
Para rastrear a ativação do agente:
- `affiliate_id`: UUID (Fk para affiliates).
- `service_type`: TEXT ('agente_ia').
- `status`: ENUM('active', 'inactive', 'trial').
- `expires_at`: TIMESTAMPTZ.

### 3. Função SQL: `calculate_commission_split` (Refinada)
```sql
DECLARE
  v_product_category product_category;
  v_main_receiver_wallet TEXT;
  v_n1_id UUID; v_n2_id UUID; v_n3_id UUID;
  v_mgr_bonus_cents INTEGER := 0;
BEGIN
  -- 1. Identificar categoria e gerador do pedido
  SELECT p.category, o.affiliate_n1_id INTO v_product_category, v_n1_id
  FROM orders o JOIN order_items oi ON ... JOIN products p ON ...
  WHERE o.id = p_order_id;

  -- 2. Definir Destinatário dos 70%
  IF v_product_category = 'ferramenta_ia' THEN
     v_main_receiver_wallet := get_setting_value('ASAAS_WALLET_RENUM');
  ELSE
     v_main_receiver_wallet := get_setting_value('ASAAS_WALLET_FACTORY');
  END IF;

  -- 3. Lógica de Redistribuição de Sobras (Catch-all)
  -- Se N2 não existe, v_n2_value (3%) vai para bônus de gestores
  IF v_n2_id IS NULL THEN
     v_mgr_bonus_cents := v_mgr_bonus_cents + (v_total * 0.03);
  END IF;
  
  -- Se N3 não existe, v_n3_value (2%) vai para bônus de gestores
  IF v_n3_id IS NULL THEN
     v_mgr_bonus_cents := v_mgr_bonus_cents + (v_total * 0.02);
  END IF;

  -- 4. Cálculo Final Gestores
  v_slim_quality_value := (v_total * 0.05) + (v_mgr_bonus_cents / 2);
  v_jb_value := (v_total * 0.05) + (v_mgr_bonus_cents / 2);
END;
```

## 🎨 Interface (Dashboard Slim Quality)
- **Filtro de Catálogo**: No Service de Produtos, injetar `WHERE category != 'ferramenta_ia'` em todas as listagens de checkout/vendas físicas.
- **Aba Ferramentas**: Criar `FerramentasIA.tsx` que renderiza apenas produtos com `category = 'ferramenta_ia'`.
- **Status do Serviço**: O componente verifica a tabela `affiliate_services` para mostrar se está "Ativo" ou "Contratar Agora".
