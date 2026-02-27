# Requirements Document - ETAPA 2: Configuração Financeira (Wallet)

## Introduction

Este documento especifica os requisitos para a ETAPA 2 do sistema de diferenciação de perfis de afiliados do Slim Quality. O objetivo é permitir que afiliados configurem sua conta de recebimento no Asaas diretamente pelo painel, habilitando-os a receber comissões.

A ETAPA 1 criou a fundação estrutural com os campos `affiliate_type`, `financial_status` e `wallet_id` (nullable). Esta etapa implementa a funcionalidade que permite ao afiliado preencher o `wallet_id` e transicionar de `financial_status='financeiro_pendente'` para `financial_status='ativo'`.

## Glossary

- **Wallet**: Carteira digital do Asaas para recebimento de comissões
- **Wallet_ID**: Identificador único da carteira no formato UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
- **Financial_Status**: Status financeiro do afiliado (financeiro_pendente ou ativo)
- **Asaas**: Gateway de pagamento e plataforma de split de comissões
- **Subconta**: Conta secundária criada no Asaas vinculada à conta principal
- **API_Key**: Chave de autenticação para acesso à API do Asaas
- **Split**: Divisão automática de pagamentos entre múltiplas carteiras
- **Onboarding**: Processo de configuração inicial do afiliado
- **RLS**: Row Level Security (políticas de segurança do Supabase)
- **Serverless_Function**: Função backend executada no Vercel
- **UUID**: Universally Unique Identifier (formato padrão de identificação única)

## Requirements

### Requirement 1: Seção de Configurações Financeiras no Painel

**User Story:** Como afiliado, eu quero acessar uma seção dedicada de configurações financeiras no meu painel, para que eu possa configurar minha conta de recebimento de forma clara e organizada.

#### Acceptance Criteria

1. THE Painel_Afiliado SHALL exibir seção "Configurações Financeiras" no menu lateral
2. WHEN `financial_status='financeiro_pendente'`, THE Seção SHALL exibir banner de alerta destacado
3. THE Banner SHALL conter mensagem "Configure sua carteira digital para começar a receber comissões"
4. THE Seção SHALL exibir duas opções claramente separadas: "Já tenho conta Asaas" e "Criar conta Asaas"
5. WHEN `financial_status='ativo'`, THE Seção SHALL exibir informações da wallet configurada (últimos 4 caracteres do wallet_id)

### Requirement 2: Fluxo "Já tenho conta Asaas"

**User Story:** Como afiliado que já possui conta no Asaas, eu quero informar manualmente meu Wallet ID, para que eu possa começar a receber comissões sem criar uma nova conta.

#### Acceptance Criteria

1. THE Formulário SHALL exibir campo de texto para entrada do Wallet ID
2. THE Formulário SHALL exibir label "Wallet ID" com exemplo do formato esperado (UUID)
3. THE Formulário SHALL validar formato do Wallet ID antes de enviar (regex UUID: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
4. WHEN formato é inválido, THE Formulário SHALL exibir mensagem de erro inline
5. WHEN formato é válido, THE Formulário SHALL habilitar botão "Salvar"
6. WHEN botão "Salvar" é clicado, THE Sistema SHALL salvar Wallet ID no banco sem validação via API Asaas
7. THE Sistema SHALL confiar na constraint UNIQUE do banco para prevenir duplicação
8. THE Sistema SHALL atualizar status para 'ativo' imediatamente após salvar

### Requirement 3: Validação de Wallet ID

**User Story:** Como sistema, eu quero validar formato de Wallet IDs, para que apenas IDs no formato UUID válido sejam aceitos.

#### Acceptance Criteria

1. THE Sistema SHALL validar formato UUID do Wallet ID (regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
2. THE Sistema SHALL aceitar apenas UUIDs em lowercase
3. THE Sistema SHALL rejeitar Wallet IDs com formato inválido antes de salvar
4. THE Sistema SHALL confiar na constraint UNIQUE do banco para prevenir duplicação
5. THE Sistema SHALL detectar erros de Wallet ID inválido na primeira tentativa de split de comissão
6. THE Sistema SHALL registrar log de todas as tentativas de configuração de wallet
7. IF Wallet ID já existe para outro afiliado, THEN THE Sistema SHALL retornar erro "Wallet já cadastrada"

**Nota:** A API Asaas não fornece endpoint para validar Wallet ID de terceiros. A validação ocorre implicitamente na primeira tentativa de split de comissão.

### Requirement 4: Fluxo "Criar conta Asaas"

**User Story:** Como afiliado que não possui conta no Asaas, eu quero criar uma subconta diretamente pelo painel, para que eu possa começar a receber comissões sem sair da plataforma.

#### Acceptance Criteria

1. THE Formulário SHALL exibir todos os campos obrigatórios da API Asaas
2. THE Formulário SHALL pré-preencher campos com dados já cadastrados do afiliado (nome, email, CPF/CNPJ, telefone)
3. THE Formulário SHALL exibir campos adicionais obrigatórios: renda/faturamento mensal, endereço completo
4. THE Formulário SHALL validar todos os campos antes de enviar
5. WHEN todos os campos são válidos, THE Formulário SHALL habilitar botão "Criar Conta"
6. WHEN botão "Criar Conta" é clicado, THE Sistema SHALL enviar requisição POST para API Asaas
7. IF criação é bem-sucedida, THEN THE Sistema SHALL extrair `walletId` da resposta
8. THE Sistema SHALL salvar `walletId` no banco e atualizar status para 'ativo'

### Requirement 5: Criação de Subconta via API Asaas

**User Story:** Como sistema, eu quero criar subcontas no Asaas via API, para que afiliados possam receber comissões sem precisar criar conta manualmente.

#### Acceptance Criteria

1. THE API SHALL fazer requisição POST para `https://api.asaas.com/v3/accounts`
2. THE API SHALL incluir header `access_token` com chave de API do Asaas
3. THE API SHALL enviar payload com campos obrigatórios: name, email, cpfCnpj, mobilePhone, incomeValue, address, addressNumber, province, postalCode
4. WHEN resposta é 200, THE API SHALL extrair `walletId` (formato UUID) da resposta
5. THE API SHALL também extrair `apiKey` da subconta criada para armazenamento opcional
6. IF resposta é 400, THEN THE API SHALL retornar erros de validação específicos
7. IF resposta é 409, THEN THE API SHALL retornar erro "Email ou CPF/CNPJ já cadastrado"
8. THE API SHALL registrar log de todas as tentativas de criação
9. THE API SHALL armazenar `walletId` retornado no campo `wallet_id` da tabela `affiliates`
10. THE API SHALL opcionalmente armazenar `apiKey` da subconta para uso futuro

### Requirement 6: Transição de Status Financeiro

**User Story:** Como sistema, eu quero atualizar automaticamente o status financeiro do afiliado, para que apenas afiliados com wallet configurada possam receber comissões.

#### Acceptance Criteria

1. WHEN `wallet_id` é salvo com sucesso, THE Sistema SHALL atualizar `financial_status` de 'financeiro_pendente' para 'ativo'
2. THE Sistema SHALL atualizar campo `wallet_configured_at` com timestamp atual
3. THE Sistema SHALL atualizar campo `onboarding_completed` para TRUE
4. THE Sistema SHALL registrar log da transição de status
5. WHEN transição é concluída, THE Sistema SHALL exibir mensagem de sucesso ao afiliado
6. THE Sistema SHALL redirecionar afiliado para dashboard principal após sucesso

### Requirement 7: Restrições de Acesso ao Link de Indicação

**User Story:** Como sistema, eu quero exibir o link de indicação apenas para afiliados ativos, para que apenas afiliados aptos a receber comissões possam indicar novos clientes.

#### Acceptance Criteria

1. WHEN `financial_status='financeiro_pendente'`, THE Dashboard SHALL ocultar seção de link de indicação
2. WHEN `financial_status='financeiro_pendente'`, THE Dashboard SHALL exibir mensagem "Configure sua wallet para liberar seu link de indicação"
3. WHEN `financial_status='ativo'`, THE Dashboard SHALL exibir seção de link de indicação completa
4. THE Sistema SHALL validar `financial_status` antes de gerar link de indicação via API
5. IF `financial_status='financeiro_pendente'`, THEN THE API SHALL retornar erro 403 "Wallet não configurada"

### Requirement 8: Validação de Campos do Formulário de Criação

**User Story:** Como sistema, eu quero validar todos os campos do formulário de criação de conta, para que apenas dados válidos sejam enviados à API do Asaas.

#### Acceptance Criteria

1. THE Formulário SHALL validar campo `name` (mínimo 3 caracteres, máximo 100)
2. THE Formulário SHALL validar campo `email` (formato de email válido)
3. THE Formulário SHALL validar campo `cpfCnpj` (11 ou 14 dígitos, dígitos verificadores corretos)
4. THE Formulário SHALL validar campo `mobilePhone` (formato brasileiro: +55XXXXXXXXXXX)
5. THE Formulário SHALL validar campo `incomeValue` (número positivo, mínimo R$ 0,01)
6. THE Formulário SHALL validar campo `postalCode` (8 dígitos, formato XXXXX-XXX)
7. THE Formulário SHALL validar campo `addressNumber` (obrigatório, não vazio)
8. THE Formulário SHALL validar formato UUID do Wallet ID retornado (regex: `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
9. IF qualquer validação falhar, THEN THE Formulário SHALL exibir mensagem de erro específica

### Requirement 9: Segurança e Proteção de Dados

**User Story:** Como sistema, eu quero proteger dados sensíveis dos afiliados, para que informações financeiras sejam tratadas com segurança.

#### Acceptance Criteria

1. THE API SHALL validar autenticação do afiliado antes de qualquer operação
2. THE API SHALL verificar que afiliado está atualizando apenas próprio `wallet_id`
3. THE API SHALL não expor chave de API do Asaas no frontend
4. THE API SHALL registrar logs de todas as operações de configuração de wallet
5. THE Sistema SHALL armazenar apenas `wallet_id` no banco (não armazenar dados bancários)
6. THE Sistema SHALL usar HTTPS para todas as comunicações com API Asaas
7. THE Sistema SHALL validar que `wallet_id` não está duplicado no banco antes de salvar
8. IF `wallet_id` já existe para outro afiliado, THEN THE Sistema SHALL retornar erro "Wallet já cadastrada"

### Requirement 10: Feedback Visual e UX

**User Story:** Como afiliado, eu quero receber feedback claro durante o processo de configuração, para que eu saiba o status de cada ação realizada.

#### Acceptance Criteria

1. WHEN formulário está sendo enviado, THE Sistema SHALL exibir loading spinner no botão
2. WHEN validação está em andamento, THE Sistema SHALL exibir mensagem "Validando wallet..."
3. WHEN criação de conta está em andamento, THE Sistema SHALL exibir mensagem "Criando sua conta no Asaas..."
4. WHEN operação é bem-sucedida, THE Sistema SHALL exibir toast de sucesso com mensagem clara
5. WHEN operação falha, THE Sistema SHALL exibir toast de erro com mensagem descritiva
6. THE Sistema SHALL desabilitar botão de envio durante processamento
7. THE Sistema SHALL manter dados preenchidos em caso de erro (não limpar formulário)
8. THE Sistema SHALL focar no primeiro campo com erro após validação falhar

## Notas de Implementação

### Ordem de Implementação Recomendada

1. **Primeiro**: Criar API endpoint de validação de Wallet ID (Requirement 3)
2. **Segundo**: Criar API endpoint de criação de subconta (Requirement 5)
3. **Terceiro**: Implementar seção de configurações financeiras no painel (Requirement 1)
4. **Quarto**: Implementar fluxo "Já tenho conta Asaas" (Requirement 2)
5. **Quinto**: Implementar fluxo "Criar conta Asaas" (Requirement 4)
6. **Sexto**: Implementar transição de status (Requirement 6)
7. **Sétimo**: Implementar restrições de acesso (Requirement 7)
8. **Oitavo**: Implementar validações e segurança (Requirements 8, 9)
9. **Nono**: Implementar feedback visual (Requirement 10)

### Dependências Externas

- API Asaas (https://api.asaas.com/v3)
- Chave de API do Asaas (variável de ambiente `ASAAS_API_KEY`)
- Supabase PostgreSQL (banco de dados)
- Vercel Serverless Functions (backend)
- React/Vite (frontend)
- shadcn/ui (componentes UI)

### Arquivos Principais a Criar/Modificar

**Backend:**
- `api/affiliates.js` - Adicionar actions: `create-asaas-account`, `configure-wallet`
- Nova função: `createAsaasAccount(affiliateData)`
- Nota: Função `validateWalletAsaas()` foi removida (endpoint não disponível na API Asaas)

**Frontend:**
- `src/pages/affiliates/ConfiguracoesFinanceiras.tsx` - Nova página
- `src/components/affiliates/WalletConfigForm.tsx` - Novo componente
- `src/components/affiliates/CreateAsaasAccountForm.tsx` - Novo componente
- `src/services/asaas.service.ts` - Novo serviço
- `src/utils/validators.ts` - Adicionar validadores de wallet e endereço

### Testes Críticos

1. **Validação de Wallet ID**: Testar formatos válidos e inválidos
2. **Validação via API Asaas**: Testar wallets existentes, inexistentes e inativas
3. **Criação de subconta**: Testar com dados válidos e inválidos
4. **Transição de status**: Verificar que status muda corretamente
5. **Restrições de acesso**: Verificar que link só aparece para status ativo
6. **Segurança**: Verificar que afiliado não pode alterar wallet de outro
7. **Duplicação**: Verificar que wallet não pode ser usada por dois afiliados

### Riscos e Mitigações

**Risco 1: API Asaas indisponível**
- Mitigação: Implementar retry logic com backoff exponencial
- Mitigação: Exibir mensagem clara ao usuário em caso de falha

**Risco 2: Wallet ID inválido aceito por erro**
- Mitigação: Validação em múltiplas camadas (frontend, API, Asaas)
- Mitigação: Logs detalhados de todas as validações

**Risco 3: Duplicação de Wallet ID**
- Mitigação: Constraint UNIQUE no banco de dados
- Mitigação: Validação antes de salvar

**Risco 4: Dados sensíveis expostos**
- Mitigação: Não armazenar dados bancários, apenas wallet_id
- Mitigação: Logs não devem conter dados sensíveis completos

## Critérios de Conclusão da ETAPA 2

A ETAPA 2 estará completa quando:

- ✅ Todos os 10 requirements estiverem implementados
- ✅ API de validação de wallet funcionando
- ✅ API de criação de subconta funcionando
- ✅ Seção de configurações financeiras no painel funcionando
- ✅ Fluxo "Já tenho conta Asaas" funcionando
- ✅ Fluxo "Criar conta Asaas" funcionando
- ✅ Transição de status automática funcionando
- ✅ Restrições de acesso ao link implementadas
- ✅ Validações de segurança implementadas
- ✅ Feedback visual implementado
- ✅ Testes de integração com Asaas passando
- ✅ Zero erros de TypeScript/ESLint
- ✅ Documentação atualizada

## Próximas Etapas (Fora do Escopo)

Esta especificação NÃO inclui:

- ❌ Produtos Show Row (ETAPA 3)
- ❌ Perfil de loja e vitrine (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)
- ❌ Alteração de wallet após configuração (apenas admin pode)
- ❌ Múltiplas wallets por afiliado
- ❌ Integração com outros gateways além do Asaas

Estas funcionalidades serão implementadas nas etapas subsequentes ou em sprints futuros.
