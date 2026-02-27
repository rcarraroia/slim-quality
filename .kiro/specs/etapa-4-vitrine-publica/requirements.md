# Requirements Document - ETAPA 4: Perfil da Loja e Vitrine Pública

## Introduction

Este documento especifica os requisitos para a ETAPA 4 do sistema de diferenciação de perfis de afiliados do Slim Quality. O objetivo é permitir que Logistas configurem um perfil de loja completo e apareçam em uma vitrine pública de descoberta, com funcionalidades de busca e geolocalização.

A ETAPA 1 criou o campo `affiliate_type` que diferencia Individual de Logista. Esta etapa implementa funcionalidades exclusivas para Logistas: perfil de loja configurável e visibilidade em vitrine pública com busca geolocalizada.

**⚠️ DEPENDÊNCIAS:**

Esta etapa depende de:
- ETAPA 1 concluída (campo `affiliate_type` existente)
- PostGIS habilitado no Supabase
- API CEP Aberto para geocodificação

## Glossary

- **Logista**: Tipo de afiliado loja física parceira que revende produtos
- **Perfil de Loja**: Conjunto de informações sobre a loja física (nome, endereço, imagens)
- **Vitrine Pública**: Página pública que exibe lojas parceiras para visitantes
- **Geocodificação**: Conversão de endereço (CEP) em coordenadas geográficas (lat/lng)
- **PostGIS**: Extensão do PostgreSQL para dados geoespaciais
- **API CEP Aberto**: API gratuita para geocodificação via CEP
- **Raio de Busca**: Distância máxima para filtrar lojas próximas (25km, 50km, 100km, 200km)
- **Switch de Visibilidade**: Controle que permite Logista ativar/desativar aparição na vitrine
- **Perfil Mínimo**: Requisitos mínimos para aparecer na vitrine (nome, cidade, estado, banner)
- **Slug**: Identificador único da loja usado no link de indicação

## Requirements

### Requirement 1: Seção "Perfil da Loja" no Painel Logista

**User Story:** Como Logista, eu quero configurar o perfil da minha loja no painel, para que eu possa fornecer informações completas aos visitantes da vitrine.

#### Acceptance Criteria

1. THE Sistema SHALL criar seção "Perfil da Loja" no painel do Logista
2. THE Seção SHALL ser acessível apenas para afiliados com `affiliate_type='logista'`
3. THE Seção SHALL exibir formulário com campos:
   - Nome da Loja (obrigatório, max 100 caracteres)
   - Endereço Completo (obrigatório, max 200 caracteres)
   - Cidade (obrigatório, max 100 caracteres)
   - Estado (obrigatório, select com UFs brasileiras)
   - CEP (obrigatório, formato 00000-000)
   - Telefone/WhatsApp (opcional, formato (00) 00000-0000)
   - Upload de Logomarca (opcional, max 2MB, formatos: jpg, png, webp)
   - Upload de Banner (obrigatório, max 5MB, formatos: jpg, png, webp)
   - Switch "Aparecer na Vitrine" (padrão: desativado)
4. THE Formulário SHALL validar todos os campos antes de salvar
5. THE Formulário SHALL exibir preview das imagens após upload
6. THE Formulário SHALL permitir remover imagens já enviadas
7. THE Formulário SHALL salvar dados na tabela `store_profiles`
8. THE Formulário SHALL exibir toast de sucesso após salvar
9. THE Formulário SHALL exibir toast de erro se falhar
10. THE Formulário SHALL ter botão "Salvar Alterações" com loading state

### Requirement 2: Validação de Perfil Mínimo

**User Story:** Como sistema, eu quero validar que o Logista preencheu o perfil mínimo antes de permitir ativação do switch de visibilidade, para que a vitrine exiba apenas lojas com informações completas.

#### Acceptance Criteria

1. THE Sistema SHALL definir perfil mínimo como: nome, cidade, estado, banner
2. THE Switch "Aparecer na Vitrine" SHALL estar desabilitado se perfil mínimo não preenchido
3. WHEN perfil mínimo não preenchido, THEN THE Sistema SHALL exibir tooltip: "Complete o perfil mínimo para aparecer na vitrine"
4. WHEN perfil mínimo preenchido, THEN THE Switch SHALL estar habilitado
5. THE Sistema SHALL validar perfil mínimo ao carregar a página
6. THE Sistema SHALL revalidar perfil mínimo após salvar alterações
7. THE Sistema SHALL exibir indicador visual de campos obrigatórios faltantes
8. THE Sistema SHALL exibir mensagem clara sobre requisitos mínimos

### Requirement 3: Upload e Armazenamento de Imagens

**User Story:** Como Logista, eu quero fazer upload de logomarca e banner da minha loja, para que minha loja tenha identidade visual na vitrine.

#### Acceptance Criteria

1. THE Sistema SHALL usar Supabase Storage para armazenar imagens
2. THE Sistema SHALL criar bucket `store-images` se não existir
3. THE Sistema SHALL organizar imagens em pastas: `logos/` e `banners/`
4. THE Sistema SHALL nomear arquivos como: `{affiliate_id}_logo.{ext}` e `{affiliate_id}_banner.{ext}`
5. THE Sistema SHALL validar tamanho máximo: 2MB para logo, 5MB para banner
6. THE Sistema SHALL validar formatos permitidos: jpg, png, webp
7. THE Sistema SHALL comprimir imagens antes de upload (qualidade 85%)
8. THE Sistema SHALL gerar URL pública após upload
9. THE Sistema SHALL salvar URL no banco de dados
10. THE Sistema SHALL permitir substituir imagem existente
11. THE Sistema SHALL deletar imagem antiga ao substituir
12. THE Sistema SHALL exibir progress bar durante upload

### Requirement 4: Geocodificação Automática

**User Story:** Como sistema, eu quero converter o CEP informado pelo Logista em coordenadas geográficas, para que a busca por proximidade funcione corretamente.

#### Acceptance Criteria

1. THE Sistema SHALL usar API Brasil Aberto para geocodificação
2. THE Sistema SHALL extrair CEP do campo "CEP" do formulário
3. THE Sistema SHALL chamar API: `https://api.brasilaberto.com/v2/zipcode/{zipcode}`
4. THE Sistema SHALL receber lat/lng da API
5. THE Sistema SHALL salvar coordenadas na coluna `location` (geography type)
6. THE Geocodificação SHALL ocorrer automaticamente ao salvar perfil
7. IF API Brasil Aberto falhar, THEN THE Sistema SHALL exibir aviso mas permitir salvar
8. IF CEP inválido, THEN THE Sistema SHALL exibir erro e não permitir salvar
9. THE Sistema SHALL registrar em logs tentativas de geocodificação
10. THE Sistema SHALL ter retry automático (máximo 3 tentativas) se API falhar

### Requirement 5: Vitrine Pública - Página e Layout

**User Story:** Como visitante, eu quero acessar uma vitrine pública de lojas parceiras, para que eu possa descobrir lojas físicas próximas a mim.

#### Acceptance Criteria

1. THE Sistema SHALL criar página pública em `/lojas`
2. THE Página SHALL ser acessível sem necessidade de login
3. THE Página SHALL ser acessível pelo menu principal do site
4. THE Página SHALL ter título "Lojas Parceiras" e descrição clara
5. THE Página SHALL exibir grid de cards de lojas (4-5 colunas em desktop)
6. THE Grid SHALL ser responsivo (1 coluna em mobile, 2 em tablet, 4-5 em desktop)
7. THE Card SHALL exibir: banner, nome da loja, cidade/estado, botão
8. THE Card SHALL ter hover effect (elevação e borda)
9. THE Botão SHALL ter texto "Comprar Desta Loja"
10. THE Página SHALL exibir loading state durante carregamento
11. WHEN não há lojas, THEN THE Página SHALL exibir mensagem: "Nenhuma loja parceira disponível no momento."
12. THE Página SHALL seguir design system do projeto (shadcn/ui)

### Requirement 6: Busca e Filtros

**User Story:** Como visitante, eu quero buscar lojas por nome, cidade ou estado, para que eu possa encontrar lojas específicas facilmente.

#### Acceptance Criteria

1. THE Página SHALL ter campo de busca por nome da loja
2. THE Página SHALL ter select de filtro por cidade
3. THE Página SHALL ter select de filtro por estado
4. THE Busca SHALL ser case-insensitive
5. THE Busca SHALL filtrar em tempo real (debounce de 300ms)
6. THE Filtros SHALL ser cumulativos (busca + cidade + estado)
7. THE Sistema SHALL popular selects de cidade/estado dinamicamente
8. THE Sistema SHALL ordenar cidades e estados alfabeticamente
9. THE Sistema SHALL exibir contador: "X lojas encontradas"
10. THE Sistema SHALL ter botão "Limpar Filtros"

### Requirement 7: Geolocalização e Busca por Raio

**User Story:** Como visitante, eu quero ver lojas próximas a mim, para que eu possa encontrar a loja mais conveniente.

#### Acceptance Criteria

1. THE Página SHALL solicitar permissão de localização ao visitante
2. IF permissão aceita, THEN THE Sistema SHALL obter coordenadas do visitante
3. IF permissão aceita, THEN THE Sistema SHALL exibir lojas num raio padrão de 50km
4. THE Sistema SHALL ordenar lojas por proximidade (mais próxima primeiro)
5. THE Sistema SHALL exibir distância em cada card: "A X km de você"
6. THE Sistema SHALL ter select de raio: 25km / 50km / 100km / 200km / Todo Brasil
7. IF permissão negada, THEN THE Sistema SHALL exibir todas as lojas ordenadas por estado/cidade
8. THE Sistema SHALL usar função `ST_Distance` do PostGIS para calcular distância
9. THE Sistema SHALL converter distância de metros para km
10. THE Sistema SHALL arredondar distância para 1 casa decimal

### Requirement 8: Redirecionamento com Rastreamento

**User Story:** Como sistema, eu quero rastrear a origem da venda quando visitante clica em "Comprar Desta Loja", para que o Logista receba comissão corretamente.

#### Acceptance Criteria

1. THE Botão "Comprar Desta Loja" SHALL redirecionar para site principal
2. THE URL SHALL incluir parâmetro: `?ref={slug_do_lojista}`
3. THE Slug SHALL ser único por loja (gerado a partir do nome)
4. THE Sistema SHALL exibir mensagem no site: "Você está comprando diretamente da fábrica indicado pela loja [NOME]"
5. THE Sistema SHALL salvar origem da venda no banco
6. THE Sistema SHALL associar venda ao Logista correto
7. THE Sistema SHALL registrar click no link em analytics
8. THE Redirecionamento SHALL abrir em nova aba
9. THE Sistema SHALL validar que slug existe antes de redirecionar

### Requirement 9: Controle de Visibilidade

**User Story:** Como Logista, eu quero controlar se minha loja aparece na vitrine pública, para que eu possa desativar temporariamente se necessário.

#### Acceptance Criteria

1. THE Switch "Aparecer na Vitrine" SHALL controlar visibilidade na vitrine
2. WHEN switch ativado AND perfil mínimo preenchido, THEN loja aparece na vitrine
3. WHEN switch desativado, THEN loja NÃO aparece na vitrine
4. WHEN perfil mínimo não preenchido, THEN switch fica desabilitado
5. THE Sistema SHALL salvar estado do switch na coluna `is_visible_in_showcase`
6. THE Sistema SHALL atualizar visibilidade imediatamente após mudança
7. THE Sistema SHALL exibir toast confirmando mudança
8. THE Logista SHALL poder ativar/desativar quantas vezes quiser
9. THE Sistema SHALL registrar histórico de mudanças de visibilidade

### Requirement 10: PostGIS e Estrutura de Banco

**User Story:** Como sistema, eu quero usar PostGIS para funcionalidades geoespaciais, para que a busca por raio seja eficiente e precisa.

#### Acceptance Criteria

1. THE Sistema SHALL habilitar extensão PostGIS no Supabase
2. THE Sistema SHALL criar tabela `store_profiles` com campos:
   - id (uuid, PK)
   - affiliate_id (uuid, FK para affiliates, UNIQUE)
   - store_name (text, NOT NULL)
   - address (text, NOT NULL)
   - city (text, NOT NULL)
   - state (text, NOT NULL)
   - zip_code (text, NOT NULL)
   - phone (text, NULL)
   - logo_url (text, NULL)
   - banner_url (text, NOT NULL)
   - location (geography(Point, 4326), NULL)
   - is_visible_in_showcase (boolean, DEFAULT false)
   - slug (text, UNIQUE, NOT NULL)
   - created_at (timestamptz, DEFAULT now())
   - updated_at (timestamptz, DEFAULT now())
3. THE Sistema SHALL criar índice espacial: `CREATE INDEX idx_store_profiles_location ON store_profiles USING GIST (location);`
4. THE Sistema SHALL criar índice: `CREATE INDEX idx_store_profiles_visible ON store_profiles (is_visible_in_showcase) WHERE is_visible_in_showcase = true;`
5. THE Sistema SHALL criar trigger para atualizar `updated_at`
6. THE Sistema SHALL criar função para gerar slug único
7. THE Sistema SHALL validar que PostGIS está habilitado antes de criar tabela

## Notas de Implementação

### Ordem de Implementação Recomendada

1. **Primeiro**: Habilitar PostGIS e criar tabela `store_profiles` (Requirement 10)
2. **Segundo**: Criar seção "Perfil da Loja" no painel (Requirement 1)
3. **Terceiro**: Implementar upload de imagens (Requirement 3)
4. **Quarto**: Implementar geocodificação (Requirement 4)
5. **Quinto**: Implementar validação de perfil mínimo (Requirement 2)
6. **Sexto**: Criar vitrine pública (Requirement 5)
7. **Sétimo**: Implementar busca e filtros (Requirement 6)
8. **Oitavo**: Implementar geolocalização (Requirement 7)
9. **Nono**: Implementar redirecionamento (Requirement 8)
10. **Décimo**: Implementar controle de visibilidade (Requirement 9)

### Dependências Externas

- ETAPA 1 completa (campo `affiliate_type`)
- Supabase PostgreSQL com PostGIS
- Supabase Storage para imagens
- API Brasil Aberto (https://api.brasilaberto.com)
- Geolocation API do navegador

### Arquivos Principais a Criar/Modificar

**Frontend:**
- `src/pages/afiliados/dashboard/PerfilLoja.tsx` - Nova página (painel Logista)
- `src/pages/public/Lojas.tsx` - Nova página (vitrine pública)
- `src/services/store-profiles.service.ts` - Novo serviço
- `src/services/geocoding.service.ts` - Novo serviço
- `src/components/StoreCard.tsx` - Novo componente
- `src/App.tsx` - Adicionar rotas

**Backend:**
- `api/store-profiles.js` - Nova Serverless Function
- `supabase/migrations/YYYYMMDDHHMMSS_create_store_profiles.sql` - Nova migration

### Testes Críticos

1. **Upload de Imagens**: Verificar que imagens são salvas corretamente no Storage
2. **Geocodificação**: Verificar que CEP é convertido em lat/lng
3. **Perfil Mínimo**: Verificar que switch só habilita com perfil completo
4. **Busca por Raio**: Verificar que lojas são filtradas corretamente por distância
5. **Redirecionamento**: Verificar que ref é passado corretamente na URL
6. **Visibilidade**: Verificar que switch controla aparição na vitrine

### Riscos e Mitigações

**Risco 1: API Brasil Aberto indisponível**
- Mitigação: Permitir salvar perfil sem geocodificação
- Mitigação: Retry automático com backoff exponencial
- Mitigação: Logs detalhados de falhas

**Risco 2: Geolocalização imprecisa**
- Mitigação: Validar coordenadas retornadas pela API
- Mitigação: Permitir correção manual de coordenadas pelo admin
- Mitigação: Fallback para busca sem geolocalização

**Risco 3: Upload de imagens grandes**
- Mitigação: Validar tamanho antes de upload
- Mitigação: Comprimir imagens automaticamente
- Mitigação: Exibir progress bar durante upload

## Critérios de Conclusão da ETAPA 4

A ETAPA 4 estará completa quando:

- ✅ Todos os 10 requirements estiverem implementados
- ✅ PostGIS habilitado e tabela criada
- ✅ Seção "Perfil da Loja" funcionando
- ✅ Upload de imagens funcionando
- ✅ Geocodificação funcionando
- ✅ Vitrine pública acessível e funcionando
- ✅ Busca e filtros funcionando
- ✅ Geolocalização com raios funcionando
- ✅ Redirecionamento com ref funcionando
- ✅ Controle de visibilidade funcionando
- ✅ Zero erros de TypeScript/ESLint
- ✅ Testes de integração passando
- ✅ Documentação atualizada

## Próximas Etapas (Fora do Escopo)

Esta especificação NÃO inclui:

- ❌ Sistema de monetização (ETAPA 5)
- ❌ Controle de inadimplência (ETAPA 5)
- ❌ Notificações de novos Logistas
- ❌ Sistema de avaliações de lojas
- ❌ Chat entre visitante e Logista

Estas funcionalidades serão implementadas nas etapas subsequentes ou em sprints futuros.
