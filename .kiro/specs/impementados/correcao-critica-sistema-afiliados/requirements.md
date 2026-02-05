# Requirements Document - Correção Completa do Sistema de Afiliados

## Introduction

Este documento especifica os requisitos para correção de **TODOS os 14 problemas** identificados na auditoria técnica do sistema de afiliados Slim Quality, realizada em 10/01/2026:

- **7 Problemas Críticos** (impedem funcionamento correto)
- **4 Problemas Altos** (causam bugs frequentes)
- **3 Problemas Médios** (causam inconsistências)

**Contexto:** O sistema possui múltiplas fontes de verdade para os mesmos dados, causando dessincronização entre frontend/backend e perda de rastreamento de indicações.

**Impacto Atual:** Comissões calculadas não correspondem à rede exibida ao afiliado, indicações são perdidas, e o sistema não é confiável.

## Glossary

- **Affiliate**: Afiliado cadastrado no sistema
- **Referral_Code**: Código único de indicação do afiliado
- **Referred_By**: Coluna que armazena quem indicou o afiliado (UUID do ascendente direto)
- **Affiliate_Network**: Tabela que armazena árvore genealógica completa
- **Vendedor**: Afiliado que realizou a venda diretamente (recebe 15%)
- **N1 (Ascendente Nível 1)**: Afiliado que indicou o vendedor (recebe 3%)
- **N2 (Ascendente Nível 2)**: Afiliado que indicou o N1 (recebe 2%)
- **N3 (Ascendente Nível 3)**: Afiliado que indicou o N2 (não recebe comissão)
- **Ascendente**: Afiliado que está acima na hierarquia (quem indicou)
- **Descendente**: Afiliado que está abaixo na hierarquia (quem foi indicado)
- **Commission_Split**: Divisão de comissões entre afiliados e gestores (30% do valor total)
- **Wallet_ID**: Identificador da carteira Asaas do afiliado (formato `wal_XXXXX`)
- **RLS**: Row Level Security (políticas de segurança do PostgreSQL)
- **LocalStorage**: Armazenamento local do navegador
- **Rede Genealógica**: Estrutura hierárquica de afiliados (quem indicou quem)

## Requirements

### Requirement 1: Fonte Única de Verdade para Rede Genealógica

**User Story:** Como desenvolvedor, eu quero uma única fonte de verdade para a rede genealógica de afiliados, para que não haja dessincronização entre frontend e backend.

#### Acceptance Criteria

1. WHEN o sistema armazena informação de rede genealógica THEN THE System SHALL usar APENAS a coluna `affiliates.referred_by`
2. WHEN o frontend busca a rede de um afiliado THEN THE System SHALL consultar `affiliates.referred_by` usando query recursiva
3. WHEN o backend calcula comissões THEN THE System SHALL usar `affiliates.referred_by` para identificar N1, N2 e N3
4. WHEN a tabela `affiliate_network` for consultada THEN THE System SHALL retornar dados derivados de `affiliates.referred_by` através de VIEW
5. THE System SHALL deprecar a tabela `affiliate_network` como fonte de dados

### Requirement 2: Sincronização de Colunas Duplicadas

**User Story:** Como administrador do sistema, eu quero eliminar colunas duplicadas, para que não haja inconsistência de dados.

#### Acceptance Criteria

1. WHEN a migration de correção for executada THEN THE System SHALL copiar todos os dados de `parent_affiliate_id` para `parent_id`
2. WHEN a sincronização for concluída THEN THE System SHALL remover a coluna `parent_affiliate_id`
3. WHEN queries antigas usarem `parent_affiliate_id` THEN THE System SHALL falhar com erro claro indicando uso de coluna depreciada
4. THE System SHALL validar que nenhum dado foi perdido durante a migração

### Requirement 3: Padronização de Chave LocalStorage

**User Story:** Como afiliado, eu quero que minhas indicações sejam rastreadas corretamente, para que eu receba crédito por todas as vendas que gerei.

#### Acceptance Criteria

1. WHEN o sistema salva código de referência no localStorage THEN THE System SHALL usar SEMPRE a chave `slim_referral_code`
2. WHEN o sistema lê código de referência do localStorage THEN THE System SHALL buscar SEMPRE a chave `slim_referral_code`
3. WHEN um usuário clica em link de afiliado THEN THE System SHALL persistir o código em `localStorage['slim_referral_code']`
4. WHEN um usuário se cadastra THEN THE System SHALL recuperar o código de `localStorage['slim_referral_code']`
5. THE System SHALL definir constante `REFERRAL_CODE_KEY = 'slim_referral_code'` em arquivo de configuração

### Requirement 4: Políticas RLS Corretas para Visualização de Rede

**User Story:** Como afiliado, eu quero visualizar minha rede de indicados no painel, para que eu possa acompanhar meu desempenho.

#### Acceptance Criteria

1. WHEN um afiliado acessa a página "Minha Rede" THEN THE System SHALL exibir todos os seus indicados diretos (N1)
2. WHEN um afiliado busca sua rede THEN THE RLS_Policy SHALL permitir SELECT onde `referred_by = afiliado_logado.id`
3. WHEN um afiliado busca descendentes THEN THE RLS_Policy SHALL permitir SELECT recursivo até nível 3
4. WHEN um afiliado tenta ver rede de outro afiliado THEN THE RLS_Policy SHALL bloquear o acesso
5. THE System SHALL manter RLS ativa em TODAS as tabelas de afiliados

### Requirement 5: Sincronização Automática de Estruturas

**User Story:** Como desenvolvedor, eu quero que as estruturas de dados sejam sincronizadas automaticamente, para que não haja erro humano.

#### Acceptance Criteria

1. WHEN `affiliates.referred_by` for atualizado THEN THE Trigger SHALL atualizar automaticamente a VIEW `affiliate_network_view`
2. WHEN um novo afiliado for criado com `referred_by` THEN THE System SHALL garantir consistência imediata
3. WHEN um afiliado for removido (soft delete) THEN THE System SHALL manter integridade referencial
4. THE System SHALL logar TODAS as sincronizações em tabela de auditoria

### Requirement 6: Validação Real de Wallet ID

**User Story:** Como administrador, eu quero validar Wallet IDs com a API Asaas, para que apenas carteiras válidas sejam cadastradas.

#### Acceptance Criteria

1. WHEN um afiliado cadastra Wallet ID THEN THE System SHALL validar com API Asaas antes de salvar
2. WHEN a API Asaas retorna wallet inválida THEN THE System SHALL bloquear cadastro com mensagem clara
3. WHEN a API Asaas retorna wallet válida THEN THE System SHALL permitir cadastro
4. WHEN a validação falhar por erro de rede THEN THE System SHALL permitir cadastro temporário e validar depois
5. THE System SHALL remover TODA validação mock de Wallet ID

### Requirement 7: Integração de Referral Code no Checkout

**User Story:** Como afiliado, eu quero receber comissões automaticamente quando alguém compra usando meu link, para que eu seja recompensado pelas vendas geradas.

#### Acceptance Criteria

1. WHEN o checkout recebe `referralCode` THEN THE System SHALL buscar o afiliado correspondente (vendedor)
2. WHEN o vendedor for encontrado THEN THE System SHALL associar o pedido ao vendedor
3. WHEN o pagamento for confirmado THEN THE System SHALL buscar ascendentes do vendedor (N1 = quem indicou vendedor, N2 = quem indicou N1)
4. WHEN os ascendentes forem identificados THEN THE System SHALL calcular split: Vendedor 15%, N1 3%, N2 2%, Gestores 10%
5. WHEN o split for calculado THEN THE System SHALL enviar para API Asaas
6. WHEN o split for confirmado THEN THE System SHALL registrar comissões na tabela `commissions`
7. THE System SHALL logar TODO o processo de cálculo de comissões

### Requirement 8: Logs de Auditoria Completos

**User Story:** Como administrador, eu quero logs completos de todas as operações financeiras, para que eu possa auditar e debugar problemas.

#### Acceptance Criteria

1. WHEN comissões forem calculadas THEN THE System SHALL logar: order_id, network_found, split_calculated, timestamp
2. WHEN validação de wallet falhar THEN THE System SHALL logar: wallet_id, erro, timestamp
3. WHEN sincronização de rede ocorrer THEN THE System SHALL logar: affiliate_id, old_value, new_value, timestamp
4. WHEN split for enviado para Asaas THEN THE System SHALL logar: payment_id, splits, response, timestamp
5. THE System SHALL criar tabela `audit_logs` com retenção de 2 anos

### Requirement 9: Testes de Integração End-to-End

**User Story:** Como desenvolvedor, eu quero testes automatizados do fluxo completo, para que eu possa garantir que o sistema funciona corretamente.

#### Acceptance Criteria

1. WHEN testes forem executados THEN THE System SHALL validar fluxo: click link → cadastro → compra → comissão
2. WHEN teste de indicação for executado THEN THE System SHALL confirmar que código é persistido corretamente
3. WHEN teste de rede for executado THEN THE System SHALL confirmar que afiliado vê seus indicados
4. WHEN teste de comissão for executado THEN THE System SHALL confirmar que split é calculado corretamente
5. THE System SHALL ter cobertura de testes > 80% para módulo de afiliados

### Requirement 10: Chamada da Função SQL de Split

**User Story:** Como desenvolvedor, eu quero que a função SQL `calculate_commission_split()` seja chamada corretamente, para que o cálculo de comissões use a lógica implementada no banco.

#### Acceptance Criteria

1. WHEN o pagamento for confirmado THEN THE System SHALL chamar `calculate_commission_split(order_id)`
2. WHEN a função SQL for executada THEN THE System SHALL buscar rede genealógica do banco
3. WHEN a função SQL calcular split THEN THE System SHALL aplicar redistribuição automaticamente
4. WHEN a função SQL concluir THEN THE System SHALL salvar resultados em `commission_splits`
5. THE System SHALL remover cálculo duplicado de comissões no código TypeScript

### Requirement 11: Validação de Dados de Teste (Bia e Giuseppe)

**User Story:** Como administrador, eu quero validar que os dados de teste estão corretos, para que eu possa confiar no sistema.

#### Acceptance Criteria

1. WHEN a validação for executada THEN THE System SHALL confirmar que Giuseppe está em `affiliates.referred_by` apontando para Bia
2. WHEN a validação for executada THEN THE System SHALL confirmar que Giuseppe está em `affiliate_network` com parent correto
3. WHEN a validação for executada THEN THE System SHALL confirmar sincronização entre as duas estruturas
4. WHEN inconsistências forem encontradas THEN THE System SHALL corrigir automaticamente
5. THE System SHALL criar script de validação executável via CLI

### Requirement 12: Correção de Políticas RLS Recursivas

**User Story:** Como administrador, eu quero políticas RLS eficientes, para que o sistema tenha boa performance e segurança.

#### Acceptance Criteria

1. WHEN políticas RLS forem criadas THEN THE System SHALL evitar funções recursivas dentro de policies
2. WHEN afiliado buscar rede THEN THE System SHALL usar índices otimizados
3. WHEN RLS for aplicada THEN THE System SHALL ter tempo de resposta < 200ms
4. WHEN políticas forem testadas THEN THE System SHALL garantir que não há recursão infinita
5. THE System SHALL manter RLS SEMPRE ativa (nunca desabilitar)

### Requirement 13: Substituição de Mock Data por Dados Reais

**User Story:** Como afiliado, eu quero ver meus dados reais de saques, para que eu possa acompanhar meus ganhos.

#### Acceptance Criteria

1. WHEN afiliado acessar página de saques THEN THE System SHALL buscar dados reais da tabela `withdrawals`
2. WHEN não houver saques THEN THE System SHALL exibir estado vazio (não mock)
3. WHEN houver saques THEN THE System SHALL exibir lista real com valores corretos
4. THE System SHALL remover TODA função `getWithdrawals()` que retorna mock
5. THE System SHALL implementar query real para buscar saques do afiliado

### Requirement 14: Padronização de Formato de Wallet ID

**User Story:** Como desenvolvedor, eu quero formato consistente de Wallet ID, para que não haja confusão entre UUID e formato Asaas.

#### Acceptance Criteria

1. WHEN o sistema validar Wallet ID THEN THE System SHALL aceitar APENAS formato Asaas `wal_XXXXX`
2. WHEN migration for executada THEN THE System SHALL converter UUIDs existentes para formato Asaas
3. WHEN documentação for atualizada THEN THE System SHALL especificar formato correto
4. WHEN variáveis de ambiente forem configuradas THEN THE System SHALL usar formato `wal_XXXXX`
5. THE System SHALL atualizar constraint do banco para validar formato `^wal_[a-zA-Z0-9]{20}$`

### Requirement 15: Implementação de Logs Suficientes

**User Story:** Como desenvolvedor, eu quero logs detalhados de todas as operações, para que eu possa debugar problemas em produção.

#### Acceptance Criteria

1. WHEN comissões forem calculadas THEN THE System SHALL logar: input, output, tempo de execução
2. WHEN sincronização ocorrer THEN THE System SHALL logar: estrutura atualizada, valores antes/depois
3. WHEN validação de wallet ocorrer THEN THE System SHALL logar: wallet_id, resposta da API Asaas
4. WHEN erro ocorrer THEN THE System SHALL logar: stack trace, contexto, dados de entrada
5. THE System SHALL usar níveis de log apropriados (DEBUG, INFO, WARN, ERROR)

### Requirement 16: Documentação de Decisões Arquiteturais

**User Story:** Como desenvolvedor futuro, eu quero documentação clara das decisões tomadas, para que eu entenda o porquê de cada escolha.

#### Acceptance Criteria

1. WHEN a correção for concluída THEN THE System SHALL documentar decisão de usar `referred_by` como fonte única
2. WHEN a correção for concluída THEN THE System SHALL documentar motivo de deprecar `affiliate_network`
3. WHEN a correção for concluída THEN THE System SHALL documentar padrão de chave localStorage
4. WHEN a correção for concluída THEN THE System SHALL documentar estrutura de RLS policies
5. THE System SHALL criar arquivo `ARCHITECTURE_DECISIONS.md` no repositório

---

**Total de Requirements:** 16 (cobrindo TODOS os 14 problemas identificados)  
**Total de Acceptance Criteria:** 77  
**Prioridade:** 🔴 CRÍTICA  
**Impacto:** Sistema de afiliados não funciona corretamente sem estas correções
