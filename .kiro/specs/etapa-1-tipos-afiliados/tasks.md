# Implementation Tasks - ETAPA 1: Base de Dados e Tipos de Afiliados

## Overview

Este documento contém as tarefas de implementação para a ETAPA 1 do sistema de diferenciação de perfis de afiliados. As tarefas estão organizadas em 7 fases sequenciais, seguindo exatamente a estrutura definida no design.md.

**Spec:** etapa-1-tipos-afiliados  
**Workflow:** Requirements-first  
**Status:** Pronto para execução

---

## Phase 1: Database Foundation

### Objetivo
Criar a fundação do banco de dados com novos ENUMs, colunas e índices, garantindo zero perda de dados.

- [ ] 1.1 Criar script de migration SQL
  - Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_add_affiliate_types.sql`
  - Criar ENUM `affiliate_type` com valores 'individual' e 'logista'
  - Criar ENUM `financial_status` com valores 'financeiro_pendente' e 'ativo'
  - Estender ENUM `product_category` adicionando valor 'show_row'
  - Adicionar colunas `affiliate_type` e `financial_status` na tabela `affiliates`
  - Definir valores padrão: `affiliate_type='individual'`, `financial_status='financeiro_pendente'`
  - Criar índices: `idx_affiliates_affiliate_type`, `idx_affiliates_financial_status`, `idx_affiliates_type_status`
  - Atualizar todos os registros existentes com valores padrão
  - Adicionar verificações de integridade de dados
  - Envolver tudo em transação (BEGIN/COMMIT)
  - Adicionar script de rollback comentado
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 1.2 Testar migration em ambiente de staging
  - Fazer backup do banco de produção
  - Aplicar migration no ambiente de staging
  - Verificar que todos os 23 afiliados existentes foram atualizados
  - Verificar que nenhum registro foi perdido (COUNT antes e depois)
  - Verificar que todos os campos existentes permanecem intactos
  - Verificar que os 3 índices foram criados corretamente
  - Testar rollback script para garantir que funciona
  - Documentar qualquer problema encontrado
  - _Requirements: 5.3, 5.4, 5.5_

- [ ] 1.3 Aplicar migration no banco de produção
  - Conectar ao Supabase via Power: Supabase Hosted Development
  - Executar migration script
  - Verificar sucesso da migration (record count >= 23)
  - Verificar que novas colunas existem e estão populadas
  - Verificar que índices foram criados
  - Monitorar logs do Supabase para erros
  - Testar login de afiliado existente para confirmar compatibilidade
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.2, 9.3, 9.4, 9.5_

---

## Phase 2: Document Validation

### Objetivo
Implementar parser e validador de CPF/CNPJ com garantia de round-trip property.

- [ ] 2.1 Implementar funções de parser de documentos
  - Criar arquivo `src/utils/validators.ts` (se não existir)
  - Implementar `parseDocument(document: string): string` - remove caracteres não numéricos
  - Implementar `formatCPF(cpf: string): string` - formata no padrão XXX.XXX.XXX-XX
  - Implementar `formatCNPJ(cnpj: string): string` - formata no padrão XX.XXX.XXX/XXXX-XX
  - Adicionar JSDoc para todas as funções
  - _Requirements: 10.1, 10.6, 10.7_

- [ ] 2.2 Implementar funções de validação de documentos
  - Implementar `validateCPF(cpf: string): boolean` - valida CPF completo
  - Implementar `validateCNPJ(cnpj: string): boolean` - valida CNPJ completo
  - Implementar `validateCPFCheckDigits(cpf: string): boolean` - helper para dígitos verificadores
  - Implementar `validateCNPJCheckDigits(cnpj: string): boolean` - helper para dígitos verificadores
  - Rejeitar CPF/CNPJ com todos os dígitos iguais (ex: 111.111.111-11)
  - Validar comprimento correto (11 para CPF, 14 para CNPJ)
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

- [ ]* 2.3 Escrever property tests para validação de documentos (OBRIGATÓRIO)
  - Instalar `fast-check` se necessário
  - Criar generators para CPFs válidos e inválidos
  - Criar generators para CNPJs válidos e inválidos
  - **Property 1: Round-trip preservation** - parse → format → parse deve preservar documento
  - **Property 2: CPF validation correctness** - validar CPFs válidos e rejeitar inválidos
  - **Property 3: CNPJ validation correctness** - validar CNPJs válidos e rejeitar inválidos
  - Configurar 100+ iterações por teste
  - Adicionar tags: `Feature: etapa-1-tipos-afiliados, Property {N}`
  - _Requirements: 10.8_

- [ ]* 2.4 Escrever unit tests para casos específicos (OBRIGATÓRIO)
  - Testar CPF com todos os dígitos iguais (deve rejeitar)
  - Testar CNPJ com todos os dígitos iguais (deve rejeitar)
  - Testar CPFs conhecidos válidos (deve aceitar)
  - Testar CNPJs conhecidos válidos (deve aceitar)
  - Testar documentos com comprimento errado (deve rejeitar)
  - Testar strings vazias (deve rejeitar)
  - Testar formatação de CPF e CNPJ
  - Verificar cobertura de código > 80%
  - _Requirements: 10.2, 10.3, 10.4, 10.5_

---

## Phase 3: API Update

### Objetivo
Atualizar API de afiliados para suportar registro com validação de tipo e documento.

- [x] 3.1 Adicionar action 'register' à API de afiliados
  - Abrir arquivo `api/affiliates.js`
  - Adicionar case 'register' ao switch statement
  - Criar função `handleRegister(req, res, supabase)`
  - Configurar CORS para o endpoint
  - Seguir padrão do arquivo existente
  - _Requirements: 7.1_

- [x] 3.2 Implementar lógica de validação na API
  - Validar campo `affiliate_type` (deve ser 'individual' ou 'logista')
  - Validar comprimento de `document` baseado em `affiliate_type`
  - Se `affiliate_type='individual'`: validar que `document` tem 11 dígitos
  - Se `affiliate_type='logista'`: validar que `document` tem 14 dígitos e não está vazio
  - Validar dígitos verificadores usando funções de `validators.ts`
  - Verificar se `email` já existe no banco
  - Verificar se `document` já existe no banco
  - Retornar erro HTTP 400 com mensagem descritiva para cada tipo de erro
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3.3 Implementar lógica de registro de afiliado
  - Criar usuário no Supabase Auth com email e senha
  - Criar registro na tabela `affiliates` com todos os campos
  - Definir `financial_status='financeiro_pendente'` automaticamente
  - Definir `document_type` baseado em `affiliate_type` ('CPF' ou 'CNPJ')
  - Gerar `referral_code` único para o afiliado
  - Armazenar `document` sem formatação (apenas números)
  - Retornar HTTP 201 com dados do afiliado criado
  - _Requirements: 4.3, 4.4, 7.6, 7.7_

- [x] 3.4 Implementar tratamento de erros na API
  - Retornar HTTP 400 para erros de validação
  - Retornar HTTP 409 para email/document duplicado
  - Retornar HTTP 500 para erros de servidor
  - Incluir mensagens descritivas em português
  - Incluir campo `field` no erro quando aplicável
  - Logar erros no console (sem expor dados sensíveis)
  - Implementar cleanup se criação de usuário suceder mas criação de afiliado falhar
  - _Requirements: 7.5_

- [x]* 3.5 Escrever testes para API de registro (OBRIGATÓRIO)
  - Testar registro válido de Individual com CPF
  - Testar registro válido de Logista com CNPJ
  - Testar erro para `affiliate_type` inválido
  - Testar erro para Individual com CNPJ (comprimento errado)
  - Testar erro para Logista com CPF (comprimento errado)
  - Testar erro para CPF com dígitos verificadores inválidos
  - Testar erro para CNPJ com dígitos verificadores inválidos
  - Testar erro para email duplicado
  - Testar erro para document duplicado
  - Verificar que `financial_status` é sempre 'financeiro_pendente'
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

---

## Phase 4: Frontend Update

### Objetivo
Atualizar formulário de cadastro e criar componente de status banner.

- [x] 4.1 Atualizar componente CadastroAfiliado
  - Abrir arquivo `src/pages/afiliados/AfiliadosCadastro.tsx`
  - Adicionar campo de seleção "Tipo de Afiliado" com opções:
    - "Individual (Pessoa Física)" → value: 'individual'
    - "Logista (Loja Física)" → value: 'logista'
  - Adicionar campo de documento condicional:
    - Se `affiliateType='individual'`: mostrar campo "CPF" com máscara XXX.XXX.XXX-XX
    - Se `affiliateType='logista'`: mostrar campo "CNPJ" com máscara XX.XXX.XXX/XXXX-XX
  - Implementar validação client-side usando funções de `validators.ts`
  - Validar CPF quando tipo é Individual (11 dígitos, dígitos verificadores)
  - Validar CNPJ quando tipo é Logista (14 dígitos, dígitos verificadores, obrigatório)
  - Exibir mensagens de erro inline abaixo dos campos
  - Manter todos os campos existentes do formulário
  - Usar componentes shadcn/ui (Select, Input, Label)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

- [x] 4.2 Criar componente AffiliateStatusBanner
  - Criar arquivo `src/components/affiliates/AffiliateStatusBanner.tsx`
  - Receber props: `financialStatus` e `onConfigureWallet` (opcional)
  - Se `financialStatus='financeiro_pendente'`:
    - Exibir banner amarelo com ícone de alerta (usar Alert do shadcn/ui)
    - Mensagem: "Configure sua carteira digital para começar a receber comissões"
    - Botão "Configurar Wallet" (desabilitado na ETAPA 1)
  - Se `financialStatus='ativo'`: não renderizar nada
  - Usar variáveis CSS do design system
  - Adicionar transition-colors para interatividade
  - _Requirements: 8.3_

- [x] 4.3 Atualizar serviço de afiliados
  - Criar arquivo `src/services/affiliates.service.ts`
  - Adicionar função `registerAffiliate(data: RegisterAffiliateRequest): Promise<RegisterAffiliateResponse>`
  - Fazer chamada POST para `/api/affiliates?action=register`
  - Incluir todos os campos: name, email, phone, password, affiliate_type, document, referral_code
  - Tratar erros da API e retornar mensagens amigáveis
  - Adicionar tipos TypeScript para request e response
  - _Requirements: 7.7_

- [x]* 4.4 Escrever testes para componentes (OBRIGATÓRIO)
  - Testar que campo CPF aparece quando Individual é selecionado
  - Testar que campo CNPJ aparece quando Logista é selecionado
  - Testar validação de CPF no formulário
  - Testar validação de CNPJ no formulário
  - Testar exibição de mensagens de erro
  - Testar submissão do formulário com dados válidos
  - Testar que AffiliateStatusBanner aparece quando status é pendente
  - Testar que AffiliateStatusBanner não aparece quando status é ativo
  - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6, 8.3_

---

## Phase 5: Status Restrictions

### Objetivo
Implementar restrições de funcionalidades para afiliados com status financeiro pendente.

- [x] 5.1 Atualizar lógica de comissões
  - Identificar arquivo que processa comissões (`src/services/affiliates/commission-calculator.service.ts`)
  - Adicionar verificação de `financial_status` antes de processar comissão
  - Se `financial_status='financeiro_pendente'`: pular afiliado no split
  - Logar afiliados pulados para auditoria
  - Garantir que soma de comissões continua correta (redistribuir se necessário)
  - _Requirements: 8.1, 8.5_

- [x] 5.2 Atualizar geração de link de indicação
  - Identificar endpoint que gera link de indicação (`api/affiliates.js?action=referral-link`)
  - Adicionar verificação de `financial_status` antes de gerar link
  - Se `financial_status='financeiro_pendente'`: retornar erro HTTP 403
  - Mensagem de erro: "Configure sua carteira digital para gerar link de indicação"
  - Se `financial_status='ativo'`: gerar link normalmente
  - _Requirements: 8.2_

- [x] 5.3 Atualizar dashboard de afiliados
  - Abrir arquivo do dashboard (`src/pages/afiliados/dashboard/Inicio.tsx`)
  - Adicionar componente AffiliateStatusBanner no topo do dashboard
  - Passar `financialStatus` do afiliado logado como prop
  - Desabilitar botões/funcionalidades relacionadas a comissões se status pendente
  - Exibir mensagens explicativas quando funcionalidades estão desabilitadas
  - Manter todas as outras funcionalidades do dashboard
  - _Requirements: 8.3_

- [x]* 5.4 Escrever testes de integração para restrições (OBRIGATÓRIO)
  - Testar que afiliado com status pendente não recebe comissões
  - Testar que afiliado com status pendente não pode gerar link de indicação
  - Testar que afiliado com status ativo pode receber comissões
  - Testar que afiliado com status ativo pode gerar link de indicação
  - Testar que banner aparece no dashboard para status pendente
  - Testar que funcionalidades estão desabilitadas para status pendente
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

---

## Phase 6: Testing & Validation

### Objetivo
Executar suite completa de testes e validar que não há breaking changes.

- [ ] 6.1 Executar suite completa de testes automatizados
  - Executar todos os unit tests: `npm run test`
  - Executar todos os property tests (fast-check)
  - Executar todos os integration tests
  - Executar todos os component tests
  - Verificar que todos os testes passam
  - Verificar cobertura de código > 70% (crítico > 90%)
  - Corrigir qualquer teste que falhar
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6.2 Realizar testes manuais do fluxo de registro
  - Testar registro de Individual com CPF válido
  - Testar registro de Logista com CNPJ válido
  - Testar validação de CPF inválido (deve mostrar erro)
  - Testar validação de CNPJ inválido (deve mostrar erro)
  - Testar registro com email duplicado (deve mostrar erro)
  - Testar registro com document duplicado (deve mostrar erro)
  - Verificar que `financial_status` é 'financeiro_pendente' após registro
  - Verificar que banner de status aparece no dashboard
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 6.3 Verificar compatibilidade com funcionalidades existentes
  - Testar login de afiliado existente (deve funcionar normalmente)
  - Testar acesso ao dashboard de afiliado existente
  - Testar sistema de comissões com afiliados existentes
  - Testar geração de link de indicação (deve estar bloqueado para todos)
  - Verificar que políticas RLS continuam funcionando
  - Verificar que nenhuma funcionalidade existente foi quebrada
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6.4 Realizar testes de performance
  - Verificar tempo de resposta da API de registro (< 500ms p95)
  - Verificar tempo de validação de documento (< 50ms)
  - Verificar tempo de queries no banco com novos índices (< 100ms)
  - Verificar que índices estão sendo usados (EXPLAIN ANALYZE)
  - Monitorar uso de memória e CPU
  - Verificar que não há degradação de performance
  - _Requirements: 1.4_

---

## Phase 7: Documentation & Deployment

### Objetivo
Atualizar documentação e fazer deploy para produção.

- [ ] 7.1 Atualizar documentação do projeto
  - Atualizar documentação da API com novo endpoint de registro
  - Atualizar schema do banco de dados com novos campos e ENUMs
  - Criar guia de migration para referência futura
  - Atualizar README com informações sobre tipos de afiliados
  - Documentar funções de validação de CPF/CNPJ
  - Adicionar exemplos de uso da API
  - _Requirements: Todos_

- [ ] 7.2 Preparar deployment
  - Revisar todas as alterações de código
  - Criar checklist de deployment
  - Preparar plano de rollback detalhado
  - Verificar que todas as variáveis de ambiente estão configuradas
  - Agendar janela de deployment (se necessário)
  - Notificar stakeholders sobre deployment
  - _Requirements: Todos_

- [ ] 7.3 Fazer deploy para produção
  - Fazer commit e push das alterações (frontend e backend)
  - Verificar que Vercel fez deploy automático do frontend
  - Verificar que Vercel fez deploy automático do backend (Serverless Functions)
  - Verificar que não há erros nos logs do Vercel
  - Verificar que site está acessível
  - Verificar que API está respondendo
  - _Requirements: Todos_

- [ ] 7.4 Realizar verificação pós-deployment
  - Testar fluxo de registro em produção (Individual e Logista)
  - Verificar que afiliados existentes não foram afetados
  - Testar login de afiliado existente
  - Verificar que dashboard funciona normalmente
  - Monitorar logs de erro por 24 horas
  - Verificar métricas de performance
  - Coletar feedback inicial de usuários
  - Documentar qualquer problema encontrado
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

---

## Checkpoint Final

- [ ] 8. Verificar conclusão da ETAPA 1
  - Todos os 10 requirements implementados e testados
  - Migration aplicada com sucesso (zero perda de dados)
  - Todos os 23 afiliados existentes migrados corretamente
  - Formulário de cadastro funcionando para ambos os tipos
  - Validação de CPF e CNPJ funcionando (property tests passando)
  - API de registro funcionando com validação completa
  - Restrições de status financeiro implementadas
  - Todos os testes automatizados passando
  - Zero breaking changes no sistema existente
  - Zero erros de TypeScript/ESLint
  - Documentação atualizada
  - Deploy em produção concluído e verificado
  - Sistema funcionando normalmente em produção

---

## Notes

### Ordem de Execução
As fases devem ser executadas na ordem apresentada, pois há dependências entre elas:
- Phase 1 (Database) deve ser concluída antes de Phase 3 (API)
- Phase 2 (Validation) deve ser concluída antes de Phase 3 (API) e Phase 4 (Frontend)
- Phase 3 (API) deve ser concluída antes de Phase 4 (Frontend)
- Phase 5 (Restrictions) depende de Phase 3 e Phase 4
- Phase 6 (Testing) deve ser executada após todas as implementações
- Phase 7 (Deployment) é a fase final

### Tasks de Testes (OBRIGATÓRIAS)
**IMPORTANTE:** As tasks marcadas com `*` (2.3, 2.4, 3.5, 4.4, 5.4) devem ser tratadas como OBRIGATÓRIAS. Nenhuma fase pode ser considerada concluída sem os testes correspondentes.

Todos os testes são essenciais para garantir qualidade e confiabilidade do sistema:
- Testes property-based (2.3) - OBRIGATÓRIO
- Testes unitários (2.4) - OBRIGATÓRIO
- Testes de API (3.5) - OBRIGATÓRIO
- Testes de componentes (4.4) - OBRIGATÓRIO
- Testes de integração (5.4) - OBRIGATÓRIO

### Checkpoints
Há checkpoints implícitos ao final de cada fase. Sempre que completar uma fase:
1. Executar testes relacionados
2. Verificar que não há erros
3. Fazer commit das alterações
4. Documentar qualquer problema encontrado

### Suporte
Se encontrar problemas durante a implementação:
1. Consultar o design.md para detalhes técnicos
2. Consultar o requirements.md para requisitos específicos
3. Verificar logs de erro no Supabase e Vercel
4. Reportar problemas ao usuário se não conseguir resolver

### Próximas Etapas
Após conclusão da ETAPA 1, as próximas etapas serão:
- ETAPA 2: Configuração de Wallet
- ETAPA 3: Produtos Show Row
- ETAPA 4: Perfil de Loja e Vitrine
- ETAPA 5: Sistema de Monetização
