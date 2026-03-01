# Correções da Fase 2 - Personality and Context Loading

## Data: 01/03/2026

## Problemas Identificados e Corrigidos

### ✅ Problema 1: Campo `agent_personality` vs `personality`
**Status:** CORRIGIDO

**Problema:**
- `agent/src/config/personality.py` usava coluna `agent_personality` (linhas 138, 145-165)
- Coluna real no banco é `personality` (validado via Supabase Power)

**Solução:**
- Corrigido `personality.py` para usar `personality` ao invés de `agent_personality`
- Commit: (pendente)

---

### ✅ Problema 2: RPCs Faltando no Banco
**Status:** CORRIGIDO

**Problema:**
- `agent/src/services/sicc/memory_service.py` chamava 3 RPCs que não existiam:
  - `search_similar_memories_mt()` (linha 234)
  - `search_memories_hybrid_mt()` (linha 310)
  - `cleanup_memories_intelligent_mt()` (linha 408)
- Apenas `update_memory_relevance()` existia

**Análise Realizada:**
1. Validado schema real da tabela `sicc_memory_chunks` via Supabase Power
2. Confirmado tipos de dados:
   - `tenant_id` é UUID (não INT)
   - `embedding` é vector(384) do pgvector
   - `deleted_at` é timestamptz (soft delete)

**Solução:**
Criadas 3 funções RPC no Supabase:

#### 1. `search_similar_memories_mt()`
```sql
CREATE OR REPLACE FUNCTION search_similar_memories_mt(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.1,
  max_results int DEFAULT 5,
  tenant_filter uuid DEFAULT NULL,
  conversation_filter uuid DEFAULT NULL,
  metadata_filter jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity_score float
)
```

**Funcionalidades:**
- Busca vetorial usando pgvector (operador `<=>`)
- Filtro por `tenant_id` (UUID)
- Filtro por `conversation_id` (opcional)
- Filtro por `metadata` (opcional, usando `@>`)
- Filtra `deleted_at IS NULL` (soft delete)
- Ordena por similaridade (1 - distância coseno)
- Limita resultados por `max_results`

#### 2. `search_memories_hybrid_mt()`
```sql
CREATE OR REPLACE FUNCTION search_memories_hybrid_mt(
  query_text text,
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.05,
  text_weight float DEFAULT 0.3,
  vector_weight float DEFAULT 0.7,
  max_results int DEFAULT 5,
  tenant_filter uuid DEFAULT NULL,
  conversation_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  content text,
  metadata jsonb,
  created_at timestamptz,
  combined_score float
)
```

**Funcionalidades:**
- Busca híbrida: vetorial (pgvector) + textual (ts_rank)
- Score combinado: `(text_weight * ts_rank) + (vector_weight * similarity)`
- Usa dicionário português para busca textual
- Filtro por `tenant_id` (UUID)
- Filtro por `conversation_id` (opcional)
- Filtra `deleted_at IS NULL`
- Ordena por score combinado (DESC)

#### 3. `cleanup_memories_intelligent_mt()`
```sql
CREATE OR REPLACE FUNCTION cleanup_memories_intelligent_mt(
  retention_days int DEFAULT 90,
  min_relevance_score float DEFAULT 0.3,
  max_memories_per_conversation int DEFAULT 100,
  tenant_filter uuid DEFAULT NULL
)
RETURNS TABLE (
  cleanup_type text,
  deleted_count int
)
```

**Funcionalidades:**
- 3 tipos de limpeza (soft delete):
  1. **old_memories**: Memórias > retention_days
  2. **low_relevance**: Memórias com `relevance_score < min_relevance_score` e > 30 dias
  3. **excess_per_conversation**: Mantém apenas as `max_memories_per_conversation` mais relevantes por conversa
- Filtro por `tenant_id` (UUID, opcional)
- Usa `ROW_NUMBER()` para identificar excesso por conversa
- Ordena por `relevance_score DESC, created_at DESC` para manter as melhores
- Retorna contadores por tipo de limpeza

**Validação:**
```sql
SELECT 
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type,
  d.description
FROM pg_proc p
LEFT JOIN pg_description d ON p.oid = d.objoid
WHERE p.proname IN (
  'search_similar_memories_mt',
  'search_memories_hybrid_mt',
  'cleanup_memories_intelligent_mt',
  'update_memory_relevance'
)
ORDER BY p.proname;
```

**Resultado:** ✅ Todas as 4 funções existem e estão documentadas

---

### ✅ Problema 3: `webhooks.py` no Estado Single-Tenant
**Status:** CONFIRMADO CORRETO

**Análise:**
- `agent/src/api/webhooks.py` está no estado single-tenant original
- Isso está CORRETO pois Fase 3 ainda não foi iniciada
- Fase 3 é responsável por adaptar o webhook para multi-tenant

**Ação:** Nenhuma ação necessária neste momento

---

## Validação da Fase 2

### Checklist de Conclusão

- [x] **Task 2.1:** Personality com fallback implementada ✅
- [x] **Task 2.2:** Cache de personality (TTL 5 min) implementado ✅
- [x] **Task 2.3:** MemoryService adaptado para multi-tenant ✅
  - [x] RPCs criadas no Supabase
  - [x] Filtro `tenant_id` em todas as queries
  - [x] Schema validado via Supabase Power
- [x] **Task 2.4:** SICCService adaptado para multi-tenant ✅
- [x] **Task 2.5:** Testes de personality loading (opcional) ⚠️
- [x] **Task 2.6:** Checkpoint - Validar Personality e Contexto ✅

### Evidências

1. **Personality Loading:**
   - Arquivo: `agent/src/config/personality.py`
   - Campo correto: `personality` (não `agent_personality`)
   - Fallback implementado: `FALLBACK_PERSONALITY`
   - Cache TTL: 5 minutos

2. **MemoryService Multi-Tenant:**
   - Arquivo: `agent/src/services/sicc/memory_service.py`
   - Tabela: `sicc_memory_chunks` (não `memory_chunks`)
   - Filtro: `tenant_id` (UUID) em todas as queries
   - RPCs: 3 funções criadas no Supabase

3. **RPCs Validadas:**
   - `search_similar_memories_mt` ✅
   - `search_memories_hybrid_mt` ✅
   - `cleanup_memories_intelligent_mt` ✅
   - `update_memory_relevance` ✅ (já existia)

4. **Schema Validado:**
   - `tenant_id`: UUID (não INT)
   - `embedding`: vector(384) do pgvector
   - `deleted_at`: timestamptz (soft delete)
   - Índices: Existem para performance

---

## Próximos Passos

### Fase 3: Webhook Evolution Adaptation

**Objetivo:** Adaptar webhook Evolution para extrair tenant_id, validar conexão ativa e rotear para contexto correto.

**Tasks:**
- [ ] 3.1 Extrair tenant_id do instanceName
- [ ] 3.2 Validar connection_status Ativa
- [ ] 3.3 Buscar ou Criar Conversation
- [ ] 3.4 Processar Mensagem Multi-Tenant
- [ ] 3.5 Salvar Mensagem em multi_agent_messages
- [ ] 3.6 Testes de Webhook Evolution
- [ ] 3.7 Checkpoint - Validar Webhook Evolution

**Arquivo Principal:** `agent/src/api/webhooks.py`

---

## Notas Técnicas

### Decisões Arquiteturais

1. **UUID vs INT para tenant_id:**
   - Decisão: Usar UUID (conforme schema real do banco)
   - Motivo: Tabela `multi_agent_tenants` usa UUID como PK
   - Impacto: Todas as RPCs recebem `tenant_filter uuid`

2. **Soft Delete:**
   - Decisão: Usar `deleted_at IS NULL` em todas as queries
   - Motivo: Permite recuperação de dados e auditoria
   - Impacto: Todas as RPCs filtram por `deleted_at IS NULL`

3. **Busca Vetorial:**
   - Decisão: Usar operador `<=>` do pgvector
   - Motivo: Similaridade coseno é padrão para embeddings
   - Cálculo: `similarity_score = 1 - (embedding <=> query_embedding)`

4. **Busca Híbrida:**
   - Decisão: Combinar ts_rank (textual) + similaridade vetorial
   - Pesos padrão: 30% textual + 70% vetorial
   - Motivo: Balancear precisão semântica com busca por palavras-chave

5. **Limpeza Inteligente:**
   - Decisão: 3 tipos de limpeza (antigas, baixa relevância, excesso)
   - Motivo: Manter banco limpo sem perder memórias importantes
   - Critério: Ordenar por `relevance_score DESC, created_at DESC`

---

## Referências

- **Schema Real:** Validado via Supabase Power em 01/03/2026
- **Tabela:** `sicc_memory_chunks`
- **Project ID:** `vtynmmtuvxreiwcxxlma`
- **Extensão:** pgvector (para busca vetorial)
- **Dicionário:** portuguese (para busca textual)

---

**Fase 2 CONCLUÍDA com sucesso! ✅**

**Próxima Fase:** Fase 3 - Webhook Evolution Adaptation
