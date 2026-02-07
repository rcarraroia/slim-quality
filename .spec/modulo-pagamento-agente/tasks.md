# Tarefas: Módulo de Pagamento e Split Independente

## 🟢 Fase 1: Banco de Dados (Supabase - Slim Quality)
- [x] Criar migração para adicionar `category` (ENUM) e `is_subscription` (BOOL) à tabela `products`
- [x] Criar/Configurar tabela `app_settings` para o toggle global `enable_agent_sales`
- [x] Criar tabela `affiliate_services` para controle de assinaturas e expiração
- [x] **Auditoria de Segurança**: Implementar `calculate_commission_split` com redistribuição dinâmica de sobras N2/N3 para Managers
- [x] Criar RPC `check_service_status` para consulta externa

## 🟢 Fase 2: Backend & Webhooks
- [x] Configurar Wallet IDs da Renum, Slim Quality e JB como segredos no Supabase (Via App Settings)
- [x] Atualizar o Edge Function `asaas-split-processor` para tratar produtos digitais (pular frete)
- [x] Implementar gatilho de ativação do Agente após pagamento confirmado no webhook

## 🟢 Fase 3: Frontend (Dashboard Slim Quality)
- [x] **Admin**: Adicionar switch de toggle global nas configurações administrativas
- [x] **Catálogo**: Injetar filtro `category != 'ferramenta_ia'` na listagem de produtos de venda física
- [x] **Dashboard Afiliado**: Criar página `FerramentasIA.tsx` (Menu lateral)
- [x] **Componente**: Criar seletor de plano (reutilizar UI de produtos) para o Agente IA

## 🟢 Fase 4: Validação
- [x] Gerar venda teste do Agente e validar split de 70% para a conta Renum no Dashboard Asaas
- [x] Validar que uma venda de colchão continua enviando 70% para a Fábrica
- [ ] Testar acesso do Agente Multi-Tenant via consulta ao novo módulo
