# ANÁLISE DE VIABILIDADE - BOTÃO "DUPLICAR PRODUTO"

**Data:** 27/02/2026  
**Solicitante:** Renato Carraro  
**Analista:** Kiro AI  
**Status:** ✅ ANÁLISE CONCLUÍDA

---

## 📋 RESUMO EXECUTIVO

A implementação de um botão "Duplicar Produto" no formulário de edição de produtos é **VIÁVEL** e de **COMPLEXIDADE BAIXA**. A funcionalidade pode ser implementada com modificações mínimas em apenas 1 arquivo principal.

**Estimativa:** 1-2 horas de desenvolvimento + testes

---

## 🎯 OBJETIVO DA FUNCIONALIDADE

Permitir que administradores dupliquem produtos existentes com um único clique, criando uma cópia do produto com:
- Todos os dados copiados (exceto campos únicos)
- Nome modificado automaticamente (ex: "Produto Original (Cópia)")
- Novos valores gerados para campos únicos (id, slug, sku)
- Datas resetadas (created_at, updated_at)

---

## 📁 ARQUIVOS AFETADOS

### 1. **`src/pages/dashboard/Produtos.tsx`** (PRINCIPAL)
**Modificações necessárias:**
- ✅ Adicionar botão "Duplicar" no card de produto
- ✅ Adicionar função `handleDuplicate(produto: Product)`
- ✅ Adicionar ícone `Copy` do lucide-react

**Linhas afetadas:** ~50 linhas (adição)

**Localização das mudanças:**
- Linha ~15: Adicionar import do ícone `Copy`
- Linha ~550: Adicionar botão "Duplicar" no card
- Linha ~300: Adicionar função `handleDuplicate`

---

### 2. **Tabela `products` (Banco de Dados)** (CONSULTA APENAS)
**Modificações:** NENHUMA
**Motivo:** Estrutura atual já suporta duplicação

---

## 🗄️ ANÁLISE DA ESTRUTURA DO BANCO

### Campos da Tabela `products` (29 campos)

#### ✅ **Campos que DEVEM ser copiados** (20 campos):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| name | text | Nome (com sufixo " (Cópia)") |
| description | text | Descrição completa |
| width_cm | numeric | Largura |
| length_cm | numeric | Comprimento |
| height_cm | numeric | Altura |
| weight_kg | numeric | Peso |
| price_cents | integer | Preço em centavos |
| is_active | boolean | Status ativo/inativo |
| is_featured | boolean | Produto em destaque |
| display_order | integer | Ordem de exibição |
| product_type | varchar(50) | Tipo (mattress, service) |
| image_url | text | URL da imagem |
| product_page_url | text | URL da página |
| magnetic_count | integer | Quantidade de ímãs |
| warranty_years | integer | Anos de garantia |
| therapeutic_technologies | integer | Tecnologias terapêuticas |
| category | ENUM | Categoria do produto |
| is_subscription | boolean | É assinatura |
| entry_fee_cents | integer | Taxa de adesão |
| monthly_fee_cents | integer | Mensalidade |
| has_entry_fee | boolean | Tem taxa de adesão |
| billing_cycle | varchar(20) | Ciclo de cobrança |
| eligible_affiliate_type | varchar(20) | Tipo de afiliado elegível |

#### ⚠️ **Campos que DEVEM ser únicos/resetados** (6 campos):

| Campo | Tipo | Ação | Motivo |
|-------|------|------|--------|
| id | uuid | **GERAR NOVO** | PRIMARY KEY (auto-gerado) |
| slug | text | **GERAR NOVO** | UNIQUE constraint |
| sku | text | **GERAR NOVO** | UNIQUE constraint |
| created_at | timestamptz | **RESETAR** | Data de criação |
| updated_at | timestamptz | **RESETAR** | Data de atualização |
| deleted_at | timestamptz | **NULL** | Soft delete |

#### 🔒 **Constraints UNIQUE identificados:**

1. ✅ **products_name_key** - UNIQUE (name)
   - **Solução:** Adicionar sufixo " (Cópia)" ou " (Cópia 2)", etc.

2. ✅ **products_sku_key** - UNIQUE (sku)
   - **Solução:** Gerar novo SKU com timestamp: `${originalSKU}-COPY-${timestamp}`

3. ✅ **products_slug_key** - UNIQUE (slug)
   - **Solução:** Gerar novo slug baseado no novo nome

---

## 🔧 IMPLEMENTAÇÃO PROPOSTA

### 1. **Função `handleDuplicate`**

```typescript
const handleDuplicate = async (produto: Product) => {
  try {
    setUploading(true);

    // Gerar nome único
    const copyName = `${produto.name} (Cópia)`;
    
    // Gerar SKU único
    const timestamp = Date.now().toString(36).toUpperCase();
    const copySku = `${produto.sku}-COPY-${timestamp}`;
    
    // Gerar slug único (simplificado)
    const copySlug = copyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Dados do produto duplicado
    const duplicatedProduct = {
      // Campos copiados
      name: copyName,
      description: produto.description,
      width_cm: produto.width_cm,
      length_cm: produto.length_cm,
      height_cm: produto.height_cm,
      weight_kg: produto.weight_kg,
      price_cents: produto.price_cents,
      is_active: false, // Criar como inativo por segurança
      is_featured: false, // Não duplicar destaque
      display_order: produto.display_order,
      product_type: produto.product_type,
      image_url: produto.image_url,
      product_page_url: produto.product_page_url,
      magnetic_count: (produto as any).magnetic_count,
      warranty_years: (produto as any).warranty_years,
      therapeutic_technologies: (produto as any).therapeutic_technologies,
      category: produto.category,
      is_subscription: (produto as any).is_subscription,
      entry_fee_cents: (produto as any).entry_fee_cents,
      monthly_fee_cents: (produto as any).monthly_fee_cents,
      has_entry_fee: (produto as any).has_entry_fee,
      billing_cycle: (produto as any).billing_cycle,
      eligible_affiliate_type: (produto as any).eligible_affiliate_type,
      
      // Campos únicos/resetados
      sku: copySku,
      slug: copySlug,
      // id, created_at, updated_at, deleted_at são gerados automaticamente
    };

    // Inserir no banco
    const { data, error } = await supabase
      .from('products')
      .insert(duplicatedProduct)
      .select()
      .single();

    if (error) throw error;

    toast.success(`Produto "${copyName}" duplicado com sucesso!`);
    loadProdutos();
  } catch (error) {
    console.error('Erro ao duplicar produto:', error);
    toast.error('Erro ao duplicar produto');
  } finally {
    setUploading(false);
  }
};
```

### 2. **Botão no Card de Produto**

```typescript
<div className="flex gap-2 pt-2">
  <Button
    variant="outline"
    size="sm"
    className="flex-1 gap-2"
    onClick={() => handleEdit(produto)}
  >
    <Edit className="h-4 w-4" />
    Editar
  </Button>
  
  {/* NOVO BOTÃO */}
  <Button
    variant="outline"
    size="sm"
    className="flex-1 gap-2 text-primary hover:text-primary"
    onClick={() => handleDuplicate(produto)}
  >
    <Copy className="h-4 w-4" />
    Duplicar
  </Button>
  
  <Button
    variant="outline"
    size="sm"
    className="flex-1 gap-2 text-destructive hover:text-destructive"
    onClick={() => handleDelete(produto.id)}
  >
    <Trash2 className="h-4 w-4" />
    Excluir
  </Button>
</div>
```

### 3. **Import do Ícone**

```typescript
import { Edit, Trash2, Plus, Package, Upload, X, Copy } from 'lucide-react';
```

---

## 🎨 COMPORTAMENTO DA UI

### Fluxo do Usuário:

1. **Usuário clica em "Duplicar"** no card do produto
2. **Sistema processa duplicação** (1-2 segundos)
3. **Toast de sucesso** aparece: "Produto 'Nome (Cópia)' duplicado com sucesso!"
4. **Lista de produtos recarrega** automaticamente
5. **Novo produto aparece** no topo da lista (created_at mais recente)

### Estados do Botão:

- **Normal:** Ícone Copy + texto "Duplicar"
- **Hover:** Cor primária (azul)
- **Disabled:** Durante upload/duplicação (botão desabilitado)

---

## ⚠️ CONSIDERAÇÕES IMPORTANTES

### 1. **Imagens do Produto**

**Problema:** Tabela `product_images` tem relação com `product_id`

**Opções:**

#### Opção A: **Não duplicar imagens** (RECOMENDADO)
- ✅ Mais simples
- ✅ Mais rápido
- ✅ Evita duplicação de arquivos no storage
- ⚠️ Usuário precisa fazer upload manual

#### Opção B: **Duplicar referências de imagens**
- ✅ Copia URLs das imagens
- ⚠️ Múltiplos produtos apontam para mesmas imagens
- ⚠️ Deletar imagem de um produto afeta outros

#### Opção C: **Duplicar arquivos de imagens**
- ✅ Cada produto tem suas próprias imagens
- ❌ Mais complexo
- ❌ Mais lento
- ❌ Aumenta uso de storage

**Recomendação:** Opção A (não duplicar imagens)

### 2. **Status do Produto Duplicado**

**Recomendação:** Criar como **INATIVO** (`is_active: false`)

**Motivo:**
- ✅ Evita produto duplicado aparecer no site imediatamente
- ✅ Permite revisão antes de ativar
- ✅ Segurança contra duplicações acidentais

### 3. **Produto em Destaque**

**Recomendação:** **NÃO** duplicar flag `is_featured`

**Motivo:**
- ✅ Evita múltiplos produtos em destaque não intencionais
- ✅ Usuário decide manualmente se novo produto será destaque

### 4. **Validação de Nome Único**

**Problema:** Constraint UNIQUE em `name`

**Solução Implementada:**
- Adicionar sufixo " (Cópia)"
- Se já existir, adicionar número: " (Cópia 2)", " (Cópia 3)", etc.

**Código de validação:**

```typescript
const generateUniqueName = async (baseName: string): Promise<string> => {
  let copyName = `${baseName} (Cópia)`;
  let counter = 2;
  
  while (true) {
    const { data } = await supabase
      .from('products')
      .select('id')
      .eq('name', copyName)
      .single();
    
    if (!data) break; // Nome disponível
    
    copyName = `${baseName} (Cópia ${counter})`;
    counter++;
  }
  
  return copyName;
};
```

---

## 📊 ESTIMATIVA DE COMPLEXIDADE

### Complexidade Técnica: **BAIXA** ⭐

**Justificativa:**
- ✅ Modificação em apenas 1 arquivo
- ✅ Lógica simples de cópia de dados
- ✅ Sem necessidade de migrations
- ✅ Sem alteração de estrutura de banco
- ✅ Sem dependências externas

### Tempo Estimado:

| Tarefa | Tempo |
|--------|-------|
| Implementação da função | 30 min |
| Adicionar botão na UI | 15 min |
| Tratamento de erros | 15 min |
| Testes manuais | 30 min |
| Ajustes e refinamentos | 30 min |
| **TOTAL** | **2 horas** |

### Riscos Identificados:

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Conflito de nome único | Média | Baixo | Validação de nome único |
| Conflito de SKU único | Baixa | Baixo | Timestamp no SKU |
| Conflito de slug único | Baixa | Baixo | Geração baseada no nome |
| Erro ao duplicar imagens | Baixa | Baixo | Não duplicar imagens (Opção A) |

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Phase 1: Preparação
- [ ] Criar branch `feature/duplicate-product`
- [ ] Ler arquivo `Produtos.tsx` completo
- [ ] Identificar linha exata para adicionar botão

### Phase 2: Implementação
- [ ] Adicionar import do ícone `Copy`
- [ ] Implementar função `handleDuplicate`
- [ ] Adicionar função `generateUniqueName` (opcional)
- [ ] Adicionar botão "Duplicar" no card
- [ ] Adicionar estado de loading durante duplicação

### Phase 3: Testes
- [ ] Testar duplicação de produto simples (colchão)
- [ ] Testar duplicação de produto digital (ferramenta_ia)
- [ ] Testar duplicação de adesão de afiliado
- [ ] Testar conflito de nome (duplicar 2x o mesmo)
- [ ] Testar com produto sem imagens
- [ ] Testar com produto com múltiplas imagens

### Phase 4: Validação
- [ ] Executar `getDiagnostics` (0 erros)
- [ ] Executar `npm run build` (0 erros)
- [ ] Testar em ambiente de desenvolvimento
- [ ] Validar que produto duplicado está inativo
- [ ] Validar que SKU é único
- [ ] Validar que slug é único

### Phase 5: Deploy
- [ ] Commit com mensagem descritiva
- [ ] Push para repositório
- [ ] Deploy automático via Vercel
- [ ] Testar em produção

---

## 🎯 RECOMENDAÇÕES ADICIONAIS

### 1. **Melhorias Futuras (Opcional)**

#### A. **Modal de Confirmação**
```typescript
const handleDuplicate = async (produto: Product) => {
  const confirmed = confirm(
    `Deseja duplicar o produto "${produto.name}"?\n\n` +
    `O novo produto será criado como INATIVO.`
  );
  
  if (!confirmed) return;
  
  // ... resto da lógica
};
```

#### B. **Edição Imediata Após Duplicar**
```typescript
// Após duplicar, abrir modal de edição automaticamente
const { data } = await supabase
  .from('products')
  .insert(duplicatedProduct)
  .select()
  .single();

if (data) {
  handleEdit(data); // Abre modal de edição
}
```

#### C. **Duplicar com Imagens (Opção C)**
```typescript
// Duplicar arquivos de imagens no storage
const duplicateImages = async (originalProductId: string, newProductId: string) => {
  const { data: images } = await supabase
    .from('product_images')
    .select('*')
    .eq('product_id', originalProductId);
  
  for (const img of images || []) {
    // Baixar imagem original
    const response = await fetch(img.image_url);
    const blob = await response.blob();
    
    // Upload com novo nome
    const fileName = `${newProductId}/${Date.now()}.jpg`;
    await supabase.storage
      .from('product-images')
      .upload(fileName, blob);
    
    // Criar registro
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    await supabase.from('product_images').insert({
      product_id: newProductId,
      image_url: publicUrl,
      is_primary: img.is_primary
    });
  }
};
```

### 2. **Logs e Auditoria**

```typescript
// Adicionar log de auditoria
console.log('[DUPLICATE] Produto duplicado:', {
  original_id: produto.id,
  original_name: produto.name,
  new_id: data.id,
  new_name: copyName,
  timestamp: new Date().toISOString()
});
```

### 3. **Notificação Melhorada**

```typescript
toast.success(
  `Produto duplicado com sucesso!`,
  {
    description: `"${copyName}" foi criado como INATIVO. Edite para ativar.`,
    action: {
      label: 'Editar Agora',
      onClick: () => handleEdit(data)
    }
  }
);
```

---

## 📝 CONCLUSÃO

A implementação do botão "Duplicar Produto" é **VIÁVEL** e **RECOMENDADA** com as seguintes características:

### ✅ Pontos Positivos:
- Complexidade baixa (2 horas)
- Modificação em apenas 1 arquivo
- Sem alteração de banco de dados
- Melhora significativa na UX
- Reduz tempo de cadastro de produtos similares

### ⚠️ Pontos de Atenção:
- Validação de nomes únicos
- Decisão sobre duplicação de imagens
- Produto duplicado criado como inativo

### 🎯 Recomendação Final:
**IMPLEMENTAR** com a abordagem proposta (Opção A - sem duplicar imagens)

---

**Análise realizada em:** 27/02/2026  
**Analista:** Kiro AI  
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO
