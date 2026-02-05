# SPEC: Correção Módulo de Afiliados

## Introdução

Esta spec define as correções necessárias para tornar o módulo de afiliados totalmente funcional, baseada na auditoria completa realizada em 04/01/2026. O sistema atual está estruturalmente completo mas funcionalmente híbrido, com algumas páginas usando dados mock e APIs backend não implementadas.

## Glossary

- **Afiliado**: Usuário cadastrado no programa de afiliados que pode indicar clientes
- **Wallet_ID**: Identificador único da carteira Asaas para recebimento de comissões
- **Referral_Code**: Código único de 6 caracteres para rastreamento de indicações
- **UTM_Tracking**: Sistema de rastreamento de origem via parâmetros de URL
- **Split_Automático**: Divisão automática de comissões via API Asaas
- **Dashboard_Afiliado**: Painel do afiliado com métricas e funcionalidades
- **Sistema_Tracking**: Conjunto de funcionalidades para rastrear cliques e conversões

## Requirements

### Requirement 1: Simplificação do Cadastro de Afiliados

**User Story:** Como um candidato a afiliado, eu quero um processo de cadastro mais simples, para que eu possa me cadastrar rapidamente sem informações técnicas complexas.

#### Acceptance Criteria

1. WHEN um usuário acessa a página de cadastro THEN o sistema SHALL exibir apenas campos essenciais (nome, email, telefone, CPF)
2. WHEN um usuário preenche o formulário THEN o sistema SHALL NOT solicitar Wallet ID durante o cadastro
3. WHEN um usuário preenche o formulário THEN o sistema SHALL NOT exibir modal "Já tem Asaas?"
4. WHEN um usuário preenche o formulário THEN o sistema SHALL NOT solicitar código de indicação manual
5. WHEN um usuário completa o cadastro THEN o sistema SHALL criar o afiliado com status 'pending' sem Wallet ID

### Requirement 2: Configuração de Wallet ID Pós-Cadastro

**User Story:** Como um afiliado cadastrado, eu quero configurar minha Wallet ID em uma seção dedicada, para que eu possa receber comissões quando estiver pronto.

#### Acceptance Criteria

1. WHEN um afiliado acessa /configuracoes THEN o sistema SHALL exibir seção "Configuração de Pagamento"
2. WHEN um afiliado não tem Wallet ID configurada THEN o sistema SHALL exibir status "Não configurada" com botão "Configurar"
3. WHEN um afiliado clica "Configurar" THEN o sistema SHALL exibir modal "Já tem conta no Asaas?"
4. WHEN um afiliado seleciona "Sim" THEN o sistema SHALL solicitar Wallet ID existente
5. WHEN um afiliado seleciona "Não" THEN o sistema SHALL exibir instruções para criar conta Asaas
6. WHEN um afiliado informa Wallet ID THEN o sistema SHALL validar via API Asaas real
7. WHEN validação é bem-sucedida THEN o sistema SHALL salvar Wallet ID e atualizar status do afiliado

### Requirement 3: Sistema de Tracking Automático

**User Story:** Como um afiliado, eu quero que meus links de indicação sejam rastreados automaticamente, para que eu não precise solicitar códigos manuais aos clientes.

#### Acceptance Criteria

1. WHEN um visitante acessa link com parâmetro ?ref=CODIGO THEN o sistema SHALL salvar código no localStorage
2. WHEN um visitante navega pelo site THEN o sistema SHALL manter código de referência na sessão
3. WHEN um visitante realiza compra THEN o sistema SHALL associar pedido ao afiliado automaticamente
4. WHEN um link é clicado THEN o sistema SHALL registrar clique na tabela referral_clicks
5. WHEN uma compra é confirmada THEN o sistema SHALL registrar conversão na tabela referral_conversions
6. WHEN um afiliado gera link THEN o sistema SHALL incluir UTM parameters para tracking completo

### Requirement 4: APIs Backend Funcionais

**User Story:** Como um afiliado, eu quero que meu dashboard exiba dados reais, para que eu possa acompanhar meu desempenho real no programa.

#### Acceptance Criteria

1. WHEN um afiliado acessa /dashboard THEN o sistema SHALL buscar dados via GET /api/affiliates/dashboard
2. WHEN um afiliado solicita link de indicação THEN o sistema SHALL buscar via GET /api/affiliates/referral-link
3. WHEN um afiliado configura Wallet ID THEN o sistema SHALL validar via POST /api/affiliates/validate-wallet
4. WHEN um afiliado visualiza comissões THEN o sistema SHALL buscar via GET /api/affiliates/:id/commissions
5. WHEN APIs são chamadas THEN o sistema SHALL retornar dados reais do Supabase, não mocks

### Requirement 5: Dashboard com Dados Reais

**User Story:** Como um afiliado, eu quero ver métricas reais do meu desempenho, para que eu possa tomar decisões baseadas em dados verdadeiros.

#### Acceptance Criteria

1. WHEN um afiliado acessa dashboard/inicio THEN o sistema SHALL exibir métricas reais de cliques, conversões e comissões
2. WHEN um afiliado acessa dashboard/comissoes THEN o sistema SHALL exibir lista real de comissões recebidas
3. WHEN um afiliado acessa dashboard/recebimentos THEN o sistema SHALL exibir histórico real de pagamentos
4. WHEN um afiliado acessa dashboard/rede THEN o sistema SHALL exibir rede real de indicados
5. WHEN não há dados THEN o sistema SHALL exibir estado vazio com orientações

### Requirement 6: Integração Asaas Completa

**User Story:** Como um afiliado, eu quero que minhas comissões sejam processadas automaticamente via Asaas, para que eu receba pagamentos sem intervenção manual.

#### Acceptance Criteria

1. WHEN uma venda é confirmada THEN o sistema SHALL calcular comissões automaticamente
2. WHEN comissões são calculadas THEN o sistema SHALL enviar split para API Asaas
3. WHEN split é processado THEN o sistema SHALL atualizar status das comissões
4. WHEN webhook Asaas é recebido THEN o sistema SHALL atualizar dados de pagamento
5. WHEN Wallet ID é validada THEN o sistema SHALL usar API Asaas real, não mock

### Requirement 7: Dados de Teste para Desenvolvimento

**User Story:** Como um desenvolvedor, eu quero dados de teste realistas, para que eu possa testar todas as funcionalidades do sistema.

#### Acceptance Criteria

1. WHEN sistema é configurado para desenvolvimento THEN o sistema SHALL ter dados de teste em commissions
2. WHEN sistema é configurado para desenvolvimento THEN o sistema SHALL ter dados de teste em withdrawals
3. WHEN sistema é configurado para desenvolvimento THEN o sistema SHALL ter dados de teste em referral_clicks
4. WHEN sistema é configurado para desenvolvimento THEN o sistema SHALL ter dados de teste em referral_conversions
5. WHEN dados de teste são criados THEN o sistema SHALL manter consistência entre tabelas relacionadas

### Requirement 8: Validação e Tratamento de Erros

**User Story:** Como um usuário do sistema, eu quero receber feedback claro sobre erros, para que eu possa corrigir problemas rapidamente.

#### Acceptance Criteria

1. WHEN validação de Wallet ID falha THEN o sistema SHALL exibir mensagem de erro específica
2. WHEN API backend está indisponível THEN o sistema SHALL exibir fallback apropriado
3. WHEN dados não são encontrados THEN o sistema SHALL exibir estado vazio com orientações
4. WHEN operação falha THEN o sistema SHALL registrar erro em logs para debugging
5. WHEN usuário tenta ação não permitida THEN o sistema SHALL exibir mensagem explicativa

### Requirement 9: Performance e Otimização

**User Story:** Como um usuário do sistema, eu quero que as páginas carreguem rapidamente, para que eu tenha uma experiência fluida.

#### Acceptance Criteria

1. WHEN páginas são carregadas THEN o sistema SHALL exibir skeleton loading durante carregamento
2. WHEN dados são buscados THEN o sistema SHALL implementar cache apropriado
3. WHEN listas são exibidas THEN o sistema SHALL implementar paginação quando necessário
4. WHEN imagens são carregadas THEN o sistema SHALL implementar lazy loading
5. WHEN operações são executadas THEN o sistema SHALL fornecer feedback visual de progresso

### Requirement 10: Monitoramento e Analytics

**User Story:** Como um administrador, eu quero monitorar o desempenho do sistema de afiliados, para que eu possa identificar problemas e oportunidades.

#### Acceptance Criteria

1. WHEN operações são executadas THEN o sistema SHALL registrar logs estruturados
2. WHEN erros ocorrem THEN o sistema SHALL registrar detalhes para debugging
3. WHEN métricas são coletadas THEN o sistema SHALL armazenar dados para análise
4. WHEN relatórios são gerados THEN o sistema SHALL usar dados reais do banco
5. WHEN performance é monitorada THEN o sistema SHALL identificar gargalos automaticamente