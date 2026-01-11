# 🔍 AUDITORIA FASE 1 - PARTE 2
## Continuação dos Bugs 06 e 03

---

## 🐛 BUG 06 - affiliate_hierarchy (CONTINUAÇÃO)

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **Tabela não existe:** `affiliate_hierarchy` não existe no banco de dados atual
2. **5 referências no código:** Código tenta acessar tabela inexistente
3. **Queries falham:** Todas as queries retornam erro "relation does not exist"
4. **Funcionalidades quebradas:** Páginas de rede de afiliados não funcionam

### 💡 CAUSA RAIZ
A tabela/view `affiliate_hierarchy` foi **removida** ou **nunca foi criada**, mas o código ainda referencia ela.

### ✅ SOLUÇÃO SUGERIDA

**OPÇÃO 1: Criar a view materializada**
```sql
CREATE MATERIALIZED VIEW affiliate_hierarchy AS
WITH RECURSIVE network_tree AS (
  -- Raízes (afiliados sem indicador)
  SELECT 
    id as affiliate_id,
    id as root_id,
    NULL::UUID as parent_id,
    0 as level,
    ARRAY[id] as path
  FROM affiliates
  WHERE referred_by IS NULL
    AND status = 'active'
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- Descendentes
  SELECT 
    a.id as affiliate_id,
    nt.root_id,
    a.referred_by as parent_id,
    nt.level + 1 as level,
    nt.path || a.id as path
  FROM affiliates a
  INNER JOIN network_tree nt ON a.referred_by = nt.affiliate_id
  WHERE a.status = 'active'
    AND a.deleted_at IS NULL
    AND nt.level < 10  -- Limite de profundidade
)
SELECT * FROM network_tree;

-- Criar índices
CREATE INDEX idx_affiliate_hierarchy_root ON affiliate_hierarchy(root_id);
CREATE INDEX idx_affiliate_hierarchy_affiliate ON affiliate_hierarchy(affiliate_id);
CREATE INDEX idx_affiliate_hierarchy_parent ON affiliate_hierarchy(parent_id);
```

**OPÇÃO 2: Substituir por queries diretas**
```typescript
// Ao invés de:
const { data } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .eq('root_id', affiliateId);

// Usar:
async function getAffiliateNetwork(affiliateId: string) {
  // Buscar diretos (N1)
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, user_id, referral_code, referred_by')
    .eq('referred_by', affiliateId)
    .eq('status', 'active')
    .is('deleted_at', null);
  
  // Para cada N1, buscar N2
  const network = [];
  for (const n1 of n1List || []) {
    const { data: n2List } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code')
      .eq('referred_by', n1.id)
      .eq('status', 'active')
      .is('deleted_at', null);
    
    network.push({
      ...n1,
      level: 1,
      children: n2List || []
    });
  }
  
  return network;
}
```

---

## 🐛 BUG 03 - ReferralTrackers Duplicados

### 📍 LOCALIZAÇÕES

#### Arquivo 1: `src/utils/referral-tracker.ts`
- **Chave localStorage:** `referral_code`
- **Funcionalidades:** Captura, armazena, recupera, limpa
- **Tamanho:** 280 linhas
- **Status:** ✅ Implementação completa e robusta

#### Arquivo 2: `src/middleware/referral-tracker.ts`
- **Chave localStorage:** `slim_referral_code` (via STORAGE_KEYS)
- **Funcionalidades:** Captura, armazena, recupera, limpa
- **Tamanho:** 210 linhas
- **Status:** ✅ Implementação completa

### 🔍 DIFERENÇAS PRINCIPAIS

| Aspecto | utils/referral-tracker.ts | middleware/referral-tracker.ts |
|---------|---------------------------|--------------------------------|
| **Chave Storage** | `referral_code` | `slim_referral_code` |
| **Imports** | Nenhum | `STORAGE_KEYS` de constants |
| **UTM Params** | ✅ Captura e armazena | ❌ Não captura |
| **Estrutura Dados** | Objeto com code, timestamp, expiry, utmParams | Objeto com code, timestamp, expiry |
| **API Endpoints** | `/api/referral/track-click` | `/api/affiliates/track-click` |
| **Auto-init** | ✅ Sim | ✅ Sim |
| **Window Export** | ✅ Sim | ❌ Não |

### ⚠️ PROBLEMAS IDENTIFICADOS

1. **Chaves diferentes:** Um usa `referral_code`, outro usa `slim_referral_code`
2. **Conflito de dados:** Código pode ser salvo em uma chave e lido de outra
3. **APIs diferentes:** Chamam endpoints diferentes para tracking
4. **Confusão no código:** Desenvolvedores não sabem qual usar
5. **Manutenção duplicada:** Bugs precisam ser corrigidos em 2 lugares

### 💡 CAUSA RAIZ
Dois desenvolvedores (ou momentos diferentes) criaram implementações paralelas sem consolidar.

