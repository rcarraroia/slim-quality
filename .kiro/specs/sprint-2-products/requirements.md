# Requirements Document - Sprint 2: Sistema de Produtos

## Introduction

Este documento define os requisitos para o Sprint 2 do projeto Slim Quality Backend. O objetivo é implementar um sistema completo de gestão de produtos, incluindo catálogo de colchões magnéticos, tecnologias, imagens e controle básico de estoque. Este sprint estabelece a base de dados de produtos para o sistema de vendas (Sprint 3).

**Contexto:** O catálogo possui 4 modelos fixos de colchões, cada um com 8 tecnologias comuns. Os produtos são relativamente estáticos, com foco em APIs públicas performáticas.

## Glossary

- **Sistema**: Slim Quality Backend
- **Product**: Produto (colchão magnético) disponível para venda
- **Technology**: Tecnologia terapêutica presente nos colchões
- **SKU**: Stock Keeping Unit - código único de identificação do produto
- **Inventory**: Estoque - quantidade disponível de cada produto
- **Soft Delete**: Exclusão lógica mantendo registro no banco com deleted_at
- **Supabase Storage**: Sistema de armazenamento de arquivos do Supabase
- **Public API**: API acessível sem autenticação para consulta de produtos

## Requirements

### Requirement 1: Cadastro de Produtos

**User Story:** Como administrador, eu quero cadastrar produtos no sistema, para que eles fiquem disponíveis para venda.

#### Acceptance Criteria

1. THE Sistema SHALL suportar 4 modelos de produtos: Solteiro, Padrão, Queen, King
2. WHEN um produto é criado, THE Sistema SHALL gerar SKU único automaticamente
3. WHEN um produto é criado, THE Sistema SHALL validar que nome é único
4. WHEN um produto é criado, THE Sistema SHALL armazenar dimensões (largura, comprimento, altura)
5. WHEN um produto é criado, THE Sistema SHALL armazenar preço em centavos para precisão

### Requirement 2: Gestão de Tecnologias

**User Story:** Como administrador, eu quero gerenciar as tecnologias dos colchões, para que eu possa destacar os diferenciais dos produtos.

#### Acceptance Criteria

1. THE Sistema SHALL suportar 8 tecnologias fixas: Sistema Magnético, Infravermelho Longo, Energia Bioquântica, Vibromassagem, Densidade Progressiva, Cromoterapia, Perfilado High-Tech, Tratamento Sanitário
2. WHEN uma tecnologia é criada, THE Sistema SHALL armazenar nome, descrição e ícone
3. WHEN tecnologias são listadas, THE Sistema SHALL ordenar por ordem de exibição
4. THE Sistema SHALL permitir ativar/desativar tecnologias sem deletá-las
5. WHEN um produto é criado, THE Sistema SHALL associar automaticamente todas as 8 tecnologias

### Requirement 3: Upload de Imagens

**User Story:** Como administrador, eu quero fazer upload de imagens dos produtos, para que clientes possam visualizá-los.

#### Acceptance Criteria

1. WHEN admin faz upload de imagem, THE Sistema SHALL armazenar no Supabase Storage
2. WHEN imagem é enviada, THE Sistema SHALL validar formato (JPEG, PNG, WEBP)
3. WHEN imagem é enviada, THE Sistema SHALL validar tamanho máximo de 5MB
4. WHEN múltiplas imagens são enviadas, THE Sistema SHALL manter ordem de exibição
5. THE Sistema SHALL gerar URL pública para cada imagem armazenada

### Requirement 4: Controle de Estoque

**User Story:** Como administrador, eu quero controlar o estoque dos produtos, para que eu saiba a disponibilidade.

#### Acceptance Criteria

1. WHEN produto é criado, THE Sistema SHALL inicializar estoque com quantidade zero
2. WHEN estoque é atualizado, THE Sistema SHALL registrar movimentação em inventory_logs
3. WHEN estoque é consultado, THE Sistema SHALL retornar quantidade disponível atual
4. THE Sistema SHALL registrar tipo de movimentação (entrada, saída, ajuste, venda)
5. WHEN estoque fica negativo, THE Sistema SHALL permitir mas registrar alerta

### Requirement 5: API Pública de Produtos

**User Story:** Como visitante, eu quero visualizar o catálogo de produtos, para que eu possa conhecer os colchões disponíveis.

#### Acceptance Criteria

1. WHEN visitante acessa GET /api/products, THE Sistema SHALL retornar lista de produtos ativos
2. WHEN produtos são listados, THE Sistema SHALL incluir tecnologias e primeira imagem
3. WHEN visitante acessa GET /api/products/:id, THE Sistema SHALL retornar detalhes completos
4. THE Sistema SHALL permitir acesso sem autenticação às rotas públicas
5. WHEN produtos são listados, THE Sistema SHALL ordenar por popularidade ou preço

### Requirement 6: API Pública de Tecnologias

**User Story:** Como visitante, eu quero conhecer as tecnologias dos colchões, para que eu possa entender os benefícios.

#### Acceptance Criteria

1. WHEN visitante acessa GET /api/technologies, THE Sistema SHALL retornar lista de tecnologias ativas
2. WHEN tecnologias são listadas, THE Sistema SHALL incluir nome, descrição e ícone
3. THE Sistema SHALL permitir acesso sem autenticação
4. WHEN tecnologias são listadas, THE Sistema SHALL ordenar por ordem de exibição
5. THE Sistema SHALL retornar URLs públicas dos ícones

### Requirement 7: API Administrativa de Produtos

**User Story:** Como administrador, eu quero gerenciar produtos via API, para que eu possa manter o catálogo atualizado.

#### Acceptance Criteria

1. WHEN admin cria produto via POST /api/admin/products, THE Sistema SHALL validar dados com Zod
2. WHEN admin atualiza produto via PUT /api/admin/products/:id, THE Sistema SHALL validar permissões
3. WHEN admin deleta produto via DELETE /api/admin/products/:id, THE Sistema SHALL fazer soft delete
4. THE Sistema SHALL exigir autenticação e role admin para rotas administrativas
5. WHEN produto é modificado, THE Sistema SHALL atualizar campo updated_at automaticamente

### Requirement 8: Upload Administrativo de Imagens

**User Story:** Como administrador, eu quero fazer upload de múltiplas imagens por produto, para que eu possa criar galeria completa.

#### Acceptance Criteria

1. WHEN admin faz upload via POST /api/admin/products/:id/images, THE Sistema SHALL validar autenticação
2. WHEN múltiplas imagens são enviadas, THE Sistema SHALL processar em lote
3. WHEN imagem é enviada, THE Sistema SHALL gerar thumbnail automaticamente
4. WHEN imagem é deletada, THE Sistema SHALL remover do Supabase Storage
5. THE Sistema SHALL permitir reordenar imagens via campo display_order

### Requirement 9: Validação de Dados

**User Story:** Como desenvolvedor, eu quero validação robusta de produtos, para que dados inválidos sejam rejeitados.

#### Acceptance Criteria

1. WHEN dados de produto são recebidos, THE Sistema SHALL validar usando schemas Zod
2. WHEN preço é inválido (negativo ou zero), THE Sistema SHALL retornar erro HTTP 400
3. WHEN dimensões são inválidas, THE Sistema SHALL retornar erro HTTP 400
4. WHEN SKU duplicado é detectado, THE Sistema SHALL retornar erro HTTP 409
5. THE Sistema SHALL sanitizar entrada para prevenir SQL injection e XSS

### Requirement 10: Relacionamento Produto-Tecnologia

**User Story:** Como sistema, eu quero manter relacionamento entre produtos e tecnologias, para que dados estejam consistentes.

#### Acceptance Criteria

1. WHEN produto é criado, THE Sistema SHALL criar registros em product_technologies para todas as 8 tecnologias
2. WHEN produto é deletado (soft delete), THE Sistema SHALL manter relacionamentos
3. WHEN tecnologia é desativada, THE Sistema SHALL manter relacionamento mas não exibir
4. THE Sistema SHALL permitir consultar produtos por tecnologia
5. THE Sistema SHALL permitir consultar tecnologias por produto

### Requirement 11: Performance e Cache

**User Story:** Como visitante, eu quero que o catálogo carregue rapidamente, para que eu tenha boa experiência.

#### Acceptance Criteria

1. WHEN produtos são listados, THE Sistema SHALL usar índices de banco para performance
2. WHEN imagens são servidas, THE Sistema SHALL usar URLs do Supabase Storage (CDN)
3. THE Sistema SHALL retornar tempo de resposta menor que 500ms para listagem
4. WHEN produtos são consultados, THE Sistema SHALL usar queries otimizadas com JOINs
5. THE Sistema SHALL incluir apenas campos necessários em listagens (não retornar tudo)

### Requirement 12: Seed de Dados Iniciais

**User Story:** Como desenvolvedor, eu quero dados iniciais de produtos, para que eu possa testar o sistema.

#### Acceptance Criteria

1. THE Sistema SHALL incluir script de seed com os 4 produtos fixos
2. WHEN seed é executado, THE Sistema SHALL criar 8 tecnologias padrão
3. WHEN seed é executado, THE Sistema SHALL associar tecnologias aos produtos
4. WHEN seed é executado, THE Sistema SHALL inicializar estoque com quantidade padrão
5. THE Sistema SHALL permitir executar seed múltiplas vezes sem duplicar dados
