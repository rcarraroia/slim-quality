# AGENTS.md

## ⚠️ RESPOSTAS SEMPRE EM PORTUGUÊS-BR

Inglês apenas dentro de código (variáveis, funções, comentários inline).

---

## 🔒 INÍCIO DE SESSÃO OBRIGATÓRIO

1. Leia `.kiro/steering/STATUS.md` antes de qualquer ação
2. Liste em voz alta o que está PENDENTE
3. Só então execute o que foi solicitado
4.Leia o documento: E:\PROJETOS SITE\repositorios\slim-quality\.kiro\steering\analise-preventiva-obrigatoria.md

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

Antes de criar nova função: consolide em existente ou consulte `serverless-functions.md`

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

## 📚 ARQUIVOS DE REFERÊNCIA (consultar conforme necessidade)

- `product.md` — Regras de negócio, comissões, produtos
- `structure.md` — Arquitetura do banco de dados
- `tech.md` — Padrões técnicos de código
- `serverless-functions.md` — Inventário e limite das 12 funções
- `procedimento-deploy.md` — Como fazer deploy do agente
- `verificacao-banco-real.md` — Checklist de intervenção no banco
