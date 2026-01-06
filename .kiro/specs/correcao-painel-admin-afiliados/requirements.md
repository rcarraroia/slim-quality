# Requirements Document - Correção Painel Admin Afiliados

## Introduction

Este documento especifica os requisitos para correção completa do Painel de Administração de Afiliados do sistema Slim Quality. A auditoria realizada em 02/01/2026 identificou que o painel está 100% funcional visualmente, mas completamente desconectado do backend real, operando apenas com dados mockados.

O objetivo desta correção é implementar todas as integrações necessárias para tornar o painel totalmente funcional com dados reais do banco de dados.

## Glossary

- **Admin_Panel**: Painel administrativo para gestão de afiliados
- **Affiliate**: Afiliado cadastrado no sistema
- **Backend_API**: APIs REST do backend Python/FastAPI
- **Database**: Banco de dados PostgreSQL (Supabase)
- **Mock_Data**: Dados simulados/falsos usados atualmente
- **Real_Data**: Dados reais vindos do banco de dados
- **Network_Tree**: Árvore genealógica de afiliados (N1, N2, N3)
- **Commission**: Comissão calculada para afiliados
- **Wallet_ID**: Identificador da carteira Asaas do afiliado
- **RLS**: Row Level Security (políticas de segurança do Supabase)

## Requirements

### Requirement 1: Integração do Dashboard de Afiliados

**User Story:** Como administrador, eu quero visualizar métricas reais dos afiliados, para que eu possa acompanhar o desempenho real do programa de afiliados.

#### Acceptance Criteria

1. WHEN o administrador acessa o dashboard de afiliados, THE System SHALL buscar métricas reais do banco de dados
2. WHEN as métricas são carregadas, THE System SHALL exibir total de afiliados ativos, comissões pagas no mês, vendas geradas e taxa de conversão
3. WHEN não há dados disponíveis, THE System SHALL exibir estado vazio apropriado
4. WHEN ocorre erro ao buscar dados, THE System SHALL exibir mensagem de erro clara
5. THE System SHALL atualizar métricas automaticamente a cada 5 minutos

### Requirement 2: Gestão de Solicitações de Afiliados

**User Story:** Como administrador, eu quero aprovar ou rejeitar solicitações de novos afiliados, para que eu possa controlar quem entra no programa.

#### Acceptance Criteria

1. WHEN o administrador acessa a lista de solicitações, THE System SHALL buscar solicitações pendentes do banco de dados
2. WHEN o administrador aprova uma solicitação, THE System SHALL atualizar status no banco para "approved" e notificar o afiliado
3. WHEN o administrador rejeita uma solicitação, THE System SHALL atualizar status no banco para "rejected" e registrar motivo
4. WHEN uma ação é executada, THE System SHALL atualizar a lista automaticamente
5. THE System SHALL validar Wallet ID do Asaas antes de aprovar afiliado

### Requirement 3: Listagem e Busca de Afiliados

**User Story:** Como administrador, eu quero buscar e filtrar afiliados cadastrados, para que eu possa encontrar informações específicas rapidamente.

#### Acceptance Criteria

1. WHEN o administrador acessa a lista de afiliados, THE System SHALL buscar todos os afiliados do banco de dados
2. WHEN o administrador busca por nome/email, THE System SHALL filtrar resultados em tempo real
3. WHEN o administrador filtra por status, THE System SHALL exibir apenas afiliados com aquele status
4. WHEN o administrador ordena por coluna, THE System SHALL reordenar dados conforme critério
5. THE System SHALL implementar paginação para listas com mais de 50 afiliados

### Requirement 4: Visualização de Rede Genealógica

**User Story:** Como administrador, eu quero visualizar a árvore genealógica de afiliados, para que eu possa entender a estrutura da rede.

#### Acceptance Criteria

1. WHEN o administrador acessa a rede genealógica, THE System SHALL buscar estrutura completa do banco de dados
2. WHEN a árvore é exibida, THE System SHALL mostrar relacionamentos N1, N2 e N3 corretamente
3. WHEN o administrador clica em um afiliado, THE System SHALL expandir/colapsar seus indicados
4. WHEN não há rede formada, THE System SHALL exibir mensagem apropriada
5. THE System SHALL calcular e exibir métricas de cada nível (total de afiliados, vendas, comissões)

### Requirement 5: Gestão de Comissões

**User Story:** Como administrador, eu quero visualizar e gerenciar comissões de afiliados, para que eu possa acompanhar pagamentos e resolver problemas.

#### Acceptance Criteria

1. WHEN o administrador acessa comissões, THE System SHALL buscar histórico real do banco de dados
2. WHEN o administrador filtra por período, THE System SHALL exibir apenas comissões daquele período
3. WHEN o administrador filtra por afiliado, THE System SHALL exibir apenas comissões daquele afiliado
4. WHEN o administrador exporta relatório, THE System SHALL gerar arquivo com dados reais
5. THE System SHALL exibir status de cada comissão (pendente, paga, cancelada)

### Requirement 6: Edição de Dados de Afiliados

**User Story:** Como administrador, eu quero editar informações de afiliados, para que eu possa corrigir dados incorretos ou atualizar informações.

#### Acceptance Criteria

1. WHEN o administrador edita dados de um afiliado, THE System SHALL validar todos os campos antes de salvar
2. WHEN os dados são válidos, THE System SHALL atualizar registro no banco de dados
3. WHEN Wallet ID é alterado, THE System SHALL validar novo ID via API Asaas
4. WHEN a edição é bem-sucedida, THE System SHALL exibir mensagem de confirmação
5. THE System SHALL registrar log de auditoria com usuário, data e campos alterados

### Requirement 7: Desativação e Reativação de Afiliados

**User Story:** Como administrador, eu quero desativar ou reativar afiliados, para que eu possa controlar quem está ativo no programa.

#### Acceptance Criteria

1. WHEN o administrador desativa um afiliado, THE System SHALL atualizar status no banco para "inactive"
2. WHEN um afiliado é desativado, THE System SHALL impedir novas comissões para ele
3. WHEN o administrador reativa um afiliado, THE System SHALL atualizar status no banco para "active"
4. WHEN um afiliado é reativado, THE System SHALL permitir novas comissões
5. THE System SHALL registrar motivo da desativação/reativação

### Requirement 8: Implementação de APIs Backend

**User Story:** Como desenvolvedor, eu quero implementar todas as APIs necessárias no backend, para que o frontend possa consumir dados reais.

#### Acceptance Criteria

1. THE Backend SHALL implementar endpoint GET /api/admin/affiliates/metrics para métricas do dashboard
2. THE Backend SHALL implementar endpoint GET /api/admin/affiliates/requests para solicitações pendentes
3. THE Backend SHALL implementar endpoint POST /api/admin/affiliates/:id/approve para aprovar afiliado
4. THE Backend SHALL implementar endpoint POST /api/admin/affiliates/:id/reject para rejeitar afiliado
5. THE Backend SHALL implementar endpoint GET /api/admin/affiliates para listar afiliados
6. THE Backend SHALL implementar endpoint GET /api/admin/affiliates/:id para detalhes de afiliado
7. THE Backend SHALL implementar endpoint PUT /api/admin/affiliates/:id para editar afiliado
8. THE Backend SHALL implementar endpoint POST /api/admin/affiliates/:id/deactivate para desativar
9. THE Backend SHALL implementar endpoint POST /api/admin/affiliates/:id/activate para reativar
10. THE Backend SHALL implementar endpoint GET /api/admin/affiliates/network para rede genealógica
11. THE Backend SHALL implementar endpoint GET /api/admin/commissions para histórico de comissões
12. THE Backend SHALL implementar endpoint POST /api/admin/commissions/export para exportar relatório

### Requirement 9: Validação de Wallet ID Asaas

**User Story:** Como sistema, eu quero validar Wallet IDs do Asaas antes de aprovar afiliados, para que apenas carteiras válidas sejam cadastradas.

#### Acceptance Criteria

1. WHEN um afiliado é aprovado, THE System SHALL validar Wallet ID via API Asaas
2. WHEN Wallet ID é inválido, THE System SHALL impedir aprovação e exibir erro
3. WHEN Wallet ID é válido mas inativo, THE System SHALL alertar administrador
4. WHEN validação falha por erro de API, THE System SHALL permitir aprovação manual com aviso
5. THE System SHALL cachear resultado de validação por 24 horas

### Requirement 10: Políticas de Segurança (RLS)

**User Story:** Como sistema, eu quero garantir que apenas administradores acessem dados de afiliados, para que informações sensíveis sejam protegidas.

#### Acceptance Criteria

1. THE Database SHALL implementar políticas RLS para tabela affiliates
2. THE Database SHALL permitir acesso completo apenas para usuários com role "admin"
3. THE Database SHALL permitir que afiliados vejam apenas seus próprios dados
4. THE Database SHALL registrar todas as operações de administração em log de auditoria
5. THE Backend SHALL validar permissões antes de executar qualquer operação administrativa

### Requirement 11: Tratamento de Erros e Estados de Loading

**User Story:** Como usuário, eu quero feedback claro sobre o status das operações, para que eu saiba quando algo está carregando ou quando ocorreu um erro.

#### Acceptance Criteria

1. WHEN dados estão sendo carregados, THE System SHALL exibir skeleton loaders apropriados
2. WHEN uma operação está em andamento, THE System SHALL desabilitar botões e exibir spinner
3. WHEN ocorre erro, THE System SHALL exibir mensagem clara e acionável
4. WHEN não há dados, THE System SHALL exibir estado vazio com ação sugerida
5. THE System SHALL implementar retry automático para falhas de rede

### Requirement 12: Notificações e Feedback

**User Story:** Como administrador, eu quero receber feedback imediato sobre minhas ações, para que eu saiba se operações foram bem-sucedidas.

#### Acceptance Criteria

1. WHEN uma operação é bem-sucedida, THE System SHALL exibir toast de sucesso
2. WHEN uma operação falha, THE System SHALL exibir toast de erro com detalhes
3. WHEN uma ação requer confirmação, THE System SHALL exibir modal de confirmação
4. WHEN um afiliado é aprovado, THE System SHALL enviar notificação por email
5. THE System SHALL manter histórico de notificações enviadas

---

## 📊 RESUMO DE REQUISITOS

**Total de Requisitos:** 12  
**Requisitos de Backend:** 3 (Req 8, 9, 10)  
**Requisitos de Frontend:** 7 (Req 1-7)  
**Requisitos de Integração:** 2 (Req 11, 12)  

**Prioridade Alta:** Req 1, 2, 3, 8, 10  
**Prioridade Média:** Req 4, 5, 6, 7, 9  
**Prioridade Baixa:** Req 11, 12  

---

**Documento criado:** 05/01/2026  
**Baseado em:** AUDITORIA_PAINEL_ADMIN_AFILIADOS.md  
**Status:** Pronto para design
