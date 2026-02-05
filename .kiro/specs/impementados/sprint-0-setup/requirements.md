# Requirements Document - Sprint 0: Setup e Infraestrutura Base

## Introduction

Este documento define os requisitos para o Sprint 0 do projeto Slim Quality Backend. O objetivo é estabelecer a fundação técnica completa do projeto, incluindo configuração do ambiente de desenvolvimento, estrutura de pastas, ferramentas de qualidade de código e migrations base do banco de dados.

## Glossary

- **Sistema**: Slim Quality Backend
- **Supabase**: Backend-as-a-Service (BaaS) utilizado para banco de dados PostgreSQL, autenticação e storage
- **Migration**: Arquivo SQL versionado que define mudanças na estrutura do banco de dados
- **RLS**: Row Level Security - sistema de segurança do PostgreSQL que controla acesso a linhas de tabelas
- **TypeScript**: Linguagem de programação tipada baseada em JavaScript
- **ESLint**: Ferramenta de análise estática de código para identificar padrões problemáticos
- **Prettier**: Formatador de código opinativo
- **Vitest**: Framework de testes unitários para JavaScript/TypeScript

## Requirements

### Requirement 1: Configuração do Projeto Node.js

**User Story:** Como desenvolvedor, eu quero um projeto Node.js com TypeScript configurado, para que eu possa desenvolver o backend com tipagem estática e ferramentas modernas.

#### Acceptance Criteria

1. WHEN o desenvolvedor executa `npm install`, THE Sistema SHALL instalar todas as dependências necessárias sem erros
2. WHEN o desenvolvedor executa `npm run dev`, THE Sistema SHALL iniciar o servidor de desenvolvimento com hot-reload
3. WHEN o desenvolvedor executa `npm run build`, THE Sistema SHALL compilar o código TypeScript para JavaScript na pasta `dist/`
4. WHEN o desenvolvedor executa `npm run lint`, THE Sistema SHALL verificar o código com ESLint e reportar erros
5. WHEN o desenvolvedor executa `npm run format`, THE Sistema SHALL formatar o código com Prettier

### Requirement 2: Estrutura de Pastas

**User Story:** Como desenvolvedor, eu quero uma estrutura de pastas organizada e padronizada, para que eu possa localizar facilmente arquivos e manter o código organizado.

#### Acceptance Criteria

1. THE Sistema SHALL criar a estrutura de pastas conforme definido em `structure.md`
2. THE Sistema SHALL incluir pastas para `src/`, `tests/`, `scripts/`, `docs/` e `supabase/`
3. WHEN um desenvolvedor navega pela estrutura, THE Sistema SHALL ter arquivos `.gitkeep` em pastas vazias para manter a estrutura no Git
4. THE Sistema SHALL ter arquivos README.md em pastas principais explicando seu propósito

### Requirement 3: Configuração do Supabase

**User Story:** Como desenvolvedor, eu quero o Supabase configurado e linkado ao projeto, para que eu possa criar migrations e acessar o banco de dados.

#### Acceptance Criteria

1. WHEN o desenvolvedor executa `supabase projects list`, THE Sistema SHALL mostrar o projeto Slim Quality linkado
2. THE Sistema SHALL ter arquivo `supabase/config.toml` configurado corretamente
3. WHEN o desenvolvedor executa `supabase db push`, THE Sistema SHALL aplicar migrations sem erros
4. THE Sistema SHALL ter credenciais configuradas no arquivo `.env`

### Requirement 4: Migration Base

**User Story:** Como desenvolvedor, eu quero uma migration base com funções auxiliares, para que eu possa usar funcionalidades comuns em todas as tabelas futuras.

#### Acceptance Criteria

1. THE Sistema SHALL criar migration `20250101000000_initial_setup.sql`
2. THE Sistema SHALL incluir função `update_updated_at_column()` para atualizar timestamps automaticamente
3. THE Sistema SHALL habilitar extensões `uuid-ossp` e `pgcrypto`
4. WHEN a migration é aplicada, THE Sistema SHALL executar sem erros
5. WHEN uma tabela usa a função `update_updated_at_column()`, THE Sistema SHALL atualizar `updated_at` automaticamente em UPDATEs

### Requirement 5: Configurações de Qualidade de Código

**User Story:** Como desenvolvedor, eu quero ferramentas de qualidade de código configuradas, para que eu possa manter padrões consistentes e evitar erros comuns.

#### Acceptance Criteria

1. THE Sistema SHALL ter arquivo `tsconfig.json` com configurações strict mode ativado
2. THE Sistema SHALL ter arquivo `.eslintrc.json` com regras recomendadas
3. THE Sistema SHALL ter arquivo `.prettierrc` com formatação padronizada
4. WHEN o desenvolvedor salva um arquivo, THE Sistema SHALL formatar automaticamente (se configurado no editor)
5. WHEN o desenvolvedor faz commit, THE Sistema SHALL executar lint e testes (se Husky configurado)

### Requirement 6: Variáveis de Ambiente

**User Story:** Como desenvolvedor, eu quero um sistema de variáveis de ambiente seguro, para que eu possa configurar credenciais sem expô-las no código.

#### Acceptance Criteria

1. THE Sistema SHALL ter arquivo `.env.example` com template de variáveis
2. THE Sistema SHALL ter arquivo `.env` no `.gitignore`
3. WHEN o desenvolvedor copia `.env.example` para `.env`, THE Sistema SHALL carregar variáveis corretamente
4. THE Sistema SHALL validar presença de variáveis obrigatórias na inicialização
5. THE Sistema SHALL ter variáveis para Supabase (URL, keys) e configurações da aplicação

### Requirement 7: Scripts de Desenvolvimento

**User Story:** Como desenvolvedor, eu quero scripts NPM padronizados, para que eu possa executar tarefas comuns facilmente.

#### Acceptance Criteria

1. THE Sistema SHALL ter script `dev` para desenvolvimento com hot-reload
2. THE Sistema SHALL ter script `build` para compilar TypeScript
3. THE Sistema SHALL ter script `start` para executar versão compilada
4. THE Sistema SHALL ter script `test` para executar testes
5. THE Sistema SHALL ter script `lint` para verificar código
6. THE Sistema SHALL ter script `format` para formatar código
7. THE Sistema SHALL ter scripts `db:*` para operações de banco de dados

### Requirement 8: Documentação Inicial

**User Story:** Como desenvolvedor, eu quero documentação básica do projeto, para que eu possa entender como configurar e usar o sistema.

#### Acceptance Criteria

1. THE Sistema SHALL ter arquivo `README.md` na raiz com instruções de setup
2. THE Sistema SHALL documentar como instalar dependências
3. THE Sistema SHALL documentar como configurar variáveis de ambiente
4. THE Sistema SHALL documentar scripts NPM disponíveis
5. THE Sistema SHALL incluir link para documentação completa em `docs/`

### Requirement 9: Configuração Git

**User Story:** Como desenvolvedor, eu quero o Git configurado corretamente, para que eu possa versionar o código sem incluir arquivos sensíveis.

#### Acceptance Criteria

1. THE Sistema SHALL ter arquivo `.gitignore` com regras apropriadas
2. THE Sistema SHALL ignorar `node_modules/`, `dist/`, `.env` e arquivos de cache
3. THE Sistema SHALL ter primeiro commit com estrutura base
4. WHEN o desenvolvedor executa `git status`, THE Sistema SHALL não mostrar arquivos sensíveis
5. THE Sistema SHALL ter mensagem de commit descritiva seguindo padrão

### Requirement 10: Validação do Setup

**User Story:** Como desenvolvedor, eu quero validar que o setup está correto, para que eu possa começar a desenvolver com confiança.

#### Acceptance Criteria

1. WHEN o desenvolvedor executa `npm run dev`, THE Sistema SHALL iniciar sem erros
2. WHEN o desenvolvedor executa `npm run build`, THE Sistema SHALL compilar sem erros
3. WHEN o desenvolvedor executa `npm run lint`, THE Sistema SHALL passar sem erros
4. WHEN o desenvolvedor executa `npm test`, THE Sistema SHALL executar testes (mesmo que vazios)
5. WHEN o desenvolvedor executa `supabase db push`, THE Sistema SHALL aplicar migrations com sucesso
