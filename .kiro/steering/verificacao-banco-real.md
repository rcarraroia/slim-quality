# 🔍 PROTOCOLO DE VERIFICAÇÃO DO BANCO REAL
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## ⚠️ REGRA FUNDAMENTAL

**SEMPRE que for necessário qualquer tipo de intervenção no banco de dados, você PRIMEIRO deve analisar o que temos no banco atualmente para não apagar ou corromper nada que já esteja funcionando.**

---

## 📋 CHECKLIST DE VERIFICAÇÃO OBRIGATÓRIA

ANTES de criar qualquer migração ou script SQL:

- [ ] Conectou ao banco real via Supabase CLI?
- [ ] Verificou se a tabela/estrutura já existe?
- [ ] Contou quantos registros existem?
- [ ] Analisou a estrutura atual dos dados?
- [ ] Identificou relacionamentos com outras tabelas?
- [ ] Verificou políticas RLS existentes?
- [ ] Buscou no código referências à estrutura?
- [ ] Avaliou o impacto em funcionalidades existentes?
- [ ] Documentou o estado atual antes da mudança?
- [ ] Criou estratégia de rollback se necessário?

---

## 🛠️ COMANDOS PARA VERIFICAÇÃO

### 1. Conectar ao Projeto
```bash
# Fazer login
supabase login

# Linkar ao projeto
supabase link --project-ref vtynmmtuvxreiwcxxlma

# Verificar conexão
supabase projects list
```

### 2. Verificar Estrutura Geral
```bash
# Ver todas as tabelas
supabase db execute "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

# Ver estrutura completa
supabase db dump --schema public
```

### 3. Verificar Tabelas Específicas
```bash
# Verificar se tabela existe
supabase db execute "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliates');"

# Contar registros
supabase db execute "SELECT COUNT(*) FROM affiliates;"

# Ver estrutura da tabela
supabase db execute "\\d affiliates"
```

### 4. Verificar Migrations
```bash
# Ver histórico de migrations
supabase migration list

# Ver migrations pendentes
supabase db diff
```

---

## 🎯 PROTOCOLO DE ANÁLISE PRÉVIA

### Exemplo de Verificação Completa
```bash
# 1. Verificar tabelas de afiliados
echo "=== VERIFICANDO TABELAS DE AFILIADOS ==="
supabase db execute "
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t 
WHERE table_schema = 'public' 
  AND table_name IN ('affiliates', 'affiliate_network', 'commissions', 'referral_clicks', 'referral_conversions', 'asaas_wallets')
ORDER BY table_name;
"

# 2. Se tabelas existem, verificar dados
supabase db execute "
SELECT 
  'affiliates' as tabela, COUNT(*) as registros FROM affiliates
UNION ALL
SELECT 
  'commissions' as tabela, COUNT(*) as registros FROM commissions
UNION ALL
SELECT 
  'referral_clicks' as tabela, COUNT(*) as registros FROM referral_clicks;
"

# 3. Ver estrutura de uma tabela específica
supabase db execute "
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'affiliates' 
ORDER BY ordinal_position;
"
```

---

## 🚨 SITUAÇÕES CRÍTICAS

### Se Tabelas NÃO Existem
- ✅ Pode criar normalmente
- ✅ Aplicar migrations
- ✅ Inserir dados de teste

### Se Tabelas JÁ Existem
- ⚠️ CUIDADO: Verificar estrutura atual
- ⚠️ CUIDADO: Verificar dados existentes
- ⚠️ CUIDADO: Criar migration de alteração, não criação

### Se Há Dados Importantes
- 🚨 BACKUP obrigatório antes de qualquer alteração
- 🚨 Testar migration em ambiente de desenvolvimento
- 🚨 Planejar rollback

---

## 📊 TEMPLATE DE RELATÓRIO

```markdown
## VERIFICAÇÃO DO BANCO DE DADOS - [DATA]

### Tabelas Verificadas:
- [ ] affiliates: [EXISTE/NÃO EXISTE] - [X registros]
- [ ] affiliate_network: [EXISTE/NÃO EXISTE] - [X registros]
- [ ] commissions: [EXISTE/NÃO EXISTE] - [X registros]

### Estrutura Atual:
[Descrever estrutura encontrada]

### Dados Existentes:
[Descrever dados importantes encontrados]

### Ações Necessárias:
[Listar o que precisa ser feito]

### Riscos Identificados:
[Listar possíveis problemas]
```

---

**LEMBRE-SE: Análise prévia é OBRIGATÓRIA antes de qualquer intervenção!**