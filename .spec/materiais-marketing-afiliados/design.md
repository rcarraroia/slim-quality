# Design Técnico: Central de Materiais de Marketing

## 1. Arquitetura e Dados

### 1.1. Modelagem de Dados (Supabase)

**Nova Tabela:** `marketing_materials`

```sql
create type material_type as enum ('image', 'video', 'text', 'pdf');

create table public.marketing_materials (
    id uuid not null default gen_random_uuid() primary key,
    -- tenant_id removed for single-tenant scenario (Phase 1)
    title text not null,
    description text,
    type material_type not null,
    
    -- Conteúdo: URL do storage (para arquivos) ou Texto (para copies)
    content_url text, 
    content_text text,
    
    -- Opcional: Link para produto específico. Se null, é material geral.
    product_id uuid references public.products(id),
    
    -- Configuração de Templates (variáveis aceitas)
    -- Ex: ["{{NOME_CLIENTE}}", "{{NOME_PRODUTO}}"]
    template_vars jsonb default '[]'::jsonb,
    
    is_active boolean default true,
    display_order int default 0,
    
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Policies (RLS)
-- Admin: All permissions
-- Authenticated (Affiliates): Select only where is_active = true
```

**Storage Bucket:**
- Criar bucket `marketing-materials` (public).
- Policy: Insert/Update (Admin only), Select (Public/Authenticated).

### 1.2. Integração Backend (Services)

**Service:** `MarketingMaterialService`
- `listMaterials(filter: { productId?: string, type?: string })`
- `createMaterial(data: CreateMaterialDTO)`
- `updateMaterial(id: string, data: UpdateMaterialDTO)`
- `deleteMaterial(id: string)`

**Prevenção de Conflitos:**
- Não alterar tabelas existentes (`products`, `affiliates`).
- Nova tabela isolada com Foreign Key segura (`product_id`).
- Frontend service estende classes existentes ou cria nova instância dedicada para não "poluir" `AffiliateFrontendService` com lógica de admin.

### 1.3. Frontend (Componentes)

**Admin:**
- `AdminMaterialsPage`: Listagem com filtros.
- `MaterialForm`:
    - Dropdown para selecionar Produto (ou "Geral").
    - Se Type == Text: Editor de texto simples com botões para inserir variáveis (`Add {{LINK}}`).
    - Se Type == Image/Video: Componente de Upload arrastar-soltar.

**Painel Afiliado:**
- `AffiliateMaterialsPage`:
    - Layout com Tabs: [Todos] [Institucional] [Produtos].
    - Grid de Cards (`MaterialCard`).
- `MaterialCard`:
    - Exibe thumbnail (se img/video) ou preview (se texto).
    - Botão Principal: "Copiar / Baixar".
    - Botão Secundário: "Personalizar" (se tiver variáveis extras).
- `TemplateGeneratorModal`:
    - Abre se o texto tiver variáveis como `{{NOME_CLIENTE}}`.
    - Inputs dinâmicos para cada variável.
    - Preview em tempo real da mensagem.

## 2. Fluxos

### 2.1. Interpolação de Strings
O frontend deve ter uma função utilitária robusta:

```typescript
function interpolateMaterial(
    template: string, 
    affiliateSlug: string, 
    variables: Record<string, string>
): string {
    let result = template;
    
    // 1. Injeta Link (Base URL + Slug)
    const baseUrl = 'https://slimquality.com.br';
    const link = `${baseUrl}?ref=${affiliateSlug}`;
    result = result.replace(/{{LINK}}/g, link);
    
    // 2. Injeta variáveis dinâmicas do usuário
    Object.entries(variables).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });
    
    return result;
}
```

## 3. Análise de Risco e Mitigação

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| **Performance** | Carregar muitos vídeos pesados na listagem. | Usar paginação na query e thumbnails otimizadas. Carregar vídeo sob demanda (modal). |
| **Link Quebrado** | Afiliado copia link sem `?ref` ou link errado. | A interpolação acontece no momento do "Copiar". Validar se `slug` existe antes de exibir. |
| **Conflito UI** | Quebrar layout existente. | Criar rota nova `/afiliados/dashboard/materiais` totalmente isolada. |
| **Segurança** | Afiliado ver materiais "rascunho". | RLS policy estrita (`is_active = true`). |

## 4. Stack Tecnológico
- **Banco:** PostgreSQL (Supabase)
- **Backend:** Supabase Client (RLS direto) + Edge Functions (se precisar processamento pesado, mas aqui CRUD simples resolve).
- **Frontend:** React (Vite) + Tailwind + Lucide Icons.
