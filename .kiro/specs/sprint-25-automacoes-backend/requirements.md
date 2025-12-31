# Documento de Requisitos

## Introdução

Este documento especifica os requisitos para o Sprint 2.5 - Sistema de Automações Backend para Slim Quality. O sistema implementa backend funcional completo para automações que se integra com o frontend existente em `src/pages/dashboard/Automacoes.tsx`. O objetivo é conectar a interface visual com lógica real de execução de regras durante conversas do agente.

## Glossário

- **Sistema_Automacao**: Sistema completo que gerencia regras de automação, execução e logs
- **Regra_Automacao**: Regra configurada com gatilho, condições e ações
- **Executor_Regras**: Serviço que avalia e executa regras durante conversas
- **Executor_Acoes**: Serviço que executa ações específicas (email, tag, etc.)
- **Node_LangGraph**: Node integrado ao LangGraph para avaliação de regras
- **Log_Execucao**: Registro de execução de regra com resultado e métricas
- **Conversa_Agente**: Conversa do agente onde regras podem ser disparadas
- **Evento_Gatilho**: Evento que pode disparar execução de regras
- **Usuario_Admin**: Usuário com permissões para gerenciar todas as automações
- **Estado_Agente**: Estado do LangGraph contendo dados da conversa

## Requisitos

### Requisito 1: Estrutura de Banco de Dados

**História do Usuário:** Como desenvolvedor, eu quero uma estrutura de banco robusta para automações, para que o sistema possa armazenar e gerenciar regras de forma eficiente.

#### Critérios de Aceitação

1. QUANDO criar tabela automation_rules, O Sistema DEVE incluir campos id, nome, status, gatilho, acao, created_at, updated_at, deleted_at
2. QUANDO criar tabela rule_execution_logs, O Sistema DEVE incluir campos id, rule_id, trigger_data, execution_result, executed_at, duration_ms
3. QUANDO aplicar políticas RLS, O Sistema DEVE garantir que usuários acessem apenas suas próprias regras de automação
4. QUANDO criar índices, O Sistema DEVE otimizar consultas para regras ativas e logs recentes
5. QUANDO definir schemas, O Sistema DEVE usar modelos Pydantic para validação e segurança de tipos

### Requisito 2: AutomationService - Operações CRUD

**História do Usuário:** Como admin, eu quero gerenciar regras de automação via API, para que eu possa criar, editar e controlar automações.

#### Critérios de Aceitação

1. QUANDO criar nova regra, O AutomationService DEVE validar todos os campos obrigatórios e armazenar no banco
2. QUANDO atualizar regra, O AutomationService DEVE preservar histórico de execução e atualizar configuração
3. QUANDO deletar regra, O AutomationService DEVE usar soft delete para manter trilha de auditoria
4. QUANDO listar regras, O AutomationService DEVE retornar apenas regras ativas com suporte a paginação
5. QUANDO alternar status da regra, O AutomationService DEVE imediatamente ativar ou desativar execução da regra

### Requisito 3: RulesExecutor - Avaliação e Execução

**História do Usuário:** Como sistema, eu quero avaliar regras automaticamente durante conversas, para que ações sejam executadas quando condições forem satisfeitas.

#### Critérios de Aceitação

1. QUANDO evento de conversa ocorrer, O RulesExecutor DEVE avaliar todas as regras ativas que correspondem ao tipo de gatilho
2. QUANDO condições da regra forem atendidas, O RulesExecutor DEVE executar ações configuradas em sequência
3. QUANDO avaliar condições, O RulesExecutor DEVE suportar operadores de comparação (igual, contém, maior que)
4. QUANDO execução falhar, O RulesExecutor DEVE registrar detalhes do erro e continuar com regras restantes
5. QUANDO múltiplas regras corresponderem, O RulesExecutor DEVE executar todas as regras correspondentes independentemente

### Requisito 4: ActionExecutor - Ações Específicas

**História do Usuário:** Como sistema, eu quero executar ações específicas quando regras são disparadas, para que automações tenham efeito real no negócio.

#### Critérios de Aceitação

1. QUANDO tipo de ação for "send_email", O ActionExecutor DEVE compor e enviar email usando template configurado
2. QUANDO tipo de ação for "apply_tag", O ActionExecutor DEVE adicionar tag ao registro do cliente no CRM
3. QUANDO tipo de ação for "create_task", O ActionExecutor DEVE criar tarefa no sistema de gerenciamento de tarefas
4. QUANDO tipo de ação for "send_notification", O ActionExecutor DEVE criar notificação do sistema para usuário
5. QUANDO execução de ação falhar, O ActionExecutor DEVE tentar novamente até 3 vezes com backoff exponencial

### Requisito 5: Integração LangGraph

**História do Usuário:** Como desenvolvedor, eu quero integrar avaliação de regras no fluxo do LangGraph, para que automações funcionem durante conversas do agente.

#### Critérios de Aceitação

1. QUANDO criar node rules_evaluator, O Sistema DEVE integrar com LangGraph 1.0.5 sem conflitos de versão
2. QUANDO conversa fluir pelo node, O rules_evaluator DEVE avaliar regras ativas contra contexto da conversa
3. QUANDO regras forem disparadas, O node DEVE executar ações assincronamente sem bloquear fluxo da conversa
4. QUANDO atualizar AgentState, O node DEVE adicionar triggered_rules e executed_actions ao estado
5. QUANDO node completar, O Sistema DEVE registrar detalhes de execução para monitoramento e debug

### Requisito 6: Endpoints API REST

**História do Usuário:** Como frontend, eu quero endpoints REST completos, para que a interface possa gerenciar automações sem alterações.

#### Critérios de Aceitação

1. QUANDO GET /api/automations/rules for chamado, A API DEVE retornar regras no formato exato esperado pelo frontend
2. QUANDO POST /api/automations/rules for chamado, A API DEVE criar nova regra e retornar objeto criado
3. QUANDO PUT /api/automations/rules/{id} for chamado, A API DEVE atualizar regra e retornar objeto atualizado
4. QUANDO DELETE /api/automations/rules/{id} for chamado, A API DEVE fazer soft delete da regra e retornar status de sucesso
5. QUANDO POST /api/automations/rules/{id}/toggle for chamado, A API DEVE alternar status da regra e retornar novo status

### Requisito 7: Logs e Estatísticas

**História do Usuário:** Como admin, eu quero visualizar logs de execução e estatísticas, para que eu possa monitorar performance das automações.

#### Critérios de Aceitação

1. QUANDO GET /api/automations/logs for chamado, A API DEVE retornar logs de execução com paginação e filtros
2. QUANDO GET /api/automations/stats for chamado, A API DEVE retornar estatísticas no formato esperado pelo frontend
3. QUANDO calcular estatísticas, O Sistema DEVE incluir fluxos_ativos, mensagens_enviadas_hoje, taxa_media_abertura
4. QUANDO registrar execução, O Sistema DEVE gravar trigger_data, execution_result, duration_ms e timestamp
5. QUANDO consultar logs, O Sistema DEVE suportar filtros por rule_id, intervalo_data e status_execucao

### Requisito 8: Performance e Confiabilidade

**História do Usuário:** Como sistema, eu quero que automações sejam performáticas e confiáveis, para que não impactem negativamente a experiência do usuário.

#### Critérios de Aceitação

1. QUANDO avaliar regras, O Sistema DEVE completar avaliação em menos de 200ms
2. QUANDO executar ações, O Sistema DEVE processá-las assincronamente para evitar bloquear fluxo da conversa
3. QUANDO lidar com alta carga, O Sistema DEVE suportar 100+ regras ativas sem degradação de performance
4. QUANDO ação falhar, O Sistema DEVE implementar lógica de retry com backoff exponencial (1s, 2s, 4s)
5. QUANDO sistema estiver sob estresse, O Sistema DEVE implementar rate limiting para prevenir sobrecarga

### Requisito 9: Compatibilidade Frontend

**História do Usuário:** Como frontend existente, eu quero que APIs retornem dados no formato exato esperado, para que não seja necessário alterar código frontend.

#### Critérios de Aceitação

1. QUANDO retornar lista de regras, A API DEVE usar formato com campos: id, nome, status, gatilho, acao, disparosMes, taxaAbertura
2. QUANDO retornar estatísticas, A API DEVE usar formato com campos: fluxos_ativos, mensagens_enviadas_hoje, taxa_media_abertura
3. QUANDO status da regra for retornado, A API DEVE usar valores "ativa" ou "inativa" em português
4. QUANDO erro ocorrer, A API DEVE retornar mensagens de erro em português para exibição no frontend
5. QUANDO paginação for necessária, A API DEVE usar formato padrão de paginação com campos page, limit, total

### Requisito 10: Segurança e Validação

**História do Usuário:** Como sistema, eu quero validações robustas e segurança adequada, para que apenas usuários autorizados possam gerenciar automações.

#### Critérios de Aceitação

1. QUANDO criar regra, O Sistema DEVE validar todos os campos obrigatórios usando schemas Pydantic
2. QUANDO usuário acessar regras, O Sistema DEVE aplicar políticas RLS para mostrar apenas regras do usuário
3. QUANDO validar ações, O Sistema DEVE garantir que tipos de ação são suportados e configurações são válidas
4. QUANDO processar gatilhos, O Sistema DEVE sanitizar dados de entrada para prevenir ataques de injeção
5. QUANDO registrar execução, O Sistema DEVE não registrar dados sensíveis como senhas ou tokens

### Requisito 11: Monitoramento e Alertas

**História do Usuário:** Como admin, eu quero monitoramento de automações, para que eu possa identificar problemas rapidamente.

#### Critérios de Aceitação

1. QUANDO execução de regra falhar repetidamente, O Sistema DEVE criar alerta para revisão do admin
2. QUANDO tempo de execução exceder limite, O Sistema DEVE registrar aviso de performance
3. QUANDO limite de retry de ação for atingido, O Sistema DEVE marcar ação como falhada e alertar admin
4. QUANDO métricas do sistema forem coletadas, O Sistema DEVE rastrear taxa de sucesso, tempo médio de execução e contagem de erros
5. QUANDO gerar relatórios, O Sistema DEVE fornecer insights sobre regras mais/menos usadas e tendências de performance

### Requisito 12: Tipos de Gatilhos Suportados

**História do Usuário:** Como admin, eu quero diversos tipos de gatilhos, para que eu possa automatizar diferentes cenários de negócio.

#### Critérios de Aceitação

1. QUANDO tipo de gatilho for "lead_created", O Sistema DEVE executar regras quando novo lead for adicionado ao CRM
2. QUANDO tipo de gatilho for "conversation_started", O Sistema DEVE executar regras quando conversa do agente começar
3. QUANDO tipo de gatilho for "message_received", O Sistema DEVE executar regras quando cliente enviar mensagem
4. QUANDO tipo de gatilho for "order_completed", O Sistema DEVE executar regras quando pagamento do pedido for confirmado
5. QUANDO tipo de gatilho for "scheduled", O Sistema DEVE executar regras em intervalos de tempo configurados

### Requisito 13: Tipos de Ações Suportadas

**História do Usuário:** Como admin, eu quero diversos tipos de ações, para que automações possam executar diferentes operações de negócio.

#### Critérios de Aceitação

1. QUANDO tipo de ação for "send_email", O Sistema DEVE enviar email usando template e destinatário configurados
2. QUANDO tipo de ação for "apply_tag", O Sistema DEVE adicionar tag ao registro do cliente para segmentação
3. QUANDO tipo de ação for "create_task", O Sistema DEVE criar tarefa para acompanhamento do membro da equipe
4. QUANDO tipo de ação for "send_whatsapp", O Sistema DEVE enviar mensagem WhatsApp via integração N8N
5. QUANDO tipo de ação for "update_field", O Sistema DEVE atualizar campo específico no registro do cliente

### Requisito 14: Configuração de Condições

**História do Usuário:** Como admin, eu quero configurar condições para regras, para que ações sejam executadas apenas quando critérios específicos forem atendidos.

#### Critérios de Aceitação

1. QUANDO tipo de condição for "field_equals", O Sistema DEVE comparar valor do campo com valor configurado
2. QUANDO tipo de condição for "field_contains", O Sistema DEVE verificar se campo contém substring configurada
3. QUANDO tipo de condição for "field_greater_than", O Sistema DEVE comparar campo numérico com limite configurado
4. QUANDO múltiplas condições existirem, O Sistema DEVE suportar operadores lógicos AND/OR
5. QUANDO avaliação de condição falhar, O Sistema DEVE registrar erro e pular execução da regra

### Requisito 15: Auditoria e Compliance

**História do Usuário:** Como admin, eu quero auditoria completa de automações, para que eu possa rastrear todas as ações executadas pelo sistema.

#### Critérios de Aceitação

1. QUANDO regra for criada, O Sistema DEVE registrar evento de criação com ID do usuário e timestamp
2. QUANDO regra for modificada, O Sistema DEVE registrar evento de modificação com mudanças feitas
3. QUANDO regra for executada, O Sistema DEVE registrar evento de execução com dados do gatilho e resultados
4. QUANDO ação for executada, O Sistema DEVE registrar evento de ação com alvo e resultado
5. QUANDO trilha de auditoria for solicitada, O Sistema DEVE fornecer histórico completo do ciclo de vida da regra