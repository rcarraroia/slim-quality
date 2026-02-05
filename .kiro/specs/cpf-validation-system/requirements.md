# Requirements Document - Sistema de Validação por CPF/CNPJ para Afiliados

## Introduction

Este documento define os requisitos para implementar validação obrigatória por CPF/CNPJ no sistema de afiliados da Slim Quality. O objetivo é prevenir fraudes através da criação de múltiplas contas por um mesmo afiliado, garantindo que cada pessoa física ou jurídica tenha apenas uma conta ativa no sistema. Esta validação é crítica para o correto funcionamento do sistema de comissões via Asaas, onde o CPF/CNPJ deve coincidir com o titular da conta bancária.

## Glossary

- **Sistema**: Sistema de afiliados da Slim Quality
- **Afiliado**: Pessoa física ou jurídica cadastrada no programa de afiliados
- **CPF**: Cadastro de Pessoa Física - documento único brasileiro
- **CNPJ**: Cadastro Nacional de Pessoa Jurídica - documento único brasileiro para empresas
- **Documento**: Campo genérico que aceita CPF ou CNPJ
- **Asaas**: Gateway de pagamento utilizado para splits de comissão
- **Wallet_ID**: Identificador da carteira digital no Asaas
- **Regularização**: Processo de atualização de afiliados existentes sem CPF/CNPJ
- **Validação Assíncrona**: Processo que não bloqueia operação principal, retornando resultado via callback
- **LGPD**: Lei Geral de Proteção de Dados Pessoais

## Requirements

### Requirement 1: Validação de CPF/CNPJ Obrigatória

**User Story:** Como administrador do sistema, eu quero que todos os novos afiliados forneçam um CPF (pessoa física) ou CNPJ (pessoa jurídica) válido, para que cada pessoa ou empresa tenha apenas uma conta no sistema.

#### Acceptance Criteria

1. WHEN um usuário tenta se cadastrar como afiliado, THE Sistema SHALL exigir o preenchimento do campo documento (CPF ou CNPJ)
2. WHEN um documento é fornecido, THE Sistema SHALL validar se o formato está correto (11 dígitos para CPF ou 14 dígitos para CNPJ)
3. WHEN um documento é fornecido, THE Sistema SHALL detectar automaticamente se é CPF (11 dígitos) ou CNPJ (14 dígitos)
4. WHEN um CPF é fornecido, THE Sistema SHALL validar usando algoritmo oficial de CPF
5. WHEN um CNPJ é fornecido, THE Sistema SHALL validar usando algoritmo oficial de CNPJ
6. WHEN um documento inválido é fornecido, THE Sistema SHALL rejeitar o cadastro com mensagem de erro específica
7. WHEN um documento já cadastrado é fornecido, THE Sistema SHALL rejeitar o cadastro informando que já existe uma conta com este documento
8. WHEN o cadastro é rejeitado por duplicação, THE Sistema SHALL sugerir recuperação de senha ou contato com suporte

### Requirement 1.5: Suporte Dual a CPF e CNPJ

**User Story:** Como administrador, eu quero que o sistema aceite tanto CPF (pessoa física) quanto CNPJ (pessoa jurídica), para permitir afiliados empresariais no programa.

#### Acceptance Criteria

1. WHEN documento tem 11 dígitos, THE Sistema SHALL processar como CPF
2. WHEN documento tem 14 dígitos, THE Sistema SHALL processar como CNPJ
3. THE Sistema SHALL manter constraint UNIQUE independente do tipo de documento
4. THE Sistema SHALL exibir interface adaptada conforme tipo detectado
5. WHEN afiliado tenta alterar tipo de documento (CPF↔CNPJ), THE Sistema SHALL revalidar completamente o novo documento
6. THE Sistema SHALL armazenar tipo de documento para auditoria

### Requirement 2: Prevenção de Duplicação

**User Story:** Como administrador do sistema, eu quero garantir que não existam múltiplos afiliados com o mesmo CPF, para manter a integridade do sistema de comissões.

#### Acceptance Criteria

1. THE Sistema SHALL manter uma constraint UNIQUE na coluna document da tabela affiliates
2. WHEN um afiliado tenta alterar seu CPF, THE Sistema SHALL validar se o novo CPF não está em uso por outro afiliado
3. WHEN um CPF duplicado é detectado, THE Sistema SHALL impedir a operação e retornar erro específico
4. THE Sistema SHALL permitir apenas um afiliado ativo por CPF em qualquer momento

### Requirement 3: Regularização de Afiliados Existentes

**User Story:** Como administrador do sistema, eu quero regularizar os afiliados existentes sem CPF/CNPJ, para que todos os afiliados tenham documento cadastrado.

#### Acceptance Criteria

1. WHEN um afiliado existente sem CPF/CNPJ faz login, THE Sistema SHALL exibir notificação sobre a necessidade de cadastrar documento
2. WHEN um afiliado existente tenta acessar funcionalidades críticas sem CPF/CNPJ, THE Sistema SHALL redirecionar para tela de cadastro de documento
3. WHEN um afiliado existente fornece seu CPF/CNPJ, THE Sistema SHALL validar e atualizar o registro
4. THE Sistema SHALL permitir um período de transição de 30 dias para regularização
5. WHEN o período de transição expira, THE Sistema SHALL suspender afiliados sem CPF/CNPJ cadastrado através de flag is_active=false

### Requirement 4: Integração com Sistema de Comissões

**User Story:** Como administrador financeiro, eu quero garantir que o CPF/CNPJ do afiliado coincida com o titular da conta Asaas, para que as comissões sejam pagas corretamente.

#### Acceptance Criteria

1. WHEN um afiliado cadastra ou atualiza seu Wallet_ID, THE Sistema SHALL validar se o CPF/CNPJ coincide com o titular da conta no Asaas
2. WHEN há divergência entre CPF/CNPJ do afiliado e titular da conta Asaas, THE Sistema SHALL rejeitar o Wallet_ID
3. WHEN a validação com Asaas falha, THE Sistema SHALL permitir cadastro temporário mas marcar para revisão manual
4. THE Sistema SHALL registrar logs de todas as validações de CPF/CNPJ vs Asaas para auditoria
5. WHEN validação é iniciada, THE Sistema SHALL processar assincronamente via webhook/callback
6. THE Sistema SHALL permitir uso do sistema enquanto validação Asaas está pendente
7. WHEN validação Asaas retorna, THE Sistema SHALL notificar afiliado do resultado
8. THE Sistema SHALL ter timeout de 24h para validação manual se Asaas não responder

### Requirement 5: Conformidade com LGPD

**User Story:** Como responsável pela proteção de dados, eu quero garantir que o tratamento de CPF/CNPJ esteja em conformidade com a LGPD, para proteger os dados pessoais dos afiliados.

#### Acceptance Criteria

1. THE Sistema SHALL solicitar consentimento explícito para coleta e tratamento do CPF/CNPJ
2. THE Sistema SHALL informar a finalidade específica do tratamento do CPF/CNPJ (prevenção de fraude e pagamento de comissões)
3. WHEN um afiliado solicita exclusão de dados, THE Sistema SHALL anonimizar o CPF/CNPJ mantendo apenas hash para controle de duplicação
4. THE Sistema SHALL permitir que afiliados visualizem e corrijam seus dados de CPF/CNPJ
5. THE Sistema SHALL manter logs de acesso e modificação de dados de CPF/CNPJ para auditoria

### Requirement 6: Interface de Usuário

**User Story:** Como afiliado, eu quero uma interface clara e intuitiva para cadastrar meu CPF/CNPJ, para que o processo seja simples e seguro.

#### Acceptance Criteria

1. WHEN um afiliado acessa a tela de cadastro, THE Sistema SHALL exibir campo de documento com máscara de formatação adaptativa (CPF: XXX.XXX.XXX-XX | CNPJ: XX.XXX.XXX/XXXX-XX)
2. WHEN um afiliado digita o documento, THE Sistema SHALL aplicar formatação automática baseada no tipo detectado
3. WHEN um documento inválido é inserido, THE Sistema SHALL exibir mensagem de erro em tempo real
4. THE Sistema SHALL exibir explicação clara sobre por que o CPF/CNPJ é necessário
5. WHEN o documento é validado com sucesso, THE Sistema SHALL exibir confirmação visual

### Requirement 7: Relatórios e Auditoria

**User Story:** Como administrador do sistema, eu quero relatórios sobre o status de regularização dos afiliados, para acompanhar o progresso e identificar pendências.

#### Acceptance Criteria

1. THE Sistema SHALL gerar relatório de afiliados sem CPF/CNPJ cadastrado
2. THE Sistema SHALL gerar relatório de tentativas de cadastro com documento duplicado
3. THE Sistema SHALL gerar relatório de validações de CPF/CNPJ vs Asaas
4. WHEN solicitado, THE Sistema SHALL exportar relatórios em formato CSV
5. THE Sistema SHALL manter histórico de alterações de CPF/CNPJ para auditoria

### Requirement 8: Notificações e Comunicação

**User Story:** Como afiliado, eu quero receber notificações sobre a necessidade de regularizar meu CPF/CNPJ, para não perder acesso às funcionalidades do sistema.

#### Acceptance Criteria

1. WHEN um afiliado sem CPF/CNPJ faz login, THE Sistema SHALL exibir banner de notificação
2. THE Sistema SHALL enviar email de lembrete sobre regularização de documento após 7 dias
3. THE Sistema SHALL enviar email de aviso sobre suspensão iminente após 23 dias
4. WHEN um afiliado regulariza seu documento, THE Sistema SHALL enviar email de confirmação
5. THE Sistema SHALL permitir que afiliados configurem preferências de notificação sobre documentos