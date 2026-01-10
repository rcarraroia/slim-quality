# Scripts Deprecados - affiliate_network

**Data de Deprecação:** 11/01/2026  
**Motivo:** Consolidação da estrutura de afiliados

## 📋 Contexto

Estes scripts foram usados durante a transição da estrutura antiga (`affiliate_network`) para a nova estrutura consolidada (`affiliates.referred_by` + view materializada `affiliate_hierarchy`).

## 🗂️ Arquivos Deprecados

### 1. `validate_sync.js`
- **Função:** Validar sincronização entre `affiliates.referred_by` e `affiliate_network.parent_id`
- **Status:** Não é mais necessário - tabela `affiliate_network` foi deprecada

### 2. `execute_sync.js`
- **Função:** Executar sincronização de dados entre as duas estruturas
- **Status:** Não é mais necessário - usamos apenas `affiliates.referred_by`

### 3. `temp_validation.sql`
- **Função:** Query temporária para validar inconsistências
- **Status:** Não é mais necessário - estrutura consolidada

## ✅ Nova Estrutura (Atual)

### Fonte Única de Verdade:
- **Tabela:** `affiliates`
- **Coluna:** `referred_by` (UUID) - aponta para o afiliado que indicou

### View Materializada:
- **View:** `affiliate_hierarchy`
- **Atualização:** Automática via triggers (INSERT, UPDATE, DELETE em `affiliates`)
- **Performance:** ~0.1ms (1900x mais rápido que 200ms)

### Triggers:
1. `trigger_refresh_hierarchy_on_insert` - Atualiza view ao inserir afiliado
2. `trigger_refresh_hierarchy_on_update` - Atualiza view ao modificar `referred_by`
3. `trigger_refresh_hierarchy_on_delete` - Atualiza view ao deletar afiliado

## 📚 Documentação

Para mais detalhes sobre a nova estrutura, consulte:
- `.kiro/specs/affiliate-system-correction/design.md`
- `docs/ARCHITECTURE_DECISIONS.md`

## ⚠️ Importante

**NÃO USE ESTES SCRIPTS!** Eles foram mantidos apenas para referência histórica.

A estrutura atual é:
- Mais simples (uma fonte de verdade)
- Mais rápida (view materializada otimizada)
- Mais confiável (sem sincronização manual)
- Mais fácil de manter (triggers automáticos)
