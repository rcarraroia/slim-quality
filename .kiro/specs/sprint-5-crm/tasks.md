# Implementation Plan - Sprint 5: Sistema de CRM e Gestão de Clientes

## Overview

Este plano de implementação converte o design do sistema de CRM em tarefas específicas de código, aproveitando 30% da estrutura frontend existente e implementando 70% de funcionalidades novas. As tarefas são organizadas em três categorias: Backend (criação), Frontend Adaptação (30% existente) e Frontend Criação (70% novo).

**Estratégia de Execução:**
1. **Backend primeiro** - Criar toda infraestrutura de dados e APIs
2. **Adaptação** - Expandir componentes existentes (Conversas.tsx, layout)  
3. **Criação** - Implementar novos componentes e páginas
4. **Integração** - Conectar frontend com backend e sistemas existentes

## Tasks

### FASE 1: INFRAESTRUTURA BACKEND

- [x] 1. Criar estrutura de banco de dados CRM



  - Criar migration com todas as tabelas (customers, conversations, messages, appointments, etc.)
  - Implementar constraints, foreign keys e validações
  - Criar índices otimizados para consultas frequentes
  - Configurar Row Level Security (RLS) para todas as tabelas
  - _Requirements: 1.1, 1.2, 1.3, 15.1, 15.2, 16.4, 17.3_


- [x] 1.1 Criar tabela customers com validações

  - Implementar estrutura completa com campos obrigatórios e opcionais
  - Adicionar constraints para email único e validação de CPF/CNPJ
  - Criar trigger para updated_at automático
  - Implementar soft delete com deleted_at
  - _Requirements: 1.1, 1.2, 16.1, 16.2, 16.3_


- [x] 1.2 Criar sistema de tags (customer_tags e assignments)

  - Implementar tabela de tags com cores e descrições
  - Criar tabela de relacionamento many-to-many
  - Adicionar regras de auto-aplicação via JSONB
  - Implementar constraints de unicidade
  - _Requirements: 2.1, 2.2, 2.3_


- [x] 1.3 Criar sistema de timeline (customer_timeline)

  - Implementar tabela de eventos cronológicos
  - Criar ENUM para tipos de eventos
  - Adicionar campos de metadata flexível (JSONB)
  - Criar índices para consultas por cliente e data
  - _Requirements: 3.1, 3.2, 3.3, 3.4_


- [x] 1.4 Criar sistema de conversas (conversations e messages)

  - Implementar tabelas para conversas multicanal
  - Criar ENUMs para status e canais
  - Adicionar campos de atribuição e prioridade
  - Implementar estrutura para mensagens com tipos
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_


- [x] 1.5 Criar sistema de agendamentos (appointments)

  - Implementar tabela com tipos e status de agendamentos
  - Adicionar validações de data/hora
  - Criar campos para localização e duração
  - Implementar soft delete e auditoria
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 1.6 Criar testes de migração e integridade


  - Testar criação de todas as tabelas
  - Validar constraints e foreign keys
  - Testar políticas RLS
  - Verificar performance dos índices
  - _Requirements: 16.4, 17.3_

### FASE 2: SERVIÇOS BACKEND

- [x] 2. Implementar CustomerService (gestão de clientes)



  - Criar service principal com CRUD completo
  - Implementar validações de CPF/CNPJ e email
  - Adicionar sistema de busca e filtros avançados
  - Implementar gestão de tags automática
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.4, 2.5_



- [x] 2.1 Implementar CRUD básico de clientes


  - Criar métodos create, read, update, delete
  - Adicionar validações usando Zod schemas
  - Implementar paginação e ordenação
  - Adicionar soft delete com preservação de histórico
  - _Requirements: 1.1, 1.2, 16.1, 16.2, 16.3_

- [x] 2.2 Implementar sistema de busca e filtros


  - Criar busca por nome, email, telefone, CPF/CNPJ
  - Implementar filtros por tags, data de cadastro, status
  - Adicionar busca full-text quando necessário
  - Otimizar queries com índices apropriados
  - _Requirements: 1.1, 17.1, 17.2_

- [x] 2.3 Implementar gestão de tags


  - Criar métodos para adicionar/remover tags
  - Implementar regras de auto-aplicação
  - Adicionar validação de tags existentes
  - Registrar eventos na timeline quando tags mudam
  - _Requirements: 2.1, 2.2, 2.3, 3.4_

- [x] 2.4 Criar testes para CustomerService


  - Testar CRUD completo com dados válidos e inválidos
  - Testar validações de CPF/CNPJ e email
  - Testar sistema de busca e filtros
  - Testar gestão de tags
  - _Requirements: 1.1, 2.1, 16.1_


- [x] 3. Implementar ConversationService (gestão de conversas)

  - Criar service para conversas multicanal
  - Implementar sistema de atribuição de atendentes
  - Adicionar gestão de status e prioridades
  - Implementar busca e filtros de conversas
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3.1 Implementar CRUD de conversas


  - Criar métodos para gerenciar conversas
  - Implementar busca por cliente, status, canal
  - Adicionar sistema de atribuição automática
  - Implementar atualização de última atividade
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 3.2 Implementar MessageService (gestão de mensagens)

  - Criar service para mensagens individuais
  - Implementar diferentes tipos de mensagem (texto, imagem)
  - Adicionar sistema de leitura/não lida
  - Implementar ordenação cronológica
  - _Requirements: 5.1, 5.2, 5.4, 5.5_


- [x] 3.3 Implementar sistema de notificações

  - Criar notificações para novas conversas
  - Implementar alertas de conversas sem resposta
  - Adicionar notificações de atribuição
  - Implementar preferências por usuário
  - _Requirements: 18.1, 18.2, 18.4_


- [x] 3.4 Criar testes para ConversationService

  - Testar criação e gestão de conversas
  - Testar sistema de mensagens
  - Testar atribuição e notificações
  - Testar filtros e busca
  - _Requirements: 4.1, 5.1, 18.1_


- [x] 4. Implementar TimelineService (eventos cronológicos)


  - Criar service para gestão de timeline
  - Implementar registro automático de eventos
  - Adicionar filtros por tipo e período
  - Implementar adição manual de notas
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [x] 4.1 Implementar registro automático de eventos

  - Criar eventos para cadastro de cliente
  - Registrar eventos de pedidos e pagamentos
  - Adicionar eventos de conversas e mensagens
  - Implementar eventos de agendamentos
  - _Requirements: 3.1, 3.3, 8.1, 8.2_


- [x] 4.2 Implementar gestão manual de eventos

  - Criar método para adicionar notas manuais
  - Implementar edição de eventos (quando permitido)
  - Adicionar sistema de anexos (futuro)
  - Implementar validações de permissão
  - _Requirements: 3.4, 10.5_


- [x] 4.3 Criar testes para TimelineService

  - Testar registro automático de eventos
  - Testar adição manual de notas
  - Testar filtros e ordenação
  - Testar integrações com outros services
  - _Requirements: 3.1, 3.4_

- [x] 5. Implementar AppointmentService (agendamentos)


  - Criar service para gestão de agendamentos
  - Implementar validação de conflitos de horário
  - Adicionar sistema de lembretes
  - Implementar diferentes tipos de agendamento
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 5.1 Implementar CRUD de agendamentos

  - Criar métodos para gerenciar agendamentos
  - Implementar validação de data/hora futura
  - Adicionar verificação de disponibilidade
  - Implementar cancelamento e reagendamento
  - _Requirements: 6.1, 6.2, 6.4_


- [x] 5.2 Implementar sistema de lembretes

  - Criar job para verificar agendamentos próximos
  - Implementar notificações 30 min antes
  - Adicionar lembretes por email (futuro)
  - Implementar configuração de preferências
  - _Requirements: 6.3, 18.3_


- [x] 5.3 Criar testes para AppointmentService

  - Testar CRUD de agendamentos
  - Testar validações de conflito
  - Testar sistema de lembretes
  - Testar diferentes tipos de agendamento
  - _Requirements: 6.1, 6.3_

### FASE 3: APIS REST


- [x] 6. Implementar APIs REST para clientes

  - Criar controllers para todas as operações de clientes
  - Implementar validação de entrada com Zod
  - Adicionar middleware de autorização
  - Implementar paginação e filtros
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.1 Criar CustomerController



  - Implementar GET /api/customers com filtros
  - Criar POST /api/customers com validação
  - Implementar PUT /api/customers/:id
  - Adicionar DELETE /api/customers/:id (soft delete)
  - _Requirements: 10.1, 10.2, 10.3_

- [x] 6.2 Implementar APIs de timeline e notas


  - Criar GET /api/customers/:id/timeline
  - Implementar POST /api/customers/:id/notes
  - Adicionar filtros por tipo de evento
  - Implementar paginação para timeline longa
  - _Requirements: 10.4, 10.5_

- [x] 6.3 Implementar APIs de tags

  - Criar POST /api/customers/:id/tags
  - Implementar DELETE /api/customers/:id/tags/:tagId
  - Adicionar GET /api/customers/:id/tags
  - Implementar validação de tags existentes
  - _Requirements: 2.4, 2.5_


- [x] 6.4 Criar testes de integração para Customer APIs

  - Testar todas as rotas com dados válidos/inválidos
  - Testar autorização e permissões
  - Testar paginação e filtros
  - Testar validações de entrada
  - _Requirements: 10.1, 15.4_


- [x] 7. Implementar APIs REST para conversas

  - Criar controllers para conversas e mensagens
  - Implementar sistema de atribuição via API
  - Adicionar filtros por status, canal, atendente
  - Implementar APIs de mensagens em tempo real
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_


- [x] 7.1 Criar ConversationController

  - Implementar GET /api/conversations com filtros
  - Criar POST /api/conversations
  - Implementar PUT /api/conversations/:id
  - Adicionar APIs de mudança de status
  - _Requirements: 11.1, 11.5_


- [x] 7.2 Implementar MessageController

  - Criar GET /api/conversations/:id/messages
  - Implementar POST /api/conversations/:id/messages
  - Adicionar marcação de leitura automática
  - Implementar paginação de mensagens
  - _Requirements: 11.2, 11.3_

- [x] 7.3 Implementar sistema de atribuição

  - Criar PUT /api/conversations/:id/assign
  - Implementar atribuição automática
  - Adicionar validação de permissões
  - Implementar notificações de atribuição
  - _Requirements: 11.4, 18.1_


- [x] 7.4 Criar testes para Conversation APIs

  - Testar CRUD de conversas
  - Testar sistema de mensagens
  - Testar atribuição e notificações
  - Testar filtros e busca
  - _Requirements: 11.1, 11.3_


- [x] 8. Implementar APIs REST para agendamentos
  - Criar controllers para agendamentos
  - Implementar vista de calendário
  - Adicionar validação de conflitos
  - Implementar diferentes tipos de agendamento
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8.1 Criar AppointmentController
  - Implementar GET /api/appointments com filtros
  - Criar POST /api/appointments com validação
  - Implementar PUT /api/appointments/:id
  - Adicionar DELETE /api/appointments/:id
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 8.2 Implementar API de calendário
  - Criar GET /api/appointments/calendar
  - Implementar filtros por data e usuário
  - Adicionar vista mensal/semanal/diária
  - Implementar detecção de conflitos
  - _Requirements: 12.5_

- [x] 8.3 Criar testes para Appointment APIs
  - Testar CRUD de agendamentos
  - Testar validação de conflitos
  - Testar vista de calendário
  - Testar diferentes tipos
  - _Requirements: 12.1, 12.5_

- [x] 9. Implementar APIs administrativas
  - Criar controllers para gestão de tags
  - Implementar APIs de relatórios e métricas
  - Adicionar exportação de dados
  - Implementar configurações do sistema
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 9.1 Criar TagController (admin)
  - Implementar CRUD completo de tags
  - Adicionar validação de cores e nomes
  - Implementar estatísticas de uso
  - Adicionar regras de auto-aplicação
  - _Requirements: 13.1_

- [x] 9.2 Implementar ReportsController
  - Criar GET /api/admin/customers/stats
  - Implementar GET /api/admin/conversations/stats
  - Adicionar GET /api/admin/reports/crm
  - Implementar métricas de performance
  - _Requirements: 13.2, 13.3, 13.4, 19.1, 19.2_

- [x] 9.3 Implementar exportação de dados
  - Criar endpoints de exportação CSV/XLSX
  - Implementar filtros para exportação
  - Adicionar compressão para arquivos grandes
  - Implementar download assíncrono
  - _Requirements: 13.5, 19.5_

- [x] 9.4 Criar testes para Admin APIs
  - Testar CRUD de tags
  - Testar geração de relatórios
  - Testar exportação de dados
  - Testar permissões administrativas
  - _Requirements: 13.1, 13.2_

### FASE 4: WEBHOOK E INTEGRAÇÕES

- [x] 10. Implementar webhook N8N/BIA
  - Criar endpoint para receber mensagens WhatsApp
  - Implementar processamento assíncrono
  - Adicionar validação de origem e autenticação
  - Implementar retry automático em falhas
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 10.1 Criar N8NWebhookController com segurança robusta
  - Implementar POST /webhooks/n8n/message
  - Adicionar validação rigorosa de payload com Zod
  - Implementar autenticação por token Bearer (N8N_WEBHOOK_SECRET)
  - Adicionar validação de origem IP (whitelist)
  - Implementar rate limiting específico (100 req/min por IP)
  - Adicionar logs de segurança para tentativas suspeitas
  - Implementar validação de timestamp para evitar replay attacks
  - _Requirements: 14.1, 14.2, 14.4, 15.3_

- [x] 10.2 Implementar processamento de mensagens
  - Criar service para processar mensagens WhatsApp
  - Implementar busca/criação automática de cliente
  - Adicionar criação automática de conversa
  - Implementar registro na timeline
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10.3 Implementar sistema de retry
  - Adicionar fila para processamento assíncrono
  - Implementar retry automático em falhas
  - Adicionar logs estruturados
  - Implementar alertas para falhas críticas
  - _Requirements: 14.5_

- [x] 10.4 Criar testes para webhook N8N
  - Testar recebimento de mensagens
  - Testar criação automática de clientes/conversas
  - Testar sistema de retry
  - Testar validação e autenticação
  - _Requirements: 14.1, 14.2_

- [x] 11. Implementar integrações com sistemas existentes
  - Integrar com sistema de vendas (pedidos → timeline)
  - Integrar com sistema de afiliados (origem de clientes)
  - Adicionar sincronização de dados
  - Implementar eventos cross-system
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11.1 Integrar com sistema de vendas
  - Modificar OrderService para registrar eventos na timeline
  - Adicionar tags automáticas baseadas em compras
  - Implementar cálculo de LTV e métricas
  - Sincronizar dados de cliente entre sistemas
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 11.2 Integrar com sistema de afiliados
  - Identificar clientes indicados por afiliados
  - Adicionar tags automáticas para indicações
  - Registrar origem na timeline do cliente
  - Implementar relatórios de conversão por fonte
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11.3 Criar testes de integração cross-system
  - Testar integração com vendas
  - Testar integração com afiliados
  - Testar sincronização de dados
  - Testar eventos automáticos
  - _Requirements: 8.1, 9.1_

### FASE 5: FRONTEND - ADAPTAÇÃO (30% EXISTENTE)

- [x] 12. Adaptar página de Conversas existente
  - Expandir src/pages/dashboard/Conversas.tsx com interface de chat
  - Substituir dados mock por integração com APIs reais
  - Adicionar filtro por atendente e sistema de atribuição
  - Implementar indicadores de mensagens não lidas
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 12.1 Expandir estrutura existente de Conversas.tsx
  - Manter filtros existentes (status, período, busca) ✅
  - Adicionar filtro por atendente atribuído
  - Implementar sistema de atribuição inline
  - Adicionar indicadores visuais de prioridade
  - _Requirements: 20.1, 20.3_

- [x] 12.2 Substituir dados mock por APIs reais
  - Remover import de mockConversas
  - Integrar com conversation-frontend.service.ts
  - Implementar loading states e error handling
  - Adicionar refresh automático de dados
  - _Requirements: 20.4, 20.22, 20.23_

- [x] 12.3 Adicionar interface de chat lateral
  - Criar layout split com lista + chat
  - Implementar seleção de conversa
  - Adicionar interface de envio de mensagens
  - Implementar scroll automático para novas mensagens
  - _Requirements: 20.1, 20.14_

- [x] 12.4 Implementar indicadores de status
  - Adicionar badges para mensagens não lidas
  - Implementar indicadores de "digitando"
  - Adicionar timestamps relativos
  - Implementar status de entrega (futuro)
  - _Requirements: 20.5_

- [x] 13. Habilitar e adaptar navegação existente
  - Habilitar menu "Clientes" no DashboardLayout (remover disabled: true)
  - Adicionar rotas faltantes no App.tsx
  - Implementar breadcrumbs para navegação
  - Adicionar ícones e badges de notificação
  - _Requirements: 20.10_

- [x] 13.1 Atualizar DashboardLayout.tsx
  - Remover disabled: true do menu Clientes
  - Adicionar badge de notificação para Conversas
  - Implementar contadores dinâmicos
  - Adicionar novos itens de menu (Agendamentos)
  - _Requirements: 20.10_

- [x] 13.2 Atualizar rotas no App.tsx
  - Adicionar rota /dashboard/clientes
  - Implementar rota /dashboard/clientes/:id
  - Adicionar rota /dashboard/agendamentos
  - Implementar rotas administrativas (/admin/tags)
  - _Requirements: 20.7, 20.8, 20.9_

- [x] 14. Adaptar componentes existentes para CRM
  - Reutilizar StatCard.tsx para métricas de CRM
  - Adaptar StatusBadge.tsx para status de conversas/clientes
  - Reutilizar componentes UI existentes (Card, Table, Avatar, etc.)
  - Implementar padrões visuais consistentes
  - _Requirements: 20.11, 20.12_

- [x] 14.1 Reutilizar StatCard para métricas CRM
  - Criar métricas específicas (total clientes, conversas ativas, etc.)
  - Implementar trends e comparações
  - Adicionar cores e ícones apropriados
  - Integrar com APIs de estatísticas
  - _Requirements: 20.11_

- [x] 14.2 Adaptar StatusBadge para CRM
  - Adicionar novos status (conversa: new, open, resolved, etc.)
  - Implementar cores para status de clientes
  - Adicionar status de agendamentos
  - Manter consistência visual
  - _Requirements: 20.12_

### FASE 6: FRONTEND - CRIAÇÃO (70% NOVO)

- [x] 15. Criar página de Clientes (/dashboard/clientes)
  - Implementar lista completa de clientes com filtros avançados
  - Adicionar busca por nome, email, telefone, CPF/CNPJ
  - Implementar paginação e ordenação
  - Adicionar ações em massa (tags, exportação)
  - _Requirements: 20.6_

- [x] 15.1 Criar estrutura base da página
  - Implementar layout com filtros superiores
  - Adicionar tabela responsiva de clientes
  - Implementar paginação com navegação
  - Adicionar botões de ação (Novo Cliente, Exportar)
  - _Requirements: 20.6_

- [ ] 15.2 Implementar filtros avançados
  - Criar filtros por tags (múltipla seleção)
  - Adicionar filtro por data de cadastro
  - Implementar filtro por origem (orgânico, afiliado, N8N)
  - Adicionar filtro por vendedor atribuído
  - _Requirements: 20.6_

- [ ] 15.3 Implementar busca inteligente
  - Criar busca unificada (nome, email, telefone, CPF)
  - Adicionar sugestões de busca
  - Implementar busca com debounce
  - Adicionar histórico de buscas recentes
  - _Requirements: 20.6_

- [ ] 15.4 Adicionar ações em massa
  - Implementar seleção múltipla de clientes
  - Adicionar aplicação de tags em massa
  - Implementar exportação seletiva
  - Adicionar atribuição em massa
  - _Requirements: 20.6_

- [x] 16. Criar página de detalhes do Cliente (/dashboard/clientes/:id)
  - Implementar layout com informações completas do cliente
  - Adicionar timeline de eventos cronológica
  - Mostrar pedidos relacionados e métricas
  - Implementar edição inline de informações
  - _Requirements: 20.7_

- [x] 16.1 Criar layout de detalhes
  - Implementar header com informações principais
  - Adicionar tabs para organizar conteúdo
  - Criar seção de tags editáveis
  - Implementar botões de ação (Editar, Agendar, etc.)
  - _Requirements: 20.7_

- [x] 16.2 Implementar timeline de eventos
  - Criar componente CustomerTimeline.tsx
  - Implementar filtros por tipo de evento
  - Adicionar paginação para timeline longa
  - Implementar adição manual de notas
  - _Requirements: 20.15, 20.7_

- [ ] 16.3 Mostrar dados relacionados
  - Integrar com sistema de vendas (pedidos)
  - Mostrar conversas relacionadas
  - Exibir agendamentos futuros e passados
  - Calcular métricas (LTV, frequência de compra)
  - _Requirements: 20.7_

- [ ] 16.4 Implementar edição de cliente
  - Criar formulário de edição inline
  - Implementar validação de campos
  - Adicionar upload de avatar (futuro)
  - Implementar histórico de alterações
  - _Requirements: 20.7_

- [x] 17. Criar página de Agendamentos (/dashboard/agendamentos)
  - Implementar vista de calendário interativo
  - Adicionar lista de agendamentos com filtros
  - Implementar criação/edição de agendamentos
  - Adicionar notificações de lembretes
  - _Requirements: 20.8_

- [x] 17.1 Implementar calendário interativo
  - Criar componente AppointmentCalendar.tsx
  - Implementar vistas mensal, semanal, diária
  - Adicionar navegação entre períodos
  - Implementar drag-and-drop para reagendar
  - _Requirements: 20.8_

- [x] 17.2 Criar lista de agendamentos
  - Implementar tabela com filtros
  - Adicionar busca por cliente/título
  - Implementar filtros por tipo e status
  - Adicionar ordenação por data/prioridade
  - _Requirements: 20.8_

- [ ] 17.3 Implementar CRUD de agendamentos
  - Criar modal/drawer para novo agendamento
  - Implementar formulário com validações
  - Adicionar seleção de cliente e tipo
  - Implementar detecção de conflitos
  - _Requirements: 20.8_

- [ ] 17.4 Adicionar sistema de lembretes
  - Implementar notificações no frontend
  - Adicionar badges de agendamentos próximos
  - Implementar configuração de preferências
  - Adicionar integração com calendário externo (futuro)
  - _Requirements: 20.8_

- [x] 18. Criar componentes específicos de CRM
  - Implementar CustomerCard.tsx para exibição de clientes
  - Criar ChatInterface.tsx para interface de mensagens
  - Implementar TagSelector.tsx para gestão de tags
  - Criar CustomerFilters.tsx para filtros avançados
  - _Requirements: 20.13, 20.14, 20.15_

- [x] 18.1 Criar CustomerCard.tsx
  - Implementar card responsivo com informações principais
  - Adicionar avatar com iniciais automáticas
  - Implementar badges de status e tags
  - Adicionar ações rápidas (ver detalhes, editar, agendar)
  - _Requirements: 20.13_

- [ ] 18.2 Criar ChatInterface.tsx
  - Implementar interface de chat em tempo real
  - Adicionar área de mensagens com scroll automático
  - Implementar input de mensagem com envio
  - Adicionar indicadores de digitação e status
  - _Requirements: 20.14_

- [ ] 18.3 Criar TagSelector.tsx
  - Implementar seletor múltiplo de tags
  - Adicionar criação de tags inline
  - Implementar cores personalizadas
  - Adicionar busca e filtro de tags
  - _Requirements: 20.15_

- [ ] 18.4 Criar CustomerFilters.tsx
  - Implementar painel de filtros avançados
  - Adicionar filtros por data com date picker
  - Implementar filtros por tags com autocomplete
  - Adicionar salvamento de filtros favoritos
  - _Requirements: 20.15_

### FASE 7: SERVIÇOS FRONTEND E INTEGRAÇÃO

- [x] 19. Criar serviços frontend para integração com APIs
  - Implementar customer-frontend.service.ts
  - Criar conversation-frontend.service.ts
  - Implementar appointment-frontend.service.ts
  - Criar tag-frontend.service.ts
  - _Requirements: 20.16, 20.17, 20.18_

- [x] 19.1 Criar customer-frontend.service.ts
  - Implementar métodos para CRUD de clientes
  - Adicionar métodos para timeline e notas
  - Implementar gestão de tags
  - Adicionar cache e otimizações
  - _Requirements: 20.16_

- [x] 19.2 Criar conversation-frontend.service.ts
  - Implementar métodos para conversas e mensagens
  - Adicionar sistema de atribuição
  - Implementar filtros e busca
  - Adicionar polling para mensagens em tempo real
  - _Requirements: 20.17_

- [x] 19.3 Criar appointment-frontend.service.ts
  - Implementar CRUD de agendamentos
  - Adicionar métodos para calendário
  - Implementar validação de conflitos
  - Adicionar notificações de lembretes
  - _Requirements: 20.18_

- [x] 19.4 Criar tag-frontend.service.ts
  - Implementar CRUD de tags (admin)
  - Adicionar métodos para aplicação de tags
  - Implementar estatísticas de uso
  - Adicionar validações de cores e nomes
  - _Requirements: 20.18_

- [ ] 20. Implementar tratamento de erros e loading states
  - Adicionar loading skeletons para todas as páginas
  - Implementar error boundaries para componentes
  - Criar sistema de notificações toast
  - Implementar retry automático em falhas
  - _Requirements: 20.19, 20.22, 20.23_

- [ ] 20.1 Implementar loading states
  - Criar skeletons para listas de clientes
  - Adicionar loading para timeline e conversas
  - Implementar spinners para ações
  - Adicionar progress bars para uploads
  - _Requirements: 20.19, 20.22_

- [ ] 20.2 Implementar error handling
  - Criar error boundaries para páginas
  - Implementar fallbacks para componentes
  - Adicionar retry automático
  - Implementar logs de erro estruturados
  - _Requirements: 20.23_

- [ ] 20.3 Criar sistema de notificações
  - Implementar toast notifications
  - Adicionar notificações de sucesso/erro
  - Implementar notificações em tempo real
  - Adicionar configuração de preferências
  - _Requirements: 20.19_

- [ ] 21. Implementar otimizações de performance
  - Adicionar lazy loading para componentes pesados
  - Implementar virtualização para listas grandes
  - Adicionar cache com React Query
  - Implementar otimistic updates
  - _Requirements: 20.20, 20.24, 20.25_

- [ ] 21.1 Implementar lazy loading
  - Adicionar lazy loading para páginas
  - Implementar code splitting por rota
  - Adicionar preloading para componentes críticos
  - Implementar loading progressivo de imagens
  - _Requirements: 20.20_

- [ ] 21.2 Implementar cache inteligente
  - Configurar React Query para cache
  - Implementar invalidação automática
  - Adicionar cache persistente
  - Implementar sincronização entre tabs
  - _Requirements: 20.20, 20.25_

- [ ] 21.3 Implementar otimistic updates
  - Adicionar updates otimistas para ações rápidas
  - Implementar rollback em caso de erro
  - Adicionar feedback visual imediato
  - Implementar sincronização em background
  - _Requirements: 20.24_

### FASE 8: PÁGINAS ADMINISTRATIVAS

- [x] 22. Criar página de gestão de Tags (/admin/tags)
  - Implementar CRUD completo de tags
  - Adicionar configuração de cores personalizadas
  - Mostrar estatísticas de uso por tag
  - Implementar regras de auto-aplicação
  - _Requirements: 20.9_

- [x] 22.1 Criar interface de gestão de tags
  - Implementar lista de tags com cores
  - Adicionar formulário de criação/edição
  - Implementar seletor de cores
  - Adicionar validação de nomes únicos
  - _Requirements: 20.9_

- [x] 22.2 Implementar estatísticas de tags
  - Mostrar quantidade de clientes por tag
  - Adicionar gráficos de distribuição
  - Implementar métricas de crescimento
  - Adicionar exportação de dados
  - _Requirements: 20.9_

- [ ] 22.3 Implementar regras de auto-aplicação
  - Criar interface para configurar regras
  - Implementar preview de regras
  - Adicionar validação de lógica
  - Implementar aplicação retroativa
  - _Requirements: 20.9_

- [ ] 23. Criar tipos TypeScript para CRM
  - Implementar customer.types.ts
  - Criar conversation.types.ts
  - Implementar appointment.types.ts
  - Adicionar validações com Zod
  - _Requirements: 20.16, 20.17, 20.18_

- [ ] 23.1 Criar customer.types.ts
  - Definir interfaces para Customer
  - Adicionar tipos para Timeline e Tags
  - Implementar tipos para filtros
  - Adicionar schemas de validação
  - _Requirements: 20.16_

- [ ] 23.2 Criar conversation.types.ts
  - Definir interfaces para Conversation e Message
  - Adicionar tipos para canais e status
  - Implementar tipos para filtros
  - Adicionar schemas de validação
  - _Requirements: 20.17_

- [ ] 23.3 Criar appointment.types.ts
  - Definir interfaces para Appointment
  - Adicionar tipos para calendário
  - Implementar tipos para lembretes
  - Adicionar schemas de validação
  - _Requirements: 20.18_

### FASE 9: TESTES E VALIDAÇÃO

- [ ] 24. Criar testes de integração frontend
  - Testar fluxos completos de CRM
  - Validar integração com APIs
  - Testar responsividade e acessibilidade
  - Implementar testes E2E críticos
  - _Requirements: Todos os requirements de frontend_

- [ ] 24.1 Testar fluxos de clientes
  - Testar criação e edição de clientes
  - Validar sistema de tags
  - Testar timeline de eventos
  - Validar filtros e busca
  - _Requirements: 20.6, 20.7_

- [ ] 24.2 Testar fluxos de conversas
  - Testar interface de chat
  - Validar sistema de atribuição
  - Testar notificações
  - Validar filtros e status
  - _Requirements: 20.1, 20.14_

- [ ] 24.3 Testar fluxos de agendamentos
  - Testar criação de agendamentos
  - Validar calendário interativo
  - Testar detecção de conflitos
  - Validar lembretes
  - _Requirements: 20.8_

- [ ] 25. Realizar testes de integração completos
  - Testar integração com sistema de vendas
  - Validar integração com afiliados
  - Testar webhook N8N/BIA
  - Validar sincronização de dados
  - _Requirements: 8.1, 9.1, 7.1_

- [ ] 25.1 Testar integração vendas → CRM
  - Validar criação automática de eventos na timeline
  - Testar aplicação automática de tags
  - Validar cálculo de métricas (LTV)
  - Testar sincronização de dados de cliente
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 25.2 Testar integração afiliados → CRM
  - Validar identificação de clientes indicados
  - Testar aplicação de tags automáticas
  - Validar registro de origem na timeline
  - Testar relatórios de conversão
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 25.3 Testar webhook N8N → CRM
  - Validar recebimento de mensagens WhatsApp
  - Testar criação automática de clientes/conversas
  - Validar processamento assíncrono
  - Testar sistema de retry
  - _Requirements: 7.1, 7.2, 7.3_

## Summary

Este plano de implementação garante que o sistema de CRM seja construído aproveitando ao máximo a estrutura frontend existente (30%) e implementando de forma eficiente as funcionalidades novas (70%). O foco está na integração perfeita com os sistemas existentes e na criação de uma experiência de usuário consistente e intuitiva.

**Total de tarefas:** 28 principais + 85 sub-tarefas = 113 tarefas
**Testes:** 15 conjuntos obrigatórios (todos os testes são obrigatórios)
**Estimativa ajustada:** 4-5 dias (otimizada pela reutilização de 30% da estrutura)
**Criticidade:** ALTA - Sistema central para relacionamento com clientes
**Segurança:** Webhook N8N com autenticação robusta e validações de segurança
### 
FASE 10: VALIDAÇÃO FINAL E CRITÉRIOS DE ACEITE

- [ ] 26. Executar checklist de validação completa
  - Validar todos os requirements implementados
  - Executar testes de aceitação end-to-end
  - Verificar integrações com sistemas existentes
  - Validar performance e segurança
  - _Requirements: Todos os 20 requirements_

- [ ] 26.1 Validar funcionalidades core de CRM
  - ✅ CRUD completo de clientes funciona
  - ✅ Sistema de tags aplicado corretamente
  - ✅ Timeline de eventos registra automaticamente
  - ✅ Busca e filtros retornam resultados corretos
  - ✅ Validações de CPF/CNPJ e email funcionam
  - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 3.1, 3.4_

- [ ] 26.2 Validar sistema de conversas
  - ✅ Conversas multicanal criadas corretamente
  - ✅ Interface de chat envia/recebe mensagens
  - ✅ Sistema de atribuição funciona
  - ✅ Filtros por status, canal, atendente funcionam
  - ✅ Indicadores de não lidas atualizados
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 20.1, 20.14_

- [ ] 26.3 Validar sistema de agendamentos
  - ✅ Calendário interativo funciona
  - ✅ Criação de agendamentos sem conflitos
  - ✅ Lembretes enviados corretamente
  - ✅ Diferentes tipos de agendamento suportados
  - ✅ Vista mensal/semanal/diária funcionam
  - _Requirements: 6.1, 6.2, 6.3, 20.8_

- [ ] 26.4 Validar integrações externas
  - ✅ Webhook N8N recebe mensagens WhatsApp
  - ✅ Clientes criados automaticamente via webhook
  - ✅ Conversas criadas automaticamente
  - ✅ Timeline atualizada com eventos de vendas
  - ✅ Tags aplicadas automaticamente (Cliente Ativo, Indicação)
  - _Requirements: 7.1, 7.2, 7.3, 8.1, 8.2, 9.1, 9.2_

- [ ] 26.5 Validar segurança e performance
  - ✅ RLS funciona corretamente (vendedores veem apenas seus clientes)
  - ✅ Webhook N8N autenticado com token
  - ✅ Rate limiting ativo em todas as APIs
  - ✅ APIs respondem em menos de 2 segundos
  - ✅ Paginação funciona para listas grandes
  - _Requirements: 15.1, 15.2, 17.1, 17.2, 14.2_

- [ ] 26.6 Validar frontend integrado
  - ✅ Menu "Clientes" habilitado e funcional
  - ✅ Página de Conversas expandida com chat
  - ✅ Página de Clientes com filtros avançados
  - ✅ Página de detalhes do cliente completa
  - ✅ Página de Agendamentos com calendário
  - ✅ Componentes reutilizados (StatCard, StatusBadge)
  - ✅ Loading states e error handling funcionam
  - _Requirements: 20.1, 20.6, 20.7, 20.8, 20.10, 20.11, 20.12, 20.22, 20.23_

- [ ] 27. Executar testes de aceitação final
  - Executar cenários de uso real com dados de produção
  - Testar fluxo completo: WhatsApp → Conversa → Cliente → Agendamento
  - Validar performance com volume real de dados
  - Executar testes de segurança e penetração
  - _Requirements: Todos os requirements_

- [ ] 27.1 Cenário: Cliente novo via WhatsApp
  - ✅ BIA envia mensagem via webhook
  - ✅ Cliente criado automaticamente
  - ✅ Conversa criada no canal WhatsApp
  - ✅ Atendente notificado
  - ✅ Timeline registra evento "Conversa Iniciada"
  - ✅ Interface de chat permite resposta
  - _Requirements: 7.1, 7.2, 7.3, 18.1, 20.1_

- [ ] 27.2 Cenário: Cliente faz primeira compra
  - ✅ Pedido criado no sistema de vendas
  - ✅ Evento "Pedido Realizado" adicionado à timeline
  - ✅ Tag "Cliente Ativo" aplicada automaticamente
  - ✅ Métricas de LTV calculadas
  - ✅ Dados sincronizados entre sistemas
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 27.3 Cenário: Vendedor agenda follow-up
  - ✅ Vendedor acessa detalhes do cliente
  - ✅ Cria agendamento via interface
  - ✅ Sistema valida disponibilidade
  - ✅ Evento adicionado à timeline
  - ✅ Lembrete enviado 30 min antes
  - ✅ Agendamento marcado como realizado
  - _Requirements: 6.1, 6.2, 6.3, 20.8_

- [ ] 27.4 Cenário: Admin gerencia tags
  - ✅ Admin acessa /admin/tags
  - ✅ Cria nova tag com cor personalizada
  - ✅ Aplica tag a múltiplos clientes
  - ✅ Visualiza estatísticas de uso
  - ✅ Configura regra de auto-aplicação
  - _Requirements: 2.1, 2.2, 2.3, 20.9_

- [ ] 28. Documentar critérios de aceite atendidos
  - Criar relatório de validação final
  - Documentar todos os requirements atendidos
  - Listar funcionalidades implementadas
  - Documentar integrações validadas
  - Preparar documentação para produção
  - _Requirements: Todos os 20 requirements_

## Critérios de Aceite Final

### ✅ **BACKEND (100% Obrigatório)**
- [ ] Todas as 5 tabelas criadas com constraints e índices
- [ ] Todos os 5 services implementados com validações
- [ ] Todas as APIs REST funcionais (customers, conversations, appointments, admin)
- [ ] Webhook N8N seguro e funcional
- [ ] Integrações com vendas e afiliados ativas
- [ ] RLS configurado e testado
- [ ] Todos os testes unitários e de integração passando

### ✅ **FRONTEND (100% Obrigatório)**
- [ ] Menu "Clientes" habilitado no DashboardLayout
- [ ] Página de Conversas expandida com interface de chat
- [ ] Página de Clientes com CRUD completo
- [ ] Página de detalhes do cliente com timeline
- [ ] Página de Agendamentos com calendário
- [ ] Página administrativa de Tags
- [ ] Todos os 4 serviços frontend implementados
- [ ] Loading states e error handling em todas as páginas
- [ ] Componentes reutilizados (StatCard, StatusBadge, UI)

### ✅ **INTEGRAÇÕES (100% Obrigatório)**
- [ ] Webhook N8N → CRM (WhatsApp messages)
- [ ] Sistema de Vendas → CRM (timeline events)
- [ ] Sistema de Afiliados → CRM (customer origin)
- [ ] Todas as integrações testadas e funcionais

### ✅ **QUALIDADE (100% Obrigatório)**
- [ ] Todos os 15 conjuntos de testes implementados e passando
- [ ] Performance: APIs < 2s, frontend responsivo
- [ ] Segurança: RLS, autenticação webhook, rate limiting
- [ ] Acessibilidade: componentes acessíveis
- [ ] Responsividade: funciona em desktop, tablet, mobile

### 🎯 **CRITÉRIO DE SUCESSO FINAL**
O Sprint 5 será considerado **100% COMPLETO** quando:
1. Todos os checkboxes acima estiverem marcados ✅
2. Todos os 4 cenários de teste de aceitação passarem
3. Sistema estiver pronto para uso em produção
4. Documentação de deploy estiver completa

**Estimativa Final Ajustada:** 4-5 dias
**Total de Tasks:** 28 principais + 85 sub-tasks = 113 tasks
**Testes:** 15 conjuntos obrigatórios (não opcionais)
**Criticidade:** ALTA - Sistema central de CRM