# SOLICITAÇÃO DE AUDITORIA TÉCNICA - SISTEMA SLIM QUALITY

## 🎯 OBJETIVO DA AUDITORIA

Realizar análise técnica completa do sistema de afiliados e comissões do projeto Slim Quality, identificando inconsistências arquiteturais, problemas de integração, e propor um plano de correção estruturado.

---

## 📋 CONTEXTO DO PROJETO

### Tecnologias
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Supabase (PostgreSQL)
- **Pagamentos:** Asaas API
- **Deploy:** Vercel (frontend automático) + EasyPanel (backend manual)

### Problema Atual
O sistema está com múltiplas inconsistências que causam efeito cascata:
- Correção de um bug causa outro bug
- Estruturas de dados duplicadas/conflitantes
- Integrações frontend/backend quebradas
- Políticas RLS mal configuradas

---

## 🔍 ÁREAS CRÍTICAS PARA AUDITORIA

### 1. SISTEMA DE AFILIADOS (PRIORIDADE MÁXIMA)

#### 1.1. Estrutura de Dados
**Problema identificado:** Duas estruturas diferentes para a mesma funcionalidade

**Tabelas envolvidas:**
- `affiliates` (tabela principal)
  - Coluna `referred_by` (UUID) - indica quem indicou
- `affiliate_network` (tabela de rede genealógica)
  - Colunas: `affiliate_id`, `parent_affiliate_id`, `level`, `path`

**Questões para investigar:**
- [ ] Qual estrutura deveria ser a fonte da verdade?
- [ ] As duas tabelas estão sincronizadas?
- [ ] Quando um afiliado é criado, ambas as tabelas são atualizadas?
- [ ] O frontend busca de qual tabela?
- [ ] O backend usa qual tabela para cálculo de comissões?

**Arquivos relacionados:**
- `src/layouts/CustomerDashboardLayout.tsx` (função `handleActivateAffiliate`)
- `src/services/affiliates/affiliate.service.ts` (função `createAffiliate`, `buildNetwork`)
- `src/services/frontend/affiliate.service.ts` (função `getNetwork`)
- `src/pages/afiliados/dashboard/MinhaRede.tsx`

#### 1.2. Políticas RLS (Row Level Security)
**Problema identificado:** Políticas não permitem que afiliados vejam sua rede

**Questões para investigar:**
- [ ] Quais políticas RLS existem em `affiliate_network`?
- [ ] As políticas permitem SELECT onde `parent_affiliate_id = afiliado_logado`?
- [ ] As políticas permitem INSERT para novos afiliados?
- [ ] Há conflito entre políticas?

**Comando para verificar:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'affiliate_network';
```

#### 1.3. Integração Frontend/Backend
**Problema identificado:** Frontend espera formato diferente do que backend retorna

**Questões para investigar:**
- [ ] Qual o contrato de dados entre frontend e backend?
- [ ] A função `getNetwork()` retorna no formato esperado?
- [ ] O componente `MinhaRede.tsx` está preparado para dados reais?
- [ ] Há fallback para dados mock que mascara erros?

---

### 2. SISTEMA DE COMISSÕES (PRIORIDADE ALTA)

#### 2.1. Cálculo de Split
**Problema identificado:** Split estava hardcoded, agora é dinâmico mas não testado

**Arquivos relacionados:**
- `api/checkout.js` (função `calculateAffiliateSplit`)
- `src/services/affiliates/commission-calculator.service.ts`

**Questões para investigar:**
- [ ] O `api/checkout.js` realmente busca a rede do banco?
- [ ] O cálculo de 15% N1, 3% N2, 2% N3 está correto?
- [ ] A redistribuição para gestores funciona quando não há N2/N3?
- [ ] O split é enviado corretamente para a API Asaas?
- [ ] Há logs para auditoria de comissões?

#### 2.2. Rastreamento de Indicações
**Problema identificado:** `referralCode` salvo em chave errada do localStorage

**Arquivos relacionados:**
- `src/pages/LandingPageWithRef.tsx`
- `src/middleware/referral-tracker.ts`

**Questões para investigar:**
- [ ] Qual chave do localStorage é usada? (`referralCode` ou `slim_referral_code`?)
- [ ] O código é capturado corretamente da URL?
- [ ] O código persiste durante toda a jornada do usuário?
- [ ] O código é enviado no checkout?

---

### 3. ARQUITETURA E PADRÕES (PRIORIDADE MÉDIA)

#### 3.1. Separação de Responsabilidades
**Questões para investigar:**
- [ ] Há duplicação de lógica entre frontend e backend?
- [ ] Serviços estão bem definidos e isolados?
- [ ] Há acoplamento excessivo entre componentes?

#### 3.2. Tratamento de Erros
**Questões para investigar:**
- [ ] Erros são tratados adequadamente?
- [ ] Há logs suficientes para debug?
- [ ] Usuário recebe feedback claro de erros?

#### 3.3. Validações
**Questões para investigar:**
- [ ] Validações estão no frontend E backend?
- [ ] Wallet IDs são validados antes de salvar?
- [ ] Códigos de indicação são validados?

---

## 📊 DELIVERABLES ESPERADOS

### 1. DOCUMENTO DE ANÁLISE
Arquivo: `AUDITORIA_RESULTADO.md`

**Estrutura esperada:**
```markdown
# RESULTADO DA AUDITORIA TÉCNICA

## 1. PROBLEMAS IDENTIFICADOS
### 1.1. Críticos (impedem funcionamento)
- Problema 1: Descrição + Impacto + Arquivos afetados
- Problema 2: ...

### 1.2. Altos (causam bugs frequentes)
- Problema 1: ...

### 1.3. Médios (causam inconsistências)
- Problema 1: ...

## 2. INCONSISTÊNCIAS ARQUITETURAIS
- Inconsistência 1: Descrição + Proposta de correção
- Inconsistência 2: ...

## 3. PLANO DE CORREÇÃO ESTRUTURADO
### Fase 1: Correções Críticas (1-2 dias)
- [ ] Tarefa 1: Descrição + Arquivos + Estimativa
- [ ] Tarefa 2: ...

### Fase 2: Correções Altas (2-3 dias)
- [ ] Tarefa 1: ...

### Fase 3: Refatoração (3-5 dias)
- [ ] Tarefa 1: ...

## 4. DIRETRIZES PARA DESENVOLVIMENTO FUTURO
- Diretriz 1: Como evitar problema X
- Diretriz 2: Padrão a seguir para Y
```

### 2. DIAGRAMA DE FLUXO CORRIGIDO
Arquivo: `FLUXO_AFILIADOS_CORRIGIDO.md`

**Conteúdo esperado:**
- Fluxo de cadastro de afiliado (passo a passo)
- Fluxo de venda com indicação (passo a passo)
- Fluxo de cálculo de comissões (passo a passo)
- Fluxo de visualização da rede (passo a passo)

### 3. CHECKLIST DE VALIDAÇÃO
Arquivo: `CHECKLIST_VALIDACAO.md`

**Conteúdo esperado:**
- [ ] Cadastro de afiliado via link funciona
- [ ] Afiliado aparece na rede de quem indicou
- [ ] Compra com link de afiliado registra corretamente
- [ ] Split de comissões é calculado corretamente
- [ ] Comissões aparecem no painel do afiliado
- [ ] Rede genealógica é exibida corretamente

---

## 🔧 FERRAMENTAS DISPONÍVEIS

### Acesso ao Banco de Dados
**Power Supabase Hosted Development** está configurado
- Project ID: `vtynmmtuvxreiwcxxlma`

### Comandos Úteis
```bash
# Verificar estrutura de tabelas
SELECT * FROM information_schema.columns WHERE table_name = 'affiliates';
SELECT * FROM information_schema.columns WHERE table_name = 'affiliate_network';

# Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename IN ('affiliates', 'affiliate_network');

# Verificar foreign keys
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'affiliate_network' AND tc.constraint_type = 'FOREIGN KEY';

# Verificar dados de teste
SELECT a.id, a.referral_code, a.referred_by, p.email 
FROM affiliates a 
JOIN profiles p ON a.user_id = p.id 
WHERE p.email IN ('bia.aguilar@hotmail.com', 'rm6661706@gmail.com');

SELECT * FROM affiliate_network WHERE parent_affiliate_id = '6f889212-9f9a-4ed8-9429-c3bdf26cb9da';
```

---

## 📝 DADOS DE TESTE

### Afiliada Principal (Bia)
- Email: `bia.aguilar@hotmail.com`
- Referral Code: `BEAT58`
- ID: `6f889212-9f9a-4ed8-9429-c3bdf26cb9da`
- Status: `active`
- Referred By: `null` (raiz)

### Afiliado Indicado (Giuseppe)
- Email: `rm6661706@gmail.com`
- Referral Code: `DA7AE7`
- ID: `36f5a54f-cb07-4260-ae59-da71136a2940`
- Status: `active`
- Referred By: `6f889212-9f9a-4ed8-9429-c3bdf26cb9da` (Bia)

**Expectativa:** Giuseppe deve aparecer na rede da Bia no painel "Minha Rede"

---

## 🎯 CRITÉRIOS DE SUCESSO

A auditoria será considerada bem-sucedida se:

1. **Identificar a raiz dos problemas** (não apenas sintomas)
2. **Propor solução estruturada** (não apenas correções pontuais)
3. **Definir diretrizes claras** (para evitar problemas futuros)
4. **Priorizar correções** (crítico → alto → médio)
5. **Ser executável** (tarefas claras com arquivos e estimativas)

---

## 📚 DOCUMENTAÇÃO DE REFERÊNCIA

### Steering Files (Regras de Negócio)
- `.kiro/steering/product.md` - Regras de comissões e afiliados
- `.kiro/steering/structure.md` - Arquitetura do sistema
- `.kiro/steering/tech.md` - Stack técnica e padrões
- `.kiro/steering/verificacao-banco-real.md` - Protocolo de acesso ao banco

### Arquivos Críticos para Análise
```
Frontend:
- src/layouts/CustomerDashboardLayout.tsx
- src/pages/afiliados/dashboard/MinhaRede.tsx
- src/services/frontend/affiliate.service.ts
- src/pages/LandingPageWithRef.tsx
- src/middleware/referral-tracker.ts

Backend:
- api/checkout.js
- src/services/affiliates/affiliate.service.ts
- src/services/affiliates/commission-calculator.service.ts

Banco de Dados:
- Tabela: affiliates
- Tabela: affiliate_network
- Tabela: commissions
- Políticas RLS de todas as tabelas acima
```

---

## ⚠️ OBSERVAÇÕES IMPORTANTES

1. **NÃO fazer correções durante a auditoria** - apenas identificar e documentar
2. **NÃO assumir que código existe = funciona** - validar com queries no banco
3. **NÃO confiar em dados mock** - verificar dados reais
4. **SEMPRE verificar RLS** - muitos problemas são de permissão, não de código
5. **PRIORIZAR problemas que causam efeito cascata** - corrigir a raiz, não os sintomas

---

## 🚀 PRÓXIMOS PASSOS APÓS AUDITORIA

1. Revisar documento de análise com o time
2. Aprovar plano de correção estruturado
3. Executar correções em fases (crítico → alto → médio)
4. Validar cada fase com checklist
5. Documentar diretrizes para desenvolvimento futuro

---

**Data da Solicitação:** 09/01/2026  
**Solicitante:** Renato Carraro  
**Prazo Esperado:** 2-3 horas de análise profunda  
**Prioridade:** CRÍTICA
