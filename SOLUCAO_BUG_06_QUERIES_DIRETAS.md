# 🔧 SOLUÇÃO DEFINITIVA - BUG 06
## Substituir affiliate_hierarchy por Queries Diretas

---

## 📋 ESTRATÉGIA

**Remover:** Todas as referências a `affiliate_hierarchy`  
**Substituir:** Por queries diretas na tabela `affiliates` usando `referred_by`  
**Vantagem:** Simples, direto, sem overhead

---

## 🔄 SUBSTITUIÇÕES NECESSÁRIAS

### 1. **src/services/frontend/affiliate.service.ts**

#### LINHA 246 - Buscar rede do afiliado

**ANTES (ERRADO):**
```typescript
const { data: networkData } = await supabase
  .from('affiliate_hierarchy')
  .select(`
    id,
    // ...
  `)
```

**DEPOIS (CORRETO):**
```typescript
// Buscar afiliados diretos (N1)
const { data: networkData } = await supabase
  .from('affiliates')
  .select('id, user_id, referral_code, referred_by, status, created_at')
  .eq('referred_by', affiliateId)
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

---

#### LINHA 534 - Buscar descendentes

**ANTES (ERRADO):**
```typescript
const { data: descendants, error: hierarchyError } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .contains('path', [currentAffiliate.id])
```

**DEPOIS (CORRETO):**
```typescript
// Buscar todos os descendentes (N1 + N2)
async function getDescendants(affiliateId: string) {
  // Buscar N1 (diretos)
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, user_id, referral_code, referred_by')
    .eq('referred_by', affiliateId)
    .eq('status', 'active')
    .is('deleted_at', null);
  
  if (!n1List || n1List.length === 0) {
    return [];
  }
  
  // Buscar N2 (indiretos) para cada N1
  const descendants = [...n1List];
  
  for (const n1 of n1List) {
    const { data: n2List } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, referred_by')
      .eq('referred_by', n1.id)
      .eq('status', 'active')
      .is('deleted_at', null);
    
    if (n2List && n2List.length > 0) {
      descendants.push(...n2List);
    }
  }
  
  return descendants;
}

const descendants = await getDescendants(currentAffiliate.id);
const hierarchyError = null; // Sem erro
```

---

#### LINHA 1028 - Remover função deprecada

**AÇÃO:** Deletar completamente a função `createNetworkEntry()` (já está deprecada)

```typescript
// DELETAR LINHAS 1028-1238 (função inteira + comentários)
```

---

#### LINHA 1301 - Buscar rede completa

**ANTES (ERRADO):**
```typescript
const { data: networkData, error } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .eq('root_id', affiliateId)
```

**DEPOIS (CORRETO):**
```typescript
// Buscar rede completa (N1 + N2 + N3)
async function getCompleteNetwork(rootId: string) {
  const network = [];
  
  // N1 - Diretos
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, user_id, referral_code, referred_by, status, created_at')
    .eq('referred_by', rootId)
    .eq('status', 'active')
    .is('deleted_at', null);
  
  if (!n1List) return [];
  
  for (const n1 of n1List) {
    const n1Node = { ...n1, level: 1, children: [] };
    
    // N2 - Indiretos do N1
    const { data: n2List } = await supabase
      .from('affiliates')
      .select('id, user_id, referral_code, referred_by, status, created_at')
      .eq('referred_by', n1.id)
      .eq('status', 'active')
      .is('deleted_at', null);
    
    if (n2List) {
      for (const n2 of n2List) {
        const n2Node = { ...n2, level: 2, children: [] };
        
        // N3 - Indiretos do N2
        const { data: n3List } = await supabase
          .from('affiliates')
          .select('id, user_id, referral_code, referred_by, status, created_at')
          .eq('referred_by', n2.id)
          .eq('status', 'active')
          .is('deleted_at', null);
        
        if (n3List) {
          n2Node.children = n3List.map(n3 => ({ ...n3, level: 3 }));
        }
        
        n1Node.children.push(n2Node);
      }
    }
    
    network.push(n1Node);
  }
  
  return network;
}

const networkData = await getCompleteNetwork(affiliateId);
const error = null;
```

---

### 2. **src/services/affiliates/affiliate.service.ts**

#### LINHA 246 - Buscar rede usando view

**SUBSTITUIR função `getNetwork()` completa:**

```typescript
/**
 * Busca rede completa do afiliado (N1 + N2 + N3)
 * CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
 */
async getNetwork(affiliateId: string): Promise<Affiliate[]> {
  try {
    const allAffiliates: Affiliate[] = [];
    
    // Buscar N1 (diretos)
    const { data: n1List, error: n1Error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('referred_by', affiliateId)
      .eq('status', 'active')
      .is('deleted_at', null);
    
    if (n1Error) throw n1Error;
    if (!n1List || n1List.length === 0) return [];
    
    allAffiliates.push(...n1List);
    
    // Buscar N2 (para cada N1)
    for (const n1 of n1List) {
      const { data: n2List } = await supabase
        .from('affiliates')
        .select('*')
        .eq('referred_by', n1.id)
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (n2List && n2List.length > 0) {
        allAffiliates.push(...n2List);
        
        // Buscar N3 (para cada N2)
        for (const n2 of n2List) {
          const { data: n3List } = await supabase
            .from('affiliates')
            .select('*')
            .eq('referred_by', n2.id)
            .eq('status', 'active')
            .is('deleted_at', null);
          
          if (n3List && n3List.length > 0) {
            allAffiliates.push(...n3List);
          }
        }
      }
    }
    
    return allAffiliates;
  } catch (error) {
    console.error('[AffiliateService] Erro ao buscar rede:', error);
    throw error;
  }
}
```

---

#### LINHA 369 - Buscar árvore genealógica

**SUBSTITUIR função `getNetworkTree()` completa:**

```typescript
/**
 * Busca árvore genealógica do afiliado
 * CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
 */
async getNetworkTree(affiliateId: string): Promise<NetworkTree | null> {
  try {
    // Buscar dados do afiliado raiz
    const { data: rootAffiliate, error: rootError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();
    
    if (rootError || !rootAffiliate) return null;
    
    // Construir árvore recursivamente
    const tree: NetworkTree = {
      affiliate: rootAffiliate,
      level: 0,
      children: await this.buildTreeLevel(affiliateId, 1)
    };
    
    return tree;
  } catch (error) {
    console.error('[AffiliateService] Erro ao buscar árvore:', error);
    return null;
  }
}

/**
 * Constrói um nível da árvore recursivamente
 * Limita a 3 níveis (N1, N2, N3)
 */
private async buildTreeLevel(parentId: string, level: number): Promise<NetworkTree[]> {
  if (level > 3) return []; // Limite de profundidade
  
  const { data: children } = await supabase
    .from('affiliates')
    .select('*')
    .eq('referred_by', parentId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (!children || children.length === 0) return [];
  
  const treeNodes: NetworkTree[] = [];
  
  for (const child of children) {
    treeNodes.push({
      affiliate: child,
      level,
      children: await this.buildTreeLevel(child.id, level + 1)
    });
  }
  
  return treeNodes;
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Arquivo: src/services/frontend/affiliate.service.ts
- [ ] Linha 246: Substituir query affiliate_hierarchy por affiliates
- [ ] Linha 534: Criar função getDescendants() com queries diretas
- [ ] Linha 1028-1238: Deletar função createNetworkEntry() deprecada
- [ ] Linha 1301: Criar função getCompleteNetwork() com queries diretas

### Arquivo: src/services/affiliates/affiliate.service.ts
- [ ] Linha 246: Reescrever getNetwork() com queries diretas
- [ ] Linha 369: Reescrever getNetworkTree() com queries diretas
- [ ] Adicionar função buildTreeLevel() privada

### Testes
- [ ] Testar busca de rede com afiliado que tem N1 + N2 + N3
- [ ] Testar busca de rede com afiliado que tem apenas N1
- [ ] Testar busca de rede com afiliado sem indicados
- [ ] Verificar performance (deve ser < 500ms para 50 afiliados)

---

## 📊 VANTAGENS DESTA SOLUÇÃO

✅ **Simples:** Código direto, fácil de entender  
✅ **Manutenível:** Sem triggers, sem views, sem sincronização  
✅ **Performático:** Para 10-100 afiliados, é mais rápido que view  
✅ **Confiável:** Dados sempre atualizados (lê direto da tabela)  
✅ **Debugável:** Fácil ver o que está acontecendo  

---

## ⚠️ QUANDO MIGRAR PARA VIEW MATERIALIZADA

**Só considerar view materializada quando:**
- Tiver mais de 500 afiliados ativos
- Queries demorarem mais de 1 segundo
- Tiver problemas reais de performance

**Até lá:** Queries diretas são a melhor solução! 🎯

---

**Solução pronta para implementar!**
