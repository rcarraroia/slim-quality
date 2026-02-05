# 🔴 SOLICITAÇÃO TÉCNICA COMPLETA - CORREÇÃO SISTEMA DE AFILIADOS

**Data:** 10/01/2026  
**Destinatário:** Kiro (Desenvolvedor)  
**Solicitante:** Claude (Analista) + Renato (Manager)  
**Prioridade:** CRÍTICA - Sistema quebrado em produção

---

## 📋 RESUMO EXECUTIVO

Duas auditorias independentes convergem para o MESMO problema raiz:

### AUDITORIA 1 - Claude (Arquitetural)
**Descoberta:** Duplicação estrutural - sistema mantém rede de afiliados em DOIS lugares:
- `affiliates.referred_by` (coluna legada)
- `affiliate_network` (tabela nova com path/ltree)

**Sintoma:** Backend e Frontend usam fontes diferentes = inconsistência total

### AUDITORIA 2 - Outra IA (Código/Runtime)
**Descoberta:** 8 bugs operacionais resultantes da duplicação:
1. ❌ Split N2/N3 nunca acontece (perda financeira)
2. ❌ Rastreamento de referral quebrado (formato JSON vs string)
3. ❌ "Minha Rede" mostra só N1 (ignora N2/N3)
4. ❌ Conflito de chaves storage
5. ❌ Lógica duplicada em 2 arquivos
6. ❌ Status de aprovação inconsistente

---

## 🎯 PROBLEMA RAIZ (Visão Holística)

```
HOJE:
                    ┌──────────────────┐
                    │   CAOS TOTAL     │
                    └──────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼─────┐    ┌────────▼────────┐   ┌─────▼──────┐
│  api/       │    │ affiliate.      │   │  Frontend  │
│  checkout   │    │ service.ts      │   │  dashboard │
│             │    │                 │   │            │
│ Lê:         │    │ Escreve:        │   │ Lê:        │
│ referred_by │    │ affiliate_      │   │ affiliate_ │
│             │    │ network         │   │ network    │
└─────────────┘    └─────────────────┘   └────────────┘
      │                     │                    │
      ▼                     ▼                    ▼
   FALHA                 SUCESSO              SUCESSO
 Split N2/N3           Cadastro OK           Rede N1 OK
  não rola!           mas não sincroniza!   mas não N2/N3!
```

**Consequência:** 3 partes do sistema trabalhando contra si mesmas.

---

## ✅ SOLUÇÃO ESTRUTURAL (Não Pontual)

### DECISÃO ARQUITETURAL

**MANTER:** `affiliates.referred_by` (simples, funcional para comissões)  
**ELIMINAR:** `affiliate_network` (complexo, não agrega valor real)

**Justificativa:**
- ✅ `referred_by` já calcula split corretamente
- ✅ Query recursiva simples resolve hierarquia N1→N2→N3
- ✅ Menos moving parts = menos bugs
- ✅ Path/ltree é overkill para 3 níveis apenas

---

## 🔧 INSTRUÇÕES COMPLETAS PARA KIRO

### FASE 1: LIMPEZA ESTRUTURAL (Banco de Dados)

**1.1. Criar Migration de Transição**
```sql
-- File: supabase/migrations/20260111000001_consolidate_affiliate_structure.sql

BEGIN;

-- 1. Garantir que referred_by está populado (sincronizar dados existentes)
UPDATE affiliates a
SET referred_by = (
  SELECT parent_id 
  FROM affiliate_network an 
  WHERE an.affiliate_id = a.id
)
WHERE referred_by IS NULL
  AND EXISTS (
    SELECT 1 FROM affiliate_network an2 
    WHERE an2.affiliate_id = a.id
  );

-- 2. Adicionar constraint para garantir integridade
ALTER TABLE affiliates
ADD CONSTRAINT fk_affiliates_referred_by
FOREIGN KEY (referred_by) 
REFERENCES affiliates(id)
ON DELETE SET NULL;

-- 3. Criar índice para performance de queries recursivas
CREATE INDEX IF NOT EXISTS idx_affiliates_referred_by 
ON affiliates(referred_by) 
WHERE referred_by IS NOT NULL;

-- 4. Criar view materializada para hierarquia (cache de performance)
CREATE MATERIALIZED VIEW affiliate_hierarchy AS
WITH RECURSIVE hierarchy AS (
  -- Base: raiz (sem pai)
  SELECT 
    id,
    id as root_id,
    ARRAY[id] as path,
    0 as level
  FROM affiliates
  WHERE referred_by IS NULL
  
  UNION ALL
  
  -- Recursivo: filhos
  SELECT 
    a.id,
    h.root_id,
    h.path || a.id,
    h.level + 1
  FROM affiliates a
  JOIN hierarchy h ON a.referred_by = h.id
  WHERE h.level < 3 -- Limite de 3 níveis
)
SELECT * FROM hierarchy;

CREATE INDEX idx_affiliate_hierarchy_id ON affiliate_hierarchy(id);
CREATE INDEX idx_affiliate_hierarchy_root ON affiliate_hierarchy(root_id);

-- 5. Criar função para refresh automático
CREATE OR REPLACE FUNCTION refresh_affiliate_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY affiliate_hierarchy;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para atualizar view quando affiliates mudar
CREATE TRIGGER trigger_refresh_affiliate_hierarchy
AFTER INSERT OR UPDATE OR DELETE ON affiliates
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_affiliate_hierarchy();

COMMIT;
```

**1.2. Migration de Remoção (após validação)**
```sql
-- File: supabase/migrations/20260111000002_remove_affiliate_network.sql

BEGIN;

-- 1. Remover tabela redundante
DROP TABLE IF EXISTS affiliate_network CASCADE;

-- 2. Documentar mudança
COMMENT ON COLUMN affiliates.referred_by IS 
'Referência ao afiliado pai. Fonte única de verdade para hierarquia e comissões.';

COMMIT;
```

---

### FASE 2: BACKEND - Unificação de Lógica

**2.1. Atualizar Service de Criação**

```typescript
// File: src/services/affiliates/affiliate.service.ts

export class AffiliateService {
  
  async createAffiliate(data: CreateAffiliateDTO) {
    const { email, name, phone, referralCode, walletId } = data;
    
    // 1. Validar código de referência (se fornecido)
    let referredBy: string | null = null;
    if (referralCode) {
      const parent = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('referral_code', referralCode)
        .single();
      
      if (!parent) {
        throw new Error('Código de referência inválido');
      }
      
      if (parent.status !== 'active') {
        throw new Error('Afiliado indicador não está ativo');
      }
      
      referredBy = parent.id;
    }
    
    // 2. Criar afiliado (ÚNICA INSERÇÃO)
    const { data: newAffiliate, error } = await supabase
      .from('affiliates')
      .insert({
        email,
        name,
        phone,
        wallet_id: walletId,
        referral_code: generateReferralCode(), // Gerar código único
        referred_by: referredBy, // ✅ PREENCHE AQUI
        status: 'pending', // Aguarda aprovação
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // 3. Atualizar hierarquia materializada (automático via trigger)
    
    return newAffiliate;
  }
  
  // ✅ NOVA: Buscar rede completa recursivamente
  async getNetwork(affiliateId: string) {
    // Usar view materializada (super rápido)
    const { data, error } = await supabase
      .from('affiliate_hierarchy')
      .select('*')
      .eq('root_id', affiliateId)
      .order('level', { ascending: true });
    
    if (error) throw error;
    
    // Transformar em estrutura hierárquica
    return buildTree(data, affiliateId);
  }
  
  // ✅ NOVA: Buscar pais (para split)
  async getAncestors(affiliateId: string, maxLevels: number = 3) {
    const ancestors: any[] = [];
    let currentId = affiliateId;
    
    for (let level = 0; level < maxLevels; level++) {
      const { data } = await supabase
        .from('affiliates')
        .select('id, referred_by, wallet_id, referral_code')
        .eq('id', currentId)
        .single();
      
      if (!data || !data.referred_by) break;
      
      ancestors.push({
        id: data.referred_by,
        level: level + 1,
        walletId: data.wallet_id
      });
      
      currentId = data.referred_by;
    }
    
    return ancestors;
  }
}
```

**2.2. Atualizar Cálculo de Split**

```javascript
// File: api/checkout.js

async function calculateSplit(orderId, affiliateCode) {
  // 1. Buscar afiliado N1
  const { data: n1 } = await supabase
    .from('affiliates')
    .select('id, wallet_id, referred_by')
    .eq('referral_code', affiliateCode)
    .eq('status', 'active')
    .single();
  
  if (!n1) {
    return null; // Sem afiliado = sem split
  }
  
  const splits = [];
  const orderTotal = await getOrderTotal(orderId);
  const splitTotal = orderTotal * 0.30; // 30% para distribuir
  
  // 2. N1 sempre recebe 15%
  splits.push({
    walletId: n1.wallet_id,
    percentual: 15,
    valor: orderTotal * 0.15,
    level: 1,
    affiliateId: n1.id
  });
  
  // 3. Buscar N2 (se existe)
  if (n1.referred_by) {
    const { data: n2 } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('id', n1.referred_by)
      .eq('status', 'active')
      .single();
    
    if (n2) {
      splits.push({
        walletId: n2.wallet_id,
        percentual: 3,
        valor: orderTotal * 0.03,
        level: 2,
        affiliateId: n2.id
      });
      
      // 4. Buscar N3 (se existe)
      if (n2.referred_by) {
        const { data: n3 } = await supabase
          .from('affiliates')
          .select('id, wallet_id')
          .eq('id', n2.referred_by)
          .eq('status', 'active')
          .single();
        
        if (n3) {
          splits.push({
            walletId: n3.wallet_id,
            percentual: 2,
            valor: orderTotal * 0.02,
            level: 3,
            affiliateId: n3.id
          });
        }
      }
    }
  }
  
  // 5. Calcular redistribuição para gestores
  const usedPercentage = splits.reduce((sum, s) => sum + s.percentual, 0);
  const redistribution = 30 - usedPercentage; // O que sobrou
  
  // Gestores sempre recebem no mínimo 5% cada
  const renumShare = 5 + (redistribution / 2);
  const jbShare = 5 + (redistribution / 2);
  
  splits.push(
    {
      walletId: process.env.WALLET_RENUM,
      percentual: renumShare,
      valor: orderTotal * (renumShare / 100),
      level: 0,
      affiliateId: null,
      isManager: true
    },
    {
      walletId: process.env.WALLET_JB,
      percentual: jbShare,
      valor: orderTotal * (jbShare / 100),
      level: 0,
      affiliateId: null,
      isManager: true
    }
  );
  
  // 6. Validar que soma = 30%
  const totalSplit = splits.reduce((sum, s) => sum + s.percentual, 0);
  if (Math.abs(totalSplit - 30) > 0.01) {
    throw new Error(`Split inválido: ${totalSplit}% (esperado 30%)`);
  }
  
  return splits;
}
```

---

### FASE 3: FRONTEND - Unificação de Rastreamento e Visualização

**3.1. Corrigir Rastreamento de Referral**

```typescript
// File: src/services/frontend/affiliate.service.ts

import { STORAGE_KEYS } from '@/constants/storage-keys';

interface ReferralData {
  code: string;
  timestamp: number;
  expiry: number;
}

export class AffiliateFrontendService {
  
  private static EXPIRY_DAYS = 30;
  
  // ✅ Salvar no formato correto (JSON)
  static trackReferralClick(code: string): void {
    const now = Date.now();
    const data: ReferralData = {
      code,
      timestamp: now,
      expiry: now + (this.EXPIRY_DAYS * 24 * 60 * 60 * 1000)
    };
    
    const jsonStr = JSON.stringify(data);
    
    // Salvar em localStorage E cookie
    localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, jsonStr);
    
    // Cookie para persistência cross-domain
    document.cookie = `${STORAGE_KEYS.REFERRAL_CODE}=${jsonStr}; path=/; max-age=${this.EXPIRY_DAYS * 86400}; SameSite=Lax`;
  }
  
  // ✅ Ler do formato correto
  static getReferralCode(): string | null {
    try {
      // Tentar localStorage primeiro
      const stored = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      
      if (!stored) {
        // Fallback para cookie
        return this.getReferralFromCookie();
      }
      
      const data: ReferralData = JSON.parse(stored);
      
      // Validar expiração
      if (Date.now() > data.expiry) {
        this.clearReferralCode();
        return null;
      }
      
      return data.code;
      
    } catch (error) {
      console.error('Erro ao ler código de referência:', error);
      this.clearReferralCode();
      return null;
    }
  }
  
  private static getReferralFromCookie(): string | null {
    const cookies = document.cookie.split(';');
    const referralCookie = cookies.find(c => 
      c.trim().startsWith(`${STORAGE_KEYS.REFERRAL_CODE}=`)
    );
    
    if (!referralCookie) return null;
    
    try {
      const value = referralCookie.split('=')[1];
      const data: ReferralData = JSON.parse(decodeURIComponent(value));
      
      if (Date.now() > data.expiry) {
        return null;
      }
      
      return data.code;
    } catch {
      return null;
    }
  }
  
  static clearReferralCode(): void {
    localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
    document.cookie = `${STORAGE_KEYS.REFERRAL_CODE}=; path=/; max-age=0`;
  }
  
  // ✅ Buscar rede completa
  static async getNetwork(affiliateId: string) {
    const { data, error } = await supabase
      .from('affiliate_hierarchy')
      .select(`
        id,
        level,
        path,
        affiliates:id (
          name,
          email,
          referral_code,
          status,
          created_at
        )
      `)
      .eq('root_id', affiliateId)
      .order('level');
    
    if (error) throw error;
    
    return this.buildHierarchyTree(data);
  }
  
  private static buildHierarchyTree(flatData: any[]) {
    // Transformar array plano em árvore hierárquica
    const map = new Map();
    const roots: any[] = [];
    
    flatData.forEach(item => {
      map.set(item.id, { ...item, children: [] });
    });
    
    flatData.forEach(item => {
      const node = map.get(item.id);
      
      if (item.level === 0) {
        roots.push(node);
      } else {
        // Encontrar pai no path
        const parentId = item.path[item.path.length - 2];
        const parent = map.get(parentId);
        if (parent) {
          parent.children.push(node);
        }
      }
    });
    
    return roots;
  }
}
```

**3.2. Atualizar Componente "Minha Rede"**

```typescript
// File: src/pages/afiliados/dashboard/MinhaRede.tsx

export function MinhaRede() {
  const { affiliateId } = useAuth();
  const { data: network, isLoading } = useQuery(
    ['affiliate-network', affiliateId],
    () => AffiliateFrontendService.getNetwork(affiliateId)
  );
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <h2>Minha Rede de Indicados</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatsCard
          title="Nível 1"
          value={countByLevel(network, 1)}
          subtitle="Indicados diretos"
        />
        <StatsCard
          title="Nível 2"
          value={countByLevel(network, 2)}
          subtitle="Indicados dos seus indicados"
        />
        <StatsCard
          title="Nível 3"
          value={countByLevel(network, 3)}
          subtitle="Terceiro nível"
        />
      </div>
      
      {/* Árvore Hierárquica */}
      <AffiliateTree data={network} />
    </div>
  );
}

// Componente recursivo para árvore
function AffiliateTree({ data }: { data: any[] }) {
  return (
    <ul className="space-y-2">
      {data.map(node => (
        <li key={node.id}>
          <div className="flex items-center gap-3 p-3 bg-white rounded border">
            <Avatar name={node.affiliates.name} />
            <div>
              <p className="font-medium">{node.affiliates.name}</p>
              <p className="text-sm text-gray-500">{node.affiliates.email}</p>
              <Badge status={node.affiliates.status} />
            </div>
          </div>
          
          {/* Recursão para filhos */}
          {node.children?.length > 0 && (
            <div className="ml-8 mt-2">
              <AffiliateTree data={node.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
```

---

### FASE 4: LIMPEZA DE CÓDIGO

**4.1. Remover Arquivos Redundantes**

```bash
# Deletar arquivo duplicado
rm src/utils/referral-tracker.ts

# Manter apenas middleware/referral-tracker.ts (atualizado na Fase 3)
```

**4.2. Atualizar Imports**

```typescript
// Buscar e substituir em TODOS os arquivos:

// ANTES (errado):
import { getReferralCode } from '@/utils/referral-tracker';

// DEPOIS (correto):
import { AffiliateFrontendService } from '@/services/frontend/affiliate.service';
const code = AffiliateFrontendService.getReferralCode();
```

---

### FASE 5: VALIDAÇÃO COMPLETA

**5.1. Testes de Integração**

```typescript
// File: tests/integration/affiliates.test.ts

describe('Sistema de Afiliados - Integração Completa', () => {
  
  it('Deve rastrear referral corretamente', async () => {
    // 1. Simular acesso com ?ref=BEAT58
    AffiliateFrontendService.trackReferralClick('BEAT58');
    
    // 2. Verificar localStorage
    const stored = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
    expect(stored).toBeTruthy();
    
    const data = JSON.parse(stored!);
    expect(data.code).toBe('BEAT58');
    expect(data.expiry).toBeGreaterThan(Date.now());
    
    // 3. Recuperar código
    const code = AffiliateFrontendService.getReferralCode();
    expect(code).toBe('BEAT58');
  });
  
  it('Deve criar afiliado com hierarquia correta', async () => {
    // 1. Criar pai
    const parent = await AffiliateService.createAffiliate({
      name: 'Giuseppe',
      email: 'giuseppe@test.com',
      phone: '11999999999',
      walletId: 'wal_parent',
      referralCode: null // Raiz
    });
    
    // 2. Criar filho usando código do pai
    const child = await AffiliateService.createAffiliate({
      name: 'Bia',
      email: 'bia@test.com',
      phone: '11988888888',
      walletId: 'wal_child',
      referralCode: parent.referral_code
    });
    
    // 3. Validar hierarquia
    expect(child.referred_by).toBe(parent.id);
    
    // 4. Buscar rede do pai
    const network = await AffiliateService.getNetwork(parent.id);
    expect(network).toHaveLength(1);
    expect(network[0].id).toBe(child.id);
  });
  
  it('Deve calcular split multinível corretamente', async () => {
    // Setup: N1 → N2 → N3
    const n3 = await createAffiliate({ name: 'N3', referralCode: null });
    const n2 = await createAffiliate({ name: 'N2', referralCode: n3.referral_code });
    const n1 = await createAffiliate({ name: 'N1', referralCode: n2.referral_code });
    
    // Simular venda de R$ 3.290
    const splits = await calculateSplit('order_123', n1.referral_code);
    
    // Validar splits
    expect(splits).toHaveLength(5); // N1, N2, N3, Renum, JB
    
    const n1Split = splits.find(s => s.level === 1);
    expect(n1Split.percentual).toBe(15);
    expect(n1Split.valor).toBe(493.50);
    
    const n2Split = splits.find(s => s.level === 2);
    expect(n2Split.percentual).toBe(3);
    expect(n2Split.valor).toBe(98.70);
    
    const n3Split = splits.find(s => s.level === 3);
    expect(n3Split.percentual).toBe(2);
    expect(n3Split.valor).toBe(65.80);
    
    // Gestores recebem 5% cada (sem redistribuição)
    const gestores = splits.filter(s => s.isManager);
    expect(gestores).toHaveLength(2);
    gestores.forEach(g => {
      expect(g.percentual).toBe(5);
      expect(g.valor).toBe(164.50);
    });
    
    // Total = 30%
    const total = splits.reduce((sum, s) => sum + s.percentual, 0);
    expect(total).toBe(30);
  });
  
  it('Deve exibir rede completa no dashboard', async () => {
    // Setup hierarquia
    const root = await createAffiliate({ name: 'Root' });
    const child1 = await createAffiliate({ name: 'Child1', parent: root });
    const child2 = await createAffiliate({ name: 'Child2', parent: root });
    const grandchild = await createAffiliate({ name: 'Grandchild', parent: child1 });
    
    // Buscar rede
    const network = await AffiliateFrontendService.getNetwork(root.id);
    
    // Validar estrutura
    expect(network).toHaveLength(1); // 1 root
    expect(network[0].children).toHaveLength(2); // 2 filhos
    expect(network[0].children[0].children).toHaveLength(1); // 1 neto
  });
});
```

**5.2. Checklist Manual**

```markdown
## ✅ CHECKLIST DE VALIDAÇÃO PÓS-CORREÇÃO

### Rastreamento
- [ ] Acessar site com ?ref=BEAT58
- [ ] Verificar localStorage tem JSON válido
- [ ] Verificar cookie criado com mesmo valor
- [ ] Navegar entre páginas, código persiste
- [ ] Aguardar 31 dias, código expira

### Cadastro
- [ ] Criar usuário com link de indicação
- [ ] Verificar `affiliates.referred_by` preenchido
- [ ] Verificar `affiliate_hierarchy` tem entrada
- [ ] Verificar path correto (ex: {root_id}.{child_id})

### Visualização
- [ ] Login como afiliado com rede N1→N2→N3
- [ ] "Minha Rede" mostra TODOS os níveis
- [ ] Cards mostram contagens corretas
- [ ] Árvore expande/colapsa corretamente

### Comissões
- [ ] Venda via afiliado sem rede (só N1)
- [ ] Verificar split: N1=15%, Gestores=7.5% cada
- [ ] Venda via afiliado com N2
- [ ] Verificar split: N1=15%, N2=3%, Gestores=6% cada
- [ ] Venda via afiliado com N2+N3
- [ ] Verificar split: N1=15%, N2=3%, N3=2%, Gestores=5% cada
- [ ] Verificar registros em `commissions` corretos
```

---

## 📊 IMPACTO DA MUDANÇA

### ANTES (Sistema Atual - Quebrado)
```
❌ 2 fontes de verdade (referred_by vs affiliate_network)
❌ Backend lê A, Frontend escreve B
❌ Split N2/N3 nunca funciona
❌ Dashboard mostra só N1
❌ Rastreamento com formato errado
❌ 3 arquivos duplicados
```

### DEPOIS (Sistema Corrigido)
```
✅ 1 fonte de verdade (referred_by + hierarchy view)
✅ Backend e Frontend sincronizados
✅ Split N1/N2/N3 funciona perfeitamente
✅ Dashboard mostra rede completa
✅ Rastreamento padronizado (JSON)
✅ Código limpo, sem duplicação
```

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Descrição | Tempo |
|------|-----------|-------|
| 1 | Migrations banco | 2h |
| 2 | Backend (service + split) | 4h |
| 3 | Frontend (tracking + rede) | 4h |
| 4 | Limpeza código | 1h |
| 5 | Testes + validação | 3h |
| **TOTAL** | | **14h (2 dias)** |

---

## 🚨 ATENÇÕES ESPECIAIS

1. **CRÍTICO:** Fazer backup completo do banco ANTES da Fase 1
2. **CRÍTICO:** Testar migration em ambiente staging primeiro
3. **CRÍTICO:** Validar que todos afiliados existentes foram migrados
4. **IMPORTANTE:** Documentar mudança para equipe
5. **IMPORTANTE:** Atualizar doc de API se houver

---

## ✅ CRITÉRIOS DE SUCESSO

Correção considerada completa quando:

1. ✅ Todos testes de integração passam
2. ✅ Checklist manual 100% validado
3. ✅ Zero erros no console (frontend)
4. ✅ Zero erros nos logs (backend)
5. ✅ Performance não degradou (< 200ms por query)
6. ✅ Renato aprovou em ambiente de homologação

---

## 📞 SUPORTE

**Dúvidas durante implementação:**
- Claude (Analista): Disponível via chat
- Renato (Manager): Aprovação de decisões arquiteturais

**Reportar:**
- Bloqueios técnicos imediatamente
- Descobertas de novos bugs
- Necessidade de alterações no plano

---

**KIRO: Este documento é sua BÍBLIA para as próximas 48h. Siga à risca, teste cada fase, e reporte progresso a cada etapa concluída. Boa sorte! 🚀**