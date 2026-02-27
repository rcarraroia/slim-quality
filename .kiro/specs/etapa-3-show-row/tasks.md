# Tasks - ETAPA 3: Produtos Show Row

## Overview

Este documento lista todas as tasks necessárias para implementar a ETAPA 3 do sistema de diferenciação de perfis de afiliados. As tasks estão organizadas em fases sequenciais e devem ser executadas na ordem apresentada.

**Dependências:**
- ETAPA 1 concluída (campo `affiliate_type` e valor 'show_row' no ENUM `product_category`)
- Supabase PostgreSQL configurado e funcionando
- React/Vite frontend funcionando
- shadcn/ui componentes disponíveis

**Estimativa Total:** Não fornecida (conforme política do projeto)

**⚠️ PADRÃO DE REFERÊNCIA OBRIGATÓRIO:**

Todas as implementações devem replicar EXATAMENTE o padrão de `ferramenta_ia`:
- **Layout:** `src/layouts/AffiliateDashboardLayout.tsx` (linhas 43-54, 107)
- **Página:** `src/pages/afiliados/dashboard/FerramentasIA.tsx`

---

## Phase 1: Database - RLS Policy

### Task 1.1: Criar migration para política RLS

**Descrição:** Criar migration SQL para adicionar política RLS que controla acesso a produtos Show Row

**Arquivos:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_show_row_rls.sql` (novo)

**Implementação:**

1. Criar arquivo de migration com timestamp atual

2. Adicionar comentário explicativo no topo

3. **CRÍTICO:** Verificar e habilitar RLS na tabela `products`:
   ```sql
   -- Verificar se RLS está habilitada
   -- Se não estiver, habilitar antes de criar política
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_class 
       WHERE relname = 'products' 
       AND relrowsecurity = true
     ) THEN
       ALTER TABLE products ENABLE ROW LEVEL SECURITY;
       RAISE NOTICE 'RLS habilitada na tabela products';
     ELSE
       RAISE NOTICE 'RLS já estava habilitada na tabela products';
     END IF;
   END $$;
   ```

4. Implementar política `show_row_access_control`:
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

5. Adicionar comentário explicando comportamento da política

6. Testar migration localmente antes de aplicar

7. Validar que RLS foi habilitada:
   ```sql
   -- Validação pós-migration
   SELECT relrowsecurity FROM pg_class WHERE relname = 'products';
   -- Deve retornar: true
   ```

**Validações:**
- RLS está habilitada na tabela `products` (verificar com query)
- Política permite SELECT de produtos não-show_row para todos
- Política permite SELECT de show_row apenas para Logistas
- Política bloqueia SELECT de show_row para Individual
- JOIN com tabela `affiliates` funciona corretamente

**Testes:**
- Testar query como Logista (deve retornar show_row)
- Testar query como Individual (deve retornar vazio para show_row)
- Testar query de outras categorias (deve funcionar para ambos)

**Critérios de Conclusão:**
- [ ] Migration criada com nome correto
- [ ] Verificação de RLS implementada
- [ ] RLS habilitada na tabela `products` (se necessário)
- [ ] Política RLS implementada corretamente
- [ ] Comentários explicativos adicionados
- [ ] Migration testada localmente
- [ ] Validação pós-migration executada
- [ ] Migration aplicada no Supabase
- [ ] Testes de RLS passando

---

### Task 1.2: Validar política RLS

**Descrição:** Validar que política RLS funciona corretamente para ambos os tipos de afiliado

**Arquivos:**
- Nenhum (apenas testes)

**Implementação:**

1. Criar afiliado de teste tipo Logista
2. Criar afiliado de teste tipo Individual
3. Criar produto de teste categoria show_row
4. Fazer query como Logista e verificar retorno
5. Fazer query como Individual e verificar retorno vazio
6. Fazer query de outras categorias e verificar retorno para ambos
7. Documentar resultados dos testes

**Validações:**
- Logista vê produtos show_row
- Individual NÃO vê produtos show_row
- Ambos veem produtos de outras categorias
- Nenhum erro de SQL ou JOIN

**Testes:**
- Query direta no Supabase SQL Editor
- Query via frontend (após implementar página)
- Query via API (se aplicável)

**Critérios de Conclusão:**
- [ ] Testes com Logista passando
- [ ] Testes com Individual passando
- [ ] Testes com outras categorias passando
- [ ] Documentação de testes criada
- [ ] Nenhum erro identificado

---

## Phase 2: Frontend - Menu Condicional

### Task 2.1: Atualizar AffiliateDashboardLayout

**Descrição:** Adicionar menu condicional "Show Row" que aparece apenas para Logistas com produtos ativos

**Arquivos:**
- `src/layouts/AffiliateDashboardLayout.tsx`

**Implementação:**

1. Importar ícone `Package` do lucide-react:
   ```typescript
   import { Package } from "lucide-react";
   ```

2. Adicionar estado para controle do menu:
   ```typescript
   const [showShowRowMenu, setShowShowRowMenu] = useState(false);
   ```

3. Criar função de verificação (após `checkIAAvailability`):
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

4. Adicionar chamada no useEffect existente:
   ```typescript
   useEffect(() => {
     loadAffiliateData();
     checkIAAvailability();
     checkShowRowAvailability(); // NOVO
   }, []);
   ```

5. Adicionar item condicional no array `menuItems` (após Ferramentas IA):
   ```typescript
   const menuItems = [
     { icon: Home, label: "Início", path: "/afiliados/dashboard" },
     ...(showIAMenu ? [{ icon: Bot, label: "Ferramentas IA", path: "/afiliados/dashboard/ferramentas-ia" }] : []),
     ...(showShowRowMenu ? [{ icon: Package, label: "Show Row", path: "/afiliados/dashboard/show-row" }] : []), // NOVO
     { icon: Megaphone, label: "Materiais", path: "/afiliados/dashboard/materiais" },
     // ... resto do menu
   ];
   ```

**Validações:**
- Menu aparece apenas para Logistas
- Menu aparece apenas se existem produtos show_row ativos
- Menu não aparece para Individual
- Menu não aparece se não há produtos ativos
- Ícone correto é exibido

**Testes:**
- Testar como Logista com produtos ativos (deve aparecer)
- Testar como Logista sem produtos ativos (não deve aparecer)
- Testar como Individual com produtos ativos (não deve aparecer)
- Testar como Individual sem produtos ativos (não deve aparecer)

**Critérios de Conclusão:**
- [ ] Ícone importado corretamente
- [ ] Estado adicionado
- [ ] Função de verificação implementada
- [ ] Chamada no useEffect adicionada
- [ ] Item condicional no menu adicionado
- [ ] Testes de renderização passando

---

## Phase 3: Frontend - Página Show Row

### Task 3.1: Criar página ShowRow.tsx

**Descrição:** Criar página dedicada aos produtos Show Row, replicando padrão de FerramentasIA.tsx

**Arquivos:**
- `src/pages/afiliados/dashboard/ShowRow.tsx` (novo)

**Implementação:**

1. Criar arquivo `ShowRow.tsx` na pasta correta

2. Importar dependências necessárias:
   ```typescript
   import { useEffect, useState } from "react";
   import { useNavigate } from "react-router-dom";
   import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
   import { Button } from "@/components/ui/button";
   import { Badge } from "@/components/ui/badge";
   import { supabase } from "@/config/supabase";
   import { Loader2, Package, AlertCircle, ShoppingCart } from "lucide-react";
   import { toast } from "sonner";
   import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
   import AffiliateAwareCheckout from "@/components/checkout/AffiliateAwareCheckout";
   import { affiliateFrontendService } from "@/services/frontend/affiliate.service";
   ```

3. Definir interfaces:
   ```typescript
   interface Product {
     id: string;
     name: string;
     slug: string;
     sku: string;
     description: string;
     price_cents: number;
     image_url?: string;
   }
   ```

4. Criar componente com estados:
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

     // ... implementar funções
   }
   ```

5. Implementar função `validateAccess()`:
   ```typescript
   const validateAccess = async () => {
     try {
       const { isAffiliate, affiliate } = 
         await affiliateFrontendService.checkAffiliateStatus();
       
       if (!isAffiliate || affiliate?.affiliate_type !== 'logista') {
         toast.error('Acesso negado. Esta seção é exclusiva para Logistas.');
         navigate('/afiliados/dashboard');
         return;
       }
     } catch (error) {
       console.error('Erro ao validar acesso:', error);
       navigate('/afiliados/dashboard');
     }
   };
   ```

6. Implementar função `loadProducts()`:
   ```typescript
   const loadProducts = async () => {
     try {
       setLoading(true);
       
       const { data, error } = await supabase
         .from('products')
         .select('id, name, slug, sku, description, price_cents, image_url')
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
   ```

7. Implementar JSX com:
   - Header com título e descrição
   - Loading state (spinner)
   - Empty state (sem produtos)
   - Grid de cards (2 colunas desktop, 1 mobile)
   - Modal de checkout

**Validações:**
- Página valida tipo de afiliado ao carregar
- Página redireciona Individual
- Página carrega produtos show_row
- Página exibe loading state
- Página exibe empty state quando necessário
- Cards exibem informações corretas
- Modal de checkout abre corretamente

**Testes:**
- Testar como Logista (deve carregar)
- Testar como Individual (deve redirecionar)
- Testar com produtos (deve exibir grid)
- Testar sem produtos (deve exibir empty state)
- Testar abertura de modal

**Critérios de Conclusão:**
- [ ] Arquivo criado na pasta correta
- [ ] Imports corretos
- [ ] Interfaces definidas
- [ ] Estados implementados
- [ ] Função validateAccess implementada
- [ ] Função loadProducts implementada
- [ ] JSX completo e responsivo
- [ ] Testes de componente passando

---

### Task 3.2: Implementar grid de cards de produtos

**Descrição:** Implementar grid responsivo de cards para exibir produtos Show Row

**Arquivos:**
- `src/pages/afiliados/dashboard/ShowRow.tsx`

**Implementação:**

1. Criar grid responsivo:
   ```typescript
   <div className="grid gap-6 md:grid-cols-2">
     {products.map((product) => (
       <Card key={product.id} className="border-2 hover:border-primary/50 transition-colors">
         {/* Card content */}
       </Card>
     ))}
   </div>
   ```

2. Implementar card de produto:
   ```typescript
   <Card key={product.id}>
     <CardHeader>
       {product.image_url && (
         <img 
           src={product.image_url} 
           alt={product.name}
           className="w-full h-48 object-cover rounded-lg mb-4"
         />
       )}
       <CardTitle>{product.name}</CardTitle>
       <CardDescription>{product.description}</CardDescription>
     </CardHeader>
     <CardContent>
       <div className="flex items-baseline gap-1">
         <span className="text-3xl font-bold">
           R$ {(product.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
         </span>
       </div>
     </CardContent>
     <CardFooter>
       <Button
         className="w-full gap-2"
         onClick={() => {
           setSelectedProduct(product);
           setIsCheckoutOpen(true);
         }}
       >
         <ShoppingCart className="h-4 w-4" />
         Ver Detalhes
       </Button>
     </CardFooter>
   </Card>
   ```

3. Adicionar hover effects e transições
4. Garantir responsividade (mobile, tablet, desktop)

**Validações:**
- Grid responsivo funciona corretamente
- Cards exibem todas as informações
- Imagens carregam corretamente (se disponíveis)
- Preço formatado corretamente
- Botão abre modal de checkout
- Hover effects funcionam

**Testes:**
- Testar em desktop (2 colunas)
- Testar em mobile (1 coluna)
- Testar com imagens
- Testar sem imagens
- Testar hover effects

**Critérios de Conclusão:**
- [ ] Grid implementado e responsivo
- [ ] Cards implementados corretamente
- [ ] Imagens exibidas (quando disponíveis)
- [ ] Preço formatado corretamente
- [ ] Botão funcionando
- [ ] Hover effects implementados
- [ ] Testes de responsividade passando

---

### Task 3.3: Implementar modal de checkout

**Descrição:** Implementar modal de checkout usando componente AffiliateAwareCheckout

**Arquivos:**
- `src/pages/afiliados/dashboard/ShowRow.tsx`

**Implementação:**

1. Adicionar Dialog do shadcn/ui:
   ```typescript
   <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
     <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
       <DialogHeader className="p-6 pb-0">
         <DialogTitle className="text-2xl font-bold flex items-center gap-2">
           <Package className="h-6 w-6 text-primary" />
           {selectedProduct?.name}
         </DialogTitle>
       </DialogHeader>
       <div className="max-h-[85vh] overflow-y-auto p-6 pt-2">
         {selectedProduct && (
           <AffiliateAwareCheckout
             product={{
               id: selectedProduct.id,
               name: selectedProduct.name,
               sku: selectedProduct.sku,
               price_cents: selectedProduct.price_cents
             }}
             isDigital={false} // Produtos Show Row são físicos
             onClose={() => setIsCheckoutOpen(false)}
             onOrderComplete={(orderId) => {
               setIsCheckoutOpen(false);
               toast.success("Pedido realizado com sucesso!");
               loadProducts(); // Recarregar produtos
             }}
           />
         )}
       </div>
     </DialogContent>
   </Dialog>
   ```

2. Garantir que modal fecha ao clicar fora
3. Garantir que modal fecha ao pressionar ESC
4. Garantir que modal é responsivo

**Validações:**
- Modal abre ao clicar em "Ver Detalhes"
- Modal exibe produto correto
- Checkout funciona corretamente
- Modal fecha após compra
- Modal fecha ao clicar fora
- Modal fecha ao pressionar ESC
- Modal é responsivo

**Testes:**
- Testar abertura de modal
- Testar fechamento de modal
- Testar compra de produto
- Testar responsividade

**Critérios de Conclusão:**
- [ ] Dialog implementado
- [ ] AffiliateAwareCheckout integrado
- [ ] isDigital=false configurado
- [ ] Callbacks implementados
- [ ] Modal responsivo
- [ ] Testes de modal passando

---

### Task 3.4: Implementar loading e empty states

**Descrição:** Implementar estados de loading e empty para melhor UX

**Arquivos:**
- `src/pages/afiliados/dashboard/ShowRow.tsx`

**Implementação:**

1. Implementar loading state:
   ```typescript
   if (loading) {
     return (
       <div className="flex justify-center items-center h-96">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
   ```

2. Implementar empty state:
   ```typescript
   if (products.length === 0) {
     return (
       <div className="space-y-6 animate-fade-in">
         <div className="flex flex-col gap-2">
           <h2 className="text-3xl font-bold tracking-tight">Show Row</h2>
           <p className="text-muted-foreground">
             Produtos exclusivos para Logistas parceiros.
           </p>
         </div>
         
         <Card>
           <CardContent className="py-10 text-center text-muted-foreground">
             <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
             <p>Nenhum produto Show Row disponível no momento.</p>
             <p className="text-sm mt-2">Novos produtos serão adicionados em breve.</p>
           </CardContent>
         </Card>
       </div>
     );
   }
   ```

3. Adicionar animações de fade-in

**Validações:**
- Loading state exibe spinner
- Empty state exibe mensagem clara
- Empty state exibe ícone apropriado
- Animações funcionam suavemente

**Testes:**
- Testar loading state
- Testar empty state
- Testar transição entre estados

**Critérios de Conclusão:**
- [ ] Loading state implementado
- [ ] Empty state implementado
- [ ] Ícones apropriados
- [ ] Mensagens claras
- [ ] Animações implementadas
- [ ] Testes de estados passando

---

## Phase 4: Frontend - Rota e Navegação

### Task 4.1: Adicionar rota no App.tsx

**Descrição:** Configurar rota `/afiliados/dashboard/show-row` no sistema de rotas

**Arquivos:**
- `src/App.tsx`

**Implementação:**

1. Importar componente ShowRow:
   ```typescript
   import ShowRow from "@/pages/afiliados/dashboard/ShowRow";
   ```

2. Adicionar rota no grupo de rotas do dashboard de afiliados:
   ```typescript
   <Route path="/afiliados/dashboard" element={<AffiliateDashboardLayout />}>
     <Route index element={<Dashboard />} />
     <Route path="ferramentas-ia" element={<FerramentasIA />} />
     <Route path="show-row" element={<ShowRow />} /> {/* NOVO */}
     <Route path="materiais" element={<Materiais />} />
     {/* ... outras rotas */}
   </Route>
   ```

3. Verificar que rota está protegida por autenticação (layout já protege)

**Validações:**
- Rota configurada corretamente
- Navegação via menu funciona
- Navegação via URL direta funciona
- Autenticação é verificada
- Redirecionamento funciona para Individual

**Testes:**
- Testar navegação via menu
- Testar navegação via URL direta
- Testar sem autenticação (deve redirecionar)
- Testar como Individual (deve redirecionar)
- Testar como Logista (deve carregar)

**Critérios de Conclusão:**
- [ ] Import adicionado
- [ ] Rota configurada
- [ ] Navegação via menu funcionando
- [ ] Navegação via URL funcionando
- [ ] Autenticação verificada
- [ ] Testes de navegação passando

---

## Phase 5: Testing & Validation

### Task 5.1: Testes de integração

**Descrição:** Criar testes de integração para validar fluxos completos

**Arquivos:**
- `tests/integration/show-row.test.ts` (novo)

**Implementação:**

1. Testar menu condicional:
   - Menu aparece para Logista com produtos ativos
   - Menu não aparece para Individual
   - Menu não aparece sem produtos ativos

2. Testar validação de página:
   - Logista acessa página normalmente
   - Individual é redirecionado
   - Toast de erro é exibido

3. Testar RLS:
   - Logista faz query e recebe produtos
   - Individual faz query e recebe vazio
   - Outras categorias funcionam para ambos

4. Testar compra:
   - Logista consegue comprar produto Show Row
   - Individual não consegue (se tentar via API)

**Critérios de Conclusão:**
- [ ] Testes de menu criados e passando
- [ ] Testes de página criados e passando
- [ ] Testes de RLS criados e passando
- [ ] Testes de compra criados e passando
- [ ] Cobertura de testes > 70%

---

### Task 5.2: Testes end-to-end

**Descrição:** Criar testes E2E para validar experiência completa do usuário

**Arquivos:**
- `tests/e2e/show-row.test.ts` (novo)

**Implementação:**

1. Testar fluxo completo como Logista:
   - Login como Logista
   - Verificar menu Show Row aparece
   - Clicar no menu
   - Verificar página carrega
   - Verificar produtos são exibidos
   - Clicar em "Ver Detalhes"
   - Verificar modal abre
   - Simular compra
   - Verificar sucesso

2. Testar tentativa de acesso como Individual:
   - Login como Individual
   - Verificar menu Show Row não aparece
   - Tentar acessar via URL direta
   - Verificar redirecionamento
   - Verificar toast de erro

3. Testar sem produtos ativos:
   - Login como Logista
   - Desativar todos os produtos Show Row
   - Verificar menu não aparece
   - Acessar via URL direta
   - Verificar empty state

**Critérios de Conclusão:**
- [ ] Teste de fluxo Logista criado e passando
- [ ] Teste de tentativa Individual criado e passando
- [ ] Teste sem produtos criado e passando
- [ ] Todos os testes E2E passando

---

## Phase 6: Documentation & Deployment

### Task 6.1: Atualizar documentação

**Descrição:** Atualizar documentação do projeto com informações da ETAPA 3

**Arquivos:**
- `docs/AFFILIATE_FEATURES.md` (atualizar ou criar)
- `README.md` (atualizar se necessário)

**Implementação:**

1. Documentar categoria Show Row
2. Documentar controle de acesso em 3 camadas
3. Documentar política RLS
4. Documentar fluxo de uso para Logistas
5. Adicionar screenshots da página (opcional)

**Critérios de Conclusão:**
- [ ] Documentação criada/atualizada
- [ ] Controle de acesso documentado
- [ ] RLS documentada
- [ ] Fluxo de uso documentado

---

### Task 6.2: Deploy e validação

**Descrição:** Fazer deploy das alterações e validar em produção

**Implementação:**

1. Verificar que todas as tasks anteriores estão concluídas
2. Executar todos os testes (unit, integration, E2E)
3. Verificar que não há erros de TypeScript/ESLint
4. Fazer commit e push para repositório
5. Aguardar deploy automático do Vercel
6. Aplicar migration RLS no Supabase de produção
7. Validar em produção:
   - Testar como Logista
   - Testar como Individual
   - Testar RLS
   - Verificar logs de erro
8. Monitorar por 24 horas

**Critérios de Conclusão:**
- [ ] Deploy realizado com sucesso
- [ ] Migration RLS aplicada em produção
- [ ] Validação em produção concluída
- [ ] Nenhum erro crítico identificado
- [ ] Monitoramento ativo

---

## Summary

**Total de Tasks:** 12 tasks organizadas em 6 fases

**Fases:**
1. Database - RLS Policy (2 tasks)
2. Frontend - Menu Condicional (1 task)
3. Frontend - Página Show Row (4 tasks)
4. Frontend - Rota e Navegação (1 task)
5. Testing & Validation (2 tasks)
6. Documentation & Deployment (2 tasks)

**Dependências Críticas:**
- Phase 1 deve ser concluída antes de Phase 2
- Phase 2 deve ser concluída antes de Phase 3
- Phase 3 deve ser concluída antes de Phase 4
- Phase 5 só pode começar após Phases 1-4 concluídas
- Phase 6 é a última fase

**Próximos Passos:**
Após conclusão da ETAPA 3, iniciar planejamento da ETAPA 4 (Perfil da Loja e Vitrine Pública).
