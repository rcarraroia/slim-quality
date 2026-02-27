# Design Document - ETAPA 3: Produtos Show Row

## Overview

Este documento especifica o design técnico para implementação da ETAPA 3 do sistema de diferenciação de perfis de afiliados. A solução cria uma categoria de produtos exclusiva para afiliados Logistas, seguindo EXATAMENTE o padrão já implementado para a categoria `ferramenta_ia` (Agente IA).

**⚠️ PADRÃO DE REFERÊNCIA OBRIGATÓRIO:**

Esta implementação deve replicar EXATAMENTE:
- **Layout:** `src/layouts/AffiliateDashboardLayout.tsx` (linhas 43-54, 107)
- **Página:** `src/pages/afiliados/dashboard/FerramentasIA.tsx`
- **Lógica:** Verificação de tipo + existência de produtos ativos

### Objetivos

1. Criar categoria de produtos exclusiva para Logistas
2. Implementar controle de acesso em 3 camadas (Layout, Página, RLS)
3. Replicar exatamente o padrão de `ferramenta_ia`
4. Garantir que apenas Logistas tenham acesso
5. Manter consistência arquitetural com o sistema existente

### Escopo

**Incluído nesta ETAPA:**
- ✅ Controle de visibilidade no menu (Camada 1)
- ✅ Validação de acesso na página (Camada 2)
- ✅ Política RLS no banco de dados (Camada 3)
- ✅ Página Show Row para Logistas
- ✅ Suporte no painel administrativo
- ✅ Rota e navegação
- ✅ Feedback visual e UX

**Não incluído (ETAPAs futuras):**
- ❌ Perfil de loja e vitrine (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)
- ❌ Produtos Show Row específicos (definidos pelo admin)
- ❌ Notificações de novos produtos


## Architecture

### System Context

O sistema Slim Quality utiliza uma arquitetura moderna baseada em:

**Frontend:** React/Vite + TypeScript
- Componentes UI: shadcn/ui
- State management: React hooks
- Validação: Zod schemas
- Localização: `/src`

**Backend:** Vercel Serverless Functions (JavaScript/ESM)
- Padrão: Cada arquivo em `/api` é uma função independente
- Roteamento: Via query parameter `action`
- Autenticação: Supabase Auth (JWT)
- Referência: `api/affiliates.js`

**Database:** Supabase PostgreSQL
- Tabela principal: `products`
- Campo relevante: `category` (ENUM com valor 'show_row')
- Tabela auxiliar: `affiliates` (campo `affiliate_type`)
- Segurança: Row Level Security (RLS)

### Architectural Decisions

**AD-1: Replicar Padrão "Agente IA"**
- Decisão: Seguir EXATAMENTE o padrão de `ferramenta_ia`
- Razão: Padrão já testado e funcionando, reduz risco de bugs
- Impacto: Consistência arquitetural, facilita manutenção

**AD-2: Controle em 3 Camadas**
- Decisão: Implementar controle de acesso em Layout, Página e RLS
- Razão: Segurança em profundidade (defense in depth)
- Impacto: Mesmo que uma camada falhe, outras protegem

**AD-3: Menu Condicional**
- Decisão: Exibir menu apenas se tipo=logista E existem produtos ativos
- Razão: Menu limpo e relevante, evita confusão
- Impacto: UX melhorada, menos cliques desnecessários

**AD-4: RLS com JOIN**
- Decisão: Política RLS faz JOIN com tabela `affiliates` para verificar tipo
- Razão: Segurança no nível do banco, não depende de frontend
- Impacto: Queries de Individual retornam vazio automaticamente

**AD-5: Usar ENUM Existente**
- Decisão: Usar valor 'show_row' já adicionado na ETAPA 1
- Razão: Evita nova migration, mantém simplicidade
- Impacto: Menos risco de erros, implementação mais rápida


## Components and Interfaces

### Database Schema (Existing)

A tabela `products` terá o campo `category` com valor 'show_row' após implementação da ETAPA 1:

```typescript
interface Product {
  id: string; // uuid
  name: string;
  slug: string;
  sku: string;
  description: string;
  price_cents: number;
  category: 'colchao' | 'ferramenta_ia' | 'show_row'; // ENUM
  product_type: 'mattress' | 'service';
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}
```

**Nenhuma alteração de schema necessária** - apenas adicionar política RLS.

### RLS Policy

#### Policy: show_row_access_control

**Propósito:** Permitir SELECT de produtos Show Row apenas para Logistas

**SQL:**

```sql
CREATE POLICY "show_row_access_control"
ON products
FOR SELECT
USING (
  -- Permitir acesso a produtos que NÃO são show_row
  category != 'show_row'
  OR
  -- OU permitir acesso a show_row apenas para Logistas
  (
    category = 'show_row'
    AND
    EXISTS (
      SELECT 1
      FROM affiliates
      WHERE affiliates.user_id = auth.uid()
      AND affiliates.affiliate_type = 'logista'
    )
  )
);
```

**Comportamento:**
- Afiliados Individual: Veem todos os produtos EXCETO show_row
- Afiliados Logista: Veem TODOS os produtos (incluindo show_row)
- Usuários não autenticados: Veem apenas produtos públicos (outras políticas)

### Frontend Components

#### 1. AffiliateDashboardLayout.tsx (Modificação)

**Localização:** `src/layouts/AffiliateDashboardLayout.tsx`

**Modificações:**

1. **Adicionar estado:**
```typescript
const [showShowRowMenu, setShowShowRowMenu] = useState(false);
```

2. **Adicionar função de verificação:**
```typescript
const checkShowRowAvailability = async () => {
  try {
    // 1. Verificar tipo de afiliado
    const { isAffiliate, affiliate: affiliateData } = 
      await affiliateFrontendService.checkAffiliateStatus();
    
    if (!isAffiliate || affiliateData?.affiliate_type !== 'logista') {
      setShowShowRowMenu(false);
      return;
    }
    
    // 2. Verificar existência de produtos ativos
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'show_row')
      .eq('is_active', true);

    setShowShowRowMenu(!!count && count > 0);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade Show Row:', error);
    setShowShowRowMenu(false);
  }
};
```

3. **Chamar no useEffect:**
```typescript
useEffect(() => {
  loadAffiliateData();
  checkIAAvailability();
  checkShowRowAvailability(); // NOVO
}, []);
```

4. **Adicionar item no menu:**
```typescript
const menuItems = [
  { icon: Home, label: "Início", path: "/afiliados/dashboard" },
  ...(showIAMenu ? [{ icon: Bot, label: "Ferramentas IA", path: "/afiliados/dashboard/ferramentas-ia" }] : []),
  ...(showShowRowMenu ? [{ icon: Package, label: "Show Row", path: "/afiliados/dashboard/show-row" }] : []), // NOVO
  { icon: Megaphone, label: "Materiais", path: "/afiliados/dashboard/materiais" },
  // ... resto do menu
];
```

**Padrão de Referência:** Linhas 43-54 e 107 do arquivo original

---

#### 2. ShowRow.tsx (Nova Página)

**Localização:** `src/pages/afiliados/dashboard/ShowRow.tsx`

**Propósito:** Página dedicada aos produtos Show Row para Logistas

**Estado:**

```typescript
interface ShowRowState {
  loading: boolean;
  products: Product[];
  selectedProduct: Product | null;
  isCheckoutOpen: boolean;
}
```

**Estrutura:**

```typescript
export default function ShowRow() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    validateAccess();
    loadProducts();
  }, []);

  const validateAccess = async () => {
    // Validar tipo de afiliado
    const { isAffiliate, affiliate } = 
      await affiliateFrontendService.checkAffiliateStatus();
    
    if (!isAffiliate || affiliate?.affiliate_type !== 'logista') {
      toast.error('Acesso negado. Esta seção é exclusiva para Logistas.');
      navigate('/afiliados/dashboard');
      return;
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'show_row')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Não foi possível carregar os produtos.');
    } finally {
      setLoading(false);
    }
  };

  // ... resto da implementação
}
```

**Layout:**

- Header com título "Show Row" e descrição
- Grid de cards (2 colunas em desktop, 1 em mobile)
- Cada card: imagem, nome, descrição, preço, botão
- Modal de checkout ao clicar em "Ver Detalhes"
- Loading state durante carregamento
- Empty state quando não há produtos

**Padrão de Referência:** `src/pages/afiliados/dashboard/FerramentasIA.tsx`


## Correctness Properties

### Property 1: Menu Visibility Control

*For any* afiliado autenticado, o item "Show Row" no menu deve aparecer se e somente se `affiliate_type='logista'` AND existem produtos Show Row ativos.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

**Rationale:** Garante que menu seja relevante e limpo, evitando confusão.

### Property 2: Page Access Control

*For any* tentativa de acesso à página Show Row, o sistema deve redirecionar se `affiliate_type != 'logista'`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

**Rationale:** Garante que apenas Logistas acessem a página, mesmo via URL direta.

### Property 3: RLS Query Control

*For any* query de produtos com `category='show_row'`, o banco deve retornar vazio se `affiliate_type != 'logista'`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

**Rationale:** Garante segurança no nível do banco, independente de frontend.

### Property 4: Product Purchase Control

*For any* tentativa de compra de produto Show Row, o sistema deve validar que `affiliate_type='logista'`.

**Validates: Requirements 9.6, 9.7**

**Rationale:** Garante que apenas Logistas possam comprar produtos Show Row.

### Property 5: Admin Panel Support

*For any* produto cadastrado com `category='show_row'`, o painel admin deve permitir criação e edição.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

**Rationale:** Garante que admin possa gerenciar catálogo Show Row.


## Error Handling

### Access Errors

#### 1. Afiliado Individual Tentando Acessar

**Scenario:** Afiliado Individual tenta acessar página Show Row

**Handling:**
- Redirecionar para `/afiliados/dashboard`
- Exibir toast: "Acesso negado. Esta seção é exclusiva para Logistas."
- Registrar tentativa em logs

#### 2. Query RLS Bloqueada

**Scenario:** Afiliado Individual tenta fazer query de produtos Show Row

**Handling:**
- RLS retorna vazio automaticamente
- Frontend exibe mensagem: "Nenhum produto disponível"
- Não expor que acesso foi bloqueado

#### 3. Produto Show Row Não Encontrado

**Scenario:** Logista tenta acessar produto Show Row que não existe

**Handling:**
- Exibir mensagem: "Produto não encontrado"
- Botão para voltar à listagem
- Não expor detalhes técnicos

### Loading Errors

#### 1. Erro ao Carregar Produtos

**Scenario:** Falha na query de produtos

**Handling:**
- Exibir toast: "Não foi possível carregar os produtos. Tente novamente."
- Botão "Tentar Novamente"
- Registrar erro em logs

#### 2. Erro ao Validar Acesso

**Scenario:** Falha ao verificar tipo de afiliado

**Handling:**
- Assumir acesso negado por segurança
- Redirecionar para dashboard
- Registrar erro em logs


## Testing Strategy

### Property-Based Testing

**Library:** Vitest

**Property Tests to Implement:**

#### 1. Menu Visibility Property

```typescript
// Feature: etapa-3-show-row, Property 1: Menu Visibility Control
describe('Menu Visibility', () => {
  test('menu appears only for logista with active products', async () => {
    // Setup: Criar afiliado logista
    const logista = await createTestAffiliate({ affiliate_type: 'logista' });
    
    // Setup: Criar produto show_row ativo
    await createTestProduct({ category: 'show_row', is_active: true });
    
    // Act: Renderizar layout
    const { getByText } = render(<AffiliateDashboardLayout />);
    
    // Assert: Menu deve aparecer
    await waitFor(() => {
      expect(getByText('Show Row')).toBeInTheDocument();
    });
  });
  
  test('menu does not appear for individual', async () => {
    // Setup: Criar afiliado individual
    const individual = await createTestAffiliate({ affiliate_type: 'individual' });
    
    // Setup: Criar produto show_row ativo
    await createTestProduct({ category: 'show_row', is_active: true });
    
    // Act: Renderizar layout
    const { queryByText } = render(<AffiliateDashboardLayout />);
    
    // Assert: Menu não deve aparecer
    await waitFor(() => {
      expect(queryByText('Show Row')).not.toBeInTheDocument();
    });
  });
});
```

#### 2. Page Access Property

```typescript
// Feature: etapa-3-show-row, Property 2: Page Access Control
describe('Page Access', () => {
  test('logista can access page', async () => {
    // Setup: Criar afiliado logista
    const logista = await createTestAffiliate({ affiliate_type: 'logista' });
    
    // Act: Navegar para página
    render(<ShowRow />);
    
    // Assert: Página deve carregar
    await waitFor(() => {
      expect(screen.getByText('Show Row')).toBeInTheDocument();
    });
  });
  
  test('individual is redirected', async () => {
    // Setup: Criar afiliado individual
    const individual = await createTestAffiliate({ affiliate_type: 'individual' });
    
    // Mock navigate
    const mockNavigate = jest.fn();
    jest.mock('react-router-dom', () => ({
      ...jest.requireActual('react-router-dom'),
      useNavigate: () => mockNavigate
    }));
    
    // Act: Tentar acessar página
    render(<ShowRow />);
    
    // Assert: Deve redirecionar
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/afiliados/dashboard');
    });
  });
});
```

### Unit Testing

**Framework:** Vitest

**Unit Tests to Implement:**

#### 1. RLS Policy Test

```typescript
describe('RLS Policy - show_row_access_control', () => {
  test('logista can query show_row products', async () => {
    // Setup: Criar afiliado logista
    const logista = await createTestAffiliate({ affiliate_type: 'logista' });
    
    // Setup: Criar produto show_row
    const product = await createTestProduct({ category: 'show_row' });
    
    // Act: Query como logista
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'show_row');
    
    // Assert: Deve retornar produto
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(product.id);
  });
  
  test('individual cannot query show_row products', async () => {
    // Setup: Criar afiliado individual
    const individual = await createTestAffiliate({ affiliate_type: 'individual' });
    
    // Setup: Criar produto show_row
    await createTestProduct({ category: 'show_row' });
    
    // Act: Query como individual
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'show_row');
    
    // Assert: Deve retornar vazio
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });
});
```


## Implementation Plan

### Phase 1: Database - RLS Policy (Priority: CRITICAL)

**Tasks:**

1. **Criar migration para política RLS**
   - Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_add_show_row_rls.sql`
   - Implementar política `show_row_access_control`
   - Testar política com ambos os tipos de afiliado
   - Validar que JOIN com `affiliates` funciona
   - Aplicar migration no Supabase

**Deliverables:**
- ✅ Migration criada e aplicada
- ✅ Política RLS funcionando
- ✅ Testes de RLS passando

### Phase 2: Frontend - Menu Condicional (Priority: HIGH)

**Tasks:**

1. **Atualizar AffiliateDashboardLayout**
   - Adicionar estado `showShowRowMenu`
   - Criar função `checkShowRowAvailability()`
   - Adicionar chamada no useEffect
   - Adicionar item condicional no array `menuItems`
   - Importar ícone `Package` do lucide-react

**Deliverables:**
- ✅ Menu condicional funcionando
- ✅ Verificação de tipo + produtos ativos
- ✅ Ícone apropriado

### Phase 3: Frontend - Página Show Row (Priority: HIGH)

**Tasks:**

1. **Criar página ShowRow.tsx**
   - Criar arquivo `src/pages/afiliados/dashboard/ShowRow.tsx`
   - Replicar estrutura de `FerramentasIA.tsx`
   - Implementar validação de acesso
   - Implementar carregamento de produtos
   - Implementar grid de cards
   - Implementar modal de checkout
   - Implementar loading e empty states

**Deliverables:**
- ✅ Página criada e funcionando
- ✅ Validação de acesso implementada
- ✅ Grid de produtos funcionando
- ✅ Checkout integrado

### Phase 4: Frontend - Rota e Navegação (Priority: MEDIUM)

**Tasks:**

1. **Configurar rota**
   - Adicionar rota em `src/App.tsx`
   - Testar navegação via menu
   - Testar navegação via URL direta
   - Validar proteção de autenticação

**Deliverables:**
- ✅ Rota configurada
- ✅ Navegação funcionando

### Phase 5: Testing & Validation (Priority: HIGH)

**Tasks:**

1. **Testes de Integração**
   - Testar menu condicional
   - Testar validação de página
   - Testar RLS com ambos os tipos
   - Testar compra de produtos

2. **Testes End-to-End**
   - Testar fluxo completo como Logista
   - Testar tentativa de acesso como Individual
   - Testar compra de produto Show Row

**Deliverables:**
- ✅ Testes de integração passando
- ✅ Testes E2E passando
- ✅ Cobertura de testes > 70%


## Security Considerations

### Access Control

- Validação em 3 camadas (Layout, Página, RLS)
- RLS como última linha de defesa
- Logs de tentativas de acesso não autorizado

### Data Validation

- Validar tipo de afiliado antes de qualquer operação
- Validar que produtos Show Row só são vendidos para Logistas
- Validar autenticação em todas as requisições

### Audit Logging

- Registrar tentativas de acesso não autorizado
- Registrar compras de produtos Show Row
- Não registrar dados sensíveis completos


## Deployment Strategy

### Deployment Order

1. **Backend First:** Deploy migration RLS
2. **Frontend Second:** Deploy alterações de layout e página
3. **Verification:** Testar fluxos completos

### Rollback Plan

- Reverter deploy do frontend se necessário
- Remover política RLS se causar problemas
- Backend é backward compatible (não quebra sistema existente)
