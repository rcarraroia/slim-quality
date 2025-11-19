# Requirements Document - Sprint 7: Correções Críticas do Sistema

## Introduction

Este documento define os requisitos para o Sprint 7 do projeto Slim Quality - um sprint de **correção urgente** focado em resolver problemas críticos identificados na análise completa do sistema realizada em 19/11/2025.

**Contexto:** A análise revelou que o sistema possui problemas estruturais graves que impedem seu funcionamento adequado em produção:
- Dados mockados em 6+ páginas críticas
- Sistema de afiliados com frontend completo mas backend ausente
- Redirecionamento pós-login quebrado para afiliados
- Estrutura do CRM com problemas

**Criticidade:** Este sprint tem **PRIORIDADE MÁXIMA**. Os problemas identificados causam:
- Perda de receita (programa de afiliados inoperante)
- Decisões baseadas em dados falsos
- Experiência de usuário quebrada
- Impacto financeiro direto

**Objetivo:** Tornar o sistema funcional e confiável, removendo dados mockados e implementando funcionalidades críticas ausentes.

## Glossary

- **Sistema**: Slim Quality Backend + Frontend
- **Mock Data**: Dados falsos/simulados usados em desenvolvimento
- **Affiliate**: Afiliado cadastrado no sistema
- **Dashboard**: Painel administrativo ou de afiliado
- **RLS**: Row Level Security - Políticas de segurança do PostgreSQL
- **API Endpoint**: Rota da API REST
- **Service Layer**: Camada de serviços do backend
- **Frontend Service**: Serviço TypeScript que consome APIs
- **Redirecionamento**: Navegação automática após login baseada em role
- **Role**: Papel do usuário (admin, vendedor, afiliado, cliente)

## Requirements

### Requirement 1: Remover Dados Mockados das Páginas Admin

**User Story:** Como administrador, eu quero visualizar dados reais do sistema, para que eu possa tomar decisões baseadas em informações corretas.

#### Acceptance Criteria

1. WHEN admin acessa `/dashboard/lista-afiliados`, THE Sistema SHALL exibir afiliados reais do banco de dados
2. WHEN admin acessa `/dashboard/gestao-comissoes`, THE Sistema SHALL exibir comissões reais calculadas pelo sistema
3. WHEN admin acessa `/dashboard/gestao-saques`, THE Sistema SHALL exibir solicitações de saque reais dos afiliados
4. WHEN admin acessa `/dashboard`, THE Sistema SHALL exibir métricas reais de conversas e vendas
5. THE Sistema SHALL remover completamente imports de `mockData.ts` das páginas de produção

### Requirement 2: Remover Dados Mockados das Páginas de Afiliados

**User Story:** Como afiliado, eu quero visualizar minhas comissões e rede reais, para que eu possa acompanhar meu desempenho verdadeiro.

#### Acceptance Criteria

1. WHEN afiliado acessa `/afiliados/dashboard/comissoes`, THE Sistema SHALL exibir comissões reais do banco de dados
2. WHEN afiliado acessa `/afiliados/dashboard/minha-rede`, THE Sistema SHALL exibir rede genealógica real
3. WHEN afiliado acessa `/afiliados/dashboard`, THE Sistema SHALL exibir métricas reais de cliques e conversões
4. THE Sistema SHALL remover imports de dados mockados de todas as páginas de afiliados
5. THE Sistema SHALL exibir estado vazio apropriado quando não houver dados

### Requirement 3: Implementar Backend de Afiliados - Cadastro

**User Story:** Como candidato a afiliado, eu quero me cadastrar no sistema, para que eu possa começar a indicar produtos e receber comissões.

#### Acceptance Criteria

1. THE Sistema SHALL implementar POST /api/affiliates com validação completa de dados
2. WHEN afiliado é cadastrado, THE Sistema SHALL validar Wallet ID via API Asaas
3. WHEN código de indicação é fornecido, THE Sistema SHALL vincular na árvore genealógica
4. WHEN afiliado é criado, THE Sistema SHALL gerar código de indicação único de 6 caracteres
5. THE Sistema SHALL criar registro em `affiliates` e atualizar `profiles.is_affiliate = true`

### Requirement 4: Implementar Backend de Afiliados - Consultas

**User Story:** Como afiliado, eu quero consultar meus dados e métricas, para que eu possa acompanhar meu desempenho.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/affiliates/me para dados do afiliado logado
2. THE Sistema SHALL implementar GET /api/affiliates/me/stats para métricas (cliques, conversões, comissões)
3. THE Sistema SHALL implementar GET /api/affiliates/me/network para visualizar rede de indicados diretos
4. THE Sistema SHALL implementar GET /api/affiliates/me/commissions para histórico de comissões
5. THE Sistema SHALL implementar RLS para garantir que afiliado veja apenas próprios dados

### Requirement 5: Implementar Backend de Afiliados - Administração

**User Story:** Como administrador, eu quero gerenciar afiliados, para que eu possa aprovar cadastros e monitorar a rede.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/admin/affiliates com paginação e filtros
2. THE Sistema SHALL implementar GET /api/admin/affiliates/:id para detalhes completos
3. THE Sistema SHALL implementar PUT /api/admin/affiliates/:id/status para ativar/suspender
4. THE Sistema SHALL implementar GET /api/admin/affiliates/:id/network para visualizar árvore completa
5. THE Sistema SHALL validar que apenas admins podem acessar rotas administrativas

### Requirement 6: Implementar Backend de Comissões - Consultas

**User Story:** Como administrador, eu quero visualizar comissões calculadas, para que eu possa auditar e aprovar pagamentos.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/admin/commissions com filtros por status, período e afiliado
2. THE Sistema SHALL implementar GET /api/admin/commissions/:id para detalhes da comissão
3. THE Sistema SHALL implementar GET /api/admin/commissions/stats para métricas gerais
4. THE Sistema SHALL exibir detalhamento de splits (N1, N2, N3, gestores)
5. THE Sistema SHALL mostrar status (pending, paid, error) de cada comissão

### Requirement 7: Implementar Backend de Saques - Gestão

**User Story:** Como administrador, eu quero gerenciar solicitações de saque, para que eu possa processar pagamentos para afiliados.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/admin/withdrawals com filtros por status e afiliado
2. THE Sistema SHALL implementar POST /api/admin/withdrawals/:id/approve para aprovar saque
3. THE Sistema SHALL implementar POST /api/admin/withdrawals/:id/reject para rejeitar saque
4. THE Sistema SHALL validar saldo disponível do afiliado antes de aprovar
5. THE Sistema SHALL registrar histórico de todas as operações de saque

### Requirement 8: Corrigir Redirecionamento Pós-Login

**User Story:** Como usuário, eu quero ser redirecionado para o dashboard correto após login, para que eu possa acessar minhas funcionalidades.

#### Acceptance Criteria

1. WHEN usuário com role 'admin' faz login, THE Sistema SHALL redirecionar para `/dashboard`
2. WHEN usuário com role 'vendedor' faz login, THE Sistema SHALL redirecionar para `/dashboard`
3. WHEN usuário com role 'afiliado' faz login, THE Sistema SHALL redirecionar para `/afiliados/dashboard`
4. WHEN usuário com role 'cliente' faz login, THE Sistema SHALL redirecionar para `/minha-conta`
5. THE Sistema SHALL implementar lógica de redirecionamento no componente de autenticação

### Requirement 9: Validar e Corrigir Estrutura do CRM

**User Story:** Como desenvolvedor, eu quero garantir que estrutura do CRM está correta, para que não haja erros de relacionamento entre tabelas.

#### Acceptance Criteria

1. THE Sistema SHALL validar que tabela `customers` possui todas as colunas necessárias
2. THE Sistema SHALL validar que relacionamentos entre `customers`, `conversations` e `messages` estão corretos
3. THE Sistema SHALL validar que foreign keys estão configuradas corretamente
4. THE Sistema SHALL validar que índices estão otimizados para queries frequentes
5. THE Sistema SHALL executar script de correção se inconsistências forem encontradas

### Requirement 10: Implementar RLS Policies Corretas

**User Story:** Como sistema, eu quero garantir segurança dos dados, para que usuários vejam apenas informações permitidas.

#### Acceptance Criteria

1. THE Sistema SHALL implementar RLS em `affiliates` para afiliados verem apenas próprios dados
2. THE Sistema SHALL implementar RLS em `commissions` para afiliados verem apenas próprias comissões
3. THE Sistema SHALL implementar RLS em `customers` para vendedores verem apenas clientes atribuídos
4. THE Sistema SHALL permitir que admins vejam todos os dados
5. THE Sistema SHALL testar políticas RLS para garantir que não há vazamento de dados

### Requirement 11: Integrar Frontend de Afiliados com Backend

**User Story:** Como afiliado, eu quero que meu dashboard funcione corretamente, para que eu possa usar o sistema.

#### Acceptance Criteria

1. WHEN afiliado acessa dashboard, THE Sistema SHALL buscar dados via `affiliate-frontend.service.ts`
2. WHEN serviço chama API, THE Sistema SHALL tratar erros e exibir mensagens apropriadas
3. WHEN dados são carregados, THE Sistema SHALL exibir loading states durante requisições
4. WHEN não há dados, THE Sistema SHALL exibir empty states informativos
5. THE Sistema SHALL implementar cache local para melhorar performance

### Requirement 12: Integrar Frontend Admin com Backend

**User Story:** Como administrador, eu quero que páginas administrativas funcionem corretamente, para que eu possa gerenciar o sistema.

#### Acceptance Criteria

1. WHEN admin acessa lista de afiliados, THE Sistema SHALL buscar dados via API real
2. WHEN admin acessa gestão de comissões, THE Sistema SHALL exibir comissões do banco
3. WHEN admin acessa gestão de saques, THE Sistema SHALL exibir solicitações reais
4. THE Sistema SHALL implementar paginação para listas grandes
5. THE Sistema SHALL implementar filtros e busca em todas as listagens

### Requirement 13: Implementar Estados de Loading e Erro

**User Story:** Como usuário, eu quero feedback visual durante operações, para que eu saiba o que está acontecendo.

#### Acceptance Criteria

1. WHEN página carrega dados, THE Sistema SHALL exibir skeleton loaders ou spinners
2. WHEN operação falha, THE Sistema SHALL exibir mensagem de erro amigável
3. WHEN operação é bem-sucedida, THE Sistema SHALL exibir toast de confirmação
4. WHEN não há dados, THE Sistema SHALL exibir empty state com ação sugerida
5. THE Sistema SHALL implementar retry automático para falhas de rede

### Requirement 14: Implementar Validações de Dados

**User Story:** Como sistema, eu quero validar dados de entrada, para que não haja inconsistências no banco.

#### Acceptance Criteria

1. THE Sistema SHALL validar Wallet ID usando regex `/^wal_[a-zA-Z0-9]{20}$/`
2. THE Sistema SHALL validar email usando formato padrão RFC 5322
3. THE Sistema SHALL validar telefone usando formato E.164
4. THE Sistema SHALL validar CPF/CNPJ usando algoritmo oficial
5. THE Sistema SHALL usar schemas Zod para validação em todas as APIs

### Requirement 15: Implementar Logs de Auditoria

**User Story:** Como administrador, eu quero logs de operações críticas, para que eu possa auditar ações no sistema.

#### Acceptance Criteria

1. WHEN afiliado é cadastrado, THE Sistema SHALL registrar em `auth_logs`
2. WHEN comissão é calculada, THE Sistema SHALL registrar em `commission_logs`
3. WHEN saque é aprovado/rejeitado, THE Sistema SHALL registrar operação
4. THE Sistema SHALL incluir user_id, timestamp e detalhes da operação em todos os logs
5. THE Sistema SHALL permitir consultar logs por usuário, tipo e período

### Requirement 16: Implementar Tratamento de Erros Consistente

**User Story:** Como desenvolvedor, eu quero tratamento de erros padronizado, para que seja fácil debugar problemas.

#### Acceptance Criteria

1. THE Sistema SHALL retornar erros no formato `{ error: string, details?: any }`
2. WHEN validação falha, THE Sistema SHALL retornar status 400 com detalhes
3. WHEN recurso não é encontrado, THE Sistema SHALL retornar status 404
4. WHEN usuário não tem permissão, THE Sistema SHALL retornar status 403
5. THE Sistema SHALL logar erros internos e retornar status 500 genérico

### Requirement 17: Otimizar Queries do Banco

**User Story:** Como usuário, eu quero que sistema seja rápido, para que eu possa trabalhar eficientemente.

#### Acceptance Criteria

1. THE Sistema SHALL criar índices em colunas usadas em WHERE e JOIN
2. THE Sistema SHALL usar paginação em todas as listagens
3. THE Sistema SHALL limitar queries a 100 registros por padrão
4. THE Sistema SHALL usar SELECT específico ao invés de SELECT *
5. THE Sistema SHALL implementar cache para dados estáticos

### Requirement 18: Implementar Testes de Integração

**User Story:** Como desenvolvedor, eu quero testes automatizados, para que eu possa garantir que correções funcionam.

#### Acceptance Criteria

1. THE Sistema SHALL implementar testes para endpoints de afiliados
2. THE Sistema SHALL implementar testes para endpoints de comissões
3. THE Sistema SHALL implementar testes para redirecionamento pós-login
4. THE Sistema SHALL implementar testes para RLS policies
5. THE Sistema SHALL garantir cobertura mínima de 70% em código crítico

### Requirement 19: Documentar APIs Implementadas

**User Story:** Como desenvolvedor frontend, eu quero documentação clara das APIs, para que eu possa integrá-las corretamente.

#### Acceptance Criteria

1. THE Sistema SHALL documentar todos os endpoints em `docs/API.md`
2. WHEN endpoint é documentado, THE Sistema SHALL incluir método, rota, parâmetros e resposta
3. THE Sistema SHALL incluir exemplos de requisição e resposta
4. THE Sistema SHALL documentar códigos de erro possíveis
5. THE Sistema SHALL manter documentação atualizada com código

### Requirement 20: Validar Sistema em Ambiente de Produção

**User Story:** Como gestor, eu quero garantir que correções funcionam em produção, para que sistema seja confiável.

#### Acceptance Criteria

1. THE Sistema SHALL executar smoke tests após deploy
2. WHEN teste falha, THE Sistema SHALL alertar equipe imediatamente
3. THE Sistema SHALL validar que dados mockados foram completamente removidos
4. THE Sistema SHALL validar que redirecionamento funciona para todos os roles
5. THE Sistema SHALL validar que afiliados conseguem acessar dashboard e ver dados reais

## Summary

Este sprint de correção urgente resolve os problemas críticos identificados na análise do sistema:

**Principais Entregas:**
1. Remoção completa de dados mockados (6+ páginas)
2. Implementação do backend de afiliados (cadastro, consultas, administração)
3. Implementação do backend de comissões e saques
4. Correção do redirecionamento pós-login baseado em role
5. Validação e correção da estrutura do CRM
6. Implementação de RLS policies corretas
7. Integração completa frontend-backend
8. Estados de loading, erro e empty implementados
9. Validações e logs de auditoria
10. Testes e documentação

**Impacto Esperado:**
- ✅ Sistema funcional e confiável em produção
- ✅ Programa de afiliados operacional
- ✅ Decisões baseadas em dados reais
- ✅ Experiência de usuário corrigida
- ✅ Segurança e integridade de dados garantidas

**Prioridade:** MÁXIMA - Este sprint deve ser executado antes de qualquer nova funcionalidade.
