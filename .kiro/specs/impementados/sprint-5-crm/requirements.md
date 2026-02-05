# Requirements Document - Sprint 5: Sistema de CRM e Gestão de Clientes

## Introduction

Este documento define os requisitos para o Sprint 5 do projeto Slim Quality Backend - implementação de um sistema completo de CRM (Customer Relationship Management) para gestão de relacionamento com clientes. O objetivo é criar uma plataforma integrada que permita gerenciar clientes, conversas, anotações, agendamentos e timeline de eventos.

**Contexto:** Os sprints anteriores (0-4) estão completos, incluindo autenticação, produtos, vendas com Asaas e sistema de afiliados. Agora implementamos o CRM para centralizar o relacionamento com clientes e integrar com a BIA (assistente IA via N8N).

**Base Existente:** Conforme análise prévia, 30% da estrutura frontend já existe (página de Conversas, layout, componentes UI), permitindo otimização do desenvolvimento.

## Glossary

- **Sistema**: Slim Quality Backend + Frontend
- **CRM**: Customer Relationship Management - Sistema de gestão de relacionamento com clientes
- **Cliente**: Pessoa física ou jurídica que interage com a empresa
- **Conversa**: Thread de mensagens entre cliente e empresa via diferentes canais
- **Timeline**: Linha do tempo cronológica de eventos relacionados ao cliente
- **Tag**: Etiqueta para categorização e segmentação de clientes
- **Agendamento**: Reunião, ligação ou follow-up agendado com cliente
- **BIA**: Bot de Inteligência Artificial integrado via N8N/WhatsApp
- **Atribuição**: Designação de um vendedor/atendente para uma conversa
- **Canal**: Meio de comunicação (WhatsApp, Email, Chat, Telefone)

## Requirements

### Requirement 1: Gestão Completa de Clientes

**User Story:** Como vendedor/atendente, eu quero gerenciar informações completas dos clientes, para que eu possa oferecer atendimento personalizado e acompanhar o histórico de relacionamento.

#### Acceptance Criteria

1. WHEN vendedor acessa lista de clientes, THE Sistema SHALL exibir tabela paginada com busca e filtros avançados
2. WHEN vendedor cria novo cliente, THE Sistema SHALL validar CPF/CNPJ, email único e telefone em formato correto
3. WHEN cliente é criado, THE Sistema SHALL gerar automaticamente evento "Cliente Cadastrado" na timeline
4. WHEN vendedor visualiza detalhes do cliente, THE Sistema SHALL exibir informações completas, tags, timeline e pedidos relacionados
5. THE Sistema SHALL permitir adicionar/remover tags para segmentação de clientes

### Requirement 2: Sistema de Tags e Segmentação

**User Story:** Como administrador, eu quero criar e gerenciar tags para categorizar clientes, para que eu possa segmentar e personalizar o atendimento.

#### Acceptance Criteria

1. WHEN admin cria nova tag, THE Sistema SHALL permitir definir nome, cor e descrição
2. WHEN tag é aplicada a cliente, THE Sistema SHALL registrar evento na timeline
3. WHEN admin visualiza relatório de tags, THE Sistema SHALL mostrar quantidade de clientes por tag
4. THE Sistema SHALL permitir filtrar clientes por uma ou múltiplas tags
5. THE Sistema SHALL aplicar automaticamente tags baseadas em eventos (ex: "Cliente Ativo" após primeira compra)

### Requirement 3: Timeline de Eventos do Cliente

**User Story:** Como vendedor, eu quero visualizar cronologia completa de eventos do cliente, para que eu possa entender o histórico de relacionamento.

#### Acceptance Criteria

1. WHEN evento ocorre, THE Sistema SHALL registrar automaticamente na timeline com timestamp preciso
2. WHEN vendedor visualiza timeline, THE Sistema SHALL exibir eventos em ordem cronológica reversa
3. THE Sistema SHALL registrar eventos de: cadastro, pedidos, pagamentos, conversas, notas, agendamentos, tags
4. WHEN vendedor adiciona nota manual, THE Sistema SHALL incluir na timeline como evento "Nota Adicionada"
5. THE Sistema SHALL permitir filtrar timeline por tipo de evento e período

### Requirement 4: Sistema de Conversas Multicanal

**User Story:** Como atendente, eu quero gerenciar conversas de diferentes canais em interface unificada, para que eu possa responder clientes eficientemente.

#### Acceptance Criteria

1. WHEN conversa é iniciada, THE Sistema SHALL criar registro com canal, cliente e status "novo"
2. WHEN atendente visualiza lista de conversas, THE Sistema SHALL mostrar preview da última mensagem e indicadores de não lidas
3. WHEN conversa é atribuída, THE Sistema SHALL notificar o atendente responsável
4. WHEN atendente responde mensagem, THE Sistema SHALL registrar na conversa e atualizar timeline do cliente
5. THE Sistema SHALL permitir filtrar conversas por status, canal, atendente e período

### Requirement 5: Interface de Chat em Tempo Real

**User Story:** Como atendente, eu quero interface de chat intuitiva para responder mensagens, para que eu possa manter conversas fluidas com clientes.

#### Acceptance Criteria

1. WHEN atendente abre conversa, THE Sistema SHALL exibir histórico completo de mensagens
2. WHEN nova mensagem é enviada, THE Sistema SHALL atualizar interface em tempo real
3. WHEN atendente digita, THE Sistema SHALL mostrar indicador de "digitando" para outros atendentes
4. THE Sistema SHALL permitir enviar mensagens de texto, emojis e anexos (futuro)
5. THE Sistema SHALL marcar mensagens como lidas automaticamente quando visualizadas

### Requirement 6: Sistema de Agendamentos

**User Story:** Como vendedor, eu quero agendar reuniões e follow-ups com clientes, para que eu possa organizar minha agenda e não perder oportunidades.

#### Acceptance Criteria

1. WHEN vendedor cria agendamento, THE Sistema SHALL validar data/hora futura e disponibilidade
2. WHEN agendamento é criado, THE Sistema SHALL registrar evento na timeline do cliente
3. WHEN data do agendamento se aproxima, THE Sistema SHALL enviar notificação de lembrete
4. WHEN agendamento é realizado, THE Sistema SHALL permitir marcar como concluído com observações
5. THE Sistema SHALL exibir agendamentos em vista de calendário e lista

### Requirement 7: Integração com BIA (N8N/WhatsApp)

**User Story:** Como sistema, eu quero receber mensagens do WhatsApp via BIA, para que eu possa centralizar conversas no CRM.

#### Acceptance Criteria

1. WHEN BIA envia webhook de mensagem, THE Sistema SHALL validar origem e estrutura do payload
2. WHEN mensagem é recebida, THE Sistema SHALL buscar/criar cliente por telefone automaticamente
3. WHEN cliente é identificado, THE Sistema SHALL buscar/criar conversa ativa para o canal WhatsApp
4. WHEN mensagem é processada, THE Sistema SHALL registrar na conversa e atualizar timeline
5. THE Sistema SHALL notificar atendente disponível se conversa não estiver atribuída

### Requirement 8: Integração com Sistema de Vendas

**User Story:** Como sistema, eu quero sincronizar dados entre CRM e vendas, para que informações sejam consistentes.

#### Acceptance Criteria

1. WHEN pedido é criado, THE Sistema SHALL registrar evento "Pedido Realizado" na timeline do cliente
2. WHEN pagamento é confirmado, THE Sistema SHALL atualizar status do cliente e adicionar tag "Cliente Ativo"
3. WHEN cliente faz primeira compra, THE Sistema SHALL registrar evento "Primeira Compra"
4. THE Sistema SHALL exibir pedidos do cliente na página de detalhes
5. THE Sistema SHALL calcular métricas de LTV (Lifetime Value) e frequência de compra

### Requirement 9: Integração com Sistema de Afiliados

**User Story:** Como sistema, eu quero identificar clientes indicados por afiliados, para que eu possa rastrear origem e dar crédito correto.

#### Acceptance Criteria

1. WHEN cliente é criado via link de afiliado, THE Sistema SHALL registrar origem na timeline
2. WHEN cliente indicado faz compra, THE Sistema SHALL adicionar tag "Indicação" automaticamente
3. THE Sistema SHALL exibir afiliado responsável pela indicação nos detalhes do cliente
4. THE Sistema SHALL permitir filtrar clientes por origem (orgânico vs indicação)
5. THE Sistema SHALL gerar relatórios de conversão por fonte de tráfego

### Requirement 10: APIs REST para Clientes

**User Story:** Como desenvolvedor frontend, eu quero APIs REST para gerenciar clientes, para que eu possa implementar interface completa.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/customers com paginação, busca e filtros
2. THE Sistema SHALL implementar POST /api/customers com validação completa de dados
3. THE Sistema SHALL implementar PUT /api/customers/:id para atualização de dados
4. THE Sistema SHALL implementar GET /api/customers/:id/timeline para histórico de eventos
5. THE Sistema SHALL implementar POST /api/customers/:id/notes para adicionar anotações

### Requirement 11: APIs REST para Conversas

**User Story:** Como desenvolvedor frontend, eu quero APIs REST para gerenciar conversas, para que eu possa implementar interface de chat.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/conversations com filtros por status, canal e atendente
2. THE Sistema SHALL implementar GET /api/conversations/:id/messages para histórico de mensagens
3. THE Sistema SHALL implementar POST /api/conversations/:id/messages para enviar mensagens
4. THE Sistema SHALL implementar PUT /api/conversations/:id/assign para atribuir atendente
5. THE Sistema SHALL implementar PUT /api/conversations/:id/status para alterar status

### Requirement 12: APIs REST para Agendamentos

**User Story:** Como desenvolvedor frontend, eu quero APIs REST para gerenciar agendamentos, para que eu possa implementar calendário.

#### Acceptance Criteria

1. THE Sistema SHALL implementar GET /api/appointments com filtros por data, tipo e status
2. THE Sistema SHALL implementar POST /api/appointments com validação de conflitos
3. THE Sistema SHALL implementar PUT /api/appointments/:id para atualizar agendamento
4. THE Sistema SHALL implementar DELETE /api/appointments/:id para cancelar agendamento
5. THE Sistema SHALL implementar GET /api/appointments/calendar para vista de calendário

### Requirement 13: APIs Administrativas

**User Story:** Como administrador, eu quero APIs para gestão de tags e relatórios, para que eu possa configurar e monitorar o sistema.

#### Acceptance Criteria

1. THE Sistema SHALL implementar CRUD completo para tags em /api/admin/tags
2. THE Sistema SHALL implementar GET /api/admin/customers/stats para métricas gerais
3. THE Sistema SHALL implementar GET /api/admin/conversations/stats para métricas de atendimento
4. THE Sistema SHALL implementar GET /api/admin/reports/crm para relatórios consolidados
5. THE Sistema SHALL implementar exportação de dados em CSV/XLSX

### Requirement 14: Webhook para Integração N8N

**User Story:** Como BIA (N8N), eu quero enviar mensagens via webhook, para que conversas sejam centralizadas no CRM.

#### Acceptance Criteria

1. THE Sistema SHALL implementar POST /webhooks/n8n/message com autenticação por token
2. WHEN webhook é recebido, THE Sistema SHALL validar estrutura: phone, message, timestamp, messageId
3. WHEN dados são válidos, THE Sistema SHALL processar mensagem assincronamente
4. THE Sistema SHALL retornar status 200 imediatamente e processar em background
5. THE Sistema SHALL implementar retry automático em caso de falha no processamento

### Requirement 15: Segurança e Controle de Acesso

**User Story:** Como administrador, eu quero controlar acesso aos dados de clientes, para que informações sensíveis sejam protegidas.

#### Acceptance Criteria

1. THE Sistema SHALL implementar RLS para que vendedores vejam apenas clientes atribuídos
2. THE Sistema SHALL permitir que admins vejam todos os clientes
3. THE Sistema SHALL implementar auditoria de acesso a dados sensíveis
4. THE Sistema SHALL validar permissões antes de cada operação CRUD
5. THE Sistema SHALL implementar rate limiting para APIs públicas

### Requirement 16: Validações e Integridade de Dados

**User Story:** Como sistema, eu quero garantir integridade dos dados de clientes, para que informações sejam confiáveis.

#### Acceptance Criteria

1. THE Sistema SHALL validar CPF/CNPJ usando algoritmo oficial
2. THE Sistema SHALL validar formato de email e telefone
3. THE Sistema SHALL garantir unicidade de email por cliente
4. THE Sistema SHALL implementar soft delete para preservar histórico
5. THE Sistema SHALL validar referências entre tabelas (foreign keys)

### Requirement 17: Performance e Otimização

**User Story:** Como usuário, eu quero que sistema seja rápido, para que eu possa trabalhar eficientemente.

#### Acceptance Criteria

1. THE Sistema SHALL responder APIs de listagem em menos de 2 segundos
2. THE Sistema SHALL implementar paginação para listas com mais de 50 itens
3. THE Sistema SHALL usar índices otimizados para buscas frequentes
4. THE Sistema SHALL implementar cache para dados estáticos (tags, configurações)
5. THE Sistema SHALL comprimir payloads de API quando apropriado

### Requirement 18: Notificações e Alertas

**User Story:** Como atendente, eu quero ser notificado sobre eventos importantes, para que eu não perca oportunidades.

#### Acceptance Criteria

1. WHEN nova conversa é criada, THE Sistema SHALL notificar atendentes disponíveis
2. WHEN conversa fica sem resposta por 2 horas, THE Sistema SHALL enviar alerta
3. WHEN agendamento se aproxima (30 min), THE Sistema SHALL notificar responsável
4. THE Sistema SHALL permitir configurar preferências de notificação por usuário
5. THE Sistema SHALL implementar notificações em tempo real via WebSocket (futuro)

### Requirement 19: Relatórios e Métricas

**User Story:** Como gestor, eu quero visualizar métricas de CRM, para que eu possa avaliar performance da equipe.

#### Acceptance Criteria

1. THE Sistema SHALL calcular métricas: total de clientes, novos por período, taxa de conversão
2. THE Sistema SHALL calcular tempo médio de resposta por atendente
3. THE Sistema SHALL gerar relatório de satisfação baseado em conversas resolvidas
4. THE Sistema SHALL mostrar distribuição de clientes por tags
5. THE Sistema SHALL permitir exportar relatórios em PDF/Excel

### Requirement 20: Integração Frontend (OBRIGATÓRIA)

**User Story:** Como usuário final, eu quero interface intuitiva para usar o CRM, para que eu possa gerenciar clientes eficientemente.

#### Acceptance Criteria - Páginas Existentes (Adaptação)

1. WHEN vendedor acessa /dashboard/conversas, THE Sistema SHALL exibir página expandida com interface de chat
2. THE Sistema SHALL reutilizar estrutura existente de Conversas.tsx adicionando funcionalidades de chat
3. THE Sistema SHALL manter filtros existentes e adicionar filtro por atendente
4. THE Sistema SHALL substituir dados mock vazios por integração com APIs reais
5. THE Sistema SHALL adicionar interface de atribuição de conversas

#### Acceptance Criteria - Páginas Novas (Criação)

6. WHEN vendedor acessa /dashboard/clientes, THE Sistema SHALL exibir lista completa de clientes
7. WHEN vendedor clica em cliente, THE Sistema SHALL abrir página de detalhes em /dashboard/clientes/:id
8. WHEN vendedor acessa /dashboard/agendamentos, THE Sistema SHALL exibir calendário de agendamentos
9. WHEN admin acessa /admin/tags, THE Sistema SHALL permitir gestão completa de tags
10. THE Sistema SHALL habilitar menu "Clientes" no DashboardLayout (remover disabled: true)

#### Acceptance Criteria - Componentes (Reutilização + Criação)

11. THE Sistema SHALL reutilizar StatCard.tsx para métricas de CRM
12. THE Sistema SHALL reutilizar StatusBadge.tsx para status de conversas/clientes
13. THE Sistema SHALL criar CustomerCard.tsx para exibição de clientes
14. THE Sistema SHALL criar ChatInterface.tsx para interface de mensagens
15. THE Sistema SHALL criar CustomerTimeline.tsx para linha do tempo

#### Acceptance Criteria - Serviços Frontend

16. THE Sistema SHALL criar customer-frontend.service.ts para integração com APIs de clientes
17. THE Sistema SHALL criar conversation-frontend.service.ts para APIs de conversas
18. THE Sistema SHALL criar appointment-frontend.service.ts para APIs de agendamentos
19. THE Sistema SHALL implementar tratamento de erros e loading states
20. THE Sistema SHALL implementar cache local para melhor performance

#### Acceptance Criteria - Fluxo de Dados

21. WHEN página carrega, THE Sistema SHALL buscar dados via APIs e exibir loading states
22. WHEN operação falha, THE Sistema SHALL exibir mensagem de erro amigável
23. WHEN dados são atualizados, THE Sistema SHALL refletir mudanças em tempo real
24. THE Sistema SHALL implementar otimistic updates para melhor UX
25. THE Sistema SHALL sincronizar dados entre diferentes páginas/componentes

## Summary

Este sprint implementa um sistema completo de CRM integrado ao ecossistema Slim Quality, aproveitando 30% da estrutura frontend existente e criando 70% de funcionalidades novas. O sistema permitirá gestão completa de clientes, conversas multicanal, agendamentos e relatórios, com integração nativa com BIA (N8N), sistema de vendas e afiliados.

**Principais Entregas:**
- Sistema completo de gestão de clientes
- Interface de conversas com chat em tempo real
- Sistema de agendamentos com calendário
- Integração com BIA via webhook
- Relatórios e métricas de CRM
- Frontend integrado reutilizando estrutura existente

**Integração Frontend:** Obrigatória e detalhada, aproveitando componentes existentes e criando interface moderna e intuitiva para gestão de relacionamento com clientes.