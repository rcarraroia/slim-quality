# 🚀 SOLICITAÇÃO TÉCNICA — SETUP GLOBAL DO KIRO
## Configuração de Skills e Steering Globais

> **Para o Kiro executar:** Leia este documento completo antes de iniciar qualquer ação.
> **Idioma:** Todas as respostas e comunicações em Português-BR.

---

## 📋 CONTEXTO

Este documento instrui o Kiro a criar a infraestrutura global de skills e steering que será aplicada automaticamente a todos os projetos futuros. O objetivo é eliminar a necessidade de copiar manualmente arquivos de configuração para cada novo projeto.

---

## 🗂️ FONTES DE DADOS

Os arquivos de origem estão nas seguintes pastas do projeto atual:

```
.context/          ← ai-coders-context (skills específicas do projeto)
.agent/            ← antigravity-kit (36 skills + 11 workflows + 19 agentes)
.agent/.shared/    ← ui-ux-pro-max (dados CSV + scripts Python)
```

---

## 🎯 ESTRUTURA ALVO

O Kiro deve criar a seguinte estrutura no diretório home do usuário:

```
~/.kiro/
├── steering/
│   └── comportamento-base.md          ← NOVO (criado do zero)
└── skills/
    │
    ├── ── SKILLS NOVAS (criadas do zero) ──
    ├── deploy-procedure/
    │   └── SKILL.md
    ├── database-verification/
    │   └── SKILL.md
    ├── integration-standard/
    │   └── SKILL.md
    ├── lessons-learned/
    │   └── SKILL.md
    ├── validacao-renum/
    │   └── SKILL.md
    ├── commit-message/
    │   └── SKILL.md
    ├── code-review/
    │   └── SKILL.md
    │
    ├── ── SKILLS MIGRADAS DO .agent/ ──
    ├── api-patterns/          (copiar .agent/skills/api-patterns/ completo)
    ├── app-builder/           (copiar .agent/skills/app-builder/ completo)
    ├── architecture/          (copiar .agent/skills/architecture/ completo)
    ├── bash-linux/            (copiar .agent/skills/bash-linux/ completo)
    ├── behavioral-modes/      (copiar .agent/skills/behavioral-modes/ completo)
    ├── brainstorming/         (copiar .agent/skills/brainstorming/ completo)
    ├── clean-code/            (copiar .agent/skills/clean-code/ completo)
    ├── code-review-checklist/ (copiar .agent/skills/code-review-checklist/ completo)
    ├── database-design/       (copiar .agent/skills/database-design/ completo)
    ├── deployment-procedures/ (copiar .agent/skills/deployment-procedures/ completo)
    ├── documentation-templates/(copiar .agent/skills/documentation-templates/ completo)
    ├── frontend-design/       (copiar .agent/skills/frontend-design/ completo)
    ├── game-development/      (copiar .agent/skills/game-development/ completo)
    ├── geo-fundamentals/      (copiar .agent/skills/geo-fundamentals/ completo)
    ├── i18n-localization/     (copiar .agent/skills/i18n-localization/ completo)
    ├── intelligent-routing/   (copiar .agent/skills/intelligent-routing/ completo)
    ├── lint-and-validate/     (copiar .agent/skills/lint-and-validate/ completo)
    ├── mcp-builder/           (copiar .agent/skills/mcp-builder/ completo)
    ├── mobile-design/         (copiar .agent/skills/mobile-design/ completo)
    ├── nextjs-best-practices/ (copiar .agent/skills/nextjs-best-practices/ completo)
    ├── nodejs-best-practices/ (copiar .agent/skills/nodejs-best-practices/ completo)
    ├── parallel-agents/       (copiar .agent/skills/parallel-agents/ completo)
    ├── performance-profiling/ (copiar .agent/skills/performance-profiling/ completo)
    ├── plan-writing/          (copiar .agent/skills/plan-writing/ completo)
    ├── powershell-windows/    (copiar .agent/skills/powershell-windows/ completo)
    ├── python-patterns/       (copiar .agent/skills/python-patterns/ completo)
    ├── react-patterns/        (copiar .agent/skills/react-patterns/ completo)
    ├── red-team-tactics/      (copiar .agent/skills/red-team-tactics/ completo)
    ├── seo-fundamentals/      (copiar .agent/skills/seo-fundamentals/ completo)
    ├── server-management/     (copiar .agent/skills/server-management/ completo)
    ├── systematic-debugging/  (copiar .agent/skills/systematic-debugging/ completo)
    ├── tailwind-patterns/     (copiar .agent/skills/tailwind-patterns/ completo)
    ├── tdd-workflow/          (copiar .agent/skills/tdd-workflow/ completo)
    ├── testing-patterns/      (copiar .agent/skills/testing-patterns/ completo)
    ├── ui-ux-pro-max/         (copiar .agent/skills/ui-ux-pro-max/ completo incluindo data/ e scripts/)
    ├── vulnerability-scanner/ (copiar .agent/skills/vulnerability-scanner/ completo)
    └── webapp-testing/        (copiar .agent/skills/webapp-testing/ completo)
```

---

## 📝 TAREFA 1 — Criar `~/.kiro/steering/comportamento-base.md`

Criar este arquivo com o seguinte conteúdo **exato**:

```markdown
---
inclusion: always
---

# 🧠 COMPORTAMENTO BASE — RENATO CARRARO
> Aplica-se a TODOS os projetos. Carregado automaticamente em toda sessão.

---

## REGRA 0 — IDIOMA OBRIGATÓRIO
**TODAS as respostas, comentários, logs e comunicações devem ser em Português-BR.**
Sem exceções, independente do idioma da pergunta.

---

## REGRA 1 — INÍCIO OBRIGATÓRIO DE SESSÃO

Ao iniciar qualquer sessão (nova ou retomada após sumarização):

1. Verifique se existe `.kiro/steering/STATUS.md` no workspace
2. Se existir → leia e liste em voz alta o que está **PENDENTE**
3. Se não existir → pergunte ao usuário se há tarefas em andamento antes de agir
4. Só então execute o que o usuário pedir

**Nunca assuma que tudo estava concluído na sessão anterior.**

---

## REGRA 2 — DEFINIÇÃO DE "CONCLUÍDO"

Uma tarefa só está CONCLUÍDA quando todos os critérios aplicáveis forem satisfeitos com **evidências reais**:

| Critério | Evidência exigida |
|---|---|
| Código implementado | Arquivos criados/modificados |
| Testes | Output real do comando de teste com `✓ passed` |
| Build | Output de `npm run build` ou equivalente sem erros |
| Lint | Output de lint com `0 errors` |
| Banco/migrations | Confirmação de aplicação no ambiente real |
| Aprovação | Confirmação explícita do usuário |

**Criar um arquivo `.md` descrevendo o que foi feito NÃO é evidência. É documentação.**

---

## REGRA 3 — HONESTIDADE E TRANSPARÊNCIA TÉCNICA

### NUNCA FAZER:
- ❌ Reportar funcionalidades como "100% implementadas" sem testar
- ❌ Criar relatórios de progresso falsos
- ❌ Afirmar que APIs estão funcionais quando são mockups
- ❌ Usar "✅ CONCLUÍDO" para itens não implementados
- ❌ Ocultar problemas ou limitações reais

### SEMPRE FAZER:
- ✅ Distinguir claramente entre "criado" e "implementado e testado"
- ✅ Reportar o status REAL com o vocabulário oficial:
  - ✅ **Implementado e validado** (somente com evidência)
  - ⚠️ **Implementado não validado** (impedimento real para teste)
  - 🚧 **Mock/Hardcoded** (protótipo solicitado)
  - ❌ **Não implementado**
- ✅ Admitir quando algo não funciona
- ✅ Reportar problemas e bloqueadores transparentemente

---

## REGRA 4 — ANÁLISE PREVENTIVA OBRIGATÓRIA

**ANTES de escrever qualquer código, responder mentalmente:**

- O que exatamente precisa ser implementado?
- Quais arquivos relacionados devo ler primeiro?
- Que padrões existentes no projeto devo seguir?
- Quais são os pontos de risco desta implementação?

### Limites de tempo por fase:
- Análise preventiva: máx. 10 minutos
- Implementação: máx. 30 minutos
- Testes: máx. 15 minutos

### Se travar:
- ✅ Parar após 2 tentativas de correção do mesmo erro
- ✅ Reportar o problema específico ao usuário com o que foi tentado
- ❌ NUNCA ficar em loop de teste-correção por mais de 30 minutos

---

## REGRA 5 — FUNCIONALIDADE SOBRE TESTES

**HIERARQUIA DE PRIORIDADES (INEGOCIÁVEL):**

1. 🥇 Sistema funcionando 100% como projetado
2. 🥈 Correção de problemas técnicos mantendo funcionalidades
3. 🥉 Testes passando COM funcionalidade completa

### NUNCA FAZER:
- ❌ Remover funcionalidades para fazer um teste passar
- ❌ Criar versões "esqueleto" sem funcionalidade real
- ❌ Quebrar integrações para evitar erros de teste
- ❌ Reportar sucesso baseado apenas em testes passando

### ANTES DE QUALQUER ALTERAÇÃO, VERIFICAR:
- Esta alteração remove alguma funcionalidade projetada? → Se sim: NÃO FAZER
- Esta alteração quebra alguma integração essencial? → Se sim: NÃO FAZER
- Estou fazendo isso apenas para um teste passar? → Se sim: NÃO FAZER

---

## REGRA 6 — CONTROLE DE ARTEFATOS E DOCUMENTAÇÃO

- ❌ PROIBIDO criar múltiplos arquivos com o mesmo propósito
- ❌ PROIBIDO criar `.env.production.example`, `.env.staging.example` (usar apenas `.env.example`)
- ✅ Verificar se já existe arquivo similar ANTES de criar um novo
- ✅ Atualizar arquivo existente ao invés de criar novo
- ✅ Explicar no chat ao invés de criar documentação desnecessária

---

## REGRA 7 — TESTES SÃO OBRIGATÓRIOS

- Testes reais = executar o comando e mostrar o output completo
- Testes com `.skip` ou `.todo` = testes falhando
- Arquivo `.md` descrevendo testes = documentação, não execução
- Corrija o código para os testes passarem — nunca simplifique o teste para passar

---

## REGRA 8 — ESCOPO DE ARQUIVOS

- Nunca modifique arquivos fora do escopo declarado da tarefa
- Se precisar tocar em arquivo externo ao escopo → pergunte antes

---

## REGRA 9 — HIERARQUIA DE INSTRUÇÕES

1. Instrução direta do usuário nesta sessão
2. `STATUS.md` do workspace atual
3. Steering files do workspace (`.kiro/steering/`)
4. Este arquivo global (`~/.kiro/steering/comportamento-base.md`)

Em conflito, a fonte mais específica e recente prevalece.
```

---

## 📝 TAREFA 2 — Criar Skills Novas

### 2.1 — `~/.kiro/skills/deploy-procedure/SKILL.md`

```markdown
---
name: deploy-procedure
description: Procedimento de deploy para projetos com frontend React/Vite no Vercel e backend Python/FastAPI no Docker Hub + EasyPanel. Use quando precisar fazer deploy, rebuild ou rollback de qualquer parte do sistema.
---

# Deploy Procedure — Renato Carraro

## Arquitetura dos Projetos

Os projetos seguem esta arquitetura padrão:

**FRONTEND (React/Vite)**
- Localização: raiz do projeto (`/`)
- Deploy: automático via Vercel ao fazer push para o repositório GitHub
- Trigger: commit + push = deploy automático em ~2 minutos

**BACKEND/AGENTE (Python/FastAPI)**
- Localização: pasta `agent/` dentro do projeto
- Deploy: manual via Docker Hub + EasyPanel
- Trigger: rebuild manual necessário após push da imagem

---

## Identificação do Tipo de Alteração

**Alterações no FRONTEND** (deploy automático):
- Qualquer arquivo fora da pasta `agent/`
- `src/`, `public/`, `index.html`, `package.json`, `vite.config.ts`, `tailwind.config.ts`

**Alterações no BACKEND** (rebuild Docker necessário):
- Qualquer arquivo dentro de `agent/`
- `agent/src/`, `agent/requirements.txt`, `agent/Dockerfile`

---

## Fluxo de Deploy

### Frontend (automático):
```bash
git add .
git commit -m "tipo(escopo): descrição [VALIDADO]"
git push origin main
# ✅ Vercel faz deploy automático em ~2 minutos
```

### Backend (manual):
```bash
git add .
git commit -m "tipo(escopo): descrição [VALIDADO]"
git push origin main
cd agent
docker build -t renumvscode/slim-agent:latest .
docker push renumvscode/slim-agent:latest
# Informar Renato para fazer rebuild manual no EasyPanel
```

### Ambos ao mesmo tempo:
1. Fazer todas as alterações
2. Commit + push (versionamento)
3. Deploy frontend acontece automaticamente
4. Rebuild backend manualmente
5. Testar integração completa

---

## Rollback de Emergência

### Frontend:
```bash
git revert HEAD
git push origin main
```

### Backend:
```bash
docker pull renumvscode/slim-agent:previous
docker tag renumvscode/slim-agent:previous renumvscode/slim-agent:latest
docker push renumvscode/slim-agent:latest
# + Informar Renato para rebuild no EasyPanel
```

---

## Checklist Pré-Deploy

- [ ] Identificado se alteração é frontend, backend ou ambos?
- [ ] Build local testado sem erros?
- [ ] Lint: 0 errors?
- [ ] Variáveis de ambiente verificadas?
- [ ] Migrations de banco aplicadas (se houver)?

---

## Regra Simples
- Alteração fora de `agent/` → Deploy automático ✅
- Alteração dentro de `agent/` → Rebuild Docker + EasyPanel 🔄
```

---

### 2.2 — `~/.kiro/skills/database-verification/SKILL.md`

```markdown
---
name: database-verification
description: Protocolo obrigatório de verificação do banco de dados Supabase antes de qualquer migration, alteração de schema ou intervenção no banco. Use SEMPRE que precisar criar ou modificar tabelas, enums, constraints, políticas RLS ou qualquer estrutura do banco.
---

# Database Verification — Protocolo Supabase

## ⚠️ REGRA FUNDAMENTAL

**SEMPRE verificar o estado atual do banco ANTES de criar qualquer migration.**
Jamais criar scripts SQL sem antes analisar o que existe para não corromper dados funcionais.

---

## Checklist Obrigatório ANTES de Qualquer Migration

- [ ] Conectou ao banco real via Power: Supabase Hosted Development?
- [ ] Verificou se a tabela/estrutura já existe?
- [ ] Contou quantos registros existem (dados em produção)?
- [ ] Analisou a estrutura atual das colunas?
- [ ] Identificou relacionamentos com outras tabelas?
- [ ] Verificou políticas RLS existentes na tabela?
- [ ] Buscou no código referências à estrutura que será alterada?
- [ ] Avaliou o impacto em funcionalidades existentes?
- [ ] Criou estratégia de rollback?

---

## Acesso Oficial ao Banco

**MÉTODO ÚNICO:** Power: Supabase Hosted Development

```
1. Ativar o Power Supabase no Kiro
2. Verificar estrutura de tabelas existentes
3. Executar queries SELECT para análise de dados
4. Aplicar migrations de forma segura
5. Validar resultado
```

**NUNCA usar:**
- ❌ Supabase CLI diretamente com credenciais hardcoded
- ❌ Scripts Python com credenciais no código
- ❌ Credenciais expostas em qualquer arquivo

---

## Lição Crítica: Sincronização Código-Banco

### REGRA INEGOCIÁVEL:
**TODA VEZ que um novo tipo/enum for usado no código, a migration DEVE incluir esse tipo NO MESMO MOMENTO.**

### Processo Correto:
1. Identificar TODOS os tipos/valores que serão usados no código
2. Criar migration COMPLETA com TODOS os tipos
3. Aplicar migration no banco
4. Validar que todos os tipos estão no constraint
5. SÓ ENTÃO implementar o código que usa os tipos

### Exemplo do que NÃO fazer:
```sql
-- ❌ Migration incompleta (adicionou só 1 dos 3 tipos necessários)
ALTER TABLE notification_logs ADD CONSTRAINT type_check 
CHECK (type IN ('welcome', 'commission_received', 'withdrawal_processed'));
-- Código usa 'commission_paid' e 'broadcast' → vai quebrar em produção!
```

### Exemplo correto:
```sql
-- ✅ Migration completa (todos os tipos que o código vai usar)
ALTER TABLE notification_logs ADD CONSTRAINT type_check 
CHECK (type IN (
  'welcome', 'commission_received', 'withdrawal_processed',
  'commission_paid', 'broadcast'  -- ← incluídos ANTES de implementar o código
));
```

---

## Template de Relatório de Verificação

```markdown
## VERIFICAÇÃO DO BANCO — [DATA]

### Acesso:
- ✅ Power Supabase Hosted Development ativado

### Tabelas verificadas:
- [tabela]: [EXISTE/NÃO EXISTE] — [N registros]

### Estrutura atual encontrada:
[Descrever o que foi encontrado]

### Ações necessárias:
[O que precisa ser feito]

### Riscos identificados:
[Possíveis problemas]
```

---

## Situações Críticas

| Situação | Ação |
|---|---|
| Tabela NÃO existe | Criar normalmente via migration |
| Tabela JÁ existe | Verificar estrutura e dados antes de alterar |
| Há dados em produção | Backup obrigatório antes de qualquer alteração destrutiva |
| Migration de enum/constraint | Incluir TODOS os valores necessários de uma vez |
```

---

### 2.3 — `~/.kiro/skills/integration-standard/SKILL.md`

```markdown
---
name: integration-standard
description: Padrão obrigatório para solicitações de sprint e specs de desenvolvimento. Use quando criar specs para o Kiro, planejar sprints ou descrever novas funcionalidades. Garante que frontend e backend sejam sempre especificados juntos.
---

# Integration Standard — Backend + Frontend

## ⚠️ Regra Fundamental

**TODA solicitação de sprint DEVE incluir EXPLICITAMENTE a integração frontend.**
Especificações apenas de backend estão INCOMPLETAS.

---

## Estrutura Obrigatória das Solicitações

### Seção Backend (sempre presente):
- Tabelas do banco necessárias
- Serviços e controllers
- APIs REST (método + rota)
- Validações e regras de negócio

### Seção Frontend (OBRIGATÓRIA):

```markdown
## X. INTEGRAÇÃO FRONTEND (OBRIGATÓRIA)

**Páginas a conectar:**

**Para [Tipo de Usuário]:**
- Página A (rota: /caminho-a)
  - Funcionalidade 1
  - APIs usadas: GET /api/..., POST /api/...

**Componentes a criar:**
- ComponenteX
  - Responsabilidade
  - Props esperadas

**Serviços frontend:**
- `service.service.ts`
  - metodo1() — GET /api/...
  - metodo2() — POST /api/...

**Estados de UI obrigatórios:**
- ✅ Loading (skeleton ou spinner)
- ✅ Error (mensagem amigável)
- ✅ Empty (quando sem dados)
- ✅ Success (feedback de ações)
```

---

## Checklist de Validação

Ao criar qualquer solicitação de sprint, verificar:

**Backend:**
- [ ] Estrutura de banco especificada?
- [ ] APIs REST listadas com método e rota?
- [ ] Validações descritas?

**Frontend (OBRIGATÓRIO):**
- [ ] Seção de integração frontend presente?
- [ ] Páginas listadas por tipo de usuário?
- [ ] Componentes especificados?
- [ ] Serviços frontend listados?
- [ ] Fluxo de dados explicado?
- [ ] Estados de UI mencionados?

**Se qualquer item frontend faltar → solicitação está INCOMPLETA.**

---

## Exceções

Este padrão se aplica a todos os sprints, exceto:
- Sprint 0 (setup/infraestrutura pura)
- Sprints explicitamente marcados como "apenas backend"

**Na dúvida: SEMPRE incluir integração frontend.**
```

---

### 2.4 — `~/.kiro/skills/lessons-learned/SKILL.md`

```markdown
---
name: lessons-learned
description: Criação e manutenção de registro de lições aprendidas por projeto. Use quando um bug crítico for resolvido, quando uma abordagem errada for identificada, ou quando uma lição importante for aprendida que evitaria retrabalho futuro.
---

# Lessons Learned — Registro de Lições por Projeto

## Quando Usar Esta Skill

- ✅ Após resolver um bug que causou problema em produção
- ✅ Quando uma migration incorreta for identificada antes do deploy
- ✅ Quando uma abordagem errada for descoberta após implementação
- ✅ Quando qualquer lição importante for aprendida que evitaria retrabalho

---

## Localização do Arquivo

Cada projeto deve manter seu próprio arquivo em:
```
.kiro/steering/licoes-aprendidas.md
```

Se o arquivo não existir → criar com o template abaixo.
Se já existir → adicionar nova lição sem apagar as anteriores.

---

## Template do Arquivo de Lições

```markdown
---
title: Lições Aprendidas — [NOME DO PROJETO]
description: Registro de lições para evitar repetição de erros
inclusion: auto
---

# LIÇÕES APRENDIDAS — [NOME DO PROJETO]

## LIÇÃO N: [TÍTULO DESCRITIVO] — [SEVERIDADE]

**Data:** DD/MM/AAAA
**Contexto:** [Onde e quando aconteceu]
**Severidade:** CRÍTICA | ALTA | MÉDIA

### Problema Identificado
[Descrição clara do que deu errado]

### O que foi feito errado
[Código ou ação incorreta, com exemplo]

### O que deveria ter sido feito
[Abordagem correta, com exemplo]

### Checklist para evitar recorrência
- [ ] [Verificação 1]
- [ ] [Verificação 2]

### Impacto se ignorado
- ❌ [Consequência 1]
- ❌ [Consequência 2]
```

---

## Processo de Registro

1. Identificar a lição (o que deu errado e por quê)
2. Verificar se `.kiro/steering/licoes-aprendidas.md` existe
3. Se não existe → criar com o template completo
4. Se existe → adicionar nova seção sem apagar as anteriores
5. Numerar as lições sequencialmente (LIÇÃO 1, LIÇÃO 2, etc.)
6. Atualizar a tabela de histórico no final do arquivo

---

## Quando Consultar

Esta skill deve ser consultada automaticamente:
- Antes de criar qualquer migration com enums ou constraints
- Antes de fazer deploy em produção
- Quando encontrar um problema que parece já ter ocorrido antes

---

## Tabela de Histórico (manter no final do arquivo)

```markdown
| Data | Lição | Severidade | Status |
|------|-------|------------|--------|
| DD/MM/AAAA | Título | CRÍTICA | Ativa |
```
```

---

### 2.5 — `~/.kiro/skills/validacao-renum/SKILL.md`

```markdown
---
name: validacao-renum
description: Validação obrigatória de tarefas seguindo as Regras Inegociáveis RENUM. Use ao final de qualquer tarefa de implementação ou correção para garantir que os critérios de qualidade foram atendidos.
---

# Validação RENUM

## Quando Usar
Sempre que uma tarefa for marcada como concluída ou estiver pronta para revisão.

---

## Instruções de Validação

### 1. Verificação de Evidências
- **Frontend:** Exigir screenshot da alteração visual
- **Backend:** Exigir log de requisição, print do console ou log de execução SQL
- **Infra/DevOps:** Exigir log de build ou status de container

### 2. Auditoria de Código
- Verificar se não há dados mockados (hardcoded) onde deveriam ser dinâmicos
- Verificar se o idioma dos comentários e logs é PT-BR
- Verificar se há tratamento de erros adequado

### 3. Limite de Tentativas
- Se esta for a 3ª tentativa de correção do mesmo bug → bloquear progresso e notificar o usuário

### 4. Vocabulário Obrigatório no Relatório Final
O relatório DEVE conter um dos status:
- ✅ **Implementado e validado** (somente com evidência anexa/citada)
- ⚠️ **Implementado não validado** (se houver impedimento real para teste)
- 🚧 **Mock/Hardcoded** (se foi solicitado um protótipo)
- ❌ **Não implementado**

---

## Exemplos de Saída

```
Tarefa concluída. ✅ Implementado e validado. Evidência: [log/screenshot]
```

```
Bloqueio detectado. ❌ Não implementado. Atingido limite de 3 tentativas.
Problema: [descrição do que foi tentado e onde travou]
Próximo passo sugerido: [orientação]
```

```
⚠️ Implementado não validado. Impedimento: ambiente de produção indisponível para teste.
O que foi implementado: [descrição]
O que falta validar: [descrição]
```
```

---

### 2.6 — `~/.kiro/skills/commit-message/SKILL.md`

```markdown
---
name: commit-message
description: Geração de mensagens de commit seguindo o padrão Conventional Commits em PT-BR com status RENUM. Use ao finalizar qualquer implementação antes de fazer commit e push.
---

# Commit Message — PT-BR + RENUM

## Padrão

```
tipo(escopo): descrição curta em PT-BR [STATUS]
```

## Tipos Disponíveis

| Emoji | Tipo | Quando usar |
|---|---|---|
| ✨ | `feat` | Nova funcionalidade |
| 🐛 | `fix` | Correção de bug |
| ♻️ | `refactor` | Refatoração sem mudança de comportamento |
| 🎨 | `style` | Formatação, CSS, UI sem lógica |
| 🧪 | `test` | Adição ou correção de testes |
| 📝 | `docs` | Documentação |
| 🔧 | `chore` | Config, dependências, build |
| 🗄️ | `db` | Migrations, schema, dados |
| 🚀 | `deploy` | Deploy, infra, CI/CD |

## Status RENUM (obrigatório no final)

- `[VALIDADO]` → Implementado e testado com evidência
- `[MOCK]` → Código temporário ou protótipo
- `[WIP]` → Trabalho em progresso (evitar commitar)

## Exemplos

```
feat(auth): implementar login com Supabase [VALIDADO]
fix(agent): ajustar limite de tokens no LangGraph [VALIDADO]
refactor(ui): extrair Button para componente compartilhado [VALIDADO]
db(affiliates): adicionar constraint de tipos em notification_logs [VALIDADO]
chore(deps): atualizar dependências do frontend [VALIDADO]
```

## Regras

1. Sempre em Português-BR
2. Descrição curta (máx. 72 caracteres na primeira linha)
3. Status RENUM obrigatório
4. Se houver mais contexto, usar corpo do commit após linha em branco
```

---

### 2.7 — `~/.kiro/skills/code-review/SKILL.md`

```markdown
---
name: code-review
description: Revisão de qualidade de código seguindo as Regras RENUM. Use ao revisar qualquer código antes de aprovar, fazer merge ou reportar como concluído.
---

# Code Review — Padrão RENUM

## Instruções de Revisão

### 1. Busca por Hardcode
- Identificar URLs fixas que deveriam estar em variáveis de ambiente
- Identificar IDs hardcoded (user IDs, product IDs, etc.)
- Identificar credenciais ou tokens no código

### 2. Verificação de Evidências
- O código alterado possui teste ou log correspondente?
- Se não → solicitar antes de aprovar

### 3. Padrões de Nomenclatura
- Variáveis e funções: inglês
- Comentários e logs: PT-BR
- Seguir convenções já estabelecidas no projeto

### 4. Segurança (Supabase)
- Auditar regras de RLS nas tabelas afetadas
- Verificar validações de input
- Confirmar que dados sensíveis não são expostos

### 5. Sincronização Código-Banco
- Se o código usa novos tipos/enums → migration correspondente existe?
- Migration inclui TODOS os valores necessários?

---

## Checklist RENUM

- [ ] O código é 100% funcional ou contém mocks declarados?
- [ ] Existem evidências de teste para as funcionalidades alteradas?
- [ ] O vocabulário oficial (✅/⚠️/🚧/❌) foi respeitado no reporte?
- [ ] Não há dados hardcoded onde deveriam ser dinâmicos?
- [ ] Comentários e logs estão em PT-BR?
- [ ] RLS e validações de segurança foram consideradas?
- [ ] Se há novos tipos de banco → migration está completa?

---

## Saída do Code Review

```markdown
## Code Review — [arquivo/feature]

### ✅ Aprovado
- [item aprovado com evidência]

### ⚠️ Atenção (não bloqueia)
- [ponto de atenção]

### ❌ Bloqueante (deve corrigir antes de aprovar)
- [problema crítico]

**Status final:** ✅ Aprovado | ⚠️ Aprovado com ressalvas | ❌ Reprovado
```
```

---

## 📁 TAREFA 3 — Migrar Skills do Antigravity-Kit

Copiar as seguintes pastas de `.agent/skills/` para `~/.kiro/skills/`, **preservando toda a estrutura interna** (subpastas `data/`, `scripts/`, `references/`, `templates/`):

```bash
# Executar a partir da raiz do projeto:
cp -r .agent/skills/api-patterns         ~/.kiro/skills/
cp -r .agent/skills/app-builder          ~/.kiro/skills/
cp -r .agent/skills/architecture         ~/.kiro/skills/
cp -r .agent/skills/bash-linux           ~/.kiro/skills/
cp -r .agent/skills/behavioral-modes     ~/.kiro/skills/
cp -r .agent/skills/brainstorming        ~/.kiro/skills/
cp -r .agent/skills/clean-code           ~/.kiro/skills/
cp -r .agent/skills/code-review-checklist ~/.kiro/skills/
cp -r .agent/skills/database-design      ~/.kiro/skills/
cp -r .agent/skills/deployment-procedures ~/.kiro/skills/
cp -r .agent/skills/documentation-templates ~/.kiro/skills/
cp -r .agent/skills/frontend-design      ~/.kiro/skills/
cp -r .agent/skills/game-development     ~/.kiro/skills/
cp -r .agent/skills/geo-fundamentals     ~/.kiro/skills/
cp -r .agent/skills/i18n-localization    ~/.kiro/skills/
cp -r .agent/skills/intelligent-routing  ~/.kiro/skills/
cp -r .agent/skills/lint-and-validate    ~/.kiro/skills/
cp -r .agent/skills/mcp-builder         ~/.kiro/skills/
cp -r .agent/skills/mobile-design        ~/.kiro/skills/
cp -r .agent/skills/nextjs-best-practices ~/.kiro/skills/
cp -r .agent/skills/nodejs-best-practices ~/.kiro/skills/
cp -r .agent/skills/parallel-agents      ~/.kiro/skills/
cp -r .agent/skills/performance-profiling ~/.kiro/skills/
cp -r .agent/skills/plan-writing         ~/.kiro/skills/
cp -r .agent/skills/powershell-windows   ~/.kiro/skills/
cp -r .agent/skills/python-patterns      ~/.kiro/skills/
cp -r .agent/skills/react-patterns       ~/.kiro/skills/
cp -r .agent/skills/red-team-tactics     ~/.kiro/skills/
cp -r .agent/skills/seo-fundamentals     ~/.kiro/skills/
cp -r .agent/skills/server-management    ~/.kiro/skills/
cp -r .agent/skills/systematic-debugging ~/.kiro/skills/
cp -r .agent/skills/tailwind-patterns    ~/.kiro/skills/
cp -r .agent/skills/tdd-workflow         ~/.kiro/skills/
cp -r .agent/skills/testing-patterns     ~/.kiro/skills/
cp -r .agent/skills/ui-ux-pro-max        ~/.kiro/skills/
cp -r .agent/skills/vulnerability-scanner ~/.kiro/skills/
cp -r .agent/skills/webapp-testing       ~/.kiro/skills/
```

> ⚠️ **Atenção especial para `ui-ux-pro-max`:** Esta skill contém subpastas `data/` (arquivos CSV) e `scripts/` (scripts Python) que são essenciais para seu funcionamento. O `cp -r` acima preserva tudo automaticamente.

---

## 📁 TAREFA 4 — Migrar Workflows do Antigravity-Kit

Criar a pasta `~/.kiro/workflows/` e copiar todos os workflows:

```bash
mkdir -p ~/.kiro/workflows
cp .agent/workflows/brainstorm.md  ~/.kiro/workflows/
cp .agent/workflows/create.md      ~/.kiro/workflows/
cp .agent/workflows/debug.md       ~/.kiro/workflows/
cp .agent/workflows/deploy.md      ~/.kiro/workflows/
cp .agent/workflows/enhance.md     ~/.kiro/workflows/
cp .agent/workflows/orchestrate.md ~/.kiro/workflows/
cp .agent/workflows/plan.md        ~/.kiro/workflows/
cp .agent/workflows/preview.md     ~/.kiro/workflows/
cp .agent/workflows/status.md      ~/.kiro/workflows/
cp .agent/workflows/test.md        ~/.kiro/workflows/
cp .agent/workflows/ui-ux-pro-max.md ~/.kiro/workflows/
```

---

## 📁 TAREFA 5 — Migrar Agentes do Antigravity-Kit

Criar a pasta `~/.kiro/agents/` e copiar todos os agentes:

```bash
mkdir -p ~/.kiro/agents
cp -r .agent/agents/. ~/.kiro/agents/
```

---

## ✅ TAREFA 6 — Verificação Final

Após executar todas as tarefas, verificar a estrutura criada:

```bash
# Verificar steering global
ls ~/.kiro/steering/

# Verificar quantidade de skills instaladas (esperado: 43 skills)
ls ~/.kiro/skills/ | wc -l

# Verificar se ui-ux-pro-max tem seus dados
ls ~/.kiro/skills/ui-ux-pro-max/data/
ls ~/.kiro/skills/ui-ux-pro-max/scripts/

# Verificar workflows
ls ~/.kiro/workflows/

# Verificar agentes
ls ~/.kiro/agents/
```

---

## 🗑️ TAREFA 7 — Limpeza das Pastas Originais

Após confirmar que a estrutura global foi criada corretamente, remover as pastas de origem do projeto:

```bash
# Confirmar que tudo foi migrado antes de deletar
echo "Skills globais instaladas: $(ls ~/.kiro/skills/ | wc -l)"
echo "Workflows instalados: $(ls ~/.kiro/workflows/ | wc -l)"

# Remover pastas originais do projeto
rm -rf .agent/
rm -rf .context/

echo "✅ Limpeza concluída. Pastas .agent/ e .context/ removidas."
```

---

## 📊 RESUMO ESPERADO AO FINAL

| Item | Quantidade | Localização |
|---|---|---|
| Global Steering | 1 arquivo | `~/.kiro/steering/` |
| Skills novas (criadas) | 7 skills | `~/.kiro/skills/` |
| Skills migradas (antigravity) | 36 skills | `~/.kiro/skills/` |
| **Total de skills** | **43 skills** | `~/.kiro/skills/` |
| Workflows | 11 arquivos | `~/.kiro/workflows/` |
| Agentes | 19 arquivos | `~/.kiro/agents/` |

---

## ⚠️ NOTAS IMPORTANTES

1. **Criar diretórios antes de copiar:** Confirme que `~/.kiro/steering/` e `~/.kiro/skills/` existem antes de criar/copiar os arquivos. Se não existirem, crie com `mkdir -p`.

2. **ui-ux-pro-max requer Python:** Esta skill executa scripts Python. Verificar com `python3 --version` se Python está disponível.

3. **Não alterar o Slim Quality:** As tarefas acima afetam apenas o diretório global `~/.kiro/`. O projeto Slim Quality continua funcionando normalmente com seu próprio `.kiro/steering/STATUS.md`.

4. **Relatório de conclusão:** Ao finalizar, reportar o status de cada tarefa usando o vocabulário RENUM:
   - ✅ Implementado e validado
   - ❌ Não implementado (com motivo)

---

**Documento criado em:** 27/02/2026  
**Autor:** Claude + Renato Carraro  
**Para execução por:** Kiro AI  
**Status:** Pronto para execução
