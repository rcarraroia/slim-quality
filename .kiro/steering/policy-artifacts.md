# Política de Geração de Artefatos e Documentação

## 1. Foco e Prioridade do Agente (Kiro)

O objetivo primário do Agente de Desenvolvimento (Kiro) é a **implementação, correção e evolução do código-fonte** do sistema. A produção de documentação e artefatos de configuração deve ser um processo **minimalista** e guiado pela necessidade explícita.

## 2. Controle de Redundância e Artefatos de Configuração

### 2.1. Proibição de Artefatos Redundantes

É estritamente proibida a criação de múltiplos arquivos que sirvam ao mesmo propósito funcional ou informativo.

**Exemplos de Redundância Proibida:**
- ❌ `.env`, `.env.example`, `.env.production.example`, `.env.staging.example`
- ❌ `README.md`, `LEIAME.md`, `DOCUMENTATION.md` com conteúdo similar
- ❌ `DEPLOY.md`, `DEPLOYMENT.md`, `PASSO_A_PASSO_DEPLOY.md` com instruções duplicadas

**Ação Correta:**
- ✅ Criar APENAS `.env.example` (template) e `.env` (local, no .gitignore)
- ✅ Consolidar documentação em um único arquivo por tópico
- ✅ Atualizar arquivo existente ao invés de criar novo

### 2.2. Verificação de Existência e Consulta Prévia

Antes de criar qualquer novo arquivo:

1. **Verificar:** Buscar arquivos com propósito idêntico ou similar
2. **Consultar:** Se encontrado, perguntar ao usuário:
   - "Encontrei `arquivo-existente.md` com conteúdo similar. Deseja que eu ATUALIZE este arquivo ao invés de criar um novo?"
3. **Decidir:** Só criar novo arquivo se explicitamente solicitado

## 3. Prioridade de Comunicação e Explicações

### 3.1. Explicações no Chat (Padrão)

**SEMPRE explicar diretamente no chat:**
- ✅ Passos executados
- ✅ Problemas encontrados e soluções
- ✅ Instruções de uso
- ✅ Comandos para executar
- ✅ Configurações necessárias

### 3.2. Documentação em Arquivo (Exceções)

Criar arquivo de documentação APENAS quando:
- ✅ Usuário solicitar explicitamente
- ✅ Informação precisa ser versionada no Git
- ✅ Conteúdo será consultado frequentemente pela equipe
- ✅ Documentação de API pública
- ✅ Guias de setup inicial do projeto

## 4. Casos Específicos do Projeto Slim Quality

### 4.1. Variáveis de Ambiente

**Arquivos Permitidos:**
- `.env.example` - Template versionado no Git
- `.env` - Local, não versionado (no .gitignore)

**Proibido:**
- `.env.production.example`
- `.env.staging.example`
- `.env.development.example`

**Razão:** Todas as variáveis devem estar documentadas no `.env.example` único, com comentários indicando qual ambiente usa cada variável.

### 4.2. Documentação de Deploy

**Arquivo Único:**
- `docs/PASSO_A_PASSO_DEPLOY.md` - Guia completo de deploy

**Proibido:**
- `DEPLOY.md`
- `DEPLOYMENT.md`
- `VERCEL_DEPLOY.md`
- Múltiplos guias de deploy

### 4.3. Documentação de API

**Estrutura Permitida:**
- `docs/API.md` - Documentação geral da API
- `docs/API_AUTH.md` - Específico de autenticação (se muito extenso)

**Evitar:**
- Criar um arquivo `.md` para cada endpoint
- Duplicar informação que já está em comentários JSDoc no código

## 5. Fluxo de Trabalho Recomendado

### Ao Completar uma Tarefa:

1. **Executar o código** ✅
2. **Explicar no chat** o que foi feito ✅
3. **Perguntar ao usuário** se deseja documentação adicional ❓
4. **Criar documentação** APENAS se solicitado 📝

### Exemplo de Resposta Ideal:

```
✅ Corrigi os erros de deploy:
1. Adicionei dependências Radix UI faltando
2. Corrigi variáveis de ambiente para Vite
3. Ajustei configuração do Vercel

Para testar:
- Acesse: https://seu-site.vercel.app
- Configure as variáveis de ambiente no Vercel Dashboard

Deseja que eu crie um documento detalhando esses passos?
```

## 6. Resumos e Conclusões

### Formato de Resumo Final:

**Minimalista (Preferido):**
```
Corrigi 3 problemas de deploy. Site deve funcionar agora.
Configure as variáveis de ambiente no Vercel.
```

**Evitar (Verboso):**
```
# Resumo Completo do Trabalho Realizado

## Problemas Identificados
- Problema 1: Descrição longa...
- Problema 2: Descrição longa...

## Soluções Implementadas
- Solução 1: Passo a passo detalhado...
- Solução 2: Passo a passo detalhado...

## Próximos Passos
- [ ] Passo 1
- [ ] Passo 2
...
```

## 7. Checklist de Validação

Antes de criar qualquer arquivo, perguntar:

- [ ] Este arquivo já existe com outro nome?
- [ ] Esta informação pode ser adicionada a um arquivo existente?
- [ ] O usuário solicitou explicitamente este arquivo?
- [ ] Esta informação precisa estar versionada no Git?
- [ ] Não posso simplesmente explicar isso no chat?

**Se 3 ou mais respostas forem "NÃO", NÃO CRIAR O ARQUIVO.**

---

**Política ativa desde:** 11/11/2025  
**Aplicável a:** Todos os agentes de desenvolvimento (Kiro)  
**Revisão:** Trimestral ou quando solicitado
