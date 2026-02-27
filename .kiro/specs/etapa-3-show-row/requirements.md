# Requirements Document - ETAPA 3: Produtos Show Row

## Introduction

Este documento especifica os requisitos para a ETAPA 3 do sistema de diferenciação de perfis de afiliados do Slim Quality. O objetivo é criar uma categoria de produtos exclusiva para afiliados Logistas, seguindo exatamente o padrão já implementado para a categoria `ferramenta_ia` (Agente IA).

A ETAPA 1 criou os campos `affiliate_type` e adicionou o valor 'show_row' ao ENUM `product_category`. Esta etapa implementa o controle de acesso em 3 camadas (Layout, Página, RLS) para garantir que apenas Logistas tenham acesso aos produtos Show Row.

**⚠️ PADRÃO DE REFERÊNCIA OBRIGATÓRIO:**

Esta implementação deve replicar EXATAMENTE o padrão da categoria `ferramenta_ia`:
- **Layout:** `src/layouts/AffiliateDashboardLayout.tsx` (linhas 43-54, 107)
- **Página:** `src/pages/afiliados/dashboard/FerramentasIA.tsx`
- **Lógica:** Verificação de tipo + existência de produtos ativos

## Glossary

- **Show_Row**: Categoria de produto exclusiva para afiliados Logistas
- **Affiliate_Type**: Campo ENUM com valores 'individual' ou 'logista'
- **Product_Category**: Campo ENUM de categorias de produtos (inclui 'show_row')
- **RLS**: Row Level Security (políticas de segurança do Supabase)
- **Logista**: Tipo de afiliado loja física parceira
- **Individual**: Tipo de afiliado pessoa física revendedora
- **Menu Condicional**: Item de menu que aparece apenas se condições forem atendidas
- **3 Camadas de Controle**: Layout (menu), Página (validação), RLS (banco)

## Requirements

### Requirement 1: Utilizar ENUM Existente

**User Story:** Como sistema, eu quero usar o valor 'show_row' que será criado pela ETAPA 1 no ENUM `product_category`, para que não seja necessário criar novo ENUM ou migration nesta etapa.

#### Acceptance Criteria

1. THE Sistema SHALL usar valor 'show_row' do ENUM `product_category` existente
2. THE Sistema SHALL NOT criar novo ENUM ou migration para categoria
3. THE Sistema SHALL validar que 'show_row' existe no ENUM antes de usar
4. IF 'show_row' não existir no ENUM, THEN THE Sistema SHALL retornar erro claro
5. THE Sistema SHALL permitir cadastro de produtos com `category='show_row'` no painel admin

### Requirement 2: Controle de Visibilidade no Menu (Camada 1)

**User Story:** Como sistema, eu quero exibir o item "Show Row" no menu lateral apenas para Logistas e apenas se houver produtos ativos, para que o menu seja limpo e relevante.

#### Acceptance Criteria

1. THE Layout SHALL verificar `affiliate_type` do afiliado autenticado
2. THE Layout SHALL verificar existência de produtos ativos com `category='show_row'`
3. WHEN `affiliate_type='logista'` AND existem produtos Show Row ativos, THEN THE Menu SHALL exibir item "Show Row"
4. WHEN `affiliate_type='individual'`, THEN THE Menu SHALL NOT exibir item "Show Row"
5. WHEN não existem produtos Show Row ativos, THEN THE Menu SHALL NOT exibir item "Show Row" (mesmo para Logistas)
6. THE Menu item SHALL usar ícone apropriado (sugestão: Package ou ShoppingBag)
7. THE Menu item SHALL redirecionar para `/afiliados/dashboard/show-row`
8. THE Verificação SHALL ser feita ao carregar o layout (useEffect)
9. THE Verificação SHALL usar query count do Supabase (performance)
10. THE Estado do menu SHALL ser armazenado em state local (`showShowRowMenu`)

**Padrão de Referência:** `src/layouts/AffiliateDashboardLayout.tsx` linhas 43-54 e 107

### Requirement 3: Validação de Acesso na Página (Camada 2)

**User Story:** Como sistema, eu quero validar o tipo de afiliado ao carregar a página Show Row, para que afiliados Individual sejam redirecionados e não tenham acesso.

#### Acceptance Criteria

1. THE Página SHALL verificar `affiliate_type` do afiliado ao carregar
2. WHEN `affiliate_type='individual'`, THEN THE Página SHALL redirecionar para `/afiliados/dashboard`
3. WHEN `affiliate_type='logista'`, THEN THE Página SHALL carregar normalmente
4. THE Redirecionamento SHALL exibir toast de erro: "Acesso negado. Esta seção é exclusiva para Logistas."
5. THE Validação SHALL ocorrer antes de carregar produtos
6. THE Validação SHALL usar dados do afiliado já carregados pelo layout
7. IF dados do afiliado não estiverem disponíveis, THEN THE Página SHALL aguardar carregamento
8. THE Página SHALL exibir loading state durante validação

### Requirement 4: Política RLS no Banco de Dados (Camada 3)

**User Story:** Como sistema, eu quero aplicar política RLS na tabela `products` para que afiliados Individual não consigam fazer query de produtos Show Row, para que a segurança seja garantida no nível do banco.

#### Acceptance Criteria

1. THE Sistema SHALL criar política RLS na tabela `products`
2. THE Política SHALL permitir SELECT de produtos `show_row` apenas para Logistas
3. THE Política SHALL verificar `affiliate_type` do usuário autenticado
4. WHEN `affiliate_type='individual'` AND `category='show_row'`, THEN THE Query SHALL retornar vazio
5. WHEN `affiliate_type='logista'` AND `category='show_row'`, THEN THE Query SHALL retornar produtos
6. THE Política SHALL NOT afetar outras categorias de produtos
7. THE Política SHALL ser aplicada via migration SQL
8. THE Política SHALL ser testada com ambos os tipos de afiliado

**Nota:** A política deve verificar o `affiliate_type` através de JOIN com a tabela `affiliates` usando `auth.uid()`.

### Requirement 5: Página Show Row

**User Story:** Como Logista, eu quero acessar uma página dedicada aos produtos Show Row, para que eu possa visualizar e adquirir produtos exclusivos.

#### Acceptance Criteria

1. THE Página SHALL ser criada em `src/pages/afiliados/dashboard/ShowRow.tsx`
2. THE Página SHALL seguir exatamente o padrão de `FerramentasIA.tsx`
3. THE Página SHALL exibir título "Show Row" e descrição clara
4. THE Página SHALL buscar produtos com `category='show_row'` AND `is_active=true`
5. THE Página SHALL exibir loading state durante carregamento
6. WHEN não há produtos, THEN THE Página SHALL exibir mensagem: "Nenhum produto Show Row disponível no momento."
7. WHEN há produtos, THEN THE Página SHALL exibir grid de cards (2 colunas em desktop)
8. THE Card SHALL exibir: imagem, nome, descrição, preço, botão "Ver Detalhes"
9. THE Botão "Ver Detalhes" SHALL abrir modal com checkout
10. THE Checkout SHALL usar componente `AffiliateAwareCheckout`
11. THE Checkout SHALL passar `isDigital=false` (produtos físicos)
12. THE Página SHALL recarregar após compra bem-sucedida

### Requirement 6: Painel Administrativo

**User Story:** Como administrador, eu quero cadastrar produtos Show Row no painel admin, para que eu possa gerenciar o catálogo exclusivo para Logistas.

#### Acceptance Criteria

1. THE Painel Admin SHALL permitir seleção de categoria 'show_row' no formulário de produtos
2. THE Select de categoria SHALL exibir opção "Show Row (Exclusivo Logistas)"
3. THE Formulário SHALL validar que categoria 'show_row' é válida
4. THE Formulário SHALL permitir upload de imagens para produtos Show Row
5. THE Formulário SHALL permitir definir preço, descrição, SKU
6. THE Formulário SHALL permitir ativar/desativar produto
7. THE Listagem de produtos SHALL filtrar por categoria 'show_row'
8. THE Listagem SHALL exibir badge "SHOW ROW" para produtos desta categoria

**Nota:** O painel admin já existe em `src/pages/dashboard/Produtos.tsx` e já suporta múltiplas categorias.

### Requirement 7: Rota e Navegação

**User Story:** Como sistema, eu quero configurar a rota `/afiliados/dashboard/show-row` corretamente, para que a navegação funcione sem erros.

#### Acceptance Criteria

1. THE Sistema SHALL adicionar rota em `src/App.tsx` ou arquivo de rotas
2. THE Rota SHALL ser `/afiliados/dashboard/show-row`
3. THE Rota SHALL usar componente `ShowRow`
4. THE Rota SHALL estar protegida por autenticação (layout já protege)
5. THE Rota SHALL ser acessível via menu lateral (quando visível)
6. THE Navegação direta via URL SHALL funcionar corretamente
7. THE Navegação SHALL respeitar validação de tipo de afiliado

### Requirement 8: Feedback Visual e UX

**User Story:** Como Logista, eu quero receber feedback claro ao interagir com produtos Show Row, para que eu saiba o status de cada ação realizada.

#### Acceptance Criteria

1. WHEN página está carregando, THE Sistema SHALL exibir loading spinner
2. WHEN não há produtos, THE Sistema SHALL exibir mensagem clara com ícone
3. WHEN produto é adicionado ao carrinho, THE Sistema SHALL exibir toast de sucesso
4. WHEN compra é concluída, THE Sistema SHALL exibir toast de sucesso
5. WHEN ocorre erro, THE Sistema SHALL exibir toast de erro com mensagem descritiva
6. THE Cards de produtos SHALL ter hover effect
7. THE Botões SHALL ter loading state durante ações
8. THE Modal de checkout SHALL ter botão de fechar visível

### Requirement 9: Segurança e Validações

**User Story:** Como sistema, eu quero garantir que apenas Logistas autorizados tenham acesso aos produtos Show Row, para que a exclusividade seja mantida.

#### Acceptance Criteria

1. THE Sistema SHALL validar autenticação antes de qualquer acesso
2. THE Sistema SHALL validar tipo de afiliado em 3 camadas (Layout, Página, RLS)
3. THE Sistema SHALL NOT confiar apenas em validação frontend
4. THE Sistema SHALL registrar tentativas de acesso não autorizado em logs
5. THE Sistema SHALL retornar erro 403 se afiliado Individual tentar acessar via API
6. THE Sistema SHALL validar que produtos Show Row só são vendidos para Logistas
7. THE Sistema SHALL impedir compra de Show Row por afiliados Individual (validação no checkout)

### Requirement 10: Consistência com Design System

**User Story:** Como sistema, eu quero que a página Show Row siga o design system do projeto, para que a interface seja consistente.

#### Acceptance Criteria

1. THE Página SHALL usar componentes shadcn/ui
2. THE Página SHALL usar variáveis CSS ao invés de cores hardcoded
3. THE Página SHALL usar componente `Card` para produtos
4. THE Página SHALL usar componente `Button` para ações
5. THE Página SHALL usar componente `Dialog` para modal de checkout
6. THE Página SHALL usar componente `Badge` para status
7. THE Página SHALL seguir padrões de espaçamento (p-6 para cards)
8. THE Página SHALL usar `font-semibold` ao invés de `font-bold`
9. THE Página SHALL usar `text-muted-foreground` para textos secundários
10. THE Página SHALL ser responsiva (mobile, tablet, desktop)

**Referência:** `.context/docs/design-system.md`

## Notas de Implementação

### Ordem de Implementação Recomendada

1. **Primeiro**: Criar política RLS na tabela `products` (Requirement 4)
2. **Segundo**: Atualizar layout para exibir menu condicional (Requirement 2)
3. **Terceiro**: Criar página ShowRow.tsx (Requirement 5)
4. **Quarto**: Adicionar validação de acesso na página (Requirement 3)
5. **Quinto**: Configurar rota (Requirement 7)
6. **Sexto**: Atualizar painel admin (Requirement 6)
7. **Sétimo**: Implementar feedback visual (Requirement 8)
8. **Oitavo**: Validar segurança e consistência (Requirements 9, 10)

### Dependências Externas

- ETAPA 1 completa (campo `affiliate_type` e valor 'show_row' no ENUM)
- Supabase PostgreSQL (banco de dados)
- Vercel Serverless Functions (backend)
- React/Vite (frontend)
- shadcn/ui (componentes UI)
- Componente `AffiliateAwareCheckout` existente

### Arquivos Principais a Criar/Modificar

**Frontend:**
- `src/pages/afiliados/dashboard/ShowRow.tsx` - Nova página (replicar FerramentasIA.tsx)
- `src/layouts/AffiliateDashboardLayout.tsx` - Adicionar menu condicional
- `src/App.tsx` - Adicionar rota
- `src/pages/dashboard/Produtos.tsx` - Já suporta, apenas validar

**Backend:**
- `supabase/migrations/YYYYMMDDHHMMSS_add_show_row_rls.sql` - Nova migration para RLS

### Testes Críticos

1. **Controle de Menu**: Verificar que menu aparece apenas para Logistas com produtos ativos
2. **Validação de Página**: Verificar que Individual é redirecionado
3. **RLS**: Verificar que Individual não consegue fazer query de produtos Show Row
4. **Compra**: Verificar que apenas Logistas conseguem comprar Show Row
5. **Painel Admin**: Verificar que produtos Show Row são cadastrados corretamente
6. **Responsividade**: Testar em mobile, tablet e desktop

### Riscos e Mitigações

**Risco 1: RLS não funcionando corretamente**
- Mitigação: Testar política com ambos os tipos de afiliado
- Mitigação: Validar que JOIN com tabela `affiliates` funciona
- Mitigação: Logs detalhados de queries bloqueadas

**Risco 2: Menu aparecendo para Individual**
- Mitigação: Validação dupla (tipo + produtos ativos)
- Mitigação: Testes automatizados de renderização condicional
- Mitigação: Code review focado em lógica de menu

**Risco 3: Afiliado Individual comprando Show Row**
- Mitigação: Validação no checkout (frontend e backend)
- Mitigação: RLS impedindo query de produtos
- Mitigação: Logs de tentativas de compra não autorizadas

## Critérios de Conclusão da ETAPA 3

A ETAPA 3 estará completa quando:

- ✅ Todos os 10 requirements estiverem implementados
- ✅ Política RLS aplicada e testada
- ✅ Menu condicional funcionando corretamente
- ✅ Página Show Row funcionando para Logistas
- ✅ Afiliados Individual sem acesso (3 camadas)
- ✅ Painel admin suportando Show Row
- ✅ Rota configurada e funcionando
- ✅ Feedback visual implementado
- ✅ Segurança validada
- ✅ Design system aplicado
- ✅ Zero erros de TypeScript/ESLint
- ✅ Testes de integração passando
- ✅ Documentação atualizada

## Próximas Etapas (Fora do Escopo)

Esta especificação NÃO inclui:

- ❌ Perfil de loja e vitrine pública (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)
- ❌ Produtos Show Row específicos (definidos pelo admin)
- ❌ Integração com sistema de comissões (já existe)
- ❌ Notificações de novos produtos Show Row

Estas funcionalidades serão implementadas nas etapas subsequentes ou em sprints futuros.
