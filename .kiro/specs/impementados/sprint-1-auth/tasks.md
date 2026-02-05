# Implementation Plan - Sprint 1: Autenticação e Gestão de Usuários

## Task List

- [x] 1. Criar estrutura de banco de dados


  - Criar migration para tabela profiles com campos preparatórios para Sprint 4
  - Criar migration para tabela user_roles com enum de roles
  - Criar migration para tabela auth_logs para auditoria
  - Implementar função update_updated_at_column() se não existir
  - _Requirements: 5.1, 8.1, 8.2, 8.3, 9.1, 11.1, 12.1_

- [x] 2. Implementar políticas RLS

  - [x] 2.1 Criar políticas RLS para tabela profiles

    - Política para usuários visualizarem próprio perfil
    - Política para usuários atualizarem próprio perfil
    - Política para admins visualizarem todos os perfis
    - Política para sistema inserir perfis
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 2.2 Criar políticas RLS para tabela user_roles

    - Política para usuários visualizarem próprias roles
    - Política para admins gerenciarem roles
    - _Requirements: 6.3, 6.4, 9.1, 9.2, 9.3_
  
  - [x] 2.3 Criar políticas RLS para tabela auth_logs

    - Política para admins visualizarem logs
    - Política para sistema inserir logs
    - _Requirements: 9.1, 12.1, 12.2, 12.3_

- [x] 3. Implementar triggers e funções de sincronização

  - [x] 3.1 Criar trigger para auto-criação de profile

    - Função handle_new_user() que cria profile automaticamente
    - Trigger on_auth_user_created em auth.users
    - Atribuição automática de role 'cliente'
    - _Requirements: 11.1, 6.1_
  
  - [x] 3.2 Criar função de sincronização de email

    - Sincronizar alterações de email entre auth.users e profiles
    - _Requirements: 11.2_
  
  - [x] 3.3 Criar função de soft delete

    - Implementar soft delete quando usuário é removido do auth
    - _Requirements: 11.3_

- [x] 4. Implementar schemas de validação Zod

  - [x] 4.1 Criar schemas de autenticação


    - registerSchema (email, password, full_name, phone)
    - loginSchema (email, password)
    - forgotPasswordSchema (email)
    - _Requirements: 1.4, 2.4, 4.4, 10.1, 10.2_
  
  - [x] 4.2 Criar schemas de perfil


    - updateProfileSchema (full_name, phone, avatar_url)
    - Validações de formato de email e telefone
    - _Requirements: 5.2, 5.4, 10.1, 10.2_
  
  - [x] 4.3 Criar tipos TypeScript


    - Interface UserProfile
    - Interface AuthResponse
    - Interface Session
    - Enum Role
    - _Requirements: 10.4_

- [x] 5. Implementar serviços de autenticação

  - [x] 5.1 Criar AuthService


    - Método getUserProfile() para buscar perfil completo com roles
    - Método updateProfile() para atualizar dados do usuário
    - Método assignRole() para gerenciar roles
    - Método logAuthEvent() para registrar eventos de auditoria
    - _Requirements: 5.1, 5.3, 5.5, 6.5, 12.1, 12.4_
  
  - [x] 5.2 Criar funções utilitárias de erro


    - handleAuthError() para tratamento padronizado de erros
    - Mapeamento de erros do Supabase para mensagens amigáveis
    - Formato padronizado de resposta de erro
    - _Requirements: 10.3, 10.4, 10.5_
  
  - [x] 5.3 Criar logger estruturado


    - Implementar Logger class com métodos info, warn, error
    - Formato JSON estruturado para logs
    - _Requirements: 12.5_

- [x] 6. Implementar middlewares de segurança

  - [x] 6.1 Criar middleware requireAuth


    - Extrair e validar JWT token do header Authorization
    - Verificar validade do token com Supabase
    - Buscar perfil e roles do usuário
    - Adicionar dados do usuário ao request object
    - Registrar tentativas de acesso inválido
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 6.2 Criar middleware requireRole


    - Verificar se usuário tem role necessária
    - Retornar erro 403 se não autorizado
    - Registrar tentativas de acesso não autorizado
    - _Requirements: 6.3, 6.4, 6.5_
  
  - [x] 6.3 Implementar rate limiting


    - Configurar rate limiter para rotas de autenticação
    - Limitar tentativas de login por IP
    - _Requirements: 2.5_

- [x] 7. Implementar controllers de autenticação

  - [x] 7.1 Criar controller de registro


    - POST /api/auth/register
    - Validar dados com registerSchema
    - Criar usuário no Supabase Auth
    - Verificar criação automática de profile via trigger
    - Retornar JWT token e dados do usuário
    - Registrar evento de registro
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 7.2 Criar controller de login

    - POST /api/auth/login
    - Validar credenciais com loginSchema
    - Autenticar via Supabase Auth
    - Buscar perfil completo com roles
    - Retornar JWT token e dados do usuário
    - Registrar evento de login (sucesso ou falha)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1, 12.2_
  
  - [x] 7.3 Criar controller de logout

    - POST /api/auth/logout
    - Validar token JWT
    - Invalidar sessão no Supabase
    - Revogar refresh token
    - Registrar evento de logout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [x] 7.4 Criar controller de recuperação de senha

    - POST /api/auth/forgot-password
    - Validar email com forgotPasswordSchema
    - Enviar email de recuperação via Supabase Auth
    - Retornar sucesso mesmo se email não existir (segurança)
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [x] 7.5 Criar controller de perfil atual

    - GET /api/auth/me
    - Validar token JWT via middleware
    - Buscar e retornar perfil completo do usuário
    - Incluir roles e status de afiliado
    - _Requirements: 5.1, 8.1, 8.2, 8.3_

- [x] 8. Implementar controllers de gestão de usuários

  - [x] 8.1 Criar controller de atualização de perfil


    - PUT /api/users/profile
    - Validar token via middleware requireAuth
    - Validar dados com updateProfileSchema
    - Atualizar perfil no banco
    - Retornar perfil atualizado
    - Registrar evento de atualização
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 12.4_
  
  - [x] 8.2 Criar controller de gestão de roles (admin)

    - POST /api/admin/users/:id/roles - atribuir role
    - DELETE /api/admin/users/:id/roles/:role - remover role
    - Validar que apenas admins podem acessar
    - Validar que role existe no enum
    - Registrar alteração de role
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 12.3_

- [x] 9. Configurar rotas da API

  - [x] 9.1 Criar arquivo de rotas de autenticação


    - Definir rotas POST /api/auth/register, /login, /logout, /forgot-password
    - Definir rota GET /api/auth/me com middleware requireAuth
    - Aplicar rate limiting nas rotas de auth
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  
  - [x] 9.2 Criar arquivo de rotas de usuários


    - Definir rota PUT /api/users/profile com middleware requireAuth
    - _Requirements: 5.2_
  
  - [x] 9.3 Criar arquivo de rotas administrativas


    - Definir rotas de gestão de roles com middlewares requireAuth e requireRole(['admin'])
    - GET /api/admin/users - listar usuários
    - POST /api/admin/users/:id/roles
    - DELETE /api/admin/users/:id/roles/:role
    - _Requirements: 6.3, 6.4_
  
  - [x] 9.4 Integrar rotas no servidor Express


    - Importar e registrar todas as rotas no app principal
    - Configurar prefixo /api
    - Aplicar middlewares globais (cors, helmet, json parser)
    - _Requirements: Integração geral_

- [x] 10. Aplicar migrations e validar banco de dados

  - [x] 10.1 Executar migrations no Supabase

    - Aplicar migration de criação de tabelas
    - Aplicar migration de políticas RLS
    - Aplicar migration de triggers e funções
    - Verificar que não há erros
    - _Requirements: 9.5_
  
  - [x] 10.2 Validar estrutura do banco

    - Verificar que tabelas foram criadas corretamente
    - Verificar que índices existem
    - Verificar que constraints estão ativos
    - Verificar que campos preparatórios para Sprint 4 existem
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 10.3 Testar triggers

    - Criar usuário de teste via Supabase Auth
    - Verificar criação automática de profile
    - Verificar atribuição automática de role 'cliente'
    - _Requirements: 11.1, 6.1_
  
  - [x] 10.4 Testar políticas RLS

    - Criar múltiplos usuários de teste
    - Verificar isolamento de dados entre usuários
    - Verificar acesso de admin a todos os dados
    - Verificar que usuários não acessam dados de outros
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 11. Validar funcionalidades end-to-end

  - [x] 11.1 Testar fluxo de registro


    - Registrar usuário com dados válidos
    - Verificar retorno de JWT token
    - Verificar criação de profile
    - Verificar atribuição de role padrão
    - Tentar registrar com email duplicado
    - Tentar registrar com dados inválidos
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [x] 11.2 Testar fluxo de login/logout

    - Login com credenciais válidas
    - Verificar retorno de JWT e dados do usuário
    - Verificar que roles estão incluídas
    - Tentar login com credenciais inválidas
    - Fazer logout e verificar invalidação de sessão
    - Tentar usar token após logout
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_
  
  - [x] 11.3 Testar gestão de perfil

    - Visualizar próprio perfil via GET /api/auth/me
    - Atualizar dados do perfil
    - Verificar que campos preparatórios existem (wallet_id, is_affiliate, affiliate_status)
    - Tentar acessar perfil de outro usuário (deve falhar)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3_
  
  - [x] 11.4 Testar sistema de roles

    - Verificar role padrão 'cliente' em novo usuário
    - Admin atribuir role 'vendedor' a usuário
    - Verificar que usuário com role 'vendedor' acessa recursos apropriados
    - Tentar acessar recurso admin sem permissão (deve retornar 403)
    - Verificar registro de alteração de role nos logs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [x] 11.5 Testar recuperação de senha

    - Solicitar recuperação com email válido
    - Verificar envio de email (logs do Supabase)
    - Solicitar recuperação com email inexistente (deve retornar sucesso por segurança)
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 11.6 Testar auditoria

    - Verificar registro de login bem-sucedido
    - Verificar registro de login falhado
    - Verificar registro de alteração de role
    - Verificar que logs contêm IP e user agent
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 12. Documentar APIs e preparar para próximo sprint


  - [x] 12.1 Criar documentação de endpoints


    - Documentar cada endpoint com request/response examples
    - Documentar códigos de erro possíveis
    - Documentar headers necessários
    - Incluir exemplos de uso com curl
    - _Requirements: Documentação geral_
  
  - [x] 12.2 Atualizar README do projeto


    - Adicionar seção de autenticação
    - Explicar sistema de roles
    - Guia de como usar as APIs
    - _Requirements: Documentação geral_
  
  - [x] 12.3 Validar preparação para Sprint 4

    - Confirmar que campos wallet_id, is_affiliate, affiliate_status existem
    - Confirmar que índices para afiliados foram criados
    - Confirmar que estrutura é extensível
    - Documentar campos preparatórios
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [x] 12.4 Criar dados de seed para desenvolvimento


    - Criar script de seed com usuários de teste
    - Incluir usuários com diferentes roles
    - Incluir perfis completos
    - _Requirements: Preparação para desenvolvimento_

## Notas de Implementação

### Ordem de Execução Recomendada

1. **Tasks 1-3:** Estrutura de banco (tabelas, RLS, triggers) - Base sólida
2. **Task 4:** Validações e tipos - Segurança de dados
3. **Task 5:** Serviços - Lógica de negócio
4. **Task 6:** Middlewares - Proteção de rotas
5. **Tasks 7-8:** Controllers - Endpoints da API
6. **Task 9:** Rotas - Exposição da API
7. **Task 10:** Aplicação e validação de banco
8. **Task 11:** Testes end-to-end
9. **Task 12:** Documentação e preparação

### Dependências Críticas

- Task 1 deve estar completa antes de Task 10
- Tasks 2-3 dependem de Task 1
- Task 6 deve estar completa antes de Task 9
- Tasks 7-8 dependem de Tasks 4-6
- Task 10 deve estar completa antes de Task 11
- Task 11 valida todas as tasks anteriores

### Validações Obrigatórias

- ✅ Todas as migrations aplicadas sem erro
- ✅ RLS ativo em todas as tabelas
- ✅ Triggers criando profiles automaticamente
- ✅ Todos os endpoints respondendo corretamente
- ✅ Middlewares de auth/authz funcionando
- ✅ Sistema de roles operacional
- ✅ Campos preparatórios para Sprint 4 criados e testados
- ✅ Logs de auditoria registrando eventos
- ✅ Validações Zod impedindo dados inválidos
- ✅ Políticas RLS protegendo dados adequadamente

### Preparações Críticas para Sprint 4 (Afiliados)

- ✅ Campo `wallet_id` em profiles (TEXT, nullable)
- ✅ Campo `is_affiliate` em profiles (BOOLEAN, default false)
- ✅ Campo `affiliate_status` em profiles (TEXT com CHECK constraint, nullable)
- ✅ Índice em `is_affiliate` para consultas rápidas
- ✅ Índice em `affiliate_status` para filtros
- ✅ Índice em `wallet_id` para lookups
- ✅ Estrutura extensível para árvore genealógica futura

### Pontos de Atenção

- **Segurança:** RLS deve ser testado rigorosamente com múltiplos cenários
- **Performance:** Índices devem ser criados antes de popular dados
- **Compatibilidade:** Estrutura deve ser extensível para Sprint 4 sem breaking changes
- **Auditoria:** Todos os eventos críticos devem ser logados com contexto completo
- **Validação:** Schemas Zod devem cobrir todos os edge cases
- **Sincronização:** Triggers devem manter consistência entre auth.users e profiles

### Critérios de Aceite do Sprint

#### Funcionalidades
- [ ] Usuário pode se registrar com sucesso
- [ ] Usuário pode fazer login e receber JWT token
- [ ] Usuário pode fazer logout e invalidar sessão
- [ ] Usuário pode recuperar senha via email
- [ ] Usuário pode visualizar próprio perfil
- [ ] Usuário pode atualizar dados do perfil
- [ ] Admin pode gerenciar roles de usuários
- [ ] Sistema atribui role 'cliente' por padrão

#### Técnico
- [ ] Todas as migrations aplicadas sem erro
- [ ] RLS ativo e testado em todas as tabelas
- [ ] Triggers criando profiles automaticamente
- [ ] Middlewares protegendo rotas adequadamente
- [ ] Validações Zod impedindo dados inválidos
- [ ] Logs de auditoria registrando eventos
- [ ] Campos preparatórios para Sprint 4 existem e funcionam

#### Segurança
- [ ] JWT tokens validados corretamente
- [ ] Usuários não acessam dados de outros
- [ ] Admins têm acesso apropriado
- [ ] Rate limiting protege contra ataques
- [ ] Senhas gerenciadas pelo Supabase Auth
- [ ] Dados sensíveis não expostos em logs ou respostas

#### Performance
- [ ] Índices criados para consultas frequentes
- [ ] Queries otimizadas
- [ ] Tempo de resposta < 500ms para endpoints
- [ ] RLS policies eficientes

#### Preparação Sprint 4
- [ ] Campo `wallet_id` existe e é nullable
- [ ] Campo `is_affiliate` existe com default false
- [ ] Campo `affiliate_status` existe com enum correto
- [ ] Índices para afiliados criados
- [ ] Estrutura compatível com árvore genealógica futura
- [ ] Documentação dos campos preparatórios

### Testes Mínimos Obrigatórios

#### Testes de Autenticação
- Registro com dados válidos
- Registro com email duplicado (deve falhar)
- Login com credenciais válidas
- Login com credenciais inválidas (deve falhar)
- Logout com token válido
- Acesso com token inválido (deve falhar)

#### Testes de Autorização
- Acesso a recurso protegido sem token (deve retornar 401)
- Acesso a recurso admin sem role admin (deve retornar 403)
- Admin acessando recurso protegido (deve funcionar)

#### Testes de RLS
- Usuário visualizando próprio perfil (deve funcionar)
- Usuário tentando visualizar perfil de outro (deve falhar)
- Admin visualizando qualquer perfil (deve funcionar)

#### Testes de Preparação Sprint 4
- Verificar que campos wallet_id, is_affiliate, affiliate_status existem
- Verificar que valores padrão estão corretos
- Verificar que índices foram criados
