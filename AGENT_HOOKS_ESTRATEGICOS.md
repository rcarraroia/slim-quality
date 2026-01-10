# 🎣 AGENT HOOKS ESTRATÉGICOS - SLIM QUALITY

## 🎯 OBJETIVO

Criar hooks automáticos que garantam que validações críticas NUNCA sejam esquecidas, melhorando a qualidade do código e reduzindo bugs em produção.

---

## 🔥 HOOKS CRÍTICOS RECOMENDADOS

### 1. HOOK: Validação Antes de Commit
**Evento:** Quando mensagem contém "commit" ou "push"  
**Ação:** Executar checklist de validação

**Prompt para o agente:**
```
ANTES DE FAZER COMMIT/PUSH, VALIDE:

□ Código compila sem erros? (npm run build)
□ Testes passam? (npm test)
□ Lint está ok? (npm run lint)
□ Não há console.logs esquecidos?
□ Variáveis de ambiente estão corretas?
□ RLS policies foram verificadas?

Se TUDO estiver OK, pode fazer commit.
Se ALGO falhar, CORRIJA antes de commitar.
```

---

### 2. HOOK: Verificação de RLS Após Migration
**Evento:** Quando arquivo em `supabase/migrations/` é salvo  
**Ação:** Verificar políticas RLS

**Comando Shell:**
```bash
echo "🔒 Verificando políticas RLS..."
# Conectar ao Supabase e verificar RLS
```

**Prompt para o agente:**
```
Uma migration foi aplicada. VERIFIQUE:

□ Tabelas novas têm RLS ativo?
□ Políticas de SELECT estão corretas?
□ Políticas de INSERT permitem operações necessárias?
□ Não há tabelas sem políticas?

Use o Power Supabase para verificar:
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';
```

---

### 3. HOOK: Validação de Integração Frontend/Backend
**Evento:** Quando arquivo em `src/services/` é salvo  
**Ação:** Verificar se contrato de dados está correto

**Prompt para o agente:**
```
Um serviço foi modificado. VERIFIQUE:

□ Tipos TypeScript estão corretos?
□ Retorno da função está no formato esperado?
□ Frontend espera esse formato?
□ Há tratamento de erro adequado?
□ Há fallback para dados vazios?

Se houver inconsistência, CORRIJA antes de continuar.
```

---

### 4. HOOK: Teste de Afiliados Após Mudança
**Evento:** Quando arquivo relacionado a afiliados é salvo  
**Ação:** Executar teste de integração

**Arquivos monitorados:**
- `src/services/affiliates/*`
- `src/services/frontend/affiliate.service.ts`
- `api/checkout.js`

**Comando Shell:**
```bash
echo "🧪 Testando sistema de afiliados..."
npm run test:affiliates
```

**Prompt para o agente:**
```
Sistema de afiliados foi modificado. TESTE:

□ Cadastro de afiliado funciona?
□ Afiliado aparece na rede de quem indicou?
□ Split de comissões está correto?
□ RLS permite visualização da rede?

Execute queries de validação no Supabase.
```

---

### 5. HOOK: Análise Preventiva Obrigatória
**Evento:** Quando nova mensagem é enviada com palavra-chave "implementar", "criar", "adicionar"  
**Ação:** Forçar análise preventiva

**Prompt para o agente:**
```
⚠️ ANÁLISE PREVENTIVA OBRIGATÓRIA

Antes de implementar, RESPONDA:

1. ENTENDIMENTO DA TAREFA
   - O que exatamente precisa ser implementado?
   - Que arquivos serão modificados?

2. DEPENDÊNCIAS
   - Que outros serviços/classes serão usados?
   - Que imports são necessários?

3. PADRÕES EXISTENTES
   - Como tarefas similares foram implementadas?
   - Que estrutura de código seguir?

4. PONTOS DE RISCO
   - Onde podem ocorrer erros?
   - Que validações são necessárias?

5. ESTRATÉGIA
   - Em que ordem implementar?
   - Como testar?

SÓ IMPLEMENTE APÓS RESPONDER TODAS AS PERGUNTAS.
```

---

### 6. HOOK: Verificação de Deploy
**Evento:** Após conclusão de execução do agente que fez commit  
**Ação:** Verificar status do deploy

**Comando Shell:**
```bash
echo "🚀 Verificando status do deploy..."
# Aguardar 2 minutos
timeout /t 120 /nobreak
```

**Prompt para o agente:**
```
Deploy foi iniciado. VERIFIQUE:

□ Deploy do Vercel foi bem-sucedido?
□ Build passou sem erros?
□ Site está acessível?
□ Não há erros no console do navegador?

Use o MCP Vercel para verificar:
- Status do último deploy
- Logs de build
- Erros reportados
```

---

### 7. HOOK: Monitoramento de Erros em Produção
**Evento:** A cada 1 hora (hook manual ou agendado)  
**Ação:** Verificar erros no Sentry

**Prompt para o agente:**
```
🔍 VERIFICAÇÃO PERIÓDICA DE ERROS

Use o MCP Sentry para verificar:

□ Há novos erros nas últimas horas?
□ Algum erro está afetando muitos usuários?
□ Há erros críticos não resolvidos?

Se houver erros críticos:
1. Crie issue no GitHub
2. Notifique o usuário
3. Priorize correção
```

---

### 8. HOOK: Validação de Dados no Banco
**Evento:** Quando arquivo em `api/` é salvo  
**Ação:** Verificar integridade dos dados

**Prompt para o agente:**
```
API foi modificada. VALIDE NO BANCO:

□ Dados estão sendo salvos corretamente?
□ Foreign keys estão corretas?
□ Não há dados órfãos?
□ Timestamps estão sendo atualizados?

Execute queries de validação:
- SELECT COUNT(*) FROM affiliates WHERE referred_by IS NOT NULL AND referred_by NOT IN (SELECT id FROM affiliates);
- SELECT * FROM affiliate_network WHERE parent_affiliate_id NOT IN (SELECT id FROM affiliates);
```

---

### 9. HOOK: Sincronização de Tabelas
**Evento:** Quando afiliado é criado  
**Ação:** Verificar se ambas as tabelas foram atualizadas

**Prompt para o agente:**
```
⚠️ VERIFICAÇÃO DE SINCRONIZAÇÃO

Quando um afiliado é criado, AMBAS as tabelas devem ser atualizadas:

□ Registro em `affiliates` foi criado?
□ Registro em `affiliate_network` foi criado (se houver referred_by)?
□ Dados estão consistentes entre as tabelas?

Execute:
SELECT a.id, a.referred_by, an.parent_affiliate_id 
FROM affiliates a 
LEFT JOIN affiliate_network an ON a.id = an.affiliate_id 
WHERE a.referred_by IS NOT NULL AND an.id IS NULL;

Se houver inconsistências, CORRIJA imediatamente.
```

---

### 10. HOOK: Documentação Automática
**Evento:** Após conclusão de execução do agente  
**Ação:** Atualizar documentação

**Prompt para o agente:**
```
Execução concluída. DOCUMENTE:

□ O que foi implementado?
□ Que arquivos foram modificados?
□ Há breaking changes?
□ Precisa atualizar README?

Se houver mudanças significativas, atualize:
- README.md
- CHANGELOG.md
- Documentação técnica relevante
```

---

## 📋 COMO CRIAR OS HOOKS NO KIRO

### Método 1: Via Command Palette
1. Abra Command Palette (Ctrl+Shift+P)
2. Digite: "Open Kiro Hook UI"
3. Clique em "Create New Hook"
4. Configure evento, ação e prompt

### Método 2: Via Explorer
1. Abra a view "Agent Hooks" no Explorer
2. Clique no botão "+"
3. Configure o hook

### Método 3: Via Arquivo (Avançado)
Criar arquivo em `.kiro/hooks/hook-name.json`:
```json
{
  "name": "Validação Antes de Commit",
  "trigger": {
    "type": "message",
    "pattern": "commit|push"
  },
  "action": {
    "type": "prompt",
    "message": "ANTES DE FAZER COMMIT/PUSH, VALIDE: ..."
  },
  "enabled": true
}
```

---

## 🎯 PRIORIDADE DE IMPLEMENTAÇÃO

### CRÍTICOS (Implementar AGORA)
1. ✅ Validação Antes de Commit
2. ✅ Análise Preventiva Obrigatória
3. ✅ Sincronização de Tabelas

### ALTOS (Implementar esta semana)
4. ✅ Verificação de RLS Após Migration
5. ✅ Validação de Integração Frontend/Backend
6. ✅ Teste de Afiliados Após Mudança

### MÉDIOS (Implementar quando possível)
7. ✅ Verificação de Deploy
8. ✅ Monitoramento de Erros em Produção
9. ✅ Validação de Dados no Banco
10. ✅ Documentação Automática

---

## 💡 BENEFÍCIOS ESPERADOS

### Redução de Bugs
- ❌ Antes: Bugs descobertos em produção
- ✅ Depois: Bugs detectados antes do commit

### Qualidade de Código
- ❌ Antes: Código sem validação adequada
- ✅ Depois: Validação automática em cada mudança

### Consistência
- ❌ Antes: Esquecer de verificar RLS, testes, etc.
- ✅ Depois: Hooks garantem que nada seja esquecido

### Produtividade
- ❌ Antes: Tempo gasto corrigindo bugs em produção
- ✅ Depois: Tempo gasto desenvolvendo features

---

## 🔧 CONFIGURAÇÃO RECOMENDADA

### Hook Global (Sempre Ativo)
```json
{
  "name": "Análise Preventiva Global",
  "trigger": {
    "type": "message",
    "pattern": ".*"
  },
  "action": {
    "type": "prompt",
    "message": "Antes de qualquer implementação, lembre-se de: 1) Ler arquivos relacionados, 2) Entender padrões existentes, 3) Planejar antes de codificar"
  },
  "enabled": true
}
```

### Hook Específico (Afiliados)
```json
{
  "name": "Validação Sistema Afiliados",
  "trigger": {
    "type": "file_save",
    "pattern": "**/affiliates/**"
  },
  "action": {
    "type": "shell",
    "command": "npm run test:affiliates"
  },
  "enabled": true
}
```

---

## 📊 MÉTRICAS DE SUCESSO

Após implementar os hooks, espera-se:
- 📉 **-80%** bugs em produção
- 📈 **+50%** cobertura de testes
- ⚡ **-60%** tempo de debug
- ✅ **+90%** consistência de código

---

**Documento criado em:** 09/01/2026  
**Status:** Pronto para implementação  
**Prioridade:** CRÍTICA
