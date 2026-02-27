# Tasks Document - ETAPA 4: Perfil da Loja e Vitrine Pública

## Metadata

**Spec Name:** etapa-4-vitrine-publica  
**Version:** 1.0.0  
**Status:** draft  
**Created:** 2026-02-25  
**Dependencies:** ETAPA 1 concluída (campo `affiliate_type` existente)

## Task Breakdown

### Phase 1: Database - PostGIS e Tabela

#### Task 1.1: Habilitar PostGIS no Supabase

**Description:** Verificar e habilitar extensão PostGIS no Supabase para funcionalidades geoespaciais.

**Acceptance Criteria:**
- Verificar se PostGIS já está habilitado via query
- Se não estiver, executar `CREATE EXTENSION IF NOT EXISTS postgis;`
- Validar que extensão está ativa
- Validar que funções PostGIS estão disponíveis (ST_Distance, etc.)

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Query de verificação: `SELECT * FROM pg_extension WHERE extname = 'postgis';`
- Se não retornar nada, criar extensão

**Estimated Effort:** 15 minutos

---

#### Task 1.2: Criar Migration para Tabela store_profiles

**Description:** Criar migration SQL completa para tabela store_profiles com todos os campos, índices e funções.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_create_store_profiles.sql`
- Implementar tabela com todos os campos conforme design.md
- Criar índice espacial GIST para coluna location
- Criar índice para is_visible_in_showcase
- Criar índice para slug
- Criar índice composto para city/state
- Criar trigger para atualizar updated_at
- Criar função generate_store_slug
- Aplicar migration no Supabase
- Validar que tabela foi criada corretamente

**Implementation Notes:**
- Usar tipo GEOGRAPHY(Point, 4326) para location
- Validar estados brasileiros com CHECK constraint
- Validar formato de CEP com regex
- Slug deve ser único e gerado automaticamente

**Estimated Effort:** 45 minutos

---

### Phase 2: Backend - API e Serviços

#### Task 2.1: Criar Serverless Function store-profiles

**Description:** Criar Vercel Serverless Function para gerenciar perfis de lojas.

**Acceptance Criteria:**
- Criar arquivo `api/store-profiles.js`
- Implementar roteamento via query parameter `action`
- Implementar action `get-profile` (autenticado)
- Implementar action `update-profile` (autenticado)
- Implementar action `upload-image` (autenticado)
- Implementar action `delete-image` (autenticado)
- Implementar action `list-public` (público)
- Implementar action `search-nearby` (público)
- Configurar CORS para todas as actions
- Validar autenticação para actions privadas
- Validar tipo de afiliado (apenas Logistas)
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Seguir padrão de `api/affiliates.js`
- Usar Supabase Client para queries
- Usar Supabase Storage para imagens
- Validar inputs com Zod schemas

**Estimated Effort:** 2 horas

---

#### Task 2.2: Criar Serviço Frontend store-profiles.service.ts

**Description:** Criar serviço frontend para interagir com API de perfis de lojas.

**Acceptance Criteria:**
- Criar arquivo `src/services/store-profiles.service.ts`
- Implementar método `getProfile()`
- Implementar método `updateProfile(data)`
- Implementar método `uploadImage(file, type)`
- Implementar método `deleteImage(type)`
- Implementar método `listPublicStores(filters)`
- Implementar método `searchNearby(lat, lng, radius)`
- Implementar método `validateProfileComplete(profile)`
- Tratamento de erros adequado
- TypeScript types corretos

**Implementation Notes:**
- Usar fetch API ou axios
- Validar responses
- Transformar dados conforme necessário

**Estimated Effort:** 1 hora

---

#### Task 2.3: Criar Serviço de Geocodificação

**Description:** Criar serviço para geocodificação via API Brasil Aberto e cálculo de distâncias.

**Acceptance Criteria:**
- Criar arquivo `src/services/geocoding.service.ts`
- Implementar método `geocodeZipCode(zipCode)`
- Implementar método `getUserLocation()`
- Implementar método `calculateDistance(lat1, lng1, lat2, lng2)`
- Integração com API Brasil Aberto
- Retry automático (máximo 3 tentativas)
- Tratamento de erros adequado
- Cache de geocodificações bem-sucedidas

**Implementation Notes:**
- API Brasil Aberto: `https://api.brasilaberto.com/v2/zipcode/{zipcode}`
- Sem necessidade de token de autenticação
- Usar Geolocation API do navegador para localização do usuário
- Fórmula de Haversine para cálculo de distância

**Estimated Effort:** 1 hora

---

### Phase 3: Frontend - Painel Logista

#### Task 3.1: Criar Página PerfilLoja.tsx

**Description:** Criar página de configuração de perfil de loja no painel do Logista.

**Acceptance Criteria:**
- Criar arquivo `src/pages/afiliados/dashboard/PerfilLoja.tsx`
- Implementar formulário com todos os campos
- Validar campos obrigatórios
- Implementar upload de logo com preview
- Implementar upload de banner com preview
- Implementar validação de tamanho e formato de imagens
- Implementar compressão de imagens antes de upload
- Implementar progress bar durante upload
- Implementar switch "Aparecer na Vitrine"
- Implementar validação de perfil mínimo
- Desabilitar switch se perfil incompleto
- Exibir tooltip explicativo no switch
- Implementar geocodificação automática ao salvar
- Exibir feedback visual (toasts, loading states)
- Seguir design system (shadcn/ui)
- Responsivo (mobile, tablet, desktop)

**Implementation Notes:**
- Usar componentes shadcn/ui (Card, Input, Select, Switch, Button)
- Usar react-hook-form para gerenciar formulário
- Usar Zod para validação
- Comprimir imagens com biblioteca (ex: browser-image-compression)

**Estimated Effort:** 3 horas

---

#### Task 3.2: Adicionar Rota no Painel Logista

**Description:** Adicionar item no menu lateral e configurar rota para página de perfil de loja.

**Acceptance Criteria:**
- Adicionar item "Perfil da Loja" no menu lateral do layout
- Item deve aparecer apenas para Logistas
- Configurar rota `/afiliados/dashboard/perfil-loja` em `src/App.tsx`
- Usar ícone apropriado (Store ou Building)
- Testar navegação via menu
- Testar navegação via URL direta

**Implementation Notes:**
- Modificar `src/layouts/AffiliateDashboardLayout.tsx`
- Verificar `affiliate_type='logista'` antes de exibir item
- Seguir padrão de outros itens do menu

**Estimated Effort:** 30 minutos

---

### Phase 4: Frontend - Vitrine Pública

#### Task 4.1: Criar Componente StoreCard.tsx

**Description:** Criar componente de card para exibir loja na vitrine.

**Acceptance Criteria:**
- Criar arquivo `src/components/StoreCard.tsx`
- Implementar layout do card conforme design.md
- Banner como imagem de fundo
- Logo sobreposto no canto
- Nome da loja
- Cidade/Estado
- Distância (se disponível)
- Botão "Comprar Desta Loja"
- Hover effect (elevação e borda)
- Responsivo
- Seguir design system

**Implementation Notes:**
- Usar componentes shadcn/ui (Card, Button)
- Usar variáveis CSS para cores
- Usar transition-colors para hover

**Estimated Effort:** 1 hora

---

#### Task 4.2: Criar Página Lojas.tsx (Vitrine Pública)

**Description:** Criar página pública de vitrine de lojas parceiras.

**Acceptance Criteria:**
- Criar arquivo `src/pages/public/Lojas.tsx`
- Implementar solicitação de permissão de localização
- Implementar carregamento de lojas visíveis
- Implementar campo de busca por nome (debounce 300ms)
- Implementar select de filtro por cidade
- Implementar select de filtro por estado
- Implementar select de raio (25km, 50km, 100km, 200km, Todo Brasil)
- Implementar busca por raio (se localização disponível)
- Implementar cálculo e exibição de distância
- Implementar grid de cards responsivo (1/2/4-5 colunas)
- Implementar loading state
- Implementar empty state
- Implementar contador "X lojas encontradas"
- Implementar botão "Limpar Filtros"
- Implementar redirecionamento com ref ao clicar em card
- Seguir design system
- Responsivo

**Implementation Notes:**
- Usar componente StoreCard
- Usar debounce para busca (lodash.debounce ou custom hook)
- Popular selects de cidade/estado dinamicamente
- Ordenar por distância quando localização disponível
- Ordenar por estado/cidade quando localização não disponível

**Estimated Effort:** 3 horas

---

#### Task 4.3: Adicionar Rota Pública

**Description:** Adicionar item no menu principal do site e configurar rota para vitrine.

**Acceptance Criteria:**
- Adicionar item "Lojas Parceiras" no menu principal do site
- Configurar rota `/lojas` em `src/App.tsx`
- Rota deve ser pública (sem autenticação)
- Usar ícone apropriado (Store ou MapPin)
- Testar navegação via menu
- Testar navegação via URL direta

**Implementation Notes:**
- Modificar componente de menu principal (Header ou Navbar)
- Rota deve estar fora do layout autenticado

**Estimated Effort:** 30 minutos

---

### Phase 5: Testing & Validation

#### Task 5.1: Testes de Integração

**Description:** Criar testes de integração para funcionalidades principais.

**Acceptance Criteria:**
- Testar upload de imagens (logo e banner)
- Testar geocodificação via CEP
- Testar validação de perfil mínimo
- Testar busca por raio
- Testar redirecionamento com ref
- Testar controle de visibilidade
- Todos os testes passando
- Cobertura > 70%

**Implementation Notes:**
- Usar Vitest
- Mockar API Brasil Aberto
- Mockar Supabase Storage
- Mockar Geolocation API

**Estimated Effort:** 2 horas

---

#### Task 5.2: Testes End-to-End

**Description:** Criar testes E2E para fluxos completos.

**Acceptance Criteria:**
- Testar fluxo completo de configuração de perfil
- Testar fluxo completo de busca na vitrine
- Testar geolocalização em diferentes cenários
- Testar responsividade em diferentes dispositivos
- Todos os testes passando

**Implementation Notes:**
- Usar Playwright ou Cypress
- Testar em Chrome, Firefox e Safari
- Testar em mobile, tablet e desktop

**Estimated Effort:** 2 horas

---

## Task Summary

**Total Tasks:** 12  
**Total Estimated Effort:** ~17 horas

**By Phase:**
- Phase 1 (Database): 1 hora
- Phase 2 (Backend): 4 horas
- Phase 3 (Painel Logista): 3.5 horas
- Phase 4 (Vitrine Pública): 4.5 horas
- Phase 5 (Testing): 4 horas

**Critical Path:**
1. Task 1.1 → Task 1.2 (Database)
2. Task 2.1 → Task 2.2 → Task 2.3 (Backend)
3. Task 3.1 → Task 3.2 (Painel)
4. Task 4.1 → Task 4.2 → Task 4.3 (Vitrine)
5. Task 5.1 → Task 5.2 (Testing)

**Dependencies:**
- Tasks 2.x dependem de Tasks 1.x (banco deve existir)
- Tasks 3.x dependem de Tasks 2.x (API deve existir)
- Tasks 4.x dependem de Tasks 2.x (API deve existir)
- Tasks 5.x dependem de todas as anteriores

## Notes

- Todas as tasks devem seguir padrões do AGENTS.md
- Sempre consultar design-system.md antes de criar UI
- Sempre usar Supabase Power para análise de banco
- Sempre validar com getDiagnostics após modificações
- Nunca comentar código para fazer build passar
- Sempre corrigir problemas, não contorná-los

