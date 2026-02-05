# Implementation Plan: Sistema de Autenticação de Clientes

## Overview

Este plano implementa o sistema de autenticação unificado para clientes e afiliados, separando o login de administradores, criando o dashboard do cliente, e substituindo os mocks do dashboard de afiliados por dados reais.

## Tasks

- [x] 1. Preparação do Banco de Dados
  - [x] 1.1 Adicionar coluna `user_id` na tabela `customers`
    - Executar migration via Supabase Power
    - Criar índice para busca por `user_id`
    - _Requirements: 4.1_

- [x] 2. Criar Customer Auth Service
  - [x] 2.1 Criar `src/services/customer-auth.service.ts`
    - Implementar login, logout, register
    - Implementar registerWithAffiliate (cria cliente + afiliado)
    - Implementar isAuthenticated, getCurrentUser, getStoredUser
    - Implementar resetPassword
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 2.2 Criar hook `src/hooks/useCustomerAuth.ts`
    - Gerenciar estado de autenticação do cliente
    - Verificar se cliente é afiliado
    - _Requirements: 10.5, 10.6_

- [x] 3. Checkpoint - Verificar serviço de autenticação
  - Testar login/logout/register manualmente
  - Verificar criação de records no banco

- [x] 4. Separar Login Admin
  - [x] 4.1 Criar página `/admin/login` (`src/pages/admin/AdminLogin.tsx`)
    - Copiar estrutura do Login atual
    - Usar adminAuthService
    - Redirecionar para /dashboard após login
    - _Requirements: 1.1, 1.2_
  
  - [x] 4.2 Modificar página `/login` para redirecionar para `/entrar`
    - Criar redirect simples
    - _Requirements: 1.5_
  
  - [x] 4.3 Atualizar rotas em `App.tsx`
    - Adicionar rota `/admin/login`
    - Adicionar redirect de `/login` para `/entrar`
    - _Requirements: 1.1, 1.5_

- [x] 5. Criar Login de Clientes
  - [x] 5.1 Criar página `/entrar` (`src/pages/CustomerLogin.tsx`)
    - Formulário de login (email/senha)
    - Link para criar conta
    - Link para recuperar senha
    - Usar customerAuthService
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 5.2 Implementar formulário de cadastro na mesma página
    - Campos: nome, email, telefone, senha
    - Criar auth.users + customers
    - Vincular customer com user_id
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_
  
  - [x] 5.3 Implementar merge de customer existente
    - Se email já existe em customers sem user_id, atualizar
    - _Requirements: 4.4_
  
  - [x] 5.4 Atualizar Header para usar `/entrar`
    - Mudar link "Entrar" para `/entrar`
    - _Requirements: 2.7_

- [x] 6. Checkpoint - Testar login de clientes
  - Testar cadastro de novo cliente
  - Testar login com cliente existente
  - Testar merge de customer sem user_id

- [x] 7. Criar Dashboard do Cliente
  - [x] 7.1 Criar layout `src/layouts/CustomerDashboardLayout.tsx`
    - Menu lateral com: Início, Meus Pedidos, Meus Dados
    - Verificar se cliente é afiliado para mostrar menu extra
    - Botão "Quero Ser Afiliado" se não for afiliado
    - _Requirements: 5.3, 5.4, 5.5_
  
  - [x] 7.2 Criar página inicial `/minha-conta` (`src/pages/minha-conta/Inicio.tsx`)
    - Resumo de pedidos recentes
    - Cards com informações do cliente
    - _Requirements: 5.1, 5.2_
  
  - [x] 7.3 Criar página `/minha-conta/pedidos` (`src/pages/minha-conta/Pedidos.tsx`)
    - Lista de pedidos do cliente
    - Buscar por customer_id (via user_id)
    - Empty state se não houver pedidos
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 7.4 Criar página `/minha-conta/dados` (`src/pages/minha-conta/Dados.tsx`)
    - Formulário de edição de perfil
    - Salvar alterações em customers
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 7.5 Atualizar rotas em `App.tsx`
    - Adicionar rotas `/minha-conta/*`
    - Usar CustomerDashboardLayout
    - _Requirements: 5.1_

- [x] 8. Checkpoint - Testar dashboard do cliente
  - Verificar navegação entre páginas
  - Verificar exibição de pedidos
  - Verificar edição de perfil

- [x] 9. Implementar Ativação de Afiliado
  - [x] 9.1 Criar método `activateAffiliate` no affiliateService
    - Criar registro em affiliates com user_id do cliente
    - Gerar referral_code único
    - Status inicial: pending
    - _Requirements: 8.4, 8.5, 8.6_
  
  - [x] 9.2 Criar modal de confirmação no CustomerDashboardLayout
    - Explicar benefícios do programa
    - Botões Confirmar/Cancelar
    - Chamar activateAffiliate ao confirmar
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 9.3 Atualizar menu após ativação
    - Esconder botão "Quero Ser Afiliado"
    - Mostrar "Painel de Afiliado"
    - _Requirements: 8.7, 8.8_

- [x] 10. Atualizar Cadastro de Afiliado Público
  - [x] 10.1 Modificar `/afiliados/cadastro` para criar cliente + afiliado
    - Usar customerAuthService.registerWithAffiliate
    - Criar auth.users + customers + affiliates
    - Vincular com referrer se houver código
    - _Requirements: 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 11. Checkpoint - Testar fluxos de afiliado
  - Testar ativação de afiliado por cliente
  - Testar cadastro público de afiliado
  - Verificar vinculação com referrer

- [x] 12. Implementar Proteção de Rotas
  - [x] 12.1 Criar guard para rotas de cliente
    - Verificar autenticação de cliente
    - Redirecionar para /entrar se não autenticado
    - _Requirements: 12.1_
  
  - [x] 12.2 Criar guard para rotas de afiliado
    - Verificar se cliente é afiliado
    - Redirecionar para /minha-conta se não for afiliado
    - _Requirements: 12.4_
  
  - [x] 12.3 Atualizar guard de admin
    - Redirecionar para /admin/login (não /login)
    - _Requirements: 12.3_
  
  - [x] 12.4 Aplicar guards nas rotas em App.tsx
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 13. Substituir Mocks no Dashboard de Afiliado
  - [x] 13.1 Atualizar `getNetwork()` para buscar dados reais
    - Query em affiliate_network e affiliates
    - Buscar por user_id do afiliado logado
    - _Requirements: 11.2_
  
  - [x] 13.2 Atualizar `getCommissions()` para buscar dados reais
    - Query em commissions
    - Buscar por affiliate_id
    - _Requirements: 11.3_
  
  - [ ] 13.3 Atualizar `getWithdrawals()` para buscar dados reais
    - Query em withdrawals (ou tabela equivalente)
    - Buscar por affiliate_id
    - _Requirements: 11.4_
  
  - [x] 13.4 Atualizar `checkAffiliateStatus()` para buscar dados reais
    - Query em affiliates por user_id
    - _Requirements: 11.5_
  
  - [x] 13.5 Implementar empty states nas páginas
    - Mostrar mensagem quando não houver dados
    - _Requirements: 11.6_

- [x] 14. Checkpoint Final
  - Testar todos os fluxos de autenticação
  - Verificar proteção de rotas
  - Verificar dados reais no dashboard de afiliado
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada task referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- A ordem das tasks garante que dependências sejam resolvidas antes
