# Requirements Document - Sprint 4: Sistema de Afiliados Multinível

## Introduction

Este documento define os requisitos para o Sprint 4 do projeto Slim Quality Backend - o sprint mais crítico e complexo do sistema. O objetivo é implementar um sistema completo de afiliados multinível (3 níveis) com cálculo automático de comissões e split no Asaas. Este sistema é o diferencial competitivo do negócio e tem impacto financeiro direto.

**Contexto:** O sistema de vendas (Sprint 3) está completo com integração Asaas funcionando. Agora implementamos o coração do negócio: rede de afiliados com comissões automáticas de 15% (N1), 3% (N2), 2% (N3) e redistribuição para gestores quando a rede não está completa.

**Criticidade:** Este sprint tem tolerância ZERO para erros. Falhas podem resultar em perdas financeiras significativas.

## Glossary

- **Sistema**: Slim Quality Backend
- **Affiliate**: Afiliado cadastrado no sistema com Wallet ID válida
- **Affiliate Network**: Árvore genealógica de afiliados (self-referencing)
- **N1**: Afiliado de primeiro nível (vendedor direto) - 15% de comissão
- **N2**: Afiliado de segundo nível (indicado do N1) - 3% de comissão  
- **N3**: Afiliado de terceiro nível (indicado do N2) - 2% de comissão
- **Referral Code**: Código único de indicação do afiliado (ex: ABC123)
- **Referral Link**: Link com código de rastreamento (ex: slimquality.com.br?ref=ABC123)
- **Commission**: Comissão calculada para um afiliado em uma venda
- **Commission Split**: Detalhamento da comissão por nível (N1, N2, N3, gestores)
- **Redistribution**: Redistribuição de percentuais não utilizados para gestores
- **Wallet ID**: Identificador único da carteira Asaas (formato: wal_xxxxx)
- **Asaas Split**: Divisão automática do pagamento entre múltiplas carteiras
- **Renum**: Gestor fixo que recebe 5% + redistribuição
- **JB**: Gestor fixo que recebe 5% + redistribuição
- **Genealogical Tree**: Estrutura hierárquica de afiliados (A → B → C)
- **Loop Detection**: Validação para evitar referências circulares (A → B → A)
- **Conversion**: Venda realizada através de link de afiliado
- **Click Tracking**: Rastreamento de cliques em links de afiliados

## Requirements

### Requirement 1: Cadastro de Afiliados

**User Story:** Como candidato a afiliado, eu quero me cadastrar no sistema fornecendo minha Wallet ID do Asaas, para que eu possa receber comissões automaticamente.

#### Acceptance Criteria

1. WHEN candidato submete formulário de cadastro, THE Sistema SHALL validar Wallet ID via API Asaas antes de prosseguir
2. WHEN Wallet ID é inválida ou inativa, THE Sistema SHALL rejeitar cadastro com mensagem específica
3. WHEN candidato fornece código de indicação válido, THE Sistema SHALL vincular na árvore genealógica
4. WHEN candidato não fornece código de indicação, THE Sistema SHALL cadastrar como afiliado raiz (sem ascendente)
5. WHEN afiliado é cadastrado, THE Sistema SHALL gerar código de indicação único alfanumérico de 6 caracteres

### Requirement 2: Validação de Wallet ID Asaas

**User Story:** Como sistema, eu quero validar Wallet IDs do Asaas em tempo real, para que apenas carteiras válidas sejam aceitas.

#### Acceptance Criteria

1. WHEN Wallet ID é fornecida, THE Sistema SHALL fazer chamada GET /v3/wallets/{walletId} na API Asaas
2. WHEN API Asaas retorna 200, THE Sistema SHALL verificar se status é 'ACTIVE'
3. WHEN API Asaas retorna 404, THE Sistema SHALL rejeitar com erro "Wallet ID não encontrada"
4. WHEN API Asaas retorna erro de rede, THE Sistema SHALL implementar retry com 3 tentativas
5. THE Sistema SHALL cachear validações por 5 minutos para evitar chamadas desnecessárias

### Requirement 3: Construção da Árvore Genealógica

**User Story:** Como sistema, eu quero construir e manter árvore genealógica de afiliados, para que eu possa calcular comissões multinível corretamente.

#### Acceptance Criteria

1. WHEN afiliado é cadastrado com código de indicação, THE Sistema SHALL identificar afiliado N1 (pai)
2. WHEN afiliado N1 é identificado, THE Sistema SHALL buscar N2 (avô) na árvore
3. WHEN afiliado N2 é identificado, THE Sistema SHALL buscar N3 (bisavô) na árvore
4. THE Sistema SHALL validar que não há loops na árvore (A → B → A é proibido)
5. THE Sistema SHALL limitar profundidade máxima a 3 níveis para cálculo de comissões

### Requirement 4: Geração de Links de Rastreamento

**User Story:** Como afiliado, eu quero obter meu link único de indicação, para que eu possa compartilhar e rastrear conversões.

#### Acceptance Criteria

1. WHEN afiliado acessa dashboard, THE Sistema SHALL gerar link no formato slimquality.com.br?ref={codigo}
2. WHEN link é acessado, THE Sistema SHALL registrar clique em referral_clicks com timestamp e IP
3. WHEN visitante navega pelo site, THE Sistema SHALL manter código de referência em cookie por 30 dias
4. THE Sistema SHALL permitir múltiplos cliques do mesmo IP sem duplicar registros
5. THE Sistema SHALL gerar QR Code do link para facilitar compartilhamento

### Requirement 5: Rastreamento de Conversões

**User Story:** Como sistema, eu quero rastrear quando visitantes de links de afiliados fazem compras, para que eu possa calcular comissões corretamente.

#### Acceptance Criteria

1. WHEN pedido é criado, THE Sistema SHALL verificar se há código de referência no cookie/sessão
2. WHEN código de referência é encontrado, THE Sistema SHALL associar pedido ao afiliado N1
3. WHEN pedido é associado a afiliado, THE Sistema SHALL registrar em referral_conversions
4. WHEN pagamento é confirmado via webhook, THE Sistema SHALL disparar cálculo de comissões
5. THE Sistema SHALL manter histórico completo de conversões para auditoria

### Requirement 6: Cálculo de Comissões Multinível

**User Story:** Como sistema, eu quero calcular comissões automaticamente quando pagamento é confirmado, para que afiliados recebam valores corretos.

#### Acceptance Criteria

1. WHEN webhook de pagamento confirmado é recebido, THE Sistema SHALL identificar se venda tem afiliado N1
2. WHEN afiliado N1 existe, THE Sistema SHALL calcular 15% do valor total para N1
3. WHEN afiliado N2 existe na árvore, THE Sistema SHALL calcular 3% do valor total para N2
4. WHEN afiliado N3 existe na árvore, THE Sistema SHALL calcular 2% do valor total para N3
5. THE Sistema SHALL sempre calcular 5% para Renum e 5% para JB como base

### Requirement 7: Regras de Redistribuição

**User Story:** Como sistema, eu quero redistribuir percentuais não utilizados para gestores, para que sempre 30% do valor seja distribuído.

#### Acceptance Criteria

1. WHEN apenas N1 existe (sem N2 e N3), THE Sistema SHALL redistribuir 5% (3%+2%) dividindo 2,5% para Renum e 2,5% para JB
2. WHEN N1 e N2 existem (sem N3), THE Sistema SHALL redistribuir 2% dividindo 1% para Renum e 1% para JB
3. WHEN rede completa existe (N1+N2+N3), THE Sistema SHALL manter Renum e JB com 5% cada
4. THE Sistema SHALL validar que soma total sempre equals 30% do valor da venda
5. THE Sistema SHALL registrar detalhes da redistribuição em commission_logs para auditoria

### Requirement 8: Split Automático no Asaas

**User Story:** Como sistema, eu quero executar split automático no Asaas, para que afiliados recebam comissões imediatamente.

#### Acceptance Criteria

1. WHEN comissões são calculadas, THE Sistema SHALL validar todas as Wallet IDs antes do split
2. WHEN todas as Wallets são válidas, THE Sistema SHALL montar payload de split com 70% fábrica + 30% comissões
3. WHEN split é enviado via POST /v3/payments/{paymentId}/split, THE Sistema SHALL aguardar confirmação
4. WHEN split é confirmado, THE Sistema SHALL atualizar status das comissões para 'paid'
5. THE Sistema SHALL implementar idempotência para evitar split duplicado

### Requirement 9: Validação de Integridade Financeira

**User Story:** Como sistema, eu quero validar integridade dos cálculos, para que não haja erros financeiros.

#### Acceptance Criteria

1. WHEN comissões são calculadas, THE Sistema SHALL validar que soma de todos os splits equals valor total da venda
2. WHEN split é preparado, THE Sistema SHALL validar que nenhum valor é negativo ou zero
3. WHEN redistribuição é aplicada, THE Sistema SHALL validar que percentuais somam exatamente 30%
4. THE Sistema SHALL rejeitar qualquer operação que resulte em inconsistência financeira
5. THE Sistema SHALL registrar todas as validações em logs para auditoria

### Requirement 10: Dashboard de Afiliados

**User Story:** Como afiliado, eu quero visualizar minhas métricas e rede, para que eu possa acompanhar meu desempenho.

#### Acceptance Criteria

1. WHEN afiliado acessa dashboard, THE Sistema SHALL exibir total de cliques, conversões e comissões
2. WHEN afiliado visualiza rede, THE Sistema SHALL mostrar apenas afiliados diretos (N1) que ele indicou
3. WHEN afiliado consulta comissões, THE Sistema SHALL mostrar histórico com status (pending, paid)
4. THE Sistema SHALL exibir link de indicação com botão de copiar
5. THE Sistema SHALL mostrar métricas de conversão (cliques → vendas)

### Requirement 11: Gestão Administrativa de Afiliados

**User Story:** Como administrador, eu quero gerenciar afiliados e aprovar cadastros, para que eu mantenha controle da rede.

#### Acceptance Criteria

1. WHEN admin acessa GET /api/admin/affiliates, THE Sistema SHALL listar todos os afiliados com paginação
2. WHEN admin visualiza afiliado específico, THE Sistema SHALL mostrar árvore genealógica completa
3. WHEN admin altera status via PUT /api/admin/affiliates/{id}/status, THE Sistema SHALL validar permissões
4. WHEN admin suspende afiliado, THE Sistema SHALL manter rede genealógica intacta
5. THE Sistema SHALL permitir busca por nome, email, código de indicação ou Wallet ID

### Requirement 12: Auditoria e Logs de Comissões

**User Story:** Como sistema, eu quero manter logs completos de cálculos, para que eu possa auditar e debugar problemas.

#### Acceptance Criteria

1. WHEN comissão é calculada, THE Sistema SHALL registrar em commission_logs com detalhes completos
2. WHEN redistribuição é aplicada, THE Sistema SHALL registrar valores originais e finais
3. WHEN split é executado, THE Sistema SHALL registrar response da API Asaas
4. THE Sistema SHALL incluir timestamps precisos e identificação do usuário em todos os logs
5. THE Sistema SHALL permitir consultar logs por pedido, afiliado ou período

### Requirement 13: Notificações de Comissões

**User Story:** Como afiliado, eu quero ser notificado quando recebo comissões, para que eu saiba sobre meus ganhos.

#### Acceptance Criteria

1. WHEN split é confirmado no Asaas, THE Sistema SHALL enviar notificação por email para afiliados
2. WHEN notificação é enviada, THE Sistema SHALL incluir valor da comissão e detalhes da venda
3. WHEN afiliado tem WhatsApp cadastrado, THE Sistema SHALL enviar notificação também via WhatsApp
4. THE Sistema SHALL permitir afiliado configurar preferências de notificação
5. THE Sistema SHALL registrar todas as notificações enviadas para auditoria

### Requirement 14: Segurança e Validações Críticas

**User Story:** Como sistema, eu quero implementar validações rigorosas, para que não haja fraudes ou manipulações.

#### Acceptance Criteria

1. WHEN dados de afiliado são recebidos, THE Sistema SHALL validar usando schemas Zod rigorosos
2. WHEN código de indicação é usado, THE Sistema SHALL validar que não cria loop na árvore
3. WHEN Wallet ID é alterada, THE Sistema SHALL revalidar via API Asaas
4. THE Sistema SHALL implementar rate limiting para APIs de cadastro de afiliados
5. THE Sistema SHALL registrar tentativas de operações suspeitas para análise

### Requirement 15: Performance e Otimização

**User Story:** Como usuário, eu quero que cálculos de comissões sejam rápidos, para que não haja atraso nos pagamentos.

#### Acceptance Criteria

1. WHEN comissões são calculadas, THE Sistema SHALL responder em menos de 5 segundos
2. WHEN árvore genealógica é consultada, THE Sistema SHALL usar índices otimizados
3. THE Sistema SHALL cachear estruturas de rede por 1 hora para consultas frequentes
4. THE Sistema SHALL processar cálculos de forma assíncrona quando possível
5. THE Sistema SHALL usar connection pooling para queries de comissões

### Requirement 16: Tratamento de Erros Críticos

**User Story:** Como sistema, eu quero tratar erros graciosamente, para que não deixe comissões em estado inconsistente.

#### Acceptance Criteria

1. WHEN API Asaas falha durante split, THE Sistema SHALL marcar comissões como 'error' e alertar admin
2. WHEN cálculo de comissão falha, THE Sistema SHALL manter pedido íntegro e permitir reprocessamento
3. WHEN Wallet ID se torna inválida, THE Sistema SHALL suspender afiliado e notificar
4. THE Sistema SHALL implementar transações SQL para operações críticas
5. THE Sistema SHALL permitir rollback manual de operações com erro

### Requirement 17: Migração e Integridade de Dados

**User Story:** Como desenvolvedor, eu quero migrar dados com segurança, para que não haja perda de informações.

#### Acceptance Criteria

1. WHEN migrations são executadas, THE Sistema SHALL validar integridade referencial
2. WHEN tabelas são criadas, THE Sistema SHALL incluir constraints de validação
3. WHEN índices são criados, THE Sistema SHALL otimizar para queries de árvore genealógica
4. THE Sistema SHALL incluir triggers para manter updated_at automaticamente
5. THE Sistema SHALL implementar soft delete em todas as tabelas críticas

### Requirement 18: APIs de Integração Externa

**User Story:** Como sistema externo, eu quero consultar dados de afiliados via API, para que eu possa integrar com outros sistemas.

#### Acceptance Criteria

1. WHEN API externa consulta GET /api/affiliates/{id}/stats, THE Sistema SHALL retornar métricas públicas
2. WHEN API externa consulta comissões, THE Sistema SHALL exigir autenticação via API key
3. WHEN webhook externo é recebido, THE Sistema SHALL validar origem e assinatura
4. THE Sistema SHALL implementar rate limiting para APIs externas
5. THE Sistema SHALL documentar todas as APIs no formato OpenAPI

### Requirement 19: Backup e Recuperação

**User Story:** Como administrador, eu quero garantir backup de dados críticos, para que eu possa recuperar em caso de falha.

#### Acceptance Criteria

1. THE Sistema SHALL fazer backup diário de tabelas de afiliados e comissões
2. WHEN backup é executado, THE Sistema SHALL validar integridade dos dados
3. WHEN recuperação é necessária, THE Sistema SHALL permitir restore pontual
4. THE Sistema SHALL manter logs de backup para auditoria
5. THE Sistema SHALL testar procedimentos de recuperação mensalmente

### Requirement 20: Métricas e Monitoramento

**User Story:** Como administrador, eu quero monitorar saúde do sistema de afiliados, para que eu possa detectar problemas rapidamente.

#### Acceptance Criteria

1. THE Sistema SHALL expor métricas de performance via endpoint /health/affiliates
2. WHEN erro crítico ocorre, THE Sistema SHALL enviar alerta imediato para admins
3. WHEN volume de cadastros é anômalo, THE Sistema SHALL alertar sobre possível fraude
4. THE Sistema SHALL monitorar tempo de resposta de APIs críticas
5. THE Sistema SHALL gerar relatórios diários de atividade de afiliados
