# Requirements Document - Correção de Visualização de Rede

## Introduction

Correção da visualização de rede de afiliados nos painéis Admin e Afiliado, incluindo correção de bugs nas queries e melhorias de UX/UI para organogramas hierárquicos.

## Glossary

- **System**: Sistema de visualização de rede de afiliados
- **Admin**: Usuário administrador do sistema
- **Affiliate**: Usuário afiliado do sistema
- **Network_Tree**: Estrutura hierárquica de afiliados
- **Root_Affiliate**: Afiliado sem indicador (referred_by IS NULL)
- **Descendant**: Afiliado indicado direta ou indiretamente
- **Depth_Level**: Profundidade na árvore (0=raiz, 1=filho, 2=neto, etc)

## Requirements

### Requirement 1: Correção de Queries de Rede

**User Story:** Como desenvolvedor, quero que as queries de rede usem o campo `path` corretamente, para que a hierarquia seja exibida sem erros.

#### Acceptance Criteria

1. WHEN buscando rede de um afiliado THEN THE System SHALL usar o campo `path` da view `affiliate_hierarchy`
2. WHEN afiliado Giuseppe busca sua rede THEN THE System SHALL retornar Maria como seu N1
3. WHEN afiliado Beatriz busca sua rede THEN THE System SHALL retornar Giuseppe (N1) e Maria (N2)
4. THE System SHALL NOT usar `root_id` para filtrar descendentes diretos
5. WHEN construindo árvore THEN THE System SHALL usar o array `path` para determinar hierarquia

### Requirement 2: Remoção de Coluna "Nível" no Admin

**User Story:** Como administrador, quero ver uma lista simples de afiliados sem coluna "Nível", porque o nível é relativo e não faz sentido numa lista plana.

#### Acceptance Criteria

1. WHEN Admin acessa "Lista de Afiliados" THEN THE System SHALL NOT exibir coluna "Nível"
2. THE System SHALL manter colunas: Afiliado, Contato, Cadastro, Saldo Disponível, Saldo Pendente, Status, Ações
3. WHEN exibindo dados THEN THE System SHALL NOT calcular ou exibir nível relativo
4. THE System SHALL manter funcionalidade de busca, filtros e exportação

### Requirement 3: Página "Minha Rede" no Admin

**User Story:** Como administrador, quero visualizar toda a rede de afiliados em um organograma hierárquico, para entender a estrutura completa.

#### Acceptance Criteria

1. WHEN Admin acessa "Minha Rede" THEN THE System SHALL exibir organograma com empresa como raiz
2. THE System SHALL exibir todos os afiliados raiz (referred_by IS NULL) como filhos diretos da empresa
3. THE System SHALL exibir profundidade ilimitada (todos os níveis)
4. WHEN exibindo organograma THEN THE System SHALL permitir expandir/recolher nós
5. THE System SHALL exibir cards de resumo: Total Afiliados, Ativos, Comissões Pagas, Vendas Geradas
6. WHEN buscando na rede THEN THE System SHALL filtrar afiliados por nome
7. THE System SHALL exibir para cada afiliado: nome, email, status, vendas, comissões geradas

### Requirement 4: Limitação de Profundidade no Painel Afiliado

**User Story:** Como afiliado, quero ver apenas meus indicados diretos (N1) e os indicados deles (N2), para focar nas comissões que recebo.

#### Acceptance Criteria

1. WHEN Afiliado acessa "Minha Rede" THEN THE System SHALL exibir organograma com afiliado como raiz
2. THE System SHALL exibir máximo 2 níveis de profundidade abaixo do afiliado
3. WHEN afiliado tem N1, N2 e N3 THEN THE System SHALL exibir apenas N1 e N2
4. THE System SHALL NOT exibir N3 (indicados dos indicados dos indicados)
5. WHEN calculando totais THEN THE System SHALL contar apenas N1 e N2
6. THE System SHALL exibir cards de resumo: Nível 1 (Diretos), Nível 2, Total Gerado

### Requirement 5: Consistência de UX/UI

**User Story:** Como usuário, quero que as novas telas mantenham o padrão visual existente, para ter uma experiência consistente.

#### Acceptance Criteria

1. THE System SHALL usar componentes UI existentes (Card, Button, Input, Table)
2. THE System SHALL manter paleta de cores do design system
3. THE System SHALL manter estrutura de navegação existente
4. WHEN exibindo organograma THEN THE System SHALL usar estilo visual similar ao existente
5. THE System SHALL manter responsividade mobile/desktop
6. THE System SHALL usar ícones consistentes com o resto do sistema

### Requirement 6: Performance de Queries

**User Story:** Como usuário, quero que a visualização da rede carregue rapidamente, para ter uma experiência fluida.

#### Acceptance Criteria

1. WHEN carregando rede THEN THE System SHALL responder em menos de 500ms
2. THE System SHALL usar view materializada `affiliate_hierarchy` (já otimizada)
3. WHEN rede tem mais de 100 afiliados THEN THE System SHALL manter performance aceitável
4. THE System SHALL usar índices existentes na view (id, root_id, level, path)
5. THE System SHALL carregar dados de forma incremental se necessário

### Requirement 7: Tratamento de Erros

**User Story:** Como usuário, quero ver mensagens claras quando houver erros, para entender o que aconteceu.

#### Acceptance Criteria

1. WHEN query falha THEN THE System SHALL exibir mensagem de erro amigável
2. WHEN rede está vazia THEN THE System SHALL exibir estado vazio com orientação
3. WHEN busca não retorna resultados THEN THE System SHALL exibir mensagem apropriada
4. THE System SHALL registrar erros no console para debug
5. THE System SHALL permitir retry em caso de erro temporário

### Requirement 8: Navegação e Rotas

**User Story:** Como usuário, quero acessar facilmente a visualização de rede, através do menu de navegação.

#### Acceptance Criteria

1. WHEN Admin acessa menu "Afiliados" THEN THE System SHALL exibir opção "Minha Rede"
2. THE System SHALL criar rota `/dashboard/afiliados/minha-rede` para admin
3. THE System SHALL manter rota `/afiliados/dashboard/minha-rede` para afiliado
4. WHEN navegando entre páginas THEN THE System SHALL manter estado de autenticação
5. THE System SHALL aplicar proteção de rota (apenas usuários autorizados)

## Validation Criteria

- Todas as queries devem usar `path` ao invés de `root_id`
- Beatriz deve ver Giuseppe e Maria na sua rede
- Giuseppe deve ver apenas Maria na sua rede
- Maria deve ver rede vazia (ainda não indicou ninguém)
- Admin deve ver organograma completo com empresa como raiz
- Coluna "Nível" deve estar removida da lista de afiliados
- Performance deve ser < 500ms para redes de até 100 afiliados
- UX/UI deve manter padrão visual existente
