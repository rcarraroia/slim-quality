# Requirements Document - ETAPA 1: Base de Dados e Tipos de Afiliados

## Introduction

Este documento especifica os requisitos para a ETAPA 1 do sistema de diferenciação de perfis de afiliados do Slim Quality. O objetivo é criar a fundação estrutural que permitirá ao sistema suportar dois tipos distintos de afiliados: Individual (pessoa física revendedora) e Logista (loja física parceira).

Atualmente, o sistema possui apenas afiliados individuais. Esta etapa estabelece a base de dados e estruturas necessárias para que as etapas seguintes possam implementar funcionalidades específicas para cada tipo de afiliado, incluindo configuração de wallet, produtos exclusivos, perfil de loja e monetização.

## Glossary

- **Affiliate**: Usuário cadastrado no programa de afiliados do Slim Quality
- **Individual**: Tipo de afiliado pessoa física que revende produtos
- **Logista**: Tipo de afiliado loja física parceira que revende produtos
- **Wallet**: Carteira digital do Asaas para recebimento de comissões
- **Financial_Status**: Status financeiro do afiliado (pendente ou ativo)
- **Affiliate_Type**: Tipo de perfil do afiliado (individual ou logista)
- **Product_Category**: Categoria de produto no sistema
- **Show_Row**: Categoria de produto exclusiva para Logistas
- **CNPJ**: Cadastro Nacional de Pessoa Jurídica (documento de empresa)
- **CPF**: Cadastro de Pessoa Física (documento de pessoa física)
- **RLS**: Row Level Security (políticas de segurança do Supabase)
- **Migration**: Script SQL para alteração de estrutura do banco de dados
- **Supabase**: Plataforma de banco de dados PostgreSQL hospedado
- **Database**: Sistema de banco de dados PostgreSQL do projeto

## Requirements

### Requirement 1: Campo de Tipo de Afiliado

**User Story:** Como administrador do sistema, eu quero que o banco de dados suporte dois tipos de afiliados (Individual e Logista), para que o sistema possa diferenciar e aplicar regras específicas para cada perfil.

#### Acceptance Criteria

1. THE Database SHALL adicionar coluna `affiliate_type` na tabela `affiliates` com tipo ENUM contendo valores 'individual' e 'logista'
2. THE Database SHALL definir valor padrão 'individual' para a coluna `affiliate_type`
3. THE Database SHALL definir a coluna `affiliate_type` como NOT NULL
4. THE Database SHALL criar índice na coluna `affiliate_type` para otimizar consultas
5. WHEN uma migration é executada, THE Database SHALL preservar todos os dados existentes na tabela `affiliates`

### Requirement 2: Sistema de Status Financeiro

**User Story:** Como administrador do sistema, eu quero controlar o status financeiro dos afiliados, para que apenas afiliados com wallet configurada possam receber comissões.

#### Acceptance Criteria

1. THE Database SHALL adicionar coluna `financial_status` na tabela `affiliates` com tipo ENUM contendo valores 'financeiro_pendente' e 'ativo'
2. THE Database SHALL definir valor padrão 'financeiro_pendente' para a coluna `financial_status`
3. THE Database SHALL definir a coluna `financial_status` como NOT NULL
4. WHEN um afiliado é cadastrado, THE Database SHALL definir `financial_status` como 'financeiro_pendente'
5. THE Database SHALL permitir atualização de `financial_status` de 'financeiro_pendente' para 'ativo'

### Requirement 3: Categoria Show Row para Produtos

**User Story:** Como administrador do sistema, eu quero adicionar a categoria Show Row ao sistema de produtos, para que futuramente possamos criar produtos exclusivos para Logistas.

#### Acceptance Criteria

1. THE Database SHALL estender o ENUM `product_category` adicionando o valor 'show_row'
2. THE Database SHALL manter os valores existentes do ENUM: 'colchao', 'ferramenta_ia', 'servico_digital'
3. THE Database SHALL permitir que produtos sejam criados com categoria 'show_row'
4. THE Database SHALL preservar todos os produtos existentes com suas categorias atuais

### Requirement 4: Validação de Documento por Tipo

**User Story:** Como sistema, eu quero validar o tipo de documento baseado no tipo de afiliado, para que Individuais usem CPF e Logistas usem CNPJ.

#### Acceptance Criteria

1. WHEN `affiliate_type` é 'individual', THE Database SHALL aceitar `document` com 11 dígitos (CPF)
2. WHEN `affiliate_type` é 'logista', THE Database SHALL aceitar `document` com 14 dígitos (CNPJ)
3. WHEN `affiliate_type` é 'individual', THE Database SHALL definir `document_type` como 'CPF'
4. WHEN `affiliate_type` é 'logista', THE Database SHALL definir `document_type` como 'CNPJ'
5. THE Database SHALL garantir unicidade do campo `document` entre todos os afiliados

### Requirement 5: Migration de Dados Existentes

**User Story:** Como administrador do sistema, eu quero que todos os afiliados existentes sejam migrados corretamente, para que o sistema continue funcionando sem perda de dados.

#### Acceptance Criteria

1. WHEN a migration é executada, THE Database SHALL atualizar todos os registros existentes em `affiliates` com `affiliate_type` = 'individual'
2. WHEN a migration é executada, THE Database SHALL atualizar todos os registros existentes em `affiliates` com `financial_status` = 'financeiro_pendente'
3. THE Database SHALL validar que nenhum registro foi perdido após a migration
4. THE Database SHALL validar que todos os campos existentes permanecem intactos
5. IF a migration falhar, THEN THE Database SHALL reverter todas as alterações (rollback)

### Requirement 6: Formulário de Cadastro de Afiliados

**User Story:** Como usuário, eu quero selecionar o tipo de afiliado durante o cadastro, para que o sistema colete as informações corretas baseadas no meu perfil.

#### Acceptance Criteria

1. THE Cadastro_Form SHALL exibir campo de seleção com opções 'Individual' e 'Logista'
2. WHEN 'Individual' é selecionado, THE Cadastro_Form SHALL exibir campo para CPF
3. WHEN 'Logista' é selecionado, THE Cadastro_Form SHALL exibir campo para CNPJ
4. WHEN 'Logista' é selecionado, THE Cadastro_Form SHALL tornar o campo CNPJ obrigatório
5. THE Cadastro_Form SHALL validar formato de CPF (11 dígitos) quando tipo é 'Individual'
6. THE Cadastro_Form SHALL validar formato de CNPJ (14 dígitos) quando tipo é 'Logista'
7. THE Cadastro_Form SHALL manter todos os campos existentes do formulário atual

### Requirement 7: API de Cadastro de Afiliados

**User Story:** Como sistema, eu quero processar cadastros de afiliados com validação de tipo e documento, para que apenas dados válidos sejam armazenados no banco.

#### Acceptance Criteria

1. WHEN uma requisição de cadastro é recebida, THE API SHALL validar o campo `affiliate_type`
2. WHEN `affiliate_type` é 'individual', THE API SHALL validar que `document` tem 11 dígitos
3. WHEN `affiliate_type` é 'logista', THE API SHALL validar que `document` tem 14 dígitos
4. WHEN `affiliate_type` é 'logista', THE API SHALL validar que `document` não está vazio
5. IF validação falhar, THEN THE API SHALL retornar erro HTTP 400 com mensagem descritiva
6. WHEN cadastro é válido, THE API SHALL criar registro com `financial_status` = 'financeiro_pendente'
7. THE API SHALL retornar HTTP 201 com dados do afiliado criado quando sucesso

### Requirement 8: Restrições para Status Financeiro Pendente

**User Story:** Como sistema, eu quero restringir funcionalidades para afiliados com status financeiro pendente, para que apenas afiliados ativos possam operar plenamente.

#### Acceptance Criteria

1. WHEN `financial_status` é 'financeiro_pendente', THE Sistema SHALL impedir participação em split de comissões
2. WHEN `financial_status` é 'financeiro_pendente', THE Sistema SHALL impedir geração de link de indicação
3. WHEN afiliado com status pendente acessa o painel, THE Sistema SHALL exibir mensagem orientando configuração de wallet
4. WHEN `financial_status` é 'ativo', THE Sistema SHALL permitir todas as funcionalidades de afiliado
5. THE Sistema SHALL validar `financial_status` antes de processar qualquer comissão

### Requirement 9: Compatibilidade com Sistema Existente

**User Story:** Como administrador do sistema, eu quero que as alterações não quebrem funcionalidades existentes, para que o sistema continue operando normalmente durante a transição.

#### Acceptance Criteria

1. THE Sistema SHALL manter todas as políticas RLS existentes funcionando
2. THE Sistema SHALL manter o sistema de comissões atual funcionando
3. THE Sistema SHALL manter o painel de afiliados existente funcionando
4. THE Sistema SHALL manter todas as APIs existentes funcionando
5. WHEN afiliados existentes acessam o sistema, THE Sistema SHALL funcionar normalmente com os novos campos

### Requirement 10: Parser e Validador de Documentos

**User Story:** Como sistema, eu quero validar e formatar documentos (CPF/CNPJ) corretamente, para que apenas documentos válidos sejam aceitos.

#### Acceptance Criteria

1. THE Document_Parser SHALL remover caracteres não numéricos de CPF e CNPJ
2. THE Document_Parser SHALL validar dígitos verificadores de CPF
3. THE Document_Parser SHALL validar dígitos verificadores de CNPJ
4. THE Document_Parser SHALL rejeitar CPF com todos os dígitos iguais (ex: 111.111.111-11)
5. THE Document_Parser SHALL rejeitar CNPJ com todos os dígitos iguais (ex: 11.111.111/1111-11)
6. THE Pretty_Printer SHALL formatar CPF no padrão XXX.XXX.XXX-XX
7. THE Pretty_Printer SHALL formatar CNPJ no padrão XX.XXX.XXX/XXXX-XX
8. FOR ALL documentos válidos, parsear então formatar então parsear SHALL produzir documento equivalente (round-trip property)

## Notas de Implementação

### Ordem de Implementação Recomendada

1. **Primeiro**: Criar migration do banco de dados (Requirements 1, 2, 3, 5)
2. **Segundo**: Implementar parser e validador de documentos (Requirement 10)
3. **Terceiro**: Atualizar API de cadastro (Requirement 7)
4. **Quarto**: Atualizar formulário de cadastro (Requirement 6)
5. **Quinto**: Implementar restrições de status (Requirement 8)
6. **Sexto**: Validar compatibilidade (Requirement 9)

### Dependências Externas

- Supabase PostgreSQL (banco de dados)
- Vercel Serverless Functions (backend)
- React/Vite (frontend)
- shadcn/ui (componentes UI)

### Arquivos Principais a Modificar

**Backend:**
- `api/affiliates.js` - API de afiliados
- Nova migration SQL em `supabase/migrations/`

**Frontend:**
- `src/pages/auth/CadastroAfiliado.tsx` - Formulário de cadastro
- `src/services/affiliates.service.ts` - Serviço de afiliados
- `src/utils/validators.ts` - Validadores (criar se não existir)

### Testes Críticos

1. **Round-trip de documentos**: Garantir que parse → format → parse mantém equivalência
2. **Migration idempotente**: Executar migration múltiplas vezes deve ser seguro
3. **Validação de CNPJ**: Testar CNPJs válidos e inválidos
4. **Validação de CPF**: Testar CPFs válidos e inválidos
5. **Compatibilidade**: Afiliados existentes devem continuar funcionando

### Riscos e Mitigações

**Risco 1: Perda de dados durante migration**
- Mitigação: Backup do banco antes da migration
- Mitigação: Migration com rollback automático em caso de erro

**Risco 2: Quebra de funcionalidades existentes**
- Mitigação: Valores padrão para novos campos
- Mitigação: Testes de regressão antes do deploy

**Risco 3: Validação de CNPJ incorreta**
- Mitigação: Usar algoritmo padrão de validação de CNPJ
- Mitigação: Testes com CNPJs reais e inválidos

## Critérios de Conclusão da ETAPA 1

A ETAPA 1 estará completa quando:

- ✅ Todos os 10 requirements estiverem implementados
- ✅ Migration aplicada com sucesso no banco de produção
- ✅ Todos os afiliados existentes migrados corretamente
- ✅ Formulário de cadastro funcionando para ambos os tipos
- ✅ Validação de CPF e CNPJ funcionando
- ✅ Testes de round-trip passando
- ✅ Sistema existente funcionando normalmente
- ✅ Zero erros de TypeScript/ESLint
- ✅ Documentação atualizada

## Próximas Etapas (Fora do Escopo)

Esta especificação NÃO inclui:

- ❌ Configuração de wallet (ETAPA 2)
- ❌ Produtos Show Row (ETAPA 3)
- ❌ Perfil de loja e vitrine (ETAPA 4)
- ❌ Sistema de monetização (ETAPA 5)

Estas funcionalidades serão implementadas nas etapas subsequentes, que dependem da fundação criada nesta ETAPA 1.
