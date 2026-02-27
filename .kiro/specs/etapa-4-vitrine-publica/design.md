# Design Document - ETAPA 4: Perfil da Loja e Vitrine Pública

## Overview

Este documento especifica o design técnico para implementação da ETAPA 4 do sistema de diferenciação de perfis de afiliados. A solução permite que Logistas configurem um perfil de loja completo e apareçam em uma vitrine pública de descoberta, com funcionalidades de busca por nome, cidade, estado e geolocalização por raio.

### Objetivos

1. Permitir que Logistas configurem perfil de loja no painel
2. Implementar upload e armazenamento de imagens (logo e banner)
3. Implementar geocodificação automática via API Brasil Aberto
4. Criar vitrine pública acessível sem login
5. Implementar busca por nome, cidade e estado
6. Implementar geolocalização com busca por raio
7. Implementar redirecionamento com rastreamento de origem
8. Implementar controle de visibilidade (switch)

### Escopo

**Incluído nesta ETAPA:**
- ✅ Seção "Perfil da Loja" no painel Logista
- ✅ Upload de logomarca e banner
- ✅ Geocodificação automática via CEP
- ✅ Vitrine pública com grid de cards
- ✅ Busca por nome, cidade, estado
- ✅ Geolocalização com raios ajustáveis
- ✅ Redirecionamento com ref
- ✅ Controle de visibilidade

**Não incluído (ETAPAs futuras):**
- ❌ Sistema de monetização (ETAPA 5)
- ❌ Controle de inadimplência (ETAPA 5)
- ❌ Sistema de avaliações
- ❌ Chat entre visitante e Logista


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
- Extensão: PostGIS (para geolocalização)
- Nova tabela: `store_profiles`
- Storage: Supabase Storage (bucket `store-images`)

**External APIs:**
- API Brasil Aberto: Geocodificação via CEP
- Geolocation API: Localização do visitante

### Architectural Decisions

**AD-1: PostGIS para Geolocalização**
- Decisão: Usar extensão PostGIS do Supabase
- Razão: Padrão da indústria, performance superior
- Impacto: Busca por raio eficiente e precisa

**AD-2: API Brasil Aberto para Geocodificação**
- Decisão: Usar API Brasil Aberto como primária
- Razão: Gratuita, sem necessidade de autenticação, retorna lat/lng direto
- Impacto: Geocodificação automática sem custo e sem complexidade de tokens

**AD-3: Supabase Storage para Imagens**
- Decisão: Usar Supabase Storage ao invés de serviço externo
- Razão: Integração nativa, URLs públicas, sem custo adicional
- Impacto: Simplifica arquitetura, reduz dependências

**AD-4: Slug Único por Loja**
- Decisão: Gerar slug único a partir do nome da loja
- Razão: URLs amigáveis, rastreamento de origem
- Impacto: Facilita analytics e comissionamento

**AD-5: Switch de Visibilidade**
- Decisão: Permitir Logista controlar visibilidade na vitrine
- Razão: Flexibilidade, controle pelo próprio Logista
- Impacto: Logista pode desativar temporariamente



## Components and Interfaces

### Database Schema

#### Tabela `store_profiles`

```sql
CREATE TABLE store_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL UNIQUE REFERENCES affiliates(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')),
  zip_code TEXT NOT NULL CHECK (zip_code ~ '^\d{5}-?\d{3}$'),
  phone TEXT,
  logo_url TEXT,
  banner_url TEXT NOT NULL,
  location GEOGRAPHY(Point, 4326),
  is_visible_in_showcase BOOLEAN NOT NULL DEFAULT false,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_store_profiles_affiliate ON store_profiles(affiliate_id);
CREATE INDEX idx_store_profiles_location ON store_profiles USING GIST (location);
CREATE INDEX idx_store_profiles_visible ON store_profiles (is_visible_in_showcase) WHERE is_visible_in_showcase = true;
CREATE INDEX idx_store_profiles_slug ON store_profiles(slug);
CREATE INDEX idx_store_profiles_city_state ON store_profiles(city, state);

-- Trigger para updated_at
CREATE TRIGGER update_store_profiles_updated_at
  BEFORE UPDATE ON store_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar slug único
CREATE OR REPLACE FUNCTION generate_store_slug(store_name TEXT, affiliate_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Gerar slug base (lowercase, sem acentos, hífens ao invés de espaços)
  base_slug := lower(unaccent(store_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Verificar unicidade e adicionar contador se necessário
  WHILE EXISTS (SELECT 1 FROM store_profiles WHERE slug = final_slug AND affiliate_id != $2) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
```

#### TypeScript Interface

```typescript
interface StoreProfile {
  id: string;
  affiliate_id: string;
  store_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string | null;
  logo_url: string | null;
  banner_url: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  } | null;
  is_visible_in_showcase: boolean;
  slug: string;
  created_at: string;
  updated_at: string;
}
```

### API Endpoints

#### Serverless Function: `api/store-profiles.js`

**Actions:**

1. **get-profile** - Obter perfil da loja do Logista autenticado
2. **update-profile** - Atualizar perfil da loja
3. **upload-image** - Upload de logo ou banner
4. **delete-image** - Deletar logo ou banner
5. **list-public** - Listar lojas visíveis na vitrine (público)
6. **search-nearby** - Buscar lojas por raio (público)

**Exemplo de Requisição:**

```javascript
// GET /api/store-profiles?action=get-profile
// Headers: Authorization: Bearer {token}

// POST /api/store-profiles?action=update-profile
// Headers: Authorization: Bearer {token}
// Body: { store_name, address, city, state, zip_code, phone, is_visible_in_showcase }

// GET /api/store-profiles?action=list-public&city=São Paulo&state=SP&search=loja
// Sem autenticação

// GET /api/store-profiles?action=search-nearby&lat=-23.5505&lng=-46.6333&radius=50
// Sem autenticação
```

### Frontend Components

#### 1. PerfilLoja.tsx (Painel Logista)

**Localização:** `src/pages/afiliados/dashboard/PerfilLoja.tsx`

**Estado:**

```typescript
interface PerfilLojaState {
  loading: boolean;
  saving: boolean;
  profile: StoreProfile | null;
  formData: {
    store_name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone: string;
    is_visible_in_showcase: boolean;
  };
  logoFile: File | null;
  bannerFile: File | null;
  logoPreview: string | null;
  bannerPreview: string | null;
  uploadProgress: {
    logo: number;
    banner: number;
  };
  isProfileComplete: boolean;
}
```

**Funcionalidades:**

- Carregar perfil existente
- Validar campos do formulário
- Upload de imagens com preview
- Geocodificação automática ao salvar
- Validação de perfil mínimo
- Controle de switch de visibilidade
- Feedback visual (toasts, loading states)

---

#### 2. Lojas.tsx (Vitrine Pública)

**Localização:** `src/pages/public/Lojas.tsx`

**Estado:**

```typescript
interface LojasState {
  loading: boolean;
  stores: StoreProfile[];
  filteredStores: StoreProfile[];
  searchTerm: string;
  selectedCity: string;
  selectedState: string;
  userLocation: {
    lat: number;
    lng: number;
  } | null;
  selectedRadius: number; // 25, 50, 100, 200, ou 0 (todo Brasil)
  locationPermission: 'granted' | 'denied' | 'prompt';
}
```

**Funcionalidades:**

- Solicitar permissão de localização
- Carregar lojas visíveis
- Busca por nome (debounce 300ms)
- Filtro por cidade e estado
- Busca por raio (se localização disponível)
- Calcular e exibir distância
- Grid responsivo de cards
- Redirecionamento com ref

---

#### 3. StoreCard.tsx (Componente)

**Localização:** `src/components/StoreCard.tsx`

**Props:**

```typescript
interface StoreCardProps {
  store: StoreProfile;
  distance?: number; // em km, opcional
  onClickBuy: (slug: string) => void;
}
```

**Layout:**

- Banner como imagem de fundo
- Logo sobreposto no canto
- Nome da loja
- Cidade/Estado
- Distância (se disponível)
- Botão "Comprar Desta Loja"
- Hover effect

### Services

#### 1. store-profiles.service.ts

```typescript
class StoreProfilesService {
  async getProfile(): Promise<StoreProfile | null>;
  async updateProfile(data: Partial<StoreProfile>): Promise<StoreProfile>;
  async uploadImage(file: File, type: 'logo' | 'banner'): Promise<string>;
  async deleteImage(type: 'logo' | 'banner'): Promise<void>;
  async listPublicStores(filters?: {
    city?: string;
    state?: string;
    search?: string;
  }): Promise<StoreProfile[]>;
  async searchNearby(lat: number, lng: number, radius: number): Promise<Array<StoreProfile & { distance: number }>>;
  validateProfileComplete(profile: Partial<StoreProfile>): boolean;
}
```

#### 2. geocoding.service.ts

```typescript
class GeocodingService {
  async geocodeZipCode(zipCode: string): Promise<{ lat: number; lng: number } | null>;
  async getUserLocation(): Promise<{ lat: number; lng: number } | null>;
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
}
```



## Correctness Properties

### Property 1: Profile Completeness Control

*For any* Logista, o switch "Aparecer na Vitrine" deve estar habilitado se e somente se o perfil mínimo estiver completo (nome, cidade, estado, banner).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

**Rationale:** Garante que apenas lojas com informações completas apareçam na vitrine.

### Property 2: Geocoding Accuracy

*For any* CEP válido informado, o sistema deve obter coordenadas geográficas via API Brasil Aberto e salvar no banco.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

**Rationale:** Garante que busca por raio funcione corretamente.

### Property 3: Visibility Control

*For any* loja com `is_visible_in_showcase=false`, a loja NÃO deve aparecer na vitrine pública.

**Validates: Requirements 9.2, 9.3**

**Rationale:** Garante que Logista tenha controle sobre visibilidade.

### Property 4: Distance Calculation

*For any* busca por raio, o sistema deve retornar apenas lojas dentro do raio especificado, ordenadas por proximidade.

**Validates: Requirements 7.3, 7.4, 7.5, 7.8**

**Rationale:** Garante que busca por raio seja precisa e útil.

### Property 5: Referral Tracking

*For any* click em "Comprar Desta Loja", o sistema deve redirecionar com parâmetro `?ref={slug}` correto.

**Validates: Requirements 8.1, 8.2, 8.3**

**Rationale:** Garante que origem da venda seja rastreada corretamente.


## Error Handling

### Upload Errors

#### 1. Arquivo Muito Grande

**Scenario:** Logista tenta fazer upload de imagem maior que o limite

**Handling:**
- Validar tamanho antes de upload
- Exibir toast: "Imagem muito grande. Máximo: 2MB para logo, 5MB para banner."
- Não permitir upload

#### 2. Formato Inválido

**Scenario:** Logista tenta fazer upload de arquivo não suportado

**Handling:**
- Validar formato antes de upload
- Exibir toast: "Formato inválido. Use: jpg, png ou webp."
- Não permitir upload

#### 3. Falha no Upload

**Scenario:** Upload para Supabase Storage falha

**Handling:**
- Retry automático (máximo 3 tentativas)
- Exibir toast: "Falha no upload. Tente novamente."
- Registrar erro em logs

### Geocoding Errors

#### 1. API Brasil Aberto Indisponível

**Scenario:** API Brasil Aberto não responde

**Handling:**
- Retry automático (máximo 3 tentativas com backoff)
- Permitir salvar perfil sem geocodificação
- Exibir aviso: "Não foi possível obter localização. Você pode atualizar depois."
- Registrar erro em logs

#### 2. CEP Inválido

**Scenario:** CEP informado não existe

**Handling:**
- Validar formato do CEP antes de chamar API
- Exibir erro: "CEP inválido. Verifique e tente novamente."
- Não permitir salvar

### Geolocation Errors

#### 1. Permissão Negada

**Scenario:** Visitante nega permissão de localização

**Handling:**
- Exibir todas as lojas ordenadas por estado/cidade
- Não exibir distâncias
- Não filtrar por raio
- Exibir mensagem: "Permita acesso à localização para ver lojas próximas."

#### 2. Localização Indisponível

**Scenario:** Navegador não suporta Geolocation API

**Handling:**
- Fallback para busca sem geolocalização
- Exibir todas as lojas ordenadas por estado/cidade
- Não exibir opção de raio


## Testing Strategy

### Property-Based Testing

**Library:** Vitest

**Property Tests to Implement:**

#### 1. Profile Completeness Property

```typescript
// Feature: etapa-4-vitrine-publica, Property 1: Profile Completeness Control
describe('Profile Completeness', () => {
  test('switch enabled only with complete profile', async () => {
    // Setup: Criar perfil completo
    const profile = {
      store_name: 'Loja Teste',
      city: 'São Paulo',
      state: 'SP',
      banner_url: 'https://example.com/banner.jpg'
    };
    
    // Act: Validar completude
    const isComplete = validateProfileComplete(profile);
    
    // Assert: Deve estar completo
    expect(isComplete).toBe(true);
  });
  
  test('switch disabled with incomplete profile', async () => {
    // Setup: Criar perfil incompleto (sem banner)
    const profile = {
      store_name: 'Loja Teste',
      city: 'São Paulo',
      state: 'SP',
      banner_url: null
    };
    
    // Act: Validar completude
    const isComplete = validateProfileComplete(profile);
    
    // Assert: Não deve estar completo
    expect(isComplete).toBe(false);
  });
});
```

#### 2. Distance Calculation Property

```typescript
// Feature: etapa-4-vitrine-publica, Property 4: Distance Calculation
describe('Distance Calculation', () => {
  test('returns stores within radius', async () => {
    // Setup: Criar lojas em diferentes distâncias
    const userLat = -23.5505;
    const userLng = -46.6333;
    
    const store1 = await createTestStore({
      location: { lat: -23.5505, lng: -46.6333 } // 0km
    });
    
    const store2 = await createTestStore({
      location: { lat: -23.6505, lng: -46.6333 } // ~11km
    });
    
    const store3 = await createTestStore({
      location: { lat: -24.5505, lng: -46.6333 } // ~111km
    });
    
    // Act: Buscar lojas num raio de 50km
    const stores = await searchNearby(userLat, userLng, 50);
    
    // Assert: Deve retornar apenas store1 e store2
    expect(stores).toHaveLength(2);
    expect(stores.map(s => s.id)).toContain(store1.id);
    expect(stores.map(s => s.id)).toContain(store2.id);
    expect(stores.map(s => s.id)).not.toContain(store3.id);
  });
  
  test('orders stores by proximity', async () => {
    // Setup: Criar lojas em diferentes distâncias
    const userLat = -23.5505;
    const userLng = -46.6333;
    
    const store1 = await createTestStore({
      location: { lat: -23.6505, lng: -46.6333 } // ~11km
    });
    
    const store2 = await createTestStore({
      location: { lat: -23.5505, lng: -46.6333 } // 0km
    });
    
    // Act: Buscar lojas
    const stores = await searchNearby(userLat, userLng, 50);
    
    // Assert: store2 deve vir primeiro (mais próxima)
    expect(stores[0].id).toBe(store2.id);
    expect(stores[1].id).toBe(store1.id);
  });
});
```

### Unit Testing

**Framework:** Vitest

**Unit Tests to Implement:**

#### 1. Geocoding Service Test

```typescript
describe('GeocodingService', () => {
  test('geocodes valid CEP', async () => {
    // Setup: Mock API Brasil Aberto
    mockApiBrasilAberto.mockResolvedValue({
      latitude: -23.5505,
      longitude: -46.6333
    });
    
    // Act: Geocodificar CEP
    const result = await geocodingService.geocodeZipCode('01310-100');
    
    // Assert: Deve retornar coordenadas
    expect(result).toEqual({
      lat: -23.5505,
      lng: -46.6333
    });
  });
  
  test('handles invalid CEP', async () => {
    // Setup: Mock API retornando erro
    mockApiBrasilAberto.mockRejectedValue(new Error('CEP não encontrado'));
    
    // Act: Tentar geocodificar CEP inválido
    const result = await geocodingService.geocodeZipCode('00000-000');
    
    // Assert: Deve retornar null
    expect(result).toBeNull();
  });
});
```

#### 2. Image Upload Test

```typescript
describe('Image Upload', () => {
  test('uploads image successfully', async () => {
    // Setup: Criar arquivo de teste
    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    
    // Act: Fazer upload
    const url = await storeProfilesService.uploadImage(file, 'logo');
    
    // Assert: Deve retornar URL pública
    expect(url).toMatch(/^https:\/\//);
    expect(url).toContain('store-images');
  });
  
  test('rejects oversized image', async () => {
    // Setup: Criar arquivo grande (3MB)
    const file = new File([new ArrayBuffer(3 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
    
    // Act & Assert: Deve lançar erro
    await expect(
      storeProfilesService.uploadImage(file, 'logo')
    ).rejects.toThrow('Imagem muito grande');
  });
});
```


## Implementation Plan

### Phase 1: Database - PostGIS e Tabela (Priority: CRITICAL)

**Tasks:**

1. **Habilitar PostGIS no Supabase**
   - Verificar se PostGIS já está habilitado
   - Se não, habilitar via SQL: `CREATE EXTENSION IF NOT EXISTS postgis;`
   - Validar que extensão está ativa

2. **Criar migration para tabela store_profiles**
   - Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_create_store_profiles.sql`
   - Implementar tabela com todos os campos
   - Criar índices (espacial, visibilidade, slug, etc.)
   - Criar trigger para updated_at
   - Criar função generate_store_slug
   - Aplicar migration no Supabase

**Deliverables:**
- ✅ PostGIS habilitado
- ✅ Tabela store_profiles criada
- ✅ Índices criados
- ✅ Função de slug funcionando

### Phase 2: Backend - API e Serviços (Priority: HIGH)

**Tasks:**

1. **Criar Serverless Function store-profiles**
   - Criar arquivo `api/store-profiles.js`
   - Implementar action get-profile
   - Implementar action update-profile
   - Implementar action upload-image
   - Implementar action delete-image
   - Implementar action list-public
   - Implementar action search-nearby
   - Configurar CORS

2. **Criar serviços frontend**
   - Criar `src/services/store-profiles.service.ts`
   - Criar `src/services/geocoding.service.ts`
   - Implementar métodos de API
   - Implementar geocodificação via CEP Aberto
   - Implementar cálculo de distância

**Deliverables:**
- ✅ API funcionando
- ✅ Serviços frontend criados
- ✅ Geocodificação funcionando

### Phase 3: Frontend - Painel Logista (Priority: HIGH)

**Tasks:**

1. **Criar página PerfilLoja.tsx**
   - Criar arquivo `src/pages/afiliados/dashboard/PerfilLoja.tsx`
   - Implementar formulário de perfil
   - Implementar upload de imagens com preview
   - Implementar validação de perfil mínimo
   - Implementar switch de visibilidade
   - Implementar feedback visual (toasts, loading)

2. **Adicionar rota no painel**
   - Adicionar item no menu lateral do layout
   - Configurar rota em `src/App.tsx`
   - Testar navegação

**Deliverables:**
- ✅ Página criada e funcionando
- ✅ Upload de imagens funcionando
- ✅ Validação de perfil funcionando
- ✅ Switch de visibilidade funcionando

### Phase 4: Frontend - Vitrine Pública (Priority: HIGH)

**Tasks:**

1. **Criar página Lojas.tsx**
   - Criar arquivo `src/pages/public/Lojas.tsx`
   - Implementar solicitação de localização
   - Implementar carregamento de lojas
   - Implementar busca por nome (debounce)
   - Implementar filtros por cidade/estado
   - Implementar busca por raio
   - Implementar grid de cards responsivo

2. **Criar componente StoreCard**
   - Criar arquivo `src/components/StoreCard.tsx`
   - Implementar layout do card
   - Implementar hover effect
   - Implementar redirecionamento com ref

3. **Adicionar rota pública**
   - Adicionar item no menu principal do site
   - Configurar rota em `src/App.tsx`
   - Testar navegação

**Deliverables:**
- ✅ Vitrine pública funcionando
- ✅ Busca e filtros funcionando
- ✅ Geolocalização funcionando
- ✅ Cards responsivos
- ✅ Redirecionamento com ref funcionando

### Phase 5: Testing & Validation (Priority: HIGH)

**Tasks:**

1. **Testes de Integração**
   - Testar upload de imagens
   - Testar geocodificação
   - Testar validação de perfil mínimo
   - Testar busca por raio
   - Testar redirecionamento

2. **Testes End-to-End**
   - Testar fluxo completo de configuração de perfil
   - Testar fluxo completo de busca na vitrine
   - Testar geolocalização em diferentes cenários

**Deliverables:**
- ✅ Testes de integração passando
- ✅ Testes E2E passando
- ✅ Cobertura de testes > 70%


## Security Considerations

### Access Control

- Seção "Perfil da Loja" acessível apenas para Logistas
- Validar `affiliate_type='logista'` antes de permitir edição
- Vitrine pública acessível sem autenticação (por design)

### Data Validation

- Validar formato de CEP antes de geocodificar
- Validar tamanho e formato de imagens antes de upload
- Validar que slug é único antes de salvar
- Sanitizar inputs de busca para evitar SQL injection

### Image Security

- Validar tipo MIME de imagens
- Limitar tamanho de upload
- Comprimir imagens antes de salvar
- Usar URLs públicas do Supabase Storage (seguras)

### Audit Logging

- Registrar uploads de imagens
- Registrar mudanças de visibilidade
- Registrar tentativas de geocodificação
- Não registrar dados sensíveis completos


## Deployment Strategy

### Deployment Order

1. **Backend First:** Deploy migration e API
2. **Frontend Second:** Deploy painel Logista
3. **Frontend Third:** Deploy vitrine pública
4. **Verification:** Testar fluxos completos

### Rollback Plan

- Reverter deploy do frontend se necessário
- Remover tabela store_profiles se causar problemas
- Backend é backward compatible (não quebra sistema existente)

