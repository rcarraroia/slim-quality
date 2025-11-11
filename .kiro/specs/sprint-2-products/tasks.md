# Implementation Plan - Sprint 2: Sistema de Produtos

## Task List

- [x] 1. Criar estrutura de banco de dados


  - Criar migration para tabela products com campos de dimensões e preço
  - Criar migration para tabela technologies
  - Criar migration para tabela product_technologies (N:N)
  - Criar migration para tabela product_images
  - Criar migration para tabela inventory_logs
  - Criar view product_inventory para estoque atual
  - Criar função generate_product_slug() para gerar slugs automaticamente
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 4.1, 10.1_




- [ ] 2. Configurar Supabase Storage
  - [ ] 2.1 Criar bucket product-images
    - Configurar bucket como público
    - Definir limite de tamanho (5MB)
    - Configurar tipos MIME permitidos (JPEG, PNG, WEBP)

    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ] 2.2 Criar políticas de acesso ao storage
    - Política para admin fazer upload
    - Política pública para leitura de imagens
    - _Requirements: 3.5, 8.1_

- [x] 3. Implementar schemas de validação Zod



  - [x] 3.1 Criar schemas de produto

    - CreateProductSchema (name, description, dimensions, price)
    - UpdateProductSchema (todos campos opcionais)
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 3.2 Criar schemas de estoque

    - InventoryMovementSchema (type, quantity, notes)
    - _Requirements: 4.2, 4.4, 9.4_
  
  - [x] 3.3 Criar schemas de imagem

    - ImageUploadSchema (alt_text, is_primary)
    - _Requirements: 3.2, 8.3_
  
  - [x] 3.4 Criar tipos TypeScript

    - Interface Product
    - Interface Technology
    - Interface ProductImage
    - Interface InventoryLog
    - _Requirements: Tipos gerais_

- [ ] 4. Implementar serviços de produtos
  - [ ] 4.1 Criar ProductService
    - Método listProducts() para listagem pública
    - Método getProductBySlug() para detalhes
    - Método createProduct() para admin
    - Método updateProduct() para admin
    - Método deleteProduct() para soft delete
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 7.1, 7.2, 7.3_
  
  - [ ] 4.2 Criar TechnologyService
    - Método listTechnologies() para listagem pública
    - Método getTechnologyById() para detalhes
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3_
  
  - [ ] 4.3 Criar ImageService
    - Método uploadProductImage() para upload no Supabase Storage
    - Método deleteProductImage() para remover imagem
    - Método reorderImages() para reordenar
    - Método generateThumbnail() para criar thumbnail
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 4.4 Criar InventoryService
    - Método getProductInventory() para consultar estoque
    - Método recordMovement() para registrar movimentação
    - Método getMovementHistory() para histórico
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5. Implementar controllers públicos
  - [ ] 5.1 Criar controller de listagem de produtos
    - GET /api/products
    - Suportar filtros (featured, limit, offset)
    - Incluir tecnologias e imagem principal
    - Retornar lista paginada
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [ ] 5.2 Criar controller de detalhes do produto
    - GET /api/products/:slug
    - Incluir todas as imagens
    - Incluir todas as tecnologias
    - Incluir estoque disponível
    - _Requirements: 5.3, 5.4_
  
  - [ ] 5.3 Criar controller de listagem de tecnologias
    - GET /api/technologies
    - Retornar apenas tecnologias ativas
    - Ordenar por display_order
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6. Implementar controllers administrativos
  - [ ] 6.1 Criar controller de criação de produto
    - POST /api/admin/products
    - Validar dados com CreateProductSchema
    - Gerar SKU automaticamente
    - Associar todas as 8 tecnologias
    - Inicializar estoque com quantidade zero
    - _Requirements: 7.1, 7.4, 10.1_
  
  - [ ] 6.2 Criar controller de atualização de produto
    - PUT /api/admin/products/:id
    - Validar dados com UpdateProductSchema
    - Atualizar apenas campos fornecidos
    - _Requirements: 7.2, 7.4, 7.5_
  
  - [ ] 6.3 Criar controller de deleção de produto
    - DELETE /api/admin/products/:id
    - Fazer soft delete (deleted_at)
    - Manter relacionamentos
    - _Requirements: 7.3, 10.2_
  
  - [ ] 6.4 Criar controller de upload de imagens
    - POST /api/admin/products/:id/images
    - Validar formato e tamanho
    - Upload para Supabase Storage
    - Gerar thumbnail
    - Criar registros em product_images
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 6.5 Criar controller de deleção de imagem
    - DELETE /api/admin/products/:productId/images/:imageId
    - Remover do Supabase Storage
    - Remover registro do banco
    - _Requirements: 8.4_
  
  - [ ] 6.6 Criar controller de gestão de estoque
    - POST /api/admin/products/:id/inventory
    - Validar tipo de movimentação
    - Registrar em inventory_logs
    - Retornar estoque atualizado
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ] 6.7 Criar controller de histórico de estoque
    - GET /api/admin/products/:id/inventory/history
    - Retornar movimentações ordenadas por data
    - Incluir estoque atual
    - _Requirements: 4.3_

- [ ] 7. Configurar rotas da API
  - [ ] 7.1 Criar rotas públicas de produtos
    - GET /api/products (listagem)
    - GET /api/products/:slug (detalhes)
    - Sem autenticação
    - Rate limiting permissivo (100 req/15min)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 7.2 Criar rotas públicas de tecnologias
    - GET /api/technologies
    - Sem autenticação
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 7.3 Criar rotas administrativas de produtos
    - POST /api/admin/products (criar)
    - PUT /api/admin/products/:id (atualizar)
    - DELETE /api/admin/products/:id (deletar)
    - Requer autenticação + role admin
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 7.4 Criar rotas administrativas de imagens
    - POST /api/admin/products/:id/images (upload)
    - DELETE /api/admin/products/:productId/images/:imageId (deletar)
    - Requer autenticação + role admin
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 7.5 Criar rotas administrativas de estoque
    - POST /api/admin/products/:id/inventory (ajustar)
    - GET /api/admin/products/:id/inventory/history (histórico)
    - Requer autenticação + role admin
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [ ] 7.6 Integrar rotas no servidor Express
    - Importar e registrar rotas públicas
    - Importar e registrar rotas administrativas
    - Aplicar middlewares apropriados
    - _Requirements: Integração geral_

- [ ] 8. Criar script de seed de dados
  - [ ] 8.1 Criar seed de tecnologias
    - Inserir 8 tecnologias fixas
    - Verificar se já existem antes de inserir
    - _Requirements: 12.1, 12.2_
  
  - [ ] 8.2 Criar seed de produtos
    - Inserir 4 produtos fixos (Solteiro, Padrão, Queen, King)
    - Verificar se já existem antes de inserir
    - Gerar SKUs únicos
    - _Requirements: 12.1, 12.3_
  
  - [ ] 8.3 Criar seed de relacionamentos
    - Associar todas as 8 tecnologias a cada produto
    - Verificar se relacionamentos já existem
    - _Requirements: 12.3, 12.5_
  
  - [ ] 8.4 Criar seed de estoque inicial
    - Inicializar estoque de cada produto com quantidade padrão (ex: 10)
    - Registrar movimentação inicial em inventory_logs
    - _Requirements: 12.4_

- [ ] 9. Aplicar migrations e validar banco
  - [ ] 9.1 Executar migrations no Supabase
    - Aplicar migration de criação de tabelas
    - Aplicar migration de views
    - Aplicar migration de funções e triggers
    - Verificar que não há erros
    - _Requirements: 11.1_
  
  - [ ] 9.2 Validar estrutura do banco
    - Verificar que tabelas foram criadas corretamente
    - Verificar que índices existem
    - Verificar que constraints estão ativos
    - Verificar que view product_inventory funciona
    - _Requirements: 11.1, 11.4_
  
  - [ ] 9.3 Executar seed de dados
    - Executar script de seed de tecnologias
    - Executar script de seed de produtos
    - Executar script de seed de relacionamentos
    - Executar script de seed de estoque
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_
  
  - [ ] 9.4 Validar dados seed
    - Verificar que 8 tecnologias foram criadas
    - Verificar que 4 produtos foram criados
    - Verificar que relacionamentos existem (32 registros)
    - Verificar que estoque foi inicializado
    - _Requirements: 12.5_

- [ ] 10. Validar funcionalidades end-to-end
  - [ ] 10.1 Testar APIs públicas
    - GET /api/products (listar produtos)
    - GET /api/products/:slug (detalhes do produto)
    - GET /api/technologies (listar tecnologias)
    - Verificar que não requer autenticação
    - Verificar performance (< 500ms)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 11.3_
  
  - [ ] 10.2 Testar CRUD de produtos (admin)
    - Criar produto via POST /api/admin/products
    - Atualizar produto via PUT /api/admin/products/:id
    - Deletar produto via DELETE /api/admin/products/:id
    - Verificar que requer autenticação + role admin
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ] 10.3 Testar upload de imagens
    - Upload de imagem via POST /api/admin/products/:id/images
    - Verificar que imagem foi salva no Supabase Storage
    - Verificar que thumbnail foi gerado
    - Verificar que URL pública funciona
    - Deletar imagem via DELETE
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 10.4 Testar gestão de estoque
    - Ajustar estoque via POST /api/admin/products/:id/inventory
    - Verificar que movimentação foi registrada
    - Consultar histórico via GET /api/admin/products/:id/inventory/history
    - Verificar cálculo de estoque atual
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 10.5 Testar relacionamentos
    - Verificar que produtos incluem tecnologias
    - Verificar que produtos incluem imagens
    - Verificar que produtos incluem estoque
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [ ] 10.6 Testar validações
    - Tentar criar produto com dados inválidos (deve falhar)
    - Tentar criar produto com SKU duplicado (deve falhar)
    - Tentar fazer upload de arquivo inválido (deve falhar)
    - Tentar acessar rota admin sem autenticação (deve falhar)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 11. Documentar APIs e preparar para próximo sprint
  - [ ] 11.1 Criar documentação de endpoints
    - Documentar APIs públicas com exemplos
    - Documentar APIs administrativas com exemplos
    - Documentar códigos de erro
    - Incluir exemplos de uso com curl
    - _Requirements: Documentação geral_
  
  - [ ] 11.2 Atualizar README do projeto
    - Adicionar seção de produtos
    - Explicar estrutura de dados
    - Guia de como usar as APIs
    - _Requirements: Documentação geral_
  
  - [ ] 11.3 Criar arquivo de testes HTTP
    - Criar arquivo .http com todos os endpoints
    - Incluir exemplos de requisições
    - Incluir testes de validação
    - _Requirements: Documentação geral_
  
  - [ ] 11.4 Validar preparação para Sprint 3
    - Confirmar que estrutura de produtos está completa
    - Confirmar que APIs estão funcionando
    - Confirmar que dados seed estão corretos
    - Documentar campos que serão usados em vendas
    - _Requirements: Preparação para Sprint 3_

## Notas de Implementação

### Ordem de Execução Recomendada

1. **Tasks 1-2:** Estrutura de banco e storage - Base sólida
2. **Task 3:** Validações e tipos - Segurança de dados
3. **Task 4:** Serviços - Lógica de negócio
4. **Tasks 5-6:** Controllers - Endpoints da API
5. **Task 7:** Rotas - Exposição da API
6. **Task 8:** Seed de dados - Dados iniciais
7. **Task 9:** Aplicação e validação de banco
8. **Task 10:** Testes end-to-end
9. **Task 11:** Documentação e preparação

### Dependências Críticas

- Task 1 deve estar completa antes de Task 9
- Task 2 deve estar completa antes de Task 4.3 (ImageService)
- Task 3 deve estar completa antes de Tasks 5-6
- Task 4 deve estar completa antes de Tasks 5-6
- Task 7 deve estar completa antes de Task 10
- Task 8 deve estar completa antes de Task 9.3
- Task 9 deve estar completa antes de Task 10

### Validações Obrigatórias

- ✅ Todas as migrations aplicadas sem erro
- ✅ Bucket do Supabase Storage criado e configurado
- ✅ Todos os endpoints respondendo corretamente
- ✅ Upload de imagens funcionando
- ✅ Estoque sendo calculado corretamente
- ✅ Seed de dados executado com sucesso
- ✅ 4 produtos criados com 8 tecnologias cada
- ✅ APIs públicas acessíveis sem autenticação
- ✅ APIs administrativas protegidas

### Dados Fixos (Seed)

#### 4 Produtos
1. **Solteiro** - 88x188x28cm - R$ 3.190,00
2. **Padrão** (Mais vendido) - 138x188x28cm - R$ 3.290,00
3. **Queen** - 158x198x30cm - R$ 3.490,00
4. **King** - 193x203x30cm - R$ 4.890,00

#### 8 Tecnologias
1. Sistema Magnético (240 ímãs de 800 Gauss)
2. Infravermelho Longo
3. Energia Bioquântica
4. Vibromassagem (8 motores)
5. Densidade Progressiva
6. Cromoterapia
7. Perfilado High-Tech
8. Tratamento Sanitário

### Pontos de Atenção

- **Performance:** APIs públicas devem ser rápidas (< 500ms)
- **Storage:** Validar formato e tamanho de imagens antes de upload
- **Estoque:** View product_inventory deve ser eficiente
- **Relacionamentos:** Todos os produtos devem ter todas as tecnologias
- **Slugs:** Gerar automaticamente e garantir unicidade
- **SKUs:** Gerar automaticamente e garantir unicidade

### Critérios de Aceite do Sprint

#### Funcionalidades
- [ ] Visitante pode listar produtos sem autenticação
- [ ] Visitante pode ver detalhes de produto sem autenticação
- [ ] Visitante pode listar tecnologias sem autenticação
- [ ] Admin pode criar, atualizar e deletar produtos
- [ ] Admin pode fazer upload de imagens
- [ ] Admin pode ajustar estoque
- [ ] Sistema calcula estoque corretamente

#### Técnico
- [ ] Todas as migrations aplicadas sem erro
- [ ] Bucket do Supabase Storage configurado
- [ ] Seed de dados executado com sucesso
- [ ] 4 produtos + 8 tecnologias criados
- [ ] Todos os endpoints respondendo
- [ ] Validações Zod impedindo dados inválidos
- [ ] Performance < 500ms para APIs públicas

#### Segurança
- [ ] APIs públicas acessíveis sem autenticação
- [ ] APIs administrativas protegidas (auth + admin)
- [ ] Upload de imagens validado
- [ ] Dados sensíveis não expostos

#### Performance
- [ ] Índices criados para consultas frequentes
- [ ] Queries otimizadas com JOINs
- [ ] Imagens servidas via CDN (Supabase Storage)
- [ ] View de estoque eficiente

#### Preparação Sprint 3
- [ ] Estrutura de produtos completa
- [ ] APIs funcionando corretamente
- [ ] Dados seed corretos
- [ ] Estoque controlado
- [ ] Documentação completa

### Testes Mínimos Obrigatórios

#### Testes de APIs Públicas
- Listar produtos (deve funcionar sem auth)
- Ver detalhes de produto (deve funcionar sem auth)
- Listar tecnologias (deve funcionar sem auth)
- Performance < 500ms

#### Testes de APIs Administrativas
- Criar produto (deve exigir auth + admin)
- Atualizar produto (deve exigir auth + admin)
- Deletar produto (deve exigir auth + admin)
- Upload de imagem (deve exigir auth + admin)

#### Testes de Validação
- Criar produto com dados inválidos (deve falhar)
- Upload de arquivo inválido (deve falhar)
- Acessar rota admin sem auth (deve falhar)

#### Testes de Estoque
- Ajustar estoque (entrada/saída)
- Verificar cálculo correto
- Consultar histórico


- [ ] 12. Integrar frontend com sistema de produtos
  - [ ] 12.1 Atualizar serviço de produtos no frontend
    - Adicionar métodos admin em product-frontend.service.ts
    - createProduct(), updateProduct(), deleteProduct()
    - uploadImage(), deleteImage()
    - adjustInventory(), getInventoryHistory()
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 4.2_
  
  - [ ] 12.2 Conectar página pública de produtos
    - Atualizar src/pages/produtos/ProductPage.tsx
    - Usar useQuery do TanStack Query
    - Buscar produtos via productService.getProducts()
    - Remover mockProdutos
    - Implementar loading skeleton
    - Implementar error state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 12.3 Conectar dashboard de produtos (admin)
    - Atualizar src/pages/dashboard/Produtos.tsx
    - Implementar listagem com dados reais
    - Implementar formulário de criação de produto
    - Implementar formulário de edição
    - Implementar upload de imagens (multipart/form-data)
    - Implementar gestão de estoque
    - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 4.2, 4.3_
  
  - [ ] 12.4 Conectar página de tecnologias
    - Atualizar src/pages/Sobre.tsx
    - Usar useQuery para buscar tecnologias
    - Exibir lista de tecnologias com ícones
    - Implementar loading e error states
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ] 12.5 Testar integração completa end-to-end
    - Testar listagem pública de produtos (sem autenticação)
    - Testar detalhes de produto
    - Testar criação de produto (admin)
    - Testar upload de imagem
    - Testar ajuste de estoque
    - Validar performance (< 500ms)
    - Validar UX e fluxos
    - _Requirements: Todos_

## Notas sobre Integração Frontend

### Padrão de Integração

**Para cada endpoint backend, criar:**
1. Método no serviço frontend (`src/services/*-frontend.service.ts`)
2. Hook com TanStack Query (se necessário)
3. Conectar componente
4. Implementar loading/error states
5. Remover dados mock

### Exemplo de Integração

**Backend:**
```typescript
// GET /api/products
router.get('/products', listProductsController);
```

**Frontend Service:**
```typescript
export const productService = {
  async getProducts() {
    const response = await apiClient.get('/api/products');
    return response.data.data;
  }
};
```

**Frontend Component:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product-frontend.service';

function ProductsPage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage />;

  return <ProductList products={products} />;
}
```

### Validação de Integração

**Checklist por funcionalidade:**
- [ ] API backend funcionando
- [ ] Serviço frontend criado
- [ ] Componente conectado
- [ ] Loading state implementado
- [ ] Error state implementado
- [ ] Dados mock removidos
- [ ] Fluxo testado end-to-end

---

## Estimativa Atualizada do Sprint 2

**Tempo Original:** 2-3 dias (apenas backend)  
**Tempo Ajustado:** 3-4 dias (backend + integração)

**Distribuição:**
- Tasks 1-9: Backend (2 dias)
- Task 10-11: Validação backend (0.5 dia)
- **Task 12: Integração frontend (1 dia)** ⭐ NOVA
- Ajustes finais: (0.5 dia)

**Total:** 4 dias

---

## Preparação para Sprint 2

### Antes de Começar

✅ **Validar que integração Sprint 1 está funcionando:**
- [ ] Backend rodando (porta 3000)
- [ ] Frontend rodando (porta 8080)
- [ ] Login funcionando
- [ ] Dashboard protegido
- [ ] Token sendo enviado nas requisições

### Durante Sprint 2

✅ **Desenvolver backend primeiro (Tasks 1-9)**
✅ **Testar APIs com curl/Postman**
✅ **Integrar frontend (Task 12)**
✅ **Testar fluxo completo**

---

**Documento criado em:** 24/10/2025  
**Status:** ✅ Pronto para Sprint 2
