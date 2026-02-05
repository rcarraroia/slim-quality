# Requirements Document

## Introduction

Este documento especifica os requisitos para corrigir os problemas críticos identificados no dashboard de vendas do sistema Slim Quality. A auditoria revelou que o frontend não está conectado corretamente ao banco de dados real, resultando em métricas incorretas e funcionalidades quebradas.

## Glossary

- **Dashboard**: Painel principal com métricas de vendas e pedidos
- **Orders**: Tabela de pedidos no banco de dados (todos os status)
- **Sales**: Vendas confirmadas (apenas pedidos com status 'paid')
- **Supabase**: Banco de dados PostgreSQL em produção
- **Frontend**: Interface React/TypeScript do sistema
- **Backend**: APIs e serviços do sistema
- **Metrics**: Métricas calculadas (vendas, conversão, ticket médio)

## Requirements

### Requirement 1: Corrigir Cards do Dashboard

**User Story:** Como um gestor, eu quero ver métricas corretas no dashboard, para que eu possa tomar decisões de negócio baseadas em dados reais.

#### Acceptance Criteria

1. WHEN o dashboard carrega, THE System SHALL buscar dados reais do banco Supabase
2. WHEN calculando "Vendas do Mês", THE System SHALL considerar apenas pedidos com status 'paid'
3. WHEN exibindo "Pedidos Realizados", THE System SHALL mostrar todos os pedidos independente do status
4. WHEN calculando "Taxa de Conversão", THE System SHALL usar a fórmula (pedidos_pagos / total_pedidos * 100)
5. WHEN calculando "Ticket Médio", THE System SHALL dividir valor total por número de pedidos pagos

### Requirement 2: Corrigir Lista "Vendas Recentes"

**User Story:** Como um gestor, eu quero ver apenas vendas confirmadas na lista "Vendas Recentes", para que eu não confunda pedidos pendentes com vendas reais.

#### Acceptance Criteria

1. WHEN a lista "Vendas Recentes" carrega, THE System SHALL filtrar apenas pedidos com status 'paid'
2. WHEN um pedido tem status 'pending', THE System SHALL excluí-lo da lista de vendas recentes
3. WHEN exibindo uma venda recente, THE System SHALL mostrar dados do cliente, produto, valor e data
4. WHEN não há vendas recentes, THE System SHALL exibir mensagem apropriada
5. WHEN ordenando vendas recentes, THE System SHALL ordenar por data de criação decrescente

### Requirement 3: Implementar Página /dashboard/vendas

**User Story:** Como um gestor, eu quero acessar uma página dedicada às vendas, para que eu possa analisar detalhadamente todas as vendas confirmadas.

#### Acceptance Criteria

1. WHEN acesso /dashboard/vendas, THE System SHALL carregar e exibir dados de vendas
2. WHEN a página carrega, THE System SHALL buscar pedidos com status 'paid' do banco
3. WHEN há vendas para exibir, THE System SHALL mostrar lista paginada com detalhes
4. WHEN não há vendas, THE System SHALL exibir estado vazio apropriado
5. WHEN há erro na conexão, THE System SHALL exibir mensagem de erro clara

### Requirement 4: Separar Conceitos de Pedidos e Vendas

**User Story:** Como um usuário do sistema, eu quero diferenciação clara entre pedidos e vendas, para que eu entenda corretamente os dados apresentados.

#### Acceptance Criteria

1. WHEN exibindo métricas, THE System SHALL separar "Pedidos Realizados" de "Vendas Confirmadas"
2. WHEN um card mostra "Pedidos", THE System SHALL incluir todos os status (pending, paid, cancelled)
3. WHEN um card mostra "Vendas", THE System SHALL incluir apenas status 'paid'
4. WHEN navegando no menu, THE System SHALL ter seções separadas para Pedidos e Vendas
5. WHEN exibindo listas, THE System SHALL usar nomenclatura clara (Pedidos vs Vendas)

### Requirement 5: Implementar Conexão Real com Supabase

**User Story:** Como desenvolvedor, eu quero que o frontend se conecte ao banco Supabase real, para que os dados exibidos sejam precisos e atualizados.

#### Acceptance Criteria

1. WHEN o sistema inicializa, THE System SHALL conectar ao Supabase usando credenciais corretas
2. WHEN fazendo queries, THE System SHALL usar métodos nativos do Supabase (não exec_sql)
3. WHEN há erro de conexão, THE System SHALL implementar fallback e retry apropriados
4. WHEN buscando dados, THE System SHALL aplicar filtros corretos por status e período
5. WHEN dados são atualizados, THE System SHALL refletir mudanças em tempo real

### Requirement 6: Implementar Filtros e Períodos

**User Story:** Como um gestor, eu quero filtrar vendas por período e status, para que eu possa analisar dados específicos conforme necessário.

#### Acceptance Criteria

1. WHEN selecionando período, THE System SHALL filtrar dados pela data de criação
2. WHEN aplicando filtro de status, THE System SHALL mostrar apenas registros com status selecionado
3. WHEN resetando filtros, THE System SHALL voltar ao estado padrão (mês atual)
4. WHEN não há dados no período, THE System SHALL exibir mensagem informativa
5. WHEN mudando filtros, THE System SHALL atualizar métricas automaticamente

### Requirement 7: Implementar Tratamento de Erros

**User Story:** Como um usuário, eu quero receber feedback claro quando há problemas, para que eu entenda o que está acontecendo e possa tomar ação apropriada.

#### Acceptance Criteria

1. WHEN há erro de conexão com banco, THE System SHALL exibir mensagem de erro específica
2. WHEN dados não carregam, THE System SHALL mostrar estado de loading apropriado
3. WHEN query falha, THE System SHALL implementar retry automático até 3 tentativas
4. WHEN erro persiste, THE System SHALL oferecer opção de recarregar manualmente
5. WHEN há timeout, THE System SHALL informar sobre problema de conectividade

### Requirement 8: Validar Dados e Métricas

**User Story:** Como desenvolvedor, eu quero validar que todas as métricas estão sendo calculadas corretamente, para garantir precisão dos dados apresentados.

#### Acceptance Criteria

1. WHEN calculando métricas, THE System SHALL validar que dados não são nulos ou inválidos
2. WHEN somando valores, THE System SHALL converter cents para reais corretamente
3. WHEN calculando percentuais, THE System SHALL tratar divisão por zero
4. WHEN exibindo datas, THE System SHALL formatar no padrão brasileiro (DD/MM/YYYY)
5. WHEN há inconsistências, THE System SHALL registrar logs para auditoria