# Requirements Document - Inversão do Fluxo de Registro (Pagamento → Conta)

## Introduction

O sistema COMADEMIG atualmente possui um problema crítico de segurança onde contas de usuário são criadas ANTES da confirmação do pagamento, resultando em usuários com acesso ao sistema sem ter efetivamente pago. Esta especificação define a inversão do fluxo para processar pagamento PRIMEIRO e só criar conta após confirmação.

## Glossary

- **Payment_First_Flow**: Novo fluxo onde pagamento é processado antes da criação da conta
- **Asaas_Gateway**: Gateway de pagamento integrado para processar cobranças
- **Supabase_Auth**: Sistema de autenticação do Supabase
- **Split_Payment**: Divisão automática de comissões para afiliados
- **Pending_Subscription**: Assinatura temporária aguardando confirmação de pagamento
- **Pending_Completion**: Registro de conta que falhou criação mas pagamento foi confirmado
- **Fallback_System**: Sistema de recuperação para cenários de erro
- **Polling_Service**: Serviço que consulta status de pagamento periodicamente
- **Retry_Mechanism**: Mecanismo de tentativas automáticas para processos falhados
- **Cobranca_Avulsa**: Cobrança única processada imediatamente (diferente de assinatura)
- **Credit_Card_Token**: Token seguro do cartão armazenado pelo Asaas para renovações
- **NextDueDate**: Data da próxima cobrança recorrente (hoje + ciclo do plano)

## Requirements

### Requirement 1: Processamento de Pagamento Prioritário

**User Story:** Como um novo usuário, eu quero que meu pagamento seja processado e confirmado antes de ter acesso ao sistema, para que eu só tenha uma conta se realmente paguei.

#### Acceptance Criteria

1. WHEN um usuário submete dados de filiação, THE Payment_First_Flow SHALL validar dados antes de qualquer processamento
2. WHEN dados são válidos, THE Payment_First_Flow SHALL criar cliente no Asaas_Gateway antes de criar conta Supabase
3. WHEN cliente Asaas é criado, THE Payment_First_Flow SHALL processar cobrança inicial com Split_Payment
4. WHEN cobrança é criada, THE Payment_First_Flow SHALL aguardar confirmação via Polling_Service
5. THE Payment_First_Flow SHALL NOT criar conta Supabase até pagamento ser confirmado

### Requirement 2: Confirmação de Pagamento com Polling

**User Story:** Como sistema, eu quero aguardar confirmação do pagamento por até 15 segundos antes de prosseguir, para garantir que o status seja atualizado corretamente sem prejudicar a experiência do usuário.

#### Acceptance Criteria

1. WHEN pagamento é processado, THE Polling_Service SHALL consultar status a cada 1 segundo
2. WHEN status for 'CONFIRMED', THE Polling_Service SHALL retornar sucesso imediatamente
3. WHEN status for 'REFUSED', THE Polling_Service SHALL retornar falha imediatamente
4. WHEN 15 segundos se passarem sem confirmação, THE Polling_Service SHALL retornar timeout
5. THE Polling_Service SHALL usar intervalo fixo de 1 segundo para manter previsibilidade

### Requirement 3: Criação de Conta Condicionada

**User Story:** Como sistema, eu quero criar conta Supabase apenas quando pagamento for confirmado, para evitar contas "lixo" no banco de dados.

#### Acceptance Criteria

1. WHEN pagamento for confirmado, THE Payment_First_Flow SHALL criar conta via Supabase_Auth
2. WHEN conta for criada, THE Payment_First_Flow SHALL criar perfil com status 'ativo'
3. WHEN perfil for criado, THE Payment_First_Flow SHALL criar assinatura com Split_Payment
4. WHEN assinatura for criada, THE Payment_First_Flow SHALL fazer login automático
5. THE Payment_First_Flow SHALL NOT criar conta se pagamento não for confirmado

### Requirement 4: Sistema de Fallback para Cenários de Erro

**User Story:** Como sistema, eu quero ter mecanismos de recuperação para cenários onde o processo é interrompido, para garantir que pagamentos confirmados não sejam perdidos.

#### Acceptance Criteria

1. WHEN assinatura falha após pagamento confirmado, THE Fallback_System SHALL armazenar dados em pending_subscriptions
WHEN criação de conta falha após pagamento confirmado, THE Fallback_System SHALL armazenar dados em pending_completions
2. WHEN dados estão em Pending_Subscription, THE Retry_Mechanism SHALL tentar completar processo automaticamente
3. WHEN tentativas automáticas falharem, THE Fallback_System SHALL notificar administradores
4. WHEN administrador intervém, THE Fallback_System SHALL permitir completar processo manualmente
5. THE Fallback_System SHALL manter log completo de todas as tentativas

### Requirement 5: Tratamento de Pagamentos Recusados

**User Story:** Como usuário com pagamento recusado, eu quero receber feedback claro sobre o problema e poder tentar novamente, sem que uma conta seja criada.

#### Acceptance Criteria

1. WHEN pagamento for recusado, THE Payment_First_Flow SHALL exibir mensagem específica do erro
2. WHEN pagamento for recusado, THE Payment_First_Flow SHALL NOT criar conta Supabase
3. WHEN usuário quiser tentar novamente, THE Payment_First_Flow SHALL permitir nova tentativa com mesmos dados
4. WHEN múltiplas tentativas falharem, THE Payment_First_Flow SHALL sugerir contato com suporte
5. THE Payment_First_Flow SHALL limpar dados temporários após falha definitiva

### Requirement 6: Preservação do Sistema de Afiliados

**User Story:** Como afiliado, eu quero continuar recebendo comissões pelos usuários que indico, mesmo com o novo fluxo de pagamento.

#### Acceptance Criteria

1. WHEN pagamento inicial for processado, THE Payment_First_Flow SHALL incluir Split_Payment para afiliado
2. WHEN assinatura for criada, THE Payment_First_Flow SHALL configurar Split_Payment recorrente
3. WHEN afiliado for válido, THE Payment_First_Flow SHALL calcular comissão corretamente
4. WHEN comissão for calculada, THE Payment_First_Flow SHALL aplicar split no Asaas_Gateway
5. THE Payment_First_Flow SHALL manter rastreabilidade completa de comissões

### Requirement 7: Interface de Aguardo com Feedback

**User Story:** Como usuário, eu quero ver o progresso do processamento do meu pagamento em tempo real, para entender que o sistema está funcionando.

#### Acceptance Criteria

1. WHEN pagamento for submetido, THE Payment_First_Flow SHALL exibir tela de aguardo
2. WHEN aguardando confirmação, THE Payment_First_Flow SHALL mostrar indicador de progresso
3. WHEN polling estiver ativo, THE Payment_First_Flow SHALL atualizar status visualmente
4. WHEN processo for concluído, THE Payment_First_Flow SHALL redirecionar automaticamente
5. THE Payment_First_Flow SHALL exibir mensagem de processamento sem permitir cancelamento (pagamento já foi processado)

### Requirement 8: Monitoramento e Logs Detalhados

**User Story:** Como administrador, eu quero ter visibilidade completa do processo de filiação para identificar e resolver problemas rapidamente.

#### Acceptance Criteria

1. WHEN cada etapa for executada, THE Payment_First_Flow SHALL registrar log detalhado
2. WHEN erro ocorrer, THE Payment_First_Flow SHALL capturar contexto completo
3. WHEN processo for concluído, THE Payment_First_Flow SHALL registrar métricas de performance
4. WHEN dados forem consultados, THE Payment_First_Flow SHALL permitir auditoria completa
5. THE Payment_First_Flow SHALL integrar com sistema de monitoramento existente

### Requirement 9: Migração Segura do Sistema Atual

**User Story:** Como administrador, eu quero migrar para o novo fluxo sem impactar usuários existentes ou processos em andamento.

#### Acceptance Criteria

1. WHEN novo fluxo for ativado, THE Payment_First_Flow SHALL manter compatibilidade com dados existentes
2. WHEN usuários existentes fizerem login, THE Payment_First_Flow SHALL funcionar normalmente
3. WHEN processos pendentes existirem, THE Payment_First_Flow SHALL permitir conclusão manual
4. WHEN migração for concluída, THE Payment_First_Flow SHALL remover código legado
5. THE Payment_First_Flow SHALL permitir rollback seguro se necessário

### Requirement 10: Performance e Timeout Adequados

**User Story:** Como usuário, eu quero que o processo de filiação seja concluído em tempo razoável, sem travamentos ou timeouts excessivos.

#### Acceptance Criteria

1. WHEN processo normal for executado, THE Payment_First_Flow SHALL concluir em até 20-25 segundos (incluindo polling de 15s + processamento 5-10s)
2. WHEN polling for executado, THE Payment_First_Flow SHALL usar intervalos otimizados
3. WHEN timeout ocorrer, THE Payment_First_Flow SHALL falhar graciosamente
4. WHEN sistema estiver sobrecarregado, THE Payment_First_Flow SHALL manter responsividade
### Requirement 11: Suporte a Múltiplos Ciclos de Planos

**User Story:** Como sistema, eu quero processar corretamente planos mensais, semestrais e anuais, aplicando splits em todas cobranças futuras.

#### Acceptance Criteria

1. WHEN plano for MENSAL, THE Payment_First_Flow SHALL criar assinatura com cycle='MONTHLY'
2. WHEN plano for SEMESTRAL, THE Payment_First_Flow SHALL criar assinatura com cycle='SEMIANNUALLY'
3. WHEN plano for ANUAL, THE Payment_First_Flow SHALL criar assinatura com cycle='YEARLY'
4. WHEN assinatura for criada, THE Payment_First_Flow SHALL calcular nextDueDate baseado no cycle
5. THE Payment_First_Flow SHALL aplicar split de afiliado em TODAS renovações futuras