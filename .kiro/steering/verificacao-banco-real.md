# 🔍 PROTOCOLO DE VERIFICAÇÃO DO BANCO REAL
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## ⚠️ REGRA FUNDAMENTAL

**SEMPRE que for necessário qualquer tipo de intervenção no banco de dados, você PRIMEIRO deve analisar o que temos no banco atualmente para não apagar ou corromper nada que já esteja funcionando.**

---

## 📋 CHECKLIST DE VERIFICAÇÃO OBRIGATÓRIA

ANTES de criar qualquer migração ou script SQL:

- [ ] Conectou ao banco real via Power: Supabase Hosted Development?
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

## 🛠️ ACESSO OFICIAL AO BANCO DE DADOS

### ⚠️ MÉTODO OFICIAL ÚNICO

**A partir de agora, o acesso ao banco de dados Supabase deve ser feito EXCLUSIVAMENTE através do:**

**🔌 Power: Supabase Hosted Development**

### Como Usar o Power Supabase

1. **Ativar o Power:**
```
Use o comando kiroPowers para ativar o power "supabase-hosted"
```

2. **Verificar Estrutura de Tabelas:**
```
Use as ferramentas do power para listar tabelas e verificar estruturas
```

3. **Executar Queries de Verificação:**
```
Use as ferramentas do power para executar queries SELECT e verificar dados
```

4. **Aplicar Migrations:**
```
Use as ferramentas do power para aplicar mudanças no banco
```

### Comandos Básicos via Power

#### Verificar Estrutura Geral
- Listar todas as tabelas do schema public
- Verificar estrutura de tabelas específicas
- Contar registros em tabelas

#### Verificar Dados Existentes
- Executar queries SELECT para análise
- Verificar relacionamentos entre tabelas
- Analisar políticas RLS ativas

#### Aplicar Mudanças
- Executar migrations de forma segura
- Criar/alterar tabelas quando necessário
- Aplicar políticas RLS

---

## 🎯 PROTOCOLO DE ANÁLISE PRÉVIA

### Exemplo de Verificação Completa via Power

```
1. Ativar Power Supabase:
   - Usar kiroPowers para ativar "supabase-hosted"
   - Verificar conexão com o projeto

2. Verificar tabelas de afiliados:
   - Listar tabelas relacionadas a afiliados
   - Verificar estrutura das tabelas existentes
   - Contar registros em cada tabela

3. Analisar dados existentes:
   - Verificar dados em affiliates, commissions, etc.
   - Identificar relacionamentos
   - Verificar políticas RLS ativas

4. Documentar estado atual:
   - Registrar estruturas encontradas
   - Documentar dados importantes
   - Planejar mudanças necessárias
```

---

## 🚨 SITUAÇÕES CRÍTICAS

### Se Tabelas NÃO Existem
- ✅ Pode criar normalmente via Power
- ✅ Aplicar migrations via Power
- ✅ Inserir dados de teste via Power

### Se Tabelas JÁ Existem
- ⚠️ CUIDADO: Verificar estrutura atual via Power
- ⚠️ CUIDADO: Verificar dados existentes via Power
- ⚠️ CUIDADO: Criar migration de alteração, não criação

### Se Há Dados Importantes
- 🚨 BACKUP obrigatório antes de qualquer alteração
- 🚨 Testar migration em ambiente de desenvolvimento
- 🚨 Planejar rollback

---

## 📊 TEMPLATE DE RELATÓRIO

```markdown
## VERIFICAÇÃO DO BANCO DE DADOS - [DATA]

### Método de Acesso:
- ✅ Power: Supabase Hosted Development ativado
- ✅ Conexão com projeto estabelecida

### Tabelas Verificadas:
- [ ] affiliates: [EXISTE/NÃO EXISTE] - [X registros]
- [ ] affiliate_network: [EXISTE/NÃO EXISTE] - [X registros]
- [ ] commissions: [EXISTE/NÃO EXISTE] - [X registros]

### Estrutura Atual:
[Descrever estrutura encontrada via Power]

### Dados Existentes:
[Descrever dados importantes encontrados via Power]

### Ações Necessárias:
[Listar o que precisa ser feito via Power]

### Riscos Identificados:
[Listar possíveis problemas]
```

---

## ⚠️ IMPORTANTE

**MÉTODO OFICIAL ÚNICO DE ACESSO:**
- 🔌 **Power: Supabase Hosted Development**
- ❌ **NÃO usar mais Supabase CLI diretamente**
- ❌ **NÃO usar credenciais hardcoded**
- ❌ **NÃO usar scripts Python com credenciais**

**LEMBRE-SE: Análise prévia via Power é OBRIGATÓRIA antes de qualquer intervenção!**