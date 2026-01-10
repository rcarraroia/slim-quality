# Requirements Document

## Introduction

Este documento define os requisitos para a correção estrutural do sistema de afiliados da Slim Quality. O sistema atual apresenta duplicação de estruturas de dados que causam inconsistências críticas entre backend e frontend, resultando em falhas no cálculo de comissões multinível e visualização incorreta da rede de afiliados.

## Glossary

- **Affiliate_System**: Sistema completo de gestão de afiliados e comissões
- **Affiliate**: Pessoa cadastrada no programa de afiliados
- **Referral_Code**: Código único de indicação de cada afiliado
- **Hierarchy**: Estrutura de relacionamento entre afiliados (N1→N2→N3)
- **Split**: Divisão automática de comissões entre afiliados e gestores
- **N1**: Afiliado vendedor direto (15% de comissão)
- **N2**: Indicador do N1 (3% de comissão)
- **N3**: Indicador do N2 (2% de comissão)
- **Manager**: Gestor (Renum ou JB, 5% base cada)
- **Wallet_ID**: Identificador da carteira Asaas para recebimento
- **Materialized_View**: Cache de dados calculados para performance

## Requirements

### Requirement 1: Consolidação da Estrutura de Dados

**User Story:** Como sistema, eu quero manter a hierarquia de afiliados em uma única estrutura de dados, para que backend e frontend trabalhem com informações consistentes.

#### Acceptance Criteria

1. THE Affiliate_System SHALL usar `affiliates.referred_by` como fonte única de verdade para hierarquia
2. THE Affiliate_System SHALL remover a tabela `affiliate_network` redundante
3. THE Affiliate_System SHALL criar view materializada `affiliate_hierarchy` para performance
4. WHEN um afiliado é criado, atualizado ou removido, THEN THE Affiliate_System SHALL atualizar automaticamente a view materializada
5. THE Affiliate_System SHALL manter índices otimizados para queries recursivas

### Requirement 2: Cálculo de Comissões Multinível

**User Story:** Como sistema de pagamentos, eu quero calcular comissões para N1, N2 e N3 corretamente, para que todos os afiliados recebam suas comissões devidas.

#### Acceptance Criteria

1. WHEN uma venda é confirmada com código de afiliado, THEN THE Affiliate_System SHALL identificar o afiliado N1 via `referred_by`
2. WHEN N1 tem indicador, THEN THE Affiliate_System SHALL identificar N2 recursivamente via `referred_by`
3. WHEN N2 tem indicador, THEN THE Affiliate_System SHALL identificar N3 recursivamente via `referred_by`
4. THE Affiliate_System SHALL calcular split com N1=15%, N2=3%, N3=2%
5. WHEN níveis não existem, THEN THE Affiliate_System SHALL redistribuir percentuais não utilizados igualmente entre gestores
6. THE Affiliate_System SHALL garantir que soma total de comissões = 30% do valor da venda
7. THE Affiliate_System SHALL registrar todas as comissões na tabela `commissions`

### Requirement 3: Rastreamento de Código de Referência

**User Story:** Como sistema de rastreamento, eu quero armazenar códigos de referência em formato estruturado, para que possam ser validados e recuperados corretamente.

#### Acceptance Criteria

1. WHEN um visitante acessa link com código de referência, THEN THE Affiliate_System SHALL salvar dados em formato JSON
2. THE Affiliate_System SHALL incluir no JSON: code, timestamp e expiry
3. THE Affiliate_System SHALL salvar dados em localStorage E cookie
4. THE Affiliate_System SHALL configurar expiração de 30 dias
5. WHEN código é recuperado, THEN THE Affiliate_System SHALL validar expiração
6. WHEN código expirou, THEN THE Affiliate_System SHALL remover dados e retornar null

### Requirement 4: Visualização da Rede de Afiliados

**User Story:** Como afiliado, eu quero visualizar minha rede completa de indicados (N1, N2, N3), para que possa acompanhar o crescimento da minha rede.

#### Acceptance Criteria

1. WHEN afiliado acessa dashboard, THEN THE Affiliate_System SHALL exibir contadores de N1, N2 e N3
2. THE Affiliate_System SHALL buscar dados da view materializada `affiliate_hierarchy`
3. THE Affiliate_System SHALL exibir árvore hierárquica visual com todos os níveis
4. THE Affiliate_System SHALL mostrar nome, email e status de cada indicado
5. THE Affiliate_System SHALL responder em menos de 200ms

### Requirement 5: Criação de Afiliados

**User Story:** Como sistema de cadastro, eu quero criar afiliados com hierarquia correta, para que a estrutura de comissões funcione adequadamente.

#### Acceptance Criteria

1. WHEN afiliado é criado sem código de indicação, THEN THE Affiliate_System SHALL criar com `referred_by` NULL
2. WHEN afiliado é criado com código de indicação válido, THEN THE Affiliate_System SHALL preencher `referred_by` com ID do indicador
3. WHEN código de indicação é inválido, THEN THE Affiliate_System SHALL rejeitar cadastro com erro descritivo
4. WHEN indicador não está ativo, THEN THE Affiliate_System SHALL rejeitar cadastro
5. THE Affiliate_System SHALL gerar código de referência único para novo afiliado
6. THE Affiliate_System SHALL criar afiliado com status 'pending'

### Requirement 6: Integridade de Dados

**User Story:** Como sistema, eu quero garantir integridade dos dados de hierarquia, para que não ocorram inconsistências ou loops.

#### Acceptance Criteria

1. THE Affiliate_System SHALL validar que não existem loops na hierarquia (A→B→A)
2. THE Affiliate_System SHALL garantir que `referred_by` sempre aponta para afiliado existente
3. WHEN afiliado é removido, THEN THE Affiliate_System SHALL configurar `referred_by` dos filhos como NULL
4. THE Affiliate_System SHALL manter constraints de foreign key
5. THE Affiliate_System SHALL validar hierarquia antes de aplicar migrations

### Requirement 7: Performance do Sistema

**User Story:** Como sistema, eu quero manter performance adequada nas queries de hierarquia, para que usuários tenham experiência fluida.

#### Acceptance Criteria

1. THE Affiliate_System SHALL responder queries de rede em menos de 200ms
2. THE Affiliate_System SHALL usar view materializada para evitar queries recursivas em tempo real
3. THE Affiliate_System SHALL atualizar view materializada em menos de 1 segundo
4. THE Affiliate_System SHALL manter índices otimizados em `referred_by` e `affiliate_hierarchy`

### Requirement 8: Migração de Dados

**User Story:** Como sistema, eu quero migrar dados existentes sem perda de informação, para que afiliados atuais não sejam afetados.

#### Acceptance Criteria

1. WHEN migration é executada, THEN THE Affiliate_System SHALL sincronizar dados de `affiliate_network` para `referred_by`
2. THE Affiliate_System SHALL criar backup de `affiliate_network` antes de remover
3. THE Affiliate_System SHALL validar contagem de registros antes e depois da migration
4. WHEN migration falha, THEN THE Affiliate_System SHALL permitir rollback completo
5. THE Affiliate_System SHALL registrar logs detalhados de todas as operações

### Requirement 9: Limpeza de Código

**User Story:** Como desenvolvedor, eu quero código limpo sem duplicação, para que manutenção futura seja facilitada.

#### Acceptance Criteria

1. THE Affiliate_System SHALL remover arquivo duplicado `src/utils/referral-tracker.ts`
2. THE Affiliate_System SHALL centralizar lógica em `affiliate.service.ts`
3. THE Affiliate_System SHALL atualizar todos os imports para usar service centralizado
4. THE Affiliate_System SHALL remover código morto relacionado a `affiliate_network`

### Requirement 10: Validação e Testes

**User Story:** Como sistema, eu quero testes automatizados que garantam funcionamento correto, para que bugs sejam detectados precocemente.

#### Acceptance Criteria

1. THE Affiliate_System SHALL ter testes de integração para fluxo completo de rastreamento→cadastro→venda→split
2. THE Affiliate_System SHALL ter testes unitários para cálculo de split
3. THE Affiliate_System SHALL ter testes para criação de hierarquia N1→N2→N3
4. THE Affiliate_System SHALL ter testes para redistribuição de comissões
5. THE Affiliate_System SHALL ter cobertura de testes superior a 80%
