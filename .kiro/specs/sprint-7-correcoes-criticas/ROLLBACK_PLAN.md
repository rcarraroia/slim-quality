# Plano de Rollback - Sprint 7: Correções Críticas

## 🚨 Objetivo

Garantir que podemos reverter mudanças rapidamente em caso de problemas críticos em produção, minimizando impacto aos usuários.

---

## 📋 Pré-requisitos para Deploy

### Antes de Cada Fase

- [ ] Backup completo do banco de dados
- [ ] Branch separada criada (`sprint-7-fase-X`)
- [ ] Feature flags configuradas (se aplicável)
- [ ] Plano de comunicação com usuários pronto
- [ ] Equipe de plantão disponível

---

## 🔄 Estratégia de Rollback por Fase

### FASE 1: Backend Afiliados + Remoção de Mocks

#### Cenários de Rollback

**Cenário 1: APIs retornando erros 500**
- **Sintoma:** Taxa de erro > 5% nas APIs de afiliados
- **Ação Imediata:**
  1. Reverter deploy via Vercel (rollback para versão anterior)
  2. Verificar logs de erro
  3. Notificar equipe
- **Tempo Estimado:** 5 minutos

**Cenário 2: Dados mockados causando problemas**
- **Sintoma:** Páginas em branco ou erros de renderização
- **Ação Imediata:**
  1. Restaurar imports de mockData.ts temporariamente
  2. Deploy hotfix
  3. Investigar causa raiz
- **Tempo Estimado:** 15 minutos

**Cenário 3: Redirecionamento quebrado**
- **Sintoma:** Usuários não conseguem acessar dashboards
- **Ação Imediata:**
  1. Reverter mudanças em AuthContext e AuthRedirect
  2. Deploy hotfix
  3. Testar todos os roles
- **Tempo Estimado:** 10 minutos

#### Rollback Completo Fase 1

```bash
# 1. Reverter deploy
vercel rollback

# 2. Restaurar banco (se migrations foram executadas)
psql $DATABASE_URL < backup_pre_fase1.sql

# 3. Verificar sistema
npm run smoke-tests

# 4. Notificar usuários
# (via email/dashboard)
```

**Tempo Total:** 20-30 minutos

---

### FASE 2: CRM + RLS + Comissões + Saques

#### Cenários de Rollback

**Cenário 1: RLS policies bloqueando acesso legítimo**
- **Sintoma:** Usuários não conseguem ver próprios dados
- **Ação Imediata:**
  1. Desabilitar RLS temporariamente (APENAS EM EMERGÊNCIA)
  2. Investigar policies
  3. Corrigir e reativar
- **Tempo Estimado:** 30 minutos

**Cenário 2: Migration de withdrawals com problemas**
- **Sintoma:** Erros ao acessar tabela withdrawals
- **Ação Imediata:**
  1. Restaurar backup do banco
  2. Reverter migration
  3. Investigar problema
- **Tempo Estimado:** 15 minutos

**Cenário 3: Performance degradada**
- **Sintoma:** Queries lentas, timeout
- **Ação Imediata:**
  1. Adicionar índices emergenciais
  2. Limitar queries (adicionar LIMIT)
  3. Cachear resultados
- **Tempo Estimado:** 20 minutos

#### Rollback Completo Fase 2

```bash
# 1. Reverter deploy
vercel rollback

# 2. Restaurar banco
psql $DATABASE_URL < backup_pre_fase2.sql

# 3. Verificar RLS policies
supabase db check

# 4. Testar funcionalidades críticas
npm run e2e-tests

# 5. Notificar usuários
```

**Tempo Total:** 30-45 minutos

---

## 🛡️ Feature Flags (Recomendado)

### Implementação

```typescript
// src/config/features.ts
export const FEATURES = {
  USE_REAL_AFFILIATE_DATA: process.env.VITE_FEATURE_REAL_AFFILIATES === 'true',
  USE_REAL_COMMISSION_DATA: process.env.VITE_FEATURE_REAL_COMMISSIONS === 'true',
  ENABLE_WITHDRAWALS: process.env.VITE_FEATURE_WITHDRAWALS === 'true',
  ENABLE_NEW_REDIRECT: process.env.VITE_FEATURE_NEW_REDIRECT === 'true',
};
```

### Uso nas Páginas

```typescript
// Exemplo: ListaAfiliados.tsx
const afiliados = FEATURES.USE_REAL_AFFILIATE_DATA
  ? useAdminAffiliates()
  : mockAfiliadosAdmin;
```

### Vantagens

- Rollback instantâneo (apenas mudar variável de ambiente)
- Teste A/B possível
- Rollback parcial (desabilitar apenas feature problemática)

---

## 📊 Monitoramento e Alertas

### Métricas Críticas

**Fase 1:**
- Taxa de erro API afiliados < 1%
- Tempo de resposta < 2s
- Taxa de sucesso de login > 99%
- Redirecionamentos corretos > 99%

**Fase 2:**
- Taxa de erro API comissões < 1%
- Taxa de erro API saques < 1%
- Queries CRM < 2s
- RLS violations = 0

### Alertas Configurados

```yaml
# Exemplo: alerts.yml
alerts:
  - name: "High Error Rate"
    condition: error_rate > 5%
    action: notify_team
    severity: critical
    
  - name: "Slow API Response"
    condition: p95_response_time > 5s
    action: notify_team
    severity: warning
    
  - name: "RLS Violation"
    condition: rls_violation_count > 0
    action: notify_team + rollback
    severity: critical
```

---

## 🔍 Checklist de Validação Pós-Rollback

### Após Rollback Fase 1

- [ ] Usuários conseguem fazer login
- [ ] Redirecionamento funciona
- [ ] Páginas admin carregam (mesmo com mocks)
- [ ] Páginas afiliado carregam (mesmo com mocks)
- [ ] Taxa de erro < 1%

### Após Rollback Fase 2

- [ ] Tudo da Fase 1 funcionando
- [ ] CRM queries funcionam
- [ ] RLS não bloqueia acesso legítimo
- [ ] Performance aceitável
- [ ] Sem erros de banco

---

## 📞 Contatos de Emergência

**Equipe de Plantão:**
- Backend Lead: [contato]
- Frontend Lead: [contato]
- DevOps: [contato]
- Product Owner: [contato]

**Procedimento de Escalação:**
1. Detectar problema (monitoramento ou usuário)
2. Avaliar severidade (crítico vs não-crítico)
3. Executar rollback se crítico
4. Notificar equipe
5. Investigar causa raiz
6. Planejar correção
7. Re-deploy com fix

---

## 📝 Documentação de Incidentes

### Template de Post-Mortem

```markdown
# Incident Report - [Data]

## Resumo
[Descrição breve do problema]

## Timeline
- HH:MM - Problema detectado
- HH:MM - Rollback iniciado
- HH:MM - Sistema restaurado
- HH:MM - Causa raiz identificada

## Causa Raiz
[Análise detalhada]

## Impacto
- Usuários afetados: X
- Duração: Y minutos
- Funcionalidades impactadas: Z

## Ações Corretivas
1. [Ação 1]
2. [Ação 2]

## Lições Aprendidas
[O que aprendemos]

## Próximos Passos
[Como evitar no futuro]
```

---

## ✅ Testes de Rollback

### Antes do Deploy

**Simular Rollback em Staging:**

```bash
# 1. Deploy para staging
vercel deploy --env=staging

# 2. Executar testes
npm run e2e-tests

# 3. Simular problema
# (injetar erro intencional)

# 4. Executar rollback
vercel rollback --env=staging

# 5. Validar que sistema voltou ao normal
npm run smoke-tests

# 6. Documentar tempo de rollback
```

**Frequência:** Antes de cada deploy de fase

---

## 🎯 Critérios de Sucesso

### Rollback Bem-Sucedido

- [ ] Sistema restaurado em < 30 minutos
- [ ] Usuários conseguem usar funcionalidades básicas
- [ ] Taxa de erro voltou ao normal (< 1%)
- [ ] Equipe notificada e ciente
- [ ] Causa raiz identificada
- [ ] Plano de correção definido

### Quando NÃO Fazer Rollback

- Problema afeta < 1% dos usuários
- Workaround simples disponível
- Fix pode ser deployado rapidamente (< 15 min)
- Problema não é crítico (cosmético, UX menor)

---

## 📚 Referências

- [Vercel Rollback Documentation](https://vercel.com/docs/deployments/rollback)
- [Supabase Backup & Restore](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Point-in-Time Recovery](https://www.postgresql.org/docs/current/continuous-archiving.html)

---

**Última Atualização:** 19/11/2025
**Responsável:** Kiro AI + Equipe Backend
**Status:** Ativo e pronto para uso
