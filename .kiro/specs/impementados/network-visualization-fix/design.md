# Design Document - Correção de Visualização de Rede

## Overview

Solução técnica para correção de bugs nas queries de rede e implementação de visualizações hierárquicas otimizadas para Admin e Afiliado, mantendo consistência de UX/UI.

## Architecture

### Componentes Principais

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐    ┌──────────────────────┐      │
│  │   Admin Panel        │    │  Affiliate Panel     │      │
│  ├──────────────────────┤    ├──────────────────────┤      │
│  │ - Lista Afiliados    │    │ - Minha Rede         │      │
│  │ - Minha Rede (NOVO)  │    │   (CORRIGIDO)        │      │
│  └──────────────────────┘    └──────────────────────┘      │
│           │                            │                     │
│           └────────────┬───────────────┘                     │
│                        │                                     │
│              ┌─────────▼─────────┐                          │
│              │   Services        │                          │
│              ├───────────────────┤                          │
│              │ - affiliate.      │                          │
│              │   service.ts      │                          │
│              │ - admin-          │                          │
│              │   affiliates.     │                          │
│              │   service.ts      │                          │
│              └─────────┬─────────┘                          │
└────────────────────────┼─────────────────────────────────────┘
                         │
                         │ Supabase Client
                         │
┌────────────────────────▼─────────────────────────────────────┐
│                  SUPABASE (Backend)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  View Materializada: affiliate_hierarchy             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Campos:                                              │  │
│  │  - id, root_id, path[], level                        │  │
│  │  - name, email, status, created_at                   │  │
│  │  - total_commissions_cents, total_conversions        │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│                         │ Atualizada via Triggers            │
│                         │                                    │
│  ┌──────────────────────▼──────────────────────────────┐  │
│  │  Tabela: affiliates                                  │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  Campos:                                              │  │
│  │  - id, user_id, name, email                          │  │
│  │  - referred_by (FK → affiliates.id)                  │  │
│  │  - status, referral_code                             │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Admin - Lista de Afiliados (Modificado)

**Arquivo:** `src/pages/dashboard/afiliados/ListaAfiliados.tsx`

**Mudanças:**
- ❌ Remover coluna "Nível"
- ✅ Manter todas as outras colunas
- ✅ Manter funcionalidade de busca/filtros

**Interface:**
```typescript
interface AffiliateListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: 'active' | 'pending' | 'inactive';
  available_balance: number;
  pending_balance: number;
  // level: number; ❌ REMOVIDO
}
```

### 2. Admin - Minha Rede (NOVO)

**Arquivo:** `src/pages/dashboard/afiliados/MinhaRede.tsx`

**Funcionalidades:**
- 🏢 Empresa como raiz do organograma
- ♾️ Profundidade ilimitada
- 🔍 Busca por nome
- 📊 Cards de resumo
- 🌳 Árvore expansível/recolhível

**Interface:**
```typescript
interface AdminNetworkNode {
  id: string;
  name: string;
  email: string;
  level: number; // Relativo à empresa (0=raiz, 1=N1, 2=N2, etc)
  status: 'active' | 'pending' | 'inactive';
  sales_count: number;
  commission_generated: number;
  children: AdminNetworkNode[];
  expanded?: boolean;
}

interface AdminNetworkData {
  roots: AdminNetworkNode[]; // Afiliados sem referred_by
  stats: {
    totalAffiliates: number;
    activeAffiliates: number;
    totalCommissions: number;
    totalSales: number;
  };
}
```

### 3. Afiliado - Minha Rede (CORRIGIDO)

**Arquivo:** `src/pages/afiliados/dashboard/MinhaRede.tsx`

**Mudanças:**
- ✅ Corrigir query (usar `path` ao invés de `root_id`)
- ✅ Limitar profundidade a 2 níveis
- ✅ Afiliado como raiz

**Interface:**
```typescript
interface AffiliateNetworkNode {
  id: string;
  name: string;
  email: string;
  nivel: 1 | 2; // Apenas N1 e N2
  vendas: number;
  comissaoGerada: number;
  indicados: AffiliateNetworkNode[];
  expanded?: boolean;
}

interface AffiliateNetworkData {
  network: AffiliateNetworkNode[];
  stats: {
    totalN1: number;
    totalN2: number;
    comissaoN1: number;
    comissaoN2: number;
  };
}
```

## Data Models

### View Materializada: affiliate_hierarchy

```sql
CREATE MATERIALIZED VIEW affiliate_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Nível 0: Raízes (sem referred_by)
  SELECT 
    id,
    id as root_id,
    ARRAY[id] as path,
    0 as level,
    name,
    email,
    referral_code,
    status,
    total_commissions_cents,
    total_conversions,
    created_at
  FROM affiliates
  WHERE referred_by IS NULL
    AND deleted_at IS NULL
  
  UNION ALL
  
  -- Níveis 1, 2, 3...
  SELECT 
    a.id,
    h.root_id,
    h.path || a.id,
    h.level + 1,
    a.name,
    a.email,
    a.referral_code,
    a.status,
    a.total_commissions_cents,
    a.total_conversions,
    a.created_at
  FROM affiliates a
  INNER JOIN hierarchy h ON a.referred_by = h.id
  WHERE a.deleted_at IS NULL
    AND h.level < 10 -- Limite de segurança
)
SELECT * FROM hierarchy;
```

## Correctness Properties

### Property 1: Query Correta para Descendentes

*For any* afiliado A, quando buscar sua rede usando `path @> ARRAY[A.id]`, o sistema deve retornar todos e apenas os descendentes diretos de A.

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Limitação de Profundidade

*For any* afiliado A no painel de afiliado, quando buscar sua rede, o sistema deve retornar no máximo 2 níveis de profundidade (N1 e N2).

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 3: Organograma Admin Completo

*For any* visualização de rede no admin, o sistema deve exibir todos os afiliados ativos sem limite de profundidade.

**Validates: Requirements 3.2, 3.3**

### Property 4: Consistência de Dados

*For any* afiliado exibido na rede, os dados (nome, email, status, comissões) devem ser consistentes com a view `affiliate_hierarchy`.

**Validates: Requirements 1.1, 6.2**

### Property 5: Performance Aceitável

*For any* rede com até 100 afiliados, o tempo de resposta da query deve ser menor que 500ms.

**Validates: Requirements 6.1, 6.3**

## Queries Corretas

### Admin - Buscar Rede Completa

```typescript
// Buscar todos os afiliados da view
const { data: allAffiliates, error } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .order('level', { ascending: true })
  .order('created_at', { ascending: true });

// Organizar em árvore
const roots = allAffiliates.filter(a => a.level === 0);
const buildTree = (parentId: string, maxDepth?: number) => {
  return allAffiliates
    .filter(a => {
      const parentIndex = a.path.indexOf(parentId);
      return parentIndex >= 0 && 
             a.path[parentIndex + 1] === a.id &&
             (!maxDepth || a.path.length - parentIndex - 1 <= maxDepth);
    })
    .map(a => ({
      ...a,
      children: buildTree(a.id, maxDepth)
    }));
};

const networkTree = roots.map(root => ({
  ...root,
  children: buildTree(root.id) // Sem limite de profundidade
}));
```

### Afiliado - Buscar Rede Limitada (2 níveis)

```typescript
// Buscar afiliado atual
const { data: currentAffiliate } = await supabase
  .from('affiliates')
  .select('id')
  .eq('user_id', user.id)
  .single();

// Buscar descendentes usando path (PostgreSQL array contains)
const { data: descendants, error } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .contains('path', [currentAffiliate.id])
  .neq('id', currentAffiliate.id);

// Filtrar apenas 2 níveis de profundidade
const filteredDescendants = descendants.filter(item => {
  const affiliateIndex = item.path.indexOf(currentAffiliate.id);
  const depth = item.path.length - affiliateIndex - 1;
  return depth <= 2; // Máximo 2 níveis
});

// Organizar em árvore
const buildTree = (parentId: string, currentDepth: number) => {
  if (currentDepth >= 2) return []; // Limite de profundidade
  
  return filteredDescendants
    .filter(a => {
      const parentIndex = a.path.indexOf(parentId);
      return parentIndex >= 0 && a.path[parentIndex + 1] === a.id;
    })
    .map(a => ({
      ...a,
      nivel: currentDepth + 1,
      children: buildTree(a.id, currentDepth + 1)
    }));
};

const networkTree = buildTree(currentAffiliate.id, 0);
```

## Error Handling

### Cenários de Erro

1. **Query Falha:**
   - Exibir toast com mensagem de erro
   - Registrar erro no console
   - Permitir retry

2. **Rede Vazia:**
   - Exibir estado vazio com ilustração
   - Mensagem: "Sua rede ainda está vazia"
   - Botão: "Compartilhar Meu Link"

3. **Busca Sem Resultados:**
   - Exibir mensagem: "Nenhum resultado encontrado"
   - Sugestão: "Tente buscar por outro nome"

4. **Timeout:**
   - Exibir loading por máximo 10 segundos
   - Após timeout, exibir erro e permitir retry

## Testing Strategy

### Unit Tests

1. **Query de Descendentes:**
   - Testar filtro por `path`
   - Testar limite de profundidade
   - Testar exclusão do próprio afiliado

2. **Construção de Árvore:**
   - Testar organização hierárquica
   - Testar limite de 2 níveis (afiliado)
   - Testar profundidade ilimitada (admin)

3. **Cálculo de Estatísticas:**
   - Testar contagem de N1, N2
   - Testar soma de comissões
   - Testar taxa de conversão

### Integration Tests

1. **Fluxo Admin:**
   - Acessar "Minha Rede"
   - Verificar empresa como raiz
   - Expandir/recolher nós
   - Buscar afiliado por nome

2. **Fluxo Afiliado:**
   - Acessar "Minha Rede"
   - Verificar afiliado como raiz
   - Verificar limite de 2 níveis
   - Verificar cards de resumo

### Manual Tests

1. **Beatriz (raiz):**
   - Deve ver Giuseppe (N1) e Maria (N2)
   - Cards: N1=1, N2=1

2. **Giuseppe (N1 de Beatriz):**
   - Deve ver apenas Maria (N1 dele)
   - Cards: N1=1, N2=0

3. **Maria (N2 de Beatriz):**
   - Rede vazia (ainda não indicou)
   - Cards: N1=0, N2=0

4. **Admin:**
   - Deve ver todos os 3 afiliados
   - Beatriz como raiz
   - Giuseppe filho de Beatriz
   - Maria filha de Giuseppe

## Performance Considerations

### Otimizações

1. **View Materializada:**
   - Já calculada e indexada
   - Atualizada via triggers
   - Performance: ~0.1ms

2. **Índices Existentes:**
   - `idx_affiliate_hierarchy_id`
   - `idx_affiliate_hierarchy_root_id`
   - `idx_affiliate_hierarchy_level`
   - `idx_affiliate_hierarchy_path` (GIN index)

3. **Paginação (Futuro):**
   - Se rede > 100 afiliados
   - Carregar incrementalmente
   - Virtualização de lista

4. **Cache Frontend:**
   - Memoizar cálculos pesados
   - useMemo para árvore
   - useCallback para handlers

## UX/UI Guidelines

### Design System

**Componentes a Usar:**
- `Card` - Cards de resumo e nós da árvore
- `Button` - Ações (expandir, buscar, etc)
- `Input` - Campo de busca
- `Avatar` - Foto/iniciais do afiliado
- `Badge` - Status (ativo, pendente, inativo)

**Cores:**
- Primary: Verde (#10b981)
- Secondary: Roxo (#8b5cf6)
- Success: Verde claro
- Warning: Amarelo
- Danger: Vermelho

**Ícones:**
- `Users` - Rede/Afiliados
- `ChevronDown/Right` - Expandir/Recolher
- `Search` - Busca
- `DollarSign` - Comissões
- `TrendingUp` - Crescimento

### Layout

**Admin - Minha Rede:**
```
┌─────────────────────────────────────────────────┐
│  Cards de Resumo (4 cards em grid)             │
├─────────────────────────────────────────────────┤
│  [Buscar...] [Expandir] [Recolher]             │
├─────────────────────────────────────────────────┤
│  🏢 Slim Quality (Empresa)                      │
│  ├─ 👤 Beatriz (N1)                             │
│  │   └─ 👤 Giuseppe (N2)                        │
│  │       └─ 👤 Maria (N3)                       │
│  └─ 👤 João (N1)                                │
└─────────────────────────────────────────────────┘
```

**Afiliado - Minha Rede:**
```
┌─────────────────────────────────────────────────┐
│  Cards de Resumo (3 cards: N1, N2, Total)      │
├─────────────────────────────────────────────────┤
│  [Buscar...] [Expandir] [Recolher]             │
├─────────────────────────────────────────────────┤
│  👤 Giuseppe (Você)                             │
│  └─ 👤 Maria (Seu N1)                           │
│      └─ (limite de 2 níveis)                    │
└─────────────────────────────────────────────────┘
```

## Migration Path

### Fase 1: Correções de Bug
1. Corrigir queries em `affiliate.service.ts`
2. Testar com dados reais (Beatriz, Giuseppe, Maria)
3. Validar que Maria aparece nas redes

### Fase 2: Admin - Lista
1. Remover coluna "Nível"
2. Ajustar layout da tabela
3. Testar responsividade

### Fase 3: Admin - Minha Rede
1. Criar novo componente
2. Implementar query completa
3. Adicionar ao menu
4. Testar com dados reais

### Fase 4: Afiliado - Limitar Profundidade
1. Modificar query existente
2. Adicionar filtro de 2 níveis
3. Atualizar cards de resumo
4. Testar com cada afiliado

### Fase 5: Validação Final
1. Testes manuais completos
2. Validação de performance
3. Revisão de UX/UI
4. Deploy

## Rollback Strategy

Se houver problemas:
1. Reverter commits específicos
2. Restaurar arquivos anteriores
3. Manter view materializada (não afetada)
4. Comunicar usuários se necessário
