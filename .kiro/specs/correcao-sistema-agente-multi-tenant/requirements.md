# Requirements Document

## Introduction

O sistema Agente Multi-Tenant foi implantado no EasyPanel mas apresenta falhas críticas que impedem seu funcionamento básico. Esta especificação define os requisitos para correção completa do sistema, abordando problemas de infraestrutura, unificação Supabase, deploy FastAPI, integração Backend Express, e funcionalidades essenciais para ativação de agentes em produção.

## Glossary

- **Sistema_Agente**: Plataforma multi-tenant para criação de agentes de IA
- **Afiliado**: Usuário que possui acesso ao sistema através de assinatura válida
- **Tenant**: Instância isolada do sistema para cada afiliado
- **Agente_IA**: Bot conversacional configurado pelo afiliado
- **Evolution_API**: Serviço interno EasyPanel para integração WhatsApp
- **Chatwoot**: Plataforma de atendimento integrada no EasyPanel
- **Subscription**: Registro de assinatura ativa do afiliado
- **JWT_Token**: Token de autenticação JSON Web Token
- **Backend_Express**: Sistema Slim Quality que integra com FastAPI
- **EasyPanel**: Plataforma de deploy com networking interno

## Requirements

### Requirement 0: Pré-Requisitos e Unificação de Infraestrutura

**User Story:** Como administrador do sistema, eu quero unificar a infraestrutura e validar pré-requisitos, para que o sistema tenha base sólida antes das correções.

#### Acceptance Criteria

1. WHEN the frontend is configured, THE Sistema_Agente SHALL use the same Supabase instance as the backend (vtynmmtuvxreiwcxxlma.supabase.co)
2. WHEN the database schema is validated, THE Sistema_Agente SHALL confirm all required tables exist with proper RLS policies
3. WHEN EasyPanel credentials are discovered, THE Sistema_Agente SHALL document all internal service URLs and API keys
4. WHEN FastAPI is deployed to EasyPanel, THE Sistema_Agente SHALL be accessible via internal networking
5. WHEN seed data is created, THE Sistema_Agente SHALL have test records in multi_agent_subscriptions table

### Requirement 1: Deploy FastAPI no EasyPanel

**User Story:** Como administrador, eu quero que o FastAPI seja deployado corretamente no EasyPanel, para que o sistema funcione em produção.

#### Acceptance Criteria

1. WHEN FastAPI is built, THE Sistema_Agente SHALL create optimized Docker image
2. WHEN deployed to EasyPanel, THE Sistema_Agente SHALL be accessible via internal networking
3. WHEN health checks are configured, THE Sistema_Agente SHALL respond to EasyPanel monitoring
4. WHEN internal services communicate, THE Sistema_Agente SHALL use EasyPanel internal URLs
5. WHEN deployment completes, THE Sistema_Agente SHALL validate all internal connections

### Requirement 2: Sistema Multi-Tenant sem Subdomain

**User Story:** Como sistema, eu quero identificar tenants via JWT ao invés de subdomain, para que o sistema funcione corretamente em produção.

#### Acceptance Criteria

1. WHEN a user makes a request, THE Sistema_Agente SHALL extract tenant information from JWT token instead of subdomain
2. WHEN tenant context is needed, THE Sistema_Agente SHALL use affiliate_id from JWT to resolve tenant
3. WHEN subdomain code is removed, THE Sistema_Agente SHALL not have any references to request.host parsing
4. WHEN tenant resolution fails, THE Sistema_Agente SHALL return appropriate error messages
5. WHEN multiple tenants exist, THE Sistema_Agente SHALL isolate data correctly per affiliate_id

### Requirement 3: Backend Express Integration

**User Story:** Como sistema híbrido, eu quero integração completa entre Backend Express (Slim Quality) e FastAPI (Agente), para que funcione como sistema unificado.

#### Acceptance Criteria

1. WHEN agent subscription is purchased, THE Sistema_Agente SHALL handle webhook via Express backend
2. WHEN agent routes are accessed, THE Sistema_Agente SHALL provide Express endpoints for /api/agent/*
3. WHEN chat requests are made, THE Sistema_Agente SHALL proxy from Express to FastAPI
4. WHEN subscription validation is needed, THE Sistema_Agente SHALL use unified middleware
5. WHEN errors occur in proxy, THE Sistema_Agente SHALL handle gracefully with proper logging

### Requirement 4: Configuração de Ambiente de Produção

**User Story:** Como administrador do sistema, eu quero que todas as configurações de ambiente estejam corretas para produção, para que o sistema funcione adequadamente no EasyPanel.

#### Acceptance Criteria

1. WHEN the frontend application loads, THE Sistema_Agente SHALL use production API URLs instead of localhost
2. WHEN CORS requests are made from the frontend, THE Sistema_Agente SHALL accept requests from the production domain
3. WHEN JWT tokens are generated, THE Sistema_Agente SHALL use a secure JWT secret different from default values
4. WHEN environment variables are loaded, THE Sistema_Agente SHALL validate all required configuration values
5. WHEN EasyPanel credentials are configured, THE Sistema_Agente SHALL use internal service URLs

### Requirement 5: Ativação de Agentes

**User Story:** Como afiliado, eu quero ativar meu agente através da interface web, para que eu possa começar a usar o sistema.

#### Acceptance Criteria

1. WHEN an affiliate clicks activate agent, THE Sistema_Agente SHALL provide an endpoint at /api/v1/agent/activate
2. WHEN the activation endpoint is called, THE Sistema_Agente SHALL validate the affiliate's subscription status
3. WHEN a valid subscription exists, THE Sistema_Agente SHALL create or update the agent activation record
4. WHEN activation is successful, THE Sistema_Agente SHALL return confirmation with agent details
5. WHEN activation fails, THE Sistema_Agente SHALL return descriptive error messages

### Requirement 6: Validação de Assinatura Unificada

**User Story:** Como sistema, eu quero uma lógica consistente de validação de assinatura, para que não haja conflitos entre diferentes tabelas de dados.

#### Acceptance Criteria

1. WHEN validating affiliate access, THE Sistema_Agente SHALL check both affiliate_services and multi_agent_subscriptions tables
2. WHEN a subscription is found in affiliate_services, THE Sistema_Agente SHALL create corresponding record in multi_agent_subscriptions if missing
3. WHEN subscription status changes, THE Sistema_Agente SHALL update both tables consistently
4. WHEN subscription expires, THE Sistema_Agente SHALL deactivate access in both systems
5. WHEN subscription conflicts exist, THE Sistema_Agente SHALL prioritize the most recent valid subscription

### Requirement 7: Autenticação JWT Robusta

**User Story:** Como usuário do sistema, eu quero que minha autenticação seja segura e confiável, para que eu possa acessar o sistema sem problemas.

#### Acceptance Criteria

1. WHEN a user logs in, THE Sistema_Agente SHALL generate JWT tokens with secure algorithms
2. WHEN JWT tokens are validated, THE Sistema_Agente SHALL verify signature and expiration
3. WHEN JWT secret is compromised, THE Sistema_Agente SHALL support secret rotation without downtime
4. WHEN authentication fails, THE Sistema_Agente SHALL return clear error messages
5. WHEN tokens expire, THE Sistema_Agente SHALL provide refresh token mechanism

### Requirement 8: Integração com Serviços Externos EasyPanel

**User Story:** Como afiliado, eu quero que meu agente se conecte corretamente ao WhatsApp e Chatwoot, para que eu possa atender meus clientes.

#### Acceptance Criteria

1. WHEN EasyPanel credentials are discovered, THE Sistema_Agente SHALL identify internal URLs for Redis, Evolution API, and Chatwoot
2. WHEN connecting to Evolution API, THE Sistema_Agente SHALL use internal EasyPanel networking
3. WHEN WhatsApp integration is activated, THE Sistema_Agente SHALL verify connection status via internal API
4. WHEN Chatwoot integration is configured, THE Sistema_Agente SHALL use internal webhook URLs
5. WHEN service connections fail, THE Sistema_Agente SHALL log detailed error information with internal network context

### Requirement 9: Monitoramento e Logs

**User Story:** Como administrador, eu quero logs estruturados e monitoramento, para que eu possa diagnosticar problemas rapidamente.

#### Acceptance Criteria

1. WHEN system operations occur, THE Sistema_Agente SHALL generate structured logs with timestamps
2. WHEN errors happen, THE Sistema_Agente SHALL log complete error context and stack traces
3. WHEN users perform actions, THE Sistema_Agente SHALL log user activities for audit
4. WHEN system health is checked, THE Sistema_Agente SHALL provide health check endpoints
5. WHEN performance issues occur, THE Sistema_Agente SHALL log performance metrics

### Requirement 10: Sincronização de Dados de Assinatura

**User Story:** Como sistema, eu quero sincronizar automaticamente os dados de assinatura entre as tabelas, para que não haja inconsistências.

#### Acceptance Criteria

1. WHEN the system starts, THE Sistema_Agente SHALL verify data consistency between affiliate_services and multi_agent_subscriptions
2. WHEN inconsistencies are found, THE Sistema_Agente SHALL create missing records in multi_agent_subscriptions
3. WHEN subscription data is updated, THE Sistema_Agente SHALL maintain referential integrity
4. WHEN data migration is needed, THE Sistema_Agente SHALL provide migration scripts
5. WHEN synchronization fails, THE Sistema_Agente SHALL alert administrators

### Requirement 11: Interface de Usuário Funcional

**User Story:** Como afiliado, eu quero uma interface web que funcione corretamente, para que eu possa gerenciar meus agentes facilmente.

#### Acceptance Criteria

1. WHEN the frontend loads, THE Sistema_Agente SHALL display the dashboard without connection errors
2. WHEN API calls are made, THE Sistema_Agente SHALL handle loading states appropriately
3. WHEN errors occur, THE Sistema_Agente SHALL display user-friendly error messages
4. WHEN actions are successful, THE Sistema_Agente SHALL provide clear success feedback
5. WHEN the interface updates, THE Sistema_Agente SHALL maintain responsive design across devices