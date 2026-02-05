# Design Document

## Overview

Este documento descreve o design técnico para correção do sistema de afiliados. A solução consolida a hierarquia de afiliados em uma única estrutura (`affiliates.referred_by`), elimina duplicação de dados, e implementa view materializada para performance.

## Architecture

### Decisão Arquitetural Principal

**MANTER:** `affiliates.referred_by` (coluna simples, funcional)  
**ELIMINAR:** `affiliate_network` (tabela complexa, redundante)  
**ADICIONAR:** `affiliate_hierarchy` (view materializada para cache)

**Justificativa:**
- Simplicidade: Query recursiva simples resolve 3 níveis
- Performance: View materializada cacheia resultados
- Manutenibilidade: Menos estruturas = menos bugs
- Adequação: ltree/path é overkill para apenas 3 níveis

### Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    BANCO DE DADOS                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  affiliates (TABELA PRINCIPAL)                          │
│  ├── id (UUID)                                          │
│  ├── name                                               │
│  ├── email                                              │
│  ├── referred_by (FK → affiliates.id) ⭐ FONTE ÚNICA   │
│  └── ...                                                │
│                                                          │
│  affiliate_hierarchy (VIEW MATERIALIZADA)               │
│  ├── id                                                 │
│  ├── root_id                                            │
│  ├── path (array)                                       │
│  ├── level (0,1,2,3)                                    │
│  └── ... (dados desnormalizados)                        │
│                                                          │
│  TRIGGERS:                                              │
│  └── refresh_affiliate_hierarchy() → Atualiza view     │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
        ┌─────────────────┴─────────────────┐
        │                                    │
┌───────▼────────┐                  ┌────────▼────────┐
│    BACKEND     │                  │    FRONTEND     │
├────────────────┤                  ├─────────────────┤
│ affiliate.     │                  │ affiliate.      │
│ service.ts     │                  │ service.ts      │
│                │                  │                 │
│ - create()     │                  │ - track()       │
│ - getNetwork() │                  │ - getCode()     │
│ - getAncestors│                  │ - getNetwork()  │
│                │                  │                 │
│ checkout.js    │                  │ MinhaRede.tsx   │
│ - calcSplit()  │                  │ - Dashboard     │
└────────────────┘                  └─────────────────┘
```

## Components and Interfaces

### 1. Database Schema

#### Tabela: affiliates
```sql
CREATE TABLE affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  wallet_id VARCHAR(50) NOT NULL,
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  referred_by UUID REFERENCES affiliates(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_affiliates_referred_by ON affiliates(referred_by);
CREATE INDEX idx_affiliates_status ON affiliates(status);
```

#### View Materializada: affiliate_hierarchy
```sql
CREATE MATERIALIZED VIEW affiliate_hierarchy AS
WITH RECURSIVE hierarchy AS (
  SELECT 
    id, id as root_id, ARRAY[id] as path, 0 as level,
    name, email, referral_code, status, created_at
  FROM affiliates
  WHERE referred_by IS NULL
  
  UNION ALL
  
  SELECT 
    a.id, h.root_id, h.path || a.id, h.level + 1,
    a.name, a.email, a.referral_code, a.status, a.created_at
  FROM affiliates a
  JOIN hierarchy h ON a.referred_by = h.id
  WHERE h.level < 3
)
SELECT * FROM hierarchy;
```

### 2. Backend Service

#### Interface: AffiliateService
```typescript
interface CreateAffiliateDTO {
  email: string;
  name: string;
  phone: string;
  walletId: string;
  referralCode?: string;
}

interface AffiliateAncestor {
  id: string;
  level: number; // 1=N1, 2=N2, 3=N3
  walletId: string;
  referralCode: string;
}

class AffiliateService {
  async createAffiliate(data: CreateAffiliateDTO): Promise<Affiliate>
  async getNetwork(affiliateId: string): Promise<AffiliateHierarchy[]>
  async getAncestors(affiliateId: string, maxLevels: number): Promise<AffiliateAncestor[]>
  async getByReferralCode(code: string): Promise<Affiliate | null>
  async approveAffiliate(affiliateId: string): Promise<void>
}
```

#### Interface: Split Calculator
```javascript
interface Split {
  walletId: string;
  percentual: number;
  valor: number;
  level: number; // 0=gestor, 1=N1, 2=N2, 3=N3
  affiliateId: string | null;
  affiliateName: string;
  isManager: boolean;
}

async function calculateSplit(orderId: string, affiliateCode: string): Promise<Split[]>
```

### 3. Frontend Service

#### Interface: AffiliateFrontendService
```typescript
interface ReferralData {
  code: string;
  timestamp: number;
  expiry: number;
}

class AffiliateFrontendService {
  static trackReferralClick(code: string): void
  static getReferralCode(): string | null
  static clearReferralCode(): void
  static async getNetwork(affiliateId: string): Promise<AffiliateHierarchy[]>
}
```

## Data Models

### Affiliate
```typescript
interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string;
  wallet_id: string;
  referral_code: string;
  referred_by: string | null; // ⭐ FONTE ÚNICA
  status: 'pending' | 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}
```

### AffiliateHierarchy
```typescript
interface AffiliateHierarchy {
  id: string;
  root_id: string;
  path: string[]; // Array de IDs do caminho
  level: number; // 0=raiz, 1=N1, 2=N2, 3=N3
  name: string;
  email: string;
  referral_code: string;
  status: string;
  created_at: string;
  children?: AffiliateHierarchy[]; // Construído no frontend
}
```

### Commission
```typescript
interface Commission {
  id: string;
  order_id: string;
  affiliate_id: string | null;
  wallet_id: string;
  level: number;
  percentage: number;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  created_at: string;
}
```

## Correctness Properties

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas do sistema - essencialmente, uma declaração formal sobre o que o sistema deve fazer.*

### Property 1: Hierarquia Única
*Para qualquer* afiliado, deve existir no máximo um caminho da raiz até ele na hierarquia.

**Validates: Requirements 1.1, 6.1**

### Property 2: Split Total Correto
*Para qualquer* venda com afiliado, a soma de todos os percentuais de split deve ser exatamente 30%.

**Validates: Requirements 2.6**

### Property 3: Redistribuição Correta
*Para qualquer* venda onde níveis N2 ou N3 não existem, os percentuais não utilizados devem ser redistribuídos igualmente entre os dois gestores.

**Validates: Requirements 2.5**

### Property 4: Rastreamento Round-Trip
*Para qualquer* código de referência válido, salvar e depois recuperar deve retornar o mesmo código (se não expirado).

**Validates: Requirements 3.1, 3.2, 3.5**

### Property 5: Hierarquia Sem Loops
*Para qualquer* afiliado, seguir a cadeia de `referred_by` nunca deve retornar ao afiliado inicial.

**Validates: Requirements 6.1**

### Property 6: View Materializada Sincronizada
*Para qualquer* operação de INSERT/UPDATE/DELETE em `affiliates`, a view `affiliate_hierarchy` deve refletir as mudanças após o trigger.

**Validates: Requirements 1.4**

### Property 7: Ancestrais Corretos
*Para qualquer* afiliado N1, buscar ancestrais deve retornar no máximo 2 níveis (N2 e N3) na ordem correta.

**Validates: Requirements 2.2, 2.3**

### Property 8: Código Expirado Retorna Null
*Para qualquer* código de referência salvo há mais de 30 dias, recuperar deve retornar null.

**Validates: Requirements 3.4, 3.6**

### Property 9: Performance de Query
*Para qualquer* query de rede usando `affiliate_hierarchy`, o tempo de resposta deve ser menor que 200ms.

**Validates: Requirements 7.1, 7.2**

### Property 10: Integridade Referencial
*Para qualquer* afiliado com `referred_by` não-null, deve existir um afiliado correspondente com aquele ID.

**Validates: Requirements 6.2**

## Error Handling

### Database Errors
- **Loop Detection**: Migration valida e rejeita se detectar loops
- **Orphan Records**: Migration identifica e reporta afiliados órfãos
- **Constraint Violations**: Foreign key constraints previnem referências inválidas

### Backend Errors
- **Invalid Referral Code**: Retorna erro 400 com mensagem descritiva
- **Inactive Referrer**: Retorna erro 400 indicando que indicador não está ativo
- **Split Validation Failed**: Lança exceção se soma != 30%
- **Database Connection**: Retry automático com exponential backoff

### Frontend Errors
- **Expired Code**: Retorna null e limpa storage
- **Invalid JSON**: Catch exception, limpa storage, retorna null
- **Network Error**: Mostra mensagem amigável, permite retry

## Testing Strategy

### Unit Tests
- `AffiliateService.createAffiliate()` - Criação com e sem indicador
- `AffiliateService.getAncestors()` - Busca de N1→N2→N3
- `calculateSplit()` - Cálculo com diferentes cenários de rede
- `AffiliateFrontendService.trackReferralClick()` - Salvamento JSON
- `AffiliateFrontendService.getReferralCode()` - Recuperação e validação

### Integration Tests
- Fluxo completo: rastreamento → cadastro → venda → split
- Hierarquia N1→N2→N3 criada e consultada
- Redistribuição de comissões quando níveis faltam
- View materializada atualizada após mudanças
- Performance de queries < 200ms

### Property-Based Tests
- **Property 1**: Gerar hierarquias aleatórias, validar unicidade de caminho
- **Property 2**: Gerar vendas com redes aleatórias, validar soma = 30%
- **Property 3**: Gerar vendas com níveis faltando, validar redistribuição
- **Property 4**: Gerar códigos aleatórios, validar round-trip
- **Property 5**: Gerar hierarquias, validar ausência de loops
- **Property 8**: Gerar timestamps aleatórios, validar expiração

**Configuração:** Mínimo 100 iterações por teste de propriedade

### Manual Tests
- Acessar site com `?ref=CODE`
- Criar afiliado com código de indicação
- Fazer venda via afiliado
- Verificar split no Asaas
- Visualizar rede no dashboard
- Validar contadores N1/N2/N3

## Performance Considerations

### Database Optimizations
- Índice em `affiliates.referred_by` para queries recursivas
- Índice composto em `(status, referred_by)` para filtros comuns
- View materializada para evitar queries recursivas em tempo real
- Refresh concorrente para não bloquear leituras
- Índices GIN em `path` para buscas de caminho

### Backend Optimizations
- Cache de afiliados ativos em memória (TTL: 5 minutos)
- Batch insert de comissões
- Connection pooling no Supabase client

### Frontend Optimizations
- localStorage para cache de código de referência
- Lazy loading da árvore hierárquica
- Virtualização para listas grandes
- Debounce em buscas

## Migration Strategy

### Phase 1: Preparation
1. Backup completo do banco
2. Validar contagem de registros
3. Testar em ambiente staging

### Phase 2: Consolidation
1. Sincronizar `affiliate_network` → `referred_by`
2. Criar constraints e índices
3. Criar view materializada
4. Criar triggers de atualização
5. Validar integridade

### Phase 3: Validation
1. Executar queries de validação
2. Testar performance
3. Verificar triggers funcionando
4. Comparar contagens

### Phase 4: Cleanup
1. Criar backup de `affiliate_network`
2. Remover tabela redundante
3. Remover código relacionado
4. Atualizar documentação

### Rollback Plan
```sql
-- Reverter Phase 4
CREATE TABLE affiliate_network AS SELECT * FROM affiliate_network_backup;

-- Reverter Phase 2
DROP TRIGGER trigger_refresh_hierarchy_* ON affiliates;
DROP FUNCTION refresh_affiliate_hierarchy();
DROP MATERIALIZED VIEW affiliate_hierarchy;
DROP INDEX idx_affiliates_referred_by;
ALTER TABLE affiliates DROP CONSTRAINT fk_affiliates_referred_by;
```

## Security Considerations

### Data Integrity
- Foreign key constraints previnem referências inválidas
- Triggers garantem sincronização automática
- Validação de loops antes de aplicar mudanças

### Access Control
- RLS policies em `affiliates` (afiliado vê apenas próprios dados)
- RLS policies em `affiliate_hierarchy` (filtrar por root_id)
- Service role key apenas no backend

### Input Validation
- Validar formato de email, phone, wallet_id
- Sanitizar código de referência
- Validar que indicador está ativo antes de criar filho

## Deployment Plan

### Pre-Deployment
- [ ] Backup completo do banco
- [ ] Testes em staging passando
- [ ] Aprovação do cliente
- [ ] Documentação atualizada

### Deployment Steps
1. Aplicar migration 1 (consolidação)
2. Validar dados migrados
3. Atualizar backend
4. Atualizar frontend
5. Aplicar migration 2 (remoção)
6. Validar sistema completo

### Post-Deployment
- [ ] Monitorar logs por 24h
- [ ] Validar performance
- [ ] Verificar comissões sendo calculadas
- [ ] Coletar feedback de afiliados

### Rollback Triggers
- Erro crítico em produção
- Performance degradada > 50%
- Perda de dados detectada
- Comissões incorretas

## Monitoring and Observability

### Metrics to Track
- Tempo de resposta de queries de hierarquia
- Taxa de erro em cálculo de split
- Tempo de refresh da view materializada
- Taxa de sucesso de rastreamento de referral

### Alerts
- Query > 500ms
- Split com soma != 30%
- View materializada não atualizada > 5min
- Erro em criação de afiliado

### Logs
- Todas as operações de split (com valores)
- Criação de afiliados (com hierarquia)
- Erros de validação
- Performance de queries lentas
