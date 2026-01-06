# 🔍 ANÁLISE COMPLETA - CAMPOS DO CADASTRO DE AFILIADOS

**Data:** 05/01/2026  
**Status:** ⚠️ ANÁLISE PREVENTIVA - AGUARDANDO APROVAÇÃO PARA CORREÇÕES

---

## 📋 RESUMO EXECUTIVO

Identificados **3 problemas principais**:
1. **Dados mockados no layout** (nome e graduação hardcoded)
2. **Campos não salvos no cadastro** (cidade e estado coletados mas não enviados)
3. **Inconsistência entre formulários** (cadastro não tem CEP, configurações tem)

---

## 🗄️ ESTRUTURA DO BANCO DE DADOS

### Tabela `affiliates` - Colunas Existentes

```sql
-- Campos de identificação
id                      UUID PRIMARY KEY
user_id                 UUID (FK para auth.users)

-- Dados pessoais
name                    TEXT NOT NULL
email                   TEXT NOT NULL
phone                   TEXT
document                TEXT (CPF/CNPJ sem formatação)

-- Dados de afiliado
referral_code           TEXT NOT NULL (código único)
wallet_id               TEXT (Wallet ID do Asaas)
wallet_validated_at     TIMESTAMPTZ
wallet_configured_at    TIMESTAMPTZ

-- Status e controle
status                  affiliate_status (pending, active, inactive, suspended, rejected)
approved_by             UUID
approved_at             TIMESTAMPTZ
rejection_reason        TEXT
onboarding_completed    BOOLEAN DEFAULT false

-- Métricas
total_clicks            INTEGER DEFAULT 0
total_conversions       INTEGER DEFAULT 0
total_commissions_cents INTEGER DEFAULT 0

-- Notificações
notification_email      BOOLEAN DEFAULT true
notification_whatsapp   BOOLEAN DEFAULT false

-- Timestamps
created_at              TIMESTAMPTZ DEFAULT NOW()
updated_at              TIMESTAMPTZ DEFAULT NOW()
deleted_at              TIMESTAMPTZ
```

### ⚠️ CAMPOS AUSENTES NO BANCO

**NÃO existem no banco:**
- ❌ `city` (cidade)
- ❌ `state` (estado)
- ❌ `cep` (CEP)
- ❌ `birth_date` (data de nascimento)

---

## 📝 ANÁLISE DO FORMULÁRIO DE CADASTRO

### Arquivo: `src/pages/afiliados/AfiliadosCadastro.tsx`

#### Campos Coletados no Formulário

```typescript
const [formData, setFormData] = useState({
  name: "",        // ✅ Enviado ao banco
  cpf: "",         // ✅ Enviado ao banco (como document, limpo)
  birthDate: "",   // ❌ NÃO enviado ao banco
  email: "",       // ✅ Enviado ao banco
  phone: "",       // ✅ Enviado ao banco
  city: "",        // ❌ NÃO enviado ao banco
  state: ""        // ❌ NÃO enviado ao banco
});
```

#### Campos Enviados ao Service

```typescript
const affiliateData = {
  name: formData.name,      // ✅ Enviado
  email: formData.email,    // ✅ Enviado
  phone: formData.phone,    // ✅ Enviado
  document: formData.cpf    // ✅ Enviado (limpo)
  // ❌ city: NÃO enviado
  // ❌ state: NÃO enviado
  // ❌ birthDate: NÃO enviado
};
```

### 🚨 PROBLEMA 1: Campos Coletados Mas Não Salvos

**Campos perdidos:**
- `city` (cidade) - Coletado no formulário mas não enviado
- `state` (estado) - Coletado no formulário mas não enviado
- `birthDate` (data de nascimento) - Coletado no formulário mas não enviado

**Impacto:**
- Usuário preenche dados que são descartados
- Má experiência do usuário
- Dados potencialmente úteis perdidos

---

## ⚙️ ANÁLISE DA TELA DE CONFIGURAÇÕES

### Arquivo: `src/pages/afiliados/dashboard/Configuracoes.tsx`

#### Campos Exibidos

```typescript
// Seção: Dados Pessoais
<Input id="nome" defaultValue={affiliate?.name || ""} />
<Input id="email" type="email" defaultValue={affiliate?.email || ""} />
<Input id="telefone" defaultValue={affiliate?.phone || ""} />
<Input id="cpf" defaultValue="***.***.***-**" disabled />

// Seção: Endereço
<Input id="cidade" placeholder="Sua cidade" />        // ⚠️ SEM valor padrão
<Select id="estado">...</Select>                      // ⚠️ SEM valor padrão
<Input id="cep" placeholder="00000-000" />            // ⚠️ SEM valor padrão
```

### 🚨 PROBLEMA 2: Campos Sem Dados

**Campos vazios:**
- `cidade` - Não tem valor padrão (não existe no banco)
- `estado` - Não tem valor padrão (não existe no banco)
- `cep` - Não tem valor padrão (não existe no banco)

**Impacto:**
- Usuário precisa preencher novamente dados que já forneceu no cadastro
- Inconsistência entre cadastro e configurações
- Campos não são salvos (botão "Salvar Alterações" não implementado)

---

## 🎭 ANÁLISE DO LAYOUT (DADOS MOCKADOS)

### Arquivo: `src/layouts/AffiliateDashboardLayout.tsx`

#### Dados Hardcoded

```typescript
// Linha ~80-90 (aproximado)
<div className="flex items-center gap-3">
  <Avatar className="h-10 w-10">
    <AvatarFallback>CM</AvatarFallback>  {/* ❌ MOCK */}
  </Avatar>
  <div>
    <p className="font-medium">Carlos Mendes</p>  {/* ❌ MOCK */}
    <p className="text-sm text-muted-foreground">
      Afiliado Nível 3  {/* ❌ MOCK */}
    </p>
  </div>
</div>
```

### 🚨 PROBLEMA 3: Dados Mockados no Layout

**Dados falsos exibidos:**
- Nome: "Carlos Mendes" (hardcoded)
- Avatar: "CM" (hardcoded)
- Graduação: "Afiliado Nível 3" (hardcoded)

**Dados reais disponíveis:**
- `affiliate.name` - Nome real do afiliado
- `affiliate.status` - Status real (pending, active, etc.)
- Nível pode ser calculado via `affiliate_network.level`

**Impacto:**
- Todos os afiliados veem o mesmo nome
- Informação incorreta e confusa
- Perda de personalização

---

## 📊 COMPARAÇÃO: CADASTRO vs CONFIGURAÇÕES

| Campo | Cadastro | Configurações | Banco | Status |
|-------|----------|---------------|-------|--------|
| Nome | ✅ Coleta | ✅ Exibe | ✅ Salva | ✅ OK |
| Email | ✅ Coleta | ✅ Exibe | ✅ Salva | ✅ OK |
| Telefone | ✅ Coleta | ✅ Exibe | ✅ Salva | ✅ OK |
| CPF | ✅ Coleta | ✅ Exibe | ✅ Salva | ✅ OK |
| Data Nasc. | ✅ Coleta | ❌ Não exibe | ❌ Não salva | ⚠️ PERDIDO |
| Cidade | ✅ Coleta | ✅ Exibe | ❌ Não salva | ⚠️ PERDIDO |
| Estado | ✅ Coleta | ✅ Exibe | ❌ Não salva | ⚠️ PERDIDO |
| CEP | ❌ Não coleta | ✅ Exibe | ❌ Não salva | ⚠️ INCONSISTENTE |

---

## 🎯 SOLUÇÕES PROPOSTAS

### SOLUÇÃO 1: Adicionar Colunas no Banco

**Migration necessária:**
```sql
-- Adicionar campos de endereço e data de nascimento
ALTER TABLE affiliates
  ADD COLUMN city TEXT,
  ADD COLUMN state TEXT,
  ADD COLUMN cep TEXT,
  ADD COLUMN birth_date DATE;

-- Criar índices para busca
CREATE INDEX idx_affiliates_city ON affiliates(city) WHERE deleted_at IS NULL;
CREATE INDEX idx_affiliates_state ON affiliates(state) WHERE deleted_at IS NULL;
```

**Vantagens:**
- ✅ Solução definitiva
- ✅ Dados preservados
- ✅ Permite buscas e filtros por localização

**Desvantagens:**
- ⚠️ Requer migration
- ⚠️ Dados antigos ficarão NULL

---

### SOLUÇÃO 2: Corrigir Service para Salvar Campos

**Arquivo:** `src/services/frontend/affiliate.service.ts`

**Alteração necessária:**
```typescript
// ANTES (linha ~70)
const affiliateData = {
  user_id: user.id,
  name: data.name,
  email: data.email,
  phone: data.phone,
  document: cleanDocument,
  // ...
};

// DEPOIS
const affiliateData = {
  user_id: user.id,
  name: data.name,
  email: data.email,
  phone: data.phone,
  document: cleanDocument,
  city: data.city || null,        // ✅ ADICIONAR
  state: data.state || null,      // ✅ ADICIONAR
  cep: data.cep || null,          // ✅ ADICIONAR
  birth_date: data.birthDate || null,  // ✅ ADICIONAR
  // ...
};
```

**Interface também precisa ser atualizada:**
```typescript
export interface CreateAffiliateData {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  city?: string;        // ✅ ADICIONAR
  state?: string;       // ✅ ADICIONAR
  cep?: string;         // ✅ ADICIONAR
  birthDate?: string;   // ✅ ADICIONAR
}
```

---

### SOLUÇÃO 3: Corrigir Dados Mockados no Layout

**Arquivo:** `src/layouts/AffiliateDashboardLayout.tsx`

**Alteração necessária:**
```typescript
// ANTES (mockado)
<Avatar className="h-10 w-10">
  <AvatarFallback>CM</AvatarFallback>
</Avatar>
<div>
  <p className="font-medium">Carlos Mendes</p>
  <p className="text-sm text-muted-foreground">
    Afiliado Nível 3
  </p>
</div>

// DEPOIS (dados reais)
<Avatar className="h-10 w-10">
  <AvatarFallback>
    {affiliate?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'AF'}
  </AvatarFallback>
</Avatar>
<div>
  <p className="font-medium">{affiliate?.name || 'Afiliado'}</p>
  <p className="text-sm text-muted-foreground">
    {affiliate?.status === 'active' ? 'Afiliado Ativo' : 
     affiliate?.status === 'pending' ? 'Aguardando Aprovação' : 
     'Afiliado'}
  </p>
</div>
```

**Dados do afiliado precisam ser carregados:**
```typescript
const [affiliate, setAffiliate] = useState<any>(null);

useEffect(() => {
  loadAffiliateData();
}, []);

const loadAffiliateData = async () => {
  const { isAffiliate, affiliate: affiliateData } = 
    await affiliateFrontendService.checkAffiliateStatus();
  
  if (isAffiliate && affiliateData) {
    setAffiliate(affiliateData);
  }
};
```

---

### SOLUÇÃO 4: Implementar Salvamento em Configurações

**Arquivo:** `src/pages/afiliados/dashboard/Configuracoes.tsx`

**Função `handleSavePersonal` precisa ser implementada:**
```typescript
const handleSavePersonal = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Coletar dados do formulário
    const formData = {
      name: (document.getElementById('nome') as HTMLInputElement).value,
      email: (document.getElementById('email') as HTMLInputElement).value,
      phone: (document.getElementById('telefone') as HTMLInputElement).value,
      city: (document.getElementById('cidade') as HTMLInputElement).value,
      state: (document.getElementById('estado') as HTMLSelectElement).value,
      cep: (document.getElementById('cep') as HTMLInputElement).value,
    };

    // Atualizar no banco
    const { error } = await supabase
      .from('affiliates')
      .update({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        state: formData.state,
        cep: formData.cep,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (error) throw error;

    toast({ title: "Dados salvos com sucesso!" });
    loadAffiliateData(); // Recarregar dados
  } catch (error) {
    toast({
      title: "Erro ao salvar",
      description: error instanceof Error ? error.message : "Erro desconhecido",
      variant: "destructive"
    });
  }
};
```

---

## 📝 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### FASE 1: Estrutura do Banco (PRIMEIRO)
1. ✅ Criar migration para adicionar colunas
2. ✅ Aplicar migration via Supabase Power
3. ✅ Verificar que colunas foram criadas

### FASE 2: Backend/Service (SEGUNDO)
1. ✅ Atualizar interface `CreateAffiliateData`
2. ✅ Modificar `registerAffiliate` para salvar novos campos
3. ✅ Testar cadastro com dados completos

### FASE 3: Frontend - Cadastro (TERCEIRO)
1. ✅ Adicionar CEP ao formulário de cadastro (opcional)
2. ✅ Garantir que todos os campos sejam enviados
3. ✅ Testar fluxo completo de cadastro

### FASE 4: Frontend - Configurações (QUARTO)
1. ✅ Carregar dados reais nos campos
2. ✅ Implementar salvamento real
3. ✅ Testar atualização de dados

### FASE 5: Frontend - Layout (QUINTO)
1. ✅ Carregar dados do afiliado no layout
2. ✅ Substituir dados mockados por reais
3. ✅ Testar personalização

---

## 🧪 TESTES NECESSÁRIOS

### Teste 1: Cadastro Completo
- [ ] Preencher todos os campos do formulário
- [ ] Verificar que todos os dados foram salvos no banco
- [ ] Confirmar que nenhum campo foi perdido

### Teste 2: Configurações
- [ ] Abrir tela de configurações
- [ ] Verificar que dados do cadastro aparecem
- [ ] Alterar dados e salvar
- [ ] Confirmar que alterações foram persistidas

### Teste 3: Layout Personalizado
- [ ] Fazer login como afiliado
- [ ] Verificar que nome real aparece no header
- [ ] Verificar que avatar tem iniciais corretas
- [ ] Verificar que status está correto

---

## ⚠️ RISCOS E CONSIDERAÇÕES

### Risco 1: Dados Antigos
- Afiliados cadastrados antes da migration terão campos NULL
- **Solução:** Pedir para atualizar dados nas configurações

### Risco 2: Validação de CEP
- CEP pode ser inválido se não validado
- **Solução:** Adicionar validação de formato (00000-000)

### Risco 3: Performance
- Adicionar colunas não afeta performance significativamente
- Índices já foram planejados na migration

---

## 📊 IMPACTO ESTIMADO

### Tempo de Implementação
- Migration: 5 minutos
- Service: 15 minutos
- Frontend (3 arquivos): 30 minutos
- Testes: 20 minutos
- **TOTAL: ~70 minutos**

### Complexidade
- 🟢 Baixa - Alterações simples e diretas
- 🟢 Sem quebra de funcionalidades existentes
- 🟢 Sem impacto em outros módulos

---

## ✅ CHECKLIST DE APROVAÇÃO

Antes de implementar, confirmar:
- [ ] Usuário aprovou adição de colunas no banco
- [ ] Usuário aprovou ordem de implementação
- [ ] Usuário confirmou quais campos são obrigatórios
- [ ] Usuário aprovou tratamento de dados antigos (NULL)

---

**AGUARDANDO APROVAÇÃO DO USUÁRIO PARA INICIAR IMPLEMENTAÇÃO**

**Próximo passo:** Usuário deve revisar este documento e aprovar as correções propostas.
