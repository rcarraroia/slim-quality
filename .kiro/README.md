# 📁 Estrutura da Pasta .kiro

> Documentação da organização de arquivos e otimização de contexto

---

## 🎯 Objetivo da Reestruturação

**Problema anterior:** 16% do contexto ocupado permanentemente por arquivos de steering (129 KB)

**Solução implementada:** Separar arquivos por frequência de uso

**Resultado:** 85% de redução no contexto base (16% → 2-3%)

---

## 📂 Estrutura Atual

```
.kiro/
├── steering/                          ← Carregado SEMPRE (inclusion: always)
│   └── AGENTS.md                      ← 7 KB - Regras globais + referências
│
├── docs/                              ← Consultado SOB DEMANDA
│   ├── napkin.md                      ← 5 KB - Lições aprendidas curadas
│   ├── status.md                      ← 64 KB - Histórico de tarefas
│   ├── tech.md                        ← 12 KB - Padrões técnicos
│   ├── structure.md                   ← 11 KB - Schema do banco
│   ├── serverless-functions.md        ← 11 KB - Inventário de APIs
│   ├── product.md                     ← 9 KB - Regras de negócio
│   ├── procedimento-deploy.md         ← 7 KB - Deploy do agente
│   └── verificacao-banco-real.md      ← 4 KB - Checklist banco
│
├── specs/                             ← Specs de features
├── hooks/                             ← Hooks do Kiro
├── settings/                          ← Configurações MCP
└── audits/                            ← Auditorias do sistema
```

---

## 📖 Descrição dos Arquivos

### **steering/ (Carregado Automaticamente)**

#### `AGENTS.md` (7 KB)
- Regras globais inegociáveis
- Princípios fundamentais
- Referências para documentação detalhada
- Instruções de início de sessão
- **Carregado:** Automaticamente em toda sessão

---

### **docs/ (Consultado Sob Demanda)**

#### `napkin.md` (5 KB) ⭐ **NOVO**
- Lições aprendidas curadas
- Máximo 10 itens por categoria
- Atualizado continuamente durante o trabalho
- Curadoria automática (remove obsoletos, prioriza importantes)
- **Lido:** No início de toda sessão (obrigatório)

#### `status.md` (64 KB)
- Histórico cronológico de tarefas
- Evidências de commits e deploys
- Próximos passos por tarefa
- **Lido:** No início de toda sessão (obrigatório)

#### `tech.md` (12 KB)
- Padrões técnicos de código
- Convenções de nomenclatura
- Estrutura de arquivos
- **Consultado:** Quando trabalhar com código

#### `structure.md` (11 KB)
- Schema completo do banco de dados
- Relacionamentos entre tabelas
- Políticas RLS
- **Consultado:** Quando trabalhar com banco

#### `serverless-functions.md` (11 KB)
- Inventário das 12 Serverless Functions
- Limite do plano Hobby
- Histórico de consolidações
- **Consultado:** Antes de criar nova função

#### `product.md` (9 KB)
- Regras de negócio
- Sistema de comissões
- Tipos de produtos
- **Consultado:** Quando trabalhar com produtos/afiliados

#### `procedimento-deploy.md` (7 KB)
- Procedimento de deploy do agente IA
- Docker Hub + EasyPanel
- Checklist de deploy
- **Consultado:** Quando fazer deploy do agente

#### `verificacao-banco-real.md` (4 KB)
- Checklist de intervenção no banco
- Uso obrigatório do Supabase Power
- Validações necessárias
- **Consultado:** Antes de modificar banco

---

## 🔄 Fluxo de Trabalho

### **1. Início da Sessão**

```
1. Kiro carrega automaticamente: AGENTS.md (7 KB)
2. AGENTS.md instrui: "Leia napkin.md e status.md"
3. Kiro lê: napkin.md (5 KB) + status.md (64 KB)
4. Total carregado: 76 KB
```

### **2. Durante o Trabalho**

```
- Consulta docs/ conforme necessário
- Atualiza napkin.md com lições aprendidas
- Curadoria automática do napkin (remove obsoletos)
```

### **3. Final da Tarefa**

```
- Atualiza status.md com histórico
- Napkin já foi atualizado durante o trabalho
```

---

## 📊 Comparação de Contexto

| Cenário | Arquivos Carregados | Tamanho | % Contexto |
|---------|---------------------|---------|------------|
| **Antes** | 9 arquivos em steering/ | 129 KB | 16% |
| **Depois (base)** | 1 arquivo em steering/ | 7 KB | 2% |
| **Depois (início)** | AGENTS + napkin + status | 76 KB | 8% |

**Economia:** 85% de redução no contexto base permanente

---

## 🧠 Sobre o Napkin

### **O que é?**

Runbook curado continuamente que mantém apenas lições aprendidas de alto valor.

### **Como funciona?**

1. **Sessão 1:** Agente trabalha normalmente, comete erros, você corrige
2. **Sessão 3:** Agente detecta problemas ANTES de você avisar
3. **Sessão 5:** Agente antecipa problemas e segue suas preferências automaticamente

### **O que é registrado?**

- ✅ Erros do próprio agente (suposições errôneas, abordagens ruins)
- ✅ Suas correções (instruções de como fazer diferente)
- ✅ Surpresas do ambiente (aspectos não óbvios do projeto)
- ✅ Suas preferências (como você gosta que as coisas sejam feitas)
- ✅ O que funcionou (abordagens bem-sucedidas)

### **Curadoria Automática:**

- Re-prioriza itens por importância
- Remove duplicatas e obsoletos
- Mantém apenas orientações recorrentes
- Máximo 10 itens por categoria
- Tamanho controlado (~5-15 KB)

---

## ✅ Benefícios da Nova Estrutura

1. **Contexto otimizado:** 85% menos contexto ocupado permanentemente
2. **Respostas mais rápidas:** Menos dados para processar
3. **Memória de longo prazo:** Napkin acumula lições aprendidas
4. **Aprendizado contínuo:** Agente melhora a cada sessão
5. **Documentação organizada:** Fácil encontrar o que precisa
6. **Escalabilidade:** Adicionar novos docs não afeta contexto base

---

## 🚀 Próximos Passos

1. ✅ Estrutura implementada
2. ✅ Napkin criado com lições iniciais
3. ✅ AGENTS.md otimizado
4. ⏳ Testar economia de contexto em próximas sessões
5. ⏳ Validar que napkin é lido no início
6. ⏳ Observar curadoria automática funcionando

---

**Data de Implementação:** 12/03/2026  
**Commit:** `6aae3f0`  
**Status:** ✅ Ativo
