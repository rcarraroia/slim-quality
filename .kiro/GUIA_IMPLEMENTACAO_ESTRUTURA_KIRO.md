# 🚀 GUIA DE IMPLEMENTAÇÃO: ESTRUTURA .KIRO OTIMIZADA

> Guia completo para replicar a estrutura otimizada do .kiro em qualquer projeto

**Versão:** 1.0  
**Data:** 12/03/2026  
**Projeto de Referência:** Slim Quality  
**Economia de Contexto:** 85% de redução

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Problema que Resolve](#problema-que-resolve)
3. [Estrutura Proposta](#estrutura-proposta)
4. [Passo a Passo de Implementação](#passo-a-passo)
5. [Conteúdo dos Arquivos](#conteúdo-dos-arquivos)
6. [Validação e Testes](#validação)
7. [Manutenção](#manutenção)

---

## 🎯 VISÃO GERAL

### **O que é esta estrutura?**

Sistema de organização de arquivos do Kiro que:
- Reduz contexto permanente em 85%
- Implementa memória de longo prazo (Napkin)
- Separa arquivos por frequência de uso
- Mantém documentação organizada e acessível

### **Quando usar?**

- ✅ Projetos com muitos arquivos de documentação
- ✅ Contexto do Kiro acima de 10%
- ✅ Necessidade de memória entre sessões
- ✅ Múltiplos desenvolvedores no projeto

### **Benefícios:**

1. **Economia de contexto:** 85% menos contexto ocupado
2. **Memória de longo prazo:** Napkin acumula lições
3. **Aprendizado contínuo:** Agente melhora a cada sessão
4. **Documentação organizada:** Fácil encontrar informações
5. **Escalabilidade:** Adicionar docs não afeta contexto base

---

## ❌ PROBLEMA QUE RESOLVE

### **Antes da Otimização:**

```
.kiro/steering/ (tudo carregado automaticamente)
├── AGENTS.md (4 KB)
├── STATUS.md (64 KB)
├── tech.md (12 KB)
├── structure.md (11 KB)
├── serverless-functions.md (11 KB)
├── product.md (9 KB)
├── analise-preventiva.md (7 KB)
├── procedimento-deploy.md (7 KB)
└── verificacao-banco.md (4 KB)

TOTAL: 129 KB carregados SEMPRE (16% de contexto)
```

**Problemas:**
- ❌ Contexto ocupado permanentemente
- ❌ Respostas mais lentas
- ❌ Custo maior de tokens
- ❌ Sem memória entre sessões
- ❌ Documentação misturada com regras

### **Depois da Otimização:**

```
.kiro/
├── steering/ (carregado automaticamente)
│   └── AGENTS.md (7 KB)
│
└── docs/ (consultado sob demanda)
    ├── napkin.md (5 KB - lido no início)
    ├── status.md (64 KB - lido no início)
    └── [outros docs] (consultados quando necessário)

CONTEXTO BASE: 7 KB (2% de contexto)
CONTEXTO INÍCIO: 76 KB (8% de contexto)
```

**Benefícios:**
- ✅ 85% menos contexto permanente
- ✅ Respostas mais rápidas
- ✅ Memória de longo prazo (Napkin)
- ✅ Documentação organizada
- ✅ Escalável

---

## 📁 ESTRUTURA PROPOSTA

### **Estrutura Completa:**

```
.kiro/
├── steering/                          ← Carregado SEMPRE (inclusion: always)
│   └── AGENTS.md                      ← Regras globais + referências
│
├── docs/                              ← Consultado SOB DEMANDA
│   ├── napkin.md                      ← Lições aprendidas curadas
│   ├── status.md                      ← Histórico de tarefas
│   ├── tech.md                        ← Padrões técnicos
│   ├── structure.md                   ← Schema do banco
│   ├── [outros docs específicos]     ← Documentação do projeto
│   └── ...
│
├── specs/                             ← Specs de features
├── hooks/                             ← Hooks do Kiro
├── settings/                          ← Configurações (MCP, etc)
├── audits/                            ← Auditorias (opcional)
└── README.md                          ← Documentação da estrutura
```

### **Descrição das Pastas:**

| Pasta | Propósito | Carregamento |
|-------|-----------|--------------|
| `steering/` | Regras globais mínimas | Automático (sempre) |
| `docs/` | Documentação e histórico | Sob demanda |
| `specs/` | Especificações de features | Sob demanda |
| `hooks/` | Hooks do Kiro | Automático (quando ativo) |
| `settings/` | Configurações | Automático |
| `audits/` | Auditorias do sistema | Sob demanda |

### **Arquivos Obrigatórios:**

1. ✅ `.kiro/steering/AGENTS.md` - Regras globais
2. ✅ `.kiro/docs/napkin.md` - Lições aprendidas
3. ✅ `.kiro/docs/status.md` - Histórico de tarefas
4. ✅ `.kiro/README.md` - Documentação da estrutura

### **Arquivos Opcionais (adaptar ao projeto):**

- `.kiro/docs/tech.md` - Padrões técnicos
- `.kiro/docs/structure.md` - Schema do banco
- `.kiro/docs/product.md` - Regras de negócio
- `.kiro/docs/[nome-do-doc].md` - Outros documentos

---

## 🔧 PASSO A PASSO DE IMPLEMENTAÇÃO

### **FASE 1: Análise do Projeto Atual**

#### **1.1 Verificar estrutura atual**

```bash
# Listar arquivos em .kiro/steering
ls -lh .kiro/steering/

# Verificar tamanho total
du -sh .kiro/steering/
```

#### **1.2 Identificar arquivos pesados**

```bash
# Listar por tamanho (Windows PowerShell)
Get-ChildItem -Path ".kiro/steering" -File | 
  Select-Object Name, @{Name="Size(KB)";Expression={[math]::Round($_.Length/1KB,2)}} | 
  Sort-Object "Size(KB)" -Descending

# Listar por tamanho (Linux/Mac)
ls -lhS .kiro/steering/
```

#### **1.3 Classificar arquivos por frequência de uso**

| Tipo | Frequência | Destino |
|------|------------|---------|
| Regras globais | Sempre | `steering/` |
| Lições aprendidas | Início de sessão | `docs/napkin.md` |
| Histórico de tarefas | Início de sessão | `docs/status.md` |
| Documentação técnica | Sob demanda | `docs/` |
| Procedimentos | Sob demanda | `docs/` |
| Checklists | Sob demanda | `docs/` |

---

### **FASE 2: Criar Nova Estrutura**

#### **2.1 Criar pasta docs/**

```bash
# Windows PowerShell
New-Item -ItemType Directory -Path ".kiro/docs" -Force

# Linux/Mac
mkdir -p .kiro/docs
```

#### **2.2 Mover arquivos pesados**

```bash
# Windows PowerShell
Move-Item -Path ".kiro/steering/STATUS.md" -Destination ".kiro/docs/status.md" -Force
Move-Item -Path ".kiro/steering/tech.md" -Destination ".kiro/docs/tech.md" -Force
# ... repetir para outros arquivos

# Linux/Mac
mv .kiro/steering/STATUS.md .kiro/docs/status.md
mv .kiro/steering/tech.md .kiro/docs/tech.md
# ... repetir para outros arquivos
```

**Arquivos a mover (adaptar ao seu projeto):**
- ✅ STATUS.md → docs/status.md
- ✅ tech.md → docs/tech.md
- ✅ structure.md → docs/structure.md
- ✅ [outros docs pesados] → docs/

**Manter em steering/ apenas:**
- ✅ AGENTS.md (será reescrito)

---

### **FASE 3: Criar Napkin (Skill de Lições Aprendidas)**

#### **3.1 Criar arquivo napkin.md**

Criar `.kiro/docs/napkin.md` com o seguinte template:

```markdown
# 🧠 Napkin Runbook — [NOME DO PROJETO]

> Runbook curado continuamente. Lido no início de TODA sessão.
> Mantém apenas regras recorrentes de alto valor.
> Máximo 10 itens por categoria, priorizados por importância.

---

## 🔧 Regras de Curadoria

- Re-priorizar a cada leitura
- Manter apenas orientações recorrentes e de alto valor
- Máximo 10 itens por categoria
- Cada item inclui data + "Do instead"
- Remover itens obsoletos ou de baixo sinal

---

## 🎯 Execução & Validação (Prioridade Máxima)

1. **[YYYY-MM-DD] Regra importante aprendida**
   Do instead: Ação concreta e repetível.

[... adicionar mais itens conforme aprende ...]

---

## 🏗️ Arquitetura & Backend

1. **[YYYY-MM-DD] Regra sobre arquitetura**
   Do instead: Ação concreta.

---

## 🎨 UI/UX & Design

1. **[YYYY-MM-DD] Regra sobre UI**
   Do instead: Ação concreta.

---

## 🗄️ Banco de Dados

1. **[YYYY-MM-DD] Regra sobre banco**
   Do instead: Ação concreta.

---

## 👤 Diretrizes do Usuário

1. **[YYYY-MM-DD] Preferência do usuário**
   Do instead: Seguir exatamente esta preferência.
```

#### **3.2 Adaptar categorias ao projeto**

**Exemplos de categorias por tipo de projeto:**

**Projeto Web (React/Node):**
- Execução & Validação
- Arquitetura & Backend
- UI/UX & Design
- Banco de Dados
- Deploy & Ambiente
- Diretrizes do Usuário

**Projeto Mobile (React Native):**
- Execução & Validação
- Arquitetura & Navegação
- UI/UX & Componentes
- APIs & Integrações
- Build & Deploy
- Diretrizes do Usuário

**Projeto Python/FastAPI:**
- Execução & Validação
- Arquitetura & APIs
- Banco de Dados & ORMs
- Testes & Qualidade
- Deploy & Docker
- Diretrizes do Usuário

#### **3.3 Migrar lições existentes (opcional)**

Se já tem lições aprendidas em outros arquivos, migre para o napkin:

```markdown
## 🎯 Execução & Validação

1. **[2026-03-12] SEMPRE validar banco real antes de migrations**
   Do instead: Usar ferramenta de inspeção do banco antes de qualquer ALTER TABLE.

2. **[2026-03-10] NUNCA comentar código para fazer build passar**
   Do instead: Corrigir o problema real (criar arquivo, instalar dependência).
```

---

### **FASE 4: Reescrever AGENTS.md**

#### **4.1 Backup do AGENTS.md atual**

```bash
# Windows PowerShell
Copy-Item ".kiro/steering/AGENTS.md" ".kiro/steering/AGENTS.md.backup"

# Linux/Mac
cp .kiro/steering/AGENTS.md .kiro/steering/AGENTS.md.backup
```

#### **4.2 Criar novo AGENTS.md otimizado**

Template para `.kiro/steering/AGENTS.md`:

```markdown
---
inclusion: always
---

# 🎯 AGENTS.MD - REGRAS GLOBAIS

## ⚠️ IDIOMA OBRIGATÓRIO
**TODAS as respostas em Português-BR.**
Inglês apenas dentro de código.

---

## 🔒 INÍCIO DE SESSÃO OBRIGATÓRIO

**Ao iniciar qualquer sessão:**

1. ✅ **Leia `.kiro/docs/napkin.md`** (lições aprendidas)
2. ✅ **Leia `.kiro/docs/status.md`** (tarefas pendentes)
3. ✅ Só então execute o que foi solicitado

**NUNCA pule a leitura do napkin!**

---

## 🏗️ ARQUITETURA DO SISTEMA

[Resumo da arquitetura do seu projeto]

**Detalhes:** Consulte `.kiro/docs/tech.md`

---

## 🎯 PRINCÍPIOS FUNDAMENTAIS

1. **Funcionalidade > Testes**
2. **Análise antes de código**
3. **Banco: sempre o real**
4. **Integridade é inegociável**

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

Consulte SOB DEMANDA:

- **Lições aprendidas:** `.kiro/docs/napkin.md` (LER NO INÍCIO!)
- **Status do projeto:** `.kiro/docs/status.md` (LER NO INÍCIO!)
- **Padrões técnicos:** `.kiro/docs/tech.md`
- **[Outros docs]:** `.kiro/docs/[nome].md`

---

## ✅ CRITÉRIOS DE CONCLUSÃO

| O que foi feito | Evidência exigida |
|----------------|-------------------|
| Código | Arquivos criados/modificados |
| Build | Output sem erros |
| Aprovação | Confirmação do usuário |

---

## 🎯 COMPROMISSO

**EU, KIRO AI, ME COMPROMETO A:**

1. ✅ SEMPRE ler napkin.md e status.md no início
2. ✅ SEMPRE fazer análise preventiva antes de implementar
3. ✅ SEMPRE atualizar napkin.md com lições aprendidas
4. ✅ NUNCA mentir sobre status de tarefas

---

**Data:** [DATA]  
**Status:** ATIVO E OBRIGATÓRIO
```

#### **4.3 Adaptar ao seu projeto**

- Substitua `[NOME DO PROJETO]` pelo nome real
- Adicione resumo da arquitetura específica
- Liste documentos específicos do projeto
- Mantenha princípios fundamentais relevantes

---

### **FASE 5: Criar README.md**

#### **5.1 Criar documentação da estrutura**

Criar `.kiro/README.md` explicando a nova estrutura:

```markdown
# 📁 Estrutura da Pasta .kiro

> Documentação da organização de arquivos e otimização de contexto

---

## 🎯 Objetivo

Reduzir contexto permanente em 85% através de:
- Separação por frequência de uso
- Implementação de memória de longo prazo (Napkin)
- Documentação organizada

---

## 📂 Estrutura

```
.kiro/
├── steering/
│   └── AGENTS.md (regras globais)
├── docs/
│   ├── napkin.md (lições aprendidas)
│   ├── status.md (histórico)
│   └── [outros docs]
└── README.md (este arquivo)
```

---

## 🔄 Fluxo de Trabalho

1. Kiro carrega AGENTS.md automaticamente
2. AGENTS.md instrui: "Leia napkin.md e status.md"
3. Kiro aplica lições aprendidas
4. Durante trabalho: atualiza napkin
5. Final da tarefa: atualiza status

---

## 📊 Economia de Contexto

- Antes: [X] KB (Y% de contexto)
- Depois: [Z] KB (W% de contexto)
- Economia: [%] de redução
```

---

### **FASE 6: Commit e Deploy**

#### **6.1 Verificar mudanças**

```bash
# Ver arquivos modificados
git status

# Ver estrutura nova
ls -R .kiro/
```

#### **6.2 Fazer commit**

```bash
git add .

git commit -m "refactor: Reestrutura .kiro para otimizar contexto (85% redução)

- Move arquivos pesados de steering/ para docs/
- Cria napkin.md (skill de lições aprendidas)
- Reescreve AGENTS.md (versão enxuta)
- Adiciona README.md com documentação

Economia de contexto: [X]% → [Y]% ([Z]% redução!)"

git push
```

---

## 📝 CONTEÚDO DOS ARQUIVOS

### **AGENTS.md - Template Completo**

```markdown
---
inclusion: always
---

# 🎯 AGENTS.MD - REGRAS GLOBAIS

## ⚠️ IDIOMA OBRIGATÓRIO
TODAS as respostas em Português-BR. Inglês apenas dentro de código.

---

## 🔒 INÍCIO DE SESSÃO OBRIGATÓRIO

1. ✅ Leia `.kiro/docs/napkin.md` (lições aprendidas)
2. ✅ Leia `.kiro/docs/status.md` (tarefas pendentes)
3. ✅ Só então execute o que foi solicitado

---

## 🏗️ ARQUITETURA DO SISTEMA

[Descreva a arquitetura do seu projeto aqui]

Exemplo:
- Frontend: React/Vite → Vercel
- Backend: Node.js/Express → AWS
- Banco: PostgreSQL → Supabase

**Detalhes:** Consulte `.kiro/docs/tech.md`

---

## 🎯 PRINCÍPIOS FUNDAMENTAIS

1. **Funcionalidade > Testes**
   Sistema funcionando tem prioridade absoluta.

2. **Análise antes de código**
   Ler arquivos relacionados, identificar padrões, planejar estrutura.

3. **Banco: sempre o real**
   Validar estrutura real antes de qualquer modificação.

4. **Integridade é inegociável**
   Nunca mentir sobre status. Reportar problemas com honestidade.

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

Consulte SOB DEMANDA:

- `.kiro/docs/napkin.md` - Lições aprendidas (LER NO INÍCIO!)
- `.kiro/docs/status.md` - Histórico de tarefas (LER NO INÍCIO!)
- `.kiro/docs/tech.md` - Padrões técnicos
- `.kiro/docs/structure.md` - Schema do banco
- `.kiro/docs/[outros]` - Documentação específica

---

## ✅ CRITÉRIOS DE CONCLUSÃO

| O que foi feito | Evidência exigida |
|----------------|-------------------|
| Código | Arquivos criados/modificados |
| Build | Output sem erros |
| Testes | Testes passando |
| Aprovação | Confirmação do usuário |

---

## 🎯 COMPROMISSO

EU, KIRO AI, ME COMPROMETO A:

1. ✅ SEMPRE ler napkin.md e status.md no início
2. ✅ SEMPRE fazer análise preventiva
3. ✅ SEMPRE atualizar napkin com lições aprendidas
4. ✅ NUNCA mentir sobre status

---

**Data:** [DATA DE CRIAÇÃO]
**Status:** ATIVO E OBRIGATÓRIO
```

---

### **NAPKIN.MD - Template Completo**

```markdown
# 🧠 Napkin Runbook — [NOME DO PROJETO]

> Runbook curado continuamente. Lido no início de TODA sessão.
> Máximo 10 itens por categoria, priorizados por importância.

---

## 🔧 Regras de Curadoria

- Re-priorizar a cada leitura
- Manter apenas orientações recorrentes
- Máximo 10 itens por categoria
- Cada item: data + "Do instead"
- Remover obsoletos

---

## 🎯 Execução & Validação (Prioridade Máxima)

1. **[YYYY-MM-DD] Primeira lição importante**
   Do instead: Ação concreta e repetível.

2. **[YYYY-MM-DD] Segunda lição importante**
   Do instead: Ação concreta e repetível.

[... até 10 itens ...]

---

## 🏗️ Arquitetura & Backend

1. **[YYYY-MM-DD] Lição sobre arquitetura**
   Do instead: Ação concreta.

[... até 10 itens ...]

---

## 🎨 UI/UX & Design

1. **[YYYY-MM-DD] Lição sobre UI**
   Do instead: Ação concreta.

[... até 10 itens ...]

---

## 🗄️ Banco de Dados

1. **[YYYY-MM-DD] Lição sobre banco**
   Do instead: Ação concreta.

[... até 10 itens ...]

---

## 🚀 Deploy & Ambiente

1. **[YYYY-MM-DD] Lição sobre deploy**
   Do instead: Ação concreta.

[... até 10 itens ...]

---

## 👤 Diretrizes do Usuário

1. **[YYYY-MM-DD] Preferência do usuário**
   Do instead: Seguir exatamente esta preferência.

[... até 10 itens ...]
```

**Dicas para categorias:**

- Adapte ao seu projeto (web, mobile, backend, etc)
- Mantenha 5-7 categorias principais
- Priorize por importância (mais crítico primeiro)
- Use emojis para facilitar leitura

---

### **STATUS.MD - Template Simplificado**

```markdown
# 🚦 STATUS DO PROJETO — [NOME DO PROJETO]

> Leia no início de toda sessão antes de qualquer ação.
> Atualize ao final de cada sessão.

---

## TAREFA ATUAL

**[NOME DA TAREFA]** [STATUS] ([DATA])

### Objetivo
[Descrever objetivo da tarefa]

### Status da Implementação
[Descrever status atual]

### Próximos Passos
- ⏳ [Próximo passo 1]
- ⏳ [Próximo passo 2]

---

## TAREFA ANTERIOR

**[NOME DA TAREFA]** ✅ CONCLUÍDA ([DATA])

### Objetivo
[Objetivo da tarefa]

### Evidências
- ✅ [Evidência 1]
- ✅ [Evidência 2]

---

[... histórico de tarefas anteriores ...]
```

---

## ✅ VALIDAÇÃO E TESTES

### **Checklist de Validação**

Após implementar, validar:

- [ ] Pasta `.kiro/docs/` criada
- [ ] Arquivos movidos de `steering/` para `docs/`
- [ ] `AGENTS.md` reescrito (versão enxuta)
- [ ] `napkin.md` criado com template
- [ ] `status.md` movido para `docs/`
- [ ] `README.md` criado
- [ ] Frontmatter `inclusion: always` apenas no AGENTS.md
- [ ] Commit realizado
- [ ] Push realizado

### **Teste de Contexto**

1. **Verificar contexto antes:**
   - Abrir painel do Kiro
   - Ver % de contexto usado por steering files

2. **Verificar contexto depois:**
   - Recarregar Kiro
   - Ver novo % de contexto
   - Confirmar redução de ~85%

3. **Testar leitura do napkin:**
   - Iniciar nova sessão
   - Verificar se Kiro lê napkin.md
   - Verificar se aplica lições automaticamente

### **Teste de Funcionalidade**

```
Teste 1: Início de sessão
- Iniciar nova sessão
- Verificar se Kiro lê napkin.md
- Verificar se Kiro lê status.md
- Confirmar que trabalha normalmente

Teste 2: Atualização do napkin
- Fazer uma tarefa
- Cometer um erro
- Corrigir o erro
- Verificar se napkin foi atualizado

Teste 3: Aplicação de lições
- Iniciar nova sessão
- Verificar se Kiro evita erro anterior
- Confirmar aprendizado funcionando
```

---

## 🔄 MANUTENÇÃO

### **Atualização do Napkin**

**Durante o trabalho:**
- Adicione lições aprendidas imediatamente
- Use formato: `[YYYY-MM-DD] Lição` + `Do instead: Ação`
- Mantenha máximo 10 itens por categoria

**Curadoria (semanal):**
- Re-priorize itens por importância
- Remova duplicatas
- Remova itens obsoletos
- Merge itens similares

**Exemplo de curadoria:**

```markdown
ANTES (duplicado):
1. [2026-03-01] Usar bcrypt para senhas
2. [2026-03-10] Usar bcryptjs em serverless

DEPOIS (merged):
1. [2026-03-10] Usar bcryptjs (não bcrypt) em serverless
   Do instead: bcryptjs é 100% JavaScript, ideal para serverless.
```

### **Atualização do Status**

**Ao final de cada tarefa:**
- Mova "TAREFA ATUAL" para "TAREFA ANTERIOR"
- Adicione nova "TAREFA ATUAL"
- Mantenha histórico das últimas 5-10 tarefas
- Archive tarefas antigas em arquivo separado (opcional)

### **Revisão Mensal**

**Checklist mensal:**
- [ ] Revisar napkin.md (remover obsoletos)
- [ ] Revisar AGENTS.md (atualizar se necessário)
- [ ] Limpar status.md (mover histórico antigo)
- [ ] Atualizar README.md (se estrutura mudou)
- [ ] Verificar economia de contexto (ainda ~85%?)

---

## 🎯 TROUBLESHOOTING

### **Problema: Napkin não é lido no início**

**Solução:**
1. Verificar se AGENTS.md tem instrução de leitura
2. Verificar se napkin.md está em `.kiro/docs/`
3. Testar manualmente: pedir ao Kiro para ler napkin

### **Problema: Contexto ainda alto**

**Solução:**
1. Verificar se arquivos foram movidos para `docs/`
2. Verificar se apenas AGENTS.md tem `inclusion: always`
3. Verificar tamanho do AGENTS.md (deve ser ~7 KB)

### **Problema: Napkin crescendo demais**

**Solução:**
1. Fazer curadoria: remover itens de baixa prioridade
2. Manter máximo 10 itens por categoria
3. Merge itens similares
4. Remover obsoletos

### **Problema: Lições não sendo aplicadas**

**Solução:**
1. Verificar se lições estão claras ("Do instead")
2. Verificar se Kiro está lendo napkin no início
3. Adicionar mais contexto na lição
4. Mover lição para categoria de maior prioridade

---

## 📊 EXEMPLOS PRÁTICOS

### **Exemplo 1: Projeto React/Node.js**

```
.kiro/
├── steering/
│   └── AGENTS.md (6 KB)
├── docs/
│   ├── napkin.md (5 KB)
│   ├── status.md (40 KB)
│   ├── tech.md (10 KB) - Padrões React/Node
│   ├── api-docs.md (8 KB) - Documentação de APIs
│   └── deploy.md (5 KB) - Procedimento de deploy
└── README.md

Categorias do napkin:
- Execução & Validação
- Arquitetura & Backend (Node/Express)
- UI/UX & React
- APIs & Integrações
- Deploy & Vercel
- Diretrizes do Usuário
```

### **Exemplo 2: Projeto Mobile (React Native)**

```
.kiro/
├── steering/
│   └── AGENTS.md (6 KB)
├── docs/
│   ├── napkin.md (5 KB)
│   ├── status.md (35 KB)
│   ├── tech.md (12 KB) - Padrões React Native
│   ├── navigation.md (6 KB) - Estrutura de navegação
│   └── build.md (8 KB) - Build iOS/Android
└── README.md

Categorias do napkin:
- Execução & Validação
- Arquitetura & Navegação
- UI/UX & Componentes
- APIs & Async Storage
- Build & Deploy (App Store/Play Store)
- Diretrizes do Usuário
```

### **Exemplo 3: Projeto Python/FastAPI**

```
.kiro/
├── steering/
│   └── AGENTS.md (7 KB)
├── docs/
│   ├── napkin.md (6 KB)
│   ├── status.md (50 KB)
│   ├── tech.md (9 KB) - Padrões Python
│   ├── database.md (15 KB) - Schema SQLAlchemy
│   └── docker.md (7 KB) - Docker/Docker Compose
└── README.md

Categorias do napkin:
- Execução & Validação
- Arquitetura & APIs (FastAPI)
- Banco de Dados & ORMs
- Testes & Pytest
- Deploy & Docker
- Diretrizes do Usuário
```

---

## 🎓 BOAS PRÁTICAS

### **Do's (Fazer):**

✅ **Manter AGENTS.md enxuto** (máx 10 KB)
✅ **Atualizar napkin durante o trabalho** (não só no final)
✅ **Usar formato consistente** ([DATA] Lição + Do instead)
✅ **Priorizar por importância** (mais crítico primeiro)
✅ **Fazer curadoria regular** (semanal/mensal)
✅ **Testar economia de contexto** (validar ~85%)
✅ **Documentar estrutura** (README.md atualizado)

### **Don'ts (Não Fazer):**

❌ **Não deixar AGENTS.md crescer** (mover para docs/)
❌ **Não ignorar curadoria do napkin** (vai crescer demais)
❌ **Não usar napkin como log** (apenas lições recorrentes)
❌ **Não duplicar informações** (consolidar em um lugar)
❌ **Não esquecer frontmatter** (`inclusion: always` só no AGENTS.md)
❌ **Não pular leitura do napkin** (obrigatório no início)

---

## 📋 CHECKLIST FINAL

### **Antes de Implementar:**

- [ ] Li este guia completamente
- [ ] Entendi o conceito do Napkin
- [ ] Identifiquei arquivos pesados no projeto
- [ ] Planejei categorias do napkin para o projeto
- [ ] Fiz backup dos arquivos atuais

### **Durante a Implementação:**

- [ ] Criei pasta `.kiro/docs/`
- [ ] Movi arquivos pesados para `docs/`
- [ ] Criei `napkin.md` com template adaptado
- [ ] Reescrevi `AGENTS.md` (versão enxuta)
- [ ] Criei `README.md` documentando estrutura
- [ ] Verifiquei frontmatter (`inclusion: always` só no AGENTS.md)
- [ ] Fiz commit com mensagem descritiva
- [ ] Fiz push para repositório

### **Após a Implementação:**

- [ ] Testei economia de contexto (antes vs depois)
- [ ] Testei leitura do napkin no início de sessão
- [ ] Validei que Kiro aplica lições aprendidas
- [ ] Documentei economia de contexto no README
- [ ] Compartilhei estrutura com equipe (se aplicável)

---

## 🚀 PRÓXIMOS PASSOS

### **Imediato (Primeira Semana):**

1. Observar se Kiro lê napkin no início
2. Adicionar primeiras lições aprendidas
3. Validar economia de contexto
4. Ajustar categorias se necessário

### **Curto Prazo (Primeiro Mês):**

1. Acumular 5-10 lições por categoria
2. Fazer primeira curadoria do napkin
3. Validar que lições são aplicadas
4. Ajustar AGENTS.md se necessário

### **Longo Prazo (Contínuo):**

1. Curadoria mensal do napkin
2. Manter máximo 10 itens/categoria
3. Atualizar README conforme evolui
4. Compartilhar aprendizados com equipe

---

## 📚 REFERÊNCIAS

### **Projeto de Referência:**
- **Nome:** Slim Quality
- **Repositório:** [Link se público]
- **Commit:** `6aae3f0` (reestruturação)
- **Economia:** 85% de redução de contexto

### **Skill Original:**
- **Nome:** Napkin
- **Autor:** Codex
- **Versão:** 6.0.0
- **Repositório:** https://github.com/blader/napkin

### **Documentação Kiro:**
- Steering Files: [Link documentação Kiro]
- MCP Settings: [Link documentação Kiro]
- Hooks: [Link documentação Kiro]

---

## 💬 SUPORTE

### **Dúvidas Comuns:**

**P: Posso usar em projeto existente?**
R: Sim! Siga o passo a passo de migração.

**P: Funciona em qualquer linguagem?**
R: Sim! Adapte as categorias do napkin ao seu stack.

**P: Preciso usar todas as categorias?**
R: Não. Adapte ao seu projeto (5-7 categorias recomendado).

**P: E se o napkin crescer demais?**
R: Faça curadoria: remova obsoletos, mantenha máx 10/categoria.

**P: Posso ter napkin global + local?**
R: Não recomendado. Use um napkin por projeto.

---

## ✅ CONCLUSÃO

Esta estrutura foi testada e validada no projeto Slim Quality, resultando em:

- ✅ 85% de redução no contexto permanente
- ✅ Memória de longo prazo funcionando
- ✅ Aprendizado contínuo entre sessões
- ✅ Documentação organizada e escalável

**Siga este guia passo a passo e você terá os mesmos benefícios!**

---

**Versão do Guia:** 1.0  
**Data:** 12/03/2026  
**Autor:** Renato Carraro  
**Projeto:** Slim Quality  
**Status:** ✅ Testado e Validado

---

## 📝 CHANGELOG

### v1.0 (12/03/2026)
- Versão inicial do guia
- Baseado na implementação do Slim Quality
- Inclui templates completos
- Inclui exemplos práticos
- Inclui troubleshooting
