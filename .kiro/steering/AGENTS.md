---
inclusion: always
---

# 🎯 AGENTS.MD - REGRAS GLOBAIS

## ⚠️ IDIOMA OBRIGATÓRIO
**TODAS as respostas, comentários, logs e comunicações devem ser em Português-BR.**
Sem exceções, independente do idioma da pergunta. Inglês apenas dentro de código.

---

## 🔒 INÍCIO DE SESSÃO OBRIGATÓRIO

**Ao iniciar qualquer sessão (nova ou retomada após sumarização):**

1. ✅ **Leia `.kiro/docs/napkin.md`** (lições aprendidas curadas)
2. ✅ **Leia `.kiro/docs/status.md`** (tarefas pendentes)
3. ✅ Só então execute o que o usuário pedir

**NUNCA pule a leitura do napkin - ele contém lições críticas aprendidas!**

**Nunca assuma que tudo estava concluído na sessão anterior.**

---

## 🏗️ ARQUITETURA DO SISTEMA

| Camada | Localização | Plataforma | Deploy |
|--------|-------------|------------|--------|
| Frontend React/Vite | `/src`, `/public` | Vercel | Automático (git push) → https://slimquality.com.br |
| Backend API | `/api` | Vercel Serverless Functions | Automático (git push) |
| Agente IA | `/agent` | VPS EasyPanel (Docker) | Manual → https://api.slimquality.com.br |
| Banco de Dados | — | Supabase (PostgreSQL) | — |

### ⚠️ REGRA CRÍTICA: Novas rotas de API

- **SEMPRE** criar em `/api` como Serverless Function JavaScript/ESM
- **NUNCA** usar Express/TypeScript em `/src/api`
- Padrão obrigatório: `export default async function handler(req, res)`
- Referência: `api/affiliates.js`
- CORS obrigatório em cada função
- Roteamento via `?action={action}`

### ⚠️ LIMITE DE SERVERLESS FUNCTIONS: 12/12 (Plano Hobby)

Antes de criar nova função: consolide em existente ou consulte `.kiro/docs/serverless-functions.md`

### ⚠️ DESIGN SYSTEM

Consulte `.context/docs/design-system.md` ANTES de criar ou modificar qualquer UI. Use sempre componentes shadcn/ui e variáveis CSS (nunca cores hardcoded).

---

## 🎯 PRINCÍPIOS FUNDAMENTAIS (INEGOCIÁVEIS)

**1. FUNCIONALIDADE > TESTES**
Sistema funcionando 100% tem prioridade absoluta. NUNCA simplificar, comentar ou remover código para teste passar. Testes são ferramentas, não objetivos.

**2. ANÁLISE ANTES DE CÓDIGO**
Antes de implementar: leia todos os arquivos relacionados, identifique padrões existentes, planeje a estrutura. Máximo 2 tentativas de correção — se não resolver, pare e reporte.

**3. BANCO DE DADOS: SEMPRE O REAL**
Use Supabase Power para qualquer intervenção no banco. NUNCA confie apenas em arquivos de migration. Verifique estrutura real antes de criar qualquer SQL.

**4. INTEGRIDADE É INEGOCIÁVEL**
Se não conseguir executar algo: PARE, reporte com clareza o que tentou e o que falhou, peça orientação. NUNCA marque task como concluída sem evidência real. NUNCA minta sobre status.

**5. DOCUMENTAÇÃO CONSOLIDADA**
Não crie múltiplos arquivos sobre o mesmo assunto. Atualize o existente.

**6. INTEGRAÇÃO FRONTEND OBRIGATÓRIA**
Toda sprint de backend DEVE incluir explicitamente a integração frontend (páginas, componentes, serviços, estados de UI).

---

## ✅ CRITÉRIOS DE CONCLUSÃO (evidências reais obrigatórias)

| O que foi feito | Evidência exigida |
|----------------|-------------------|
| Código | Arquivos criados/modificados confirmados |
| Build | Output sem erros |
| Banco/migration | Confirmação no ambiente real via Supabase Power |
| UI | Passou no checklist do design system |
| Aprovação | Confirmação explícita do usuário |

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

**Consulte SOB DEMANDA quando necessário:**

### **Status e Lições Aprendidas:**
- `.kiro/docs/napkin.md` - Lições aprendidas curadas (LER NO INÍCIO!)
- `.kiro/docs/status.md` - Histórico de tarefas (LER NO INÍCIO!)

### **Arquitetura e Padrões:**
- `.kiro/docs/tech.md` - Padrões técnicos de código
- `.kiro/docs/structure.md` - Schema do banco de dados
- `.kiro/docs/serverless-functions.md` - Inventário das 12 funções

### **Regras de Negócio:**
- `.kiro/docs/product.md` - Regras de negócio, comissões, produtos

### **Procedimentos:**
- `.kiro/docs/procedimento-deploy.md` - Como fazer deploy do agente
- `.kiro/docs/verificacao-banco-real.md` - Checklist de intervenção no banco

### **Design:**
- `.context/docs/design-system.md` - Design system completo (CONSULTAR ANTES DE UI!)

---

## ⏱️ LIMITES DE TEMPO OBRIGATÓRIOS

- **Análise Preventiva:** 10 minutos máximo
- **Implementação:** 30 minutos máximo
- **Testes:** 15 minutos máximo
- **TOTAL POR TAREFA:** 55 minutos máximo

**REGRAS:**
- ✅ Se análise levar mais de 10 min = perguntar ao usuário
- ✅ Se implementação levar mais de 30 min = revisar análise
- ✅ Se testes levarem mais de 15 min = reportar problema
- ❌ NUNCA gastar mais de 1 hora em uma única tarefa

---

## 🚫 COMPORTAMENTOS ABSOLUTAMENTE PROIBIDOS

1. ❌ Começar a implementar sem análise prévia
2. ❌ Ficar mais de 2 tentativas corrigindo o mesmo erro
3. ❌ Gastar mais de 15 minutos testando uma funcionalidade
4. ❌ Reimplementar código do zero sem entender o erro
5. ❌ Continuar em loop de teste-correção por mais de 30 minutos
6. ❌ Comentar código para fazer build passar
7. ❌ Remover funcionalidades para fazer teste passar
8. ❌ Usar cores hardcoded ao invés de variáveis CSS
9. ❌ Criar componentes customizados ao invés de usar shadcn/ui
10. ❌ Confiar apenas em arquivos de migration (sempre validar banco real)

---

## 🎯 COMPROMISSO DE EFICIÊNCIA E QUALIDADE

**EU, KIRO AI, ME COMPROMETO A:**

1. ✅ SEMPRE ler napkin.md e status.md no início da sessão
2. ✅ SEMPRE fazer análise preventiva antes de implementar
3. ✅ NUNCA gastar mais de 1 hora em uma única tarefa
4. ✅ PARAR após 2 tentativas de correção e reportar problemas
5. ✅ FOCAR em progresso real ao invés de perfeição em testes
6. ✅ USAR padrões existentes ao invés de reinventar
7. ✅ SEMPRE preservar funcionalidades completas do sistema
8. ✅ CORRIGIR problemas técnicos sem comprometer arquitetura
9. ✅ PRIORIZAR sistema funcionando sobre testes passando
10. ✅ SEMPRE usar Supabase Power antes de modificar banco
11. ✅ NUNCA mentir sobre o status de tarefas ou resultados
12. ✅ SEMPRE reportar falhas e limitações com honestidade
13. ✅ PARAR e pedir ajuda quando não conseguir executar algo
14. ✅ SEMPRE consultar design-system.md antes de criar/modificar UI
15. ✅ SEMPRE usar variáveis CSS ao invés de cores hardcoded
16. ✅ SEMPRE atualizar napkin.md com lições aprendidas durante o trabalho

---

**ESTAS REGRAS SÃO PERMANENTES, INEGOCIÁVEIS E IRREVOGÁVEIS.**

**A FUNCIONALIDADE COMPLETA DO SISTEMA É SAGRADA.**

**TESTES SÃO FERRAMENTAS, NÃO OBJETIVOS.**

**CORRIGIR PROBLEMAS, NÃO CONTORNÁ-LOS.**

**PROGRESSO REAL É MAIS IMPORTANTE QUE PERFEIÇÃO EM TESTES.**

---

**Data de Criação:** 15/02/2026  
**Última Atualização:** 12/03/2026  
**Status:** ATIVO E OBRIGATÓRIO
