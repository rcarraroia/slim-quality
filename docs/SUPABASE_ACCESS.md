# 🔐 GUIA DE ACESSO AO SUPABASE - SLIM QUALITY

## ⚠️ IMPORTANTE

Este documento explica como configurar e acessar o Supabase para o projeto Slim Quality.

**ATENÇÃO:** As credenciais reais devem ser obtidas após criar o projeto no Supabase Dashboard.

---

## 🔑 CREDENCIAIS REAIS DO PROJETO

**As credenciais reais do projeto Slim Quality estão armazenadas em:**

📄 **`docs/SUPABASE_CREDENTIALS.md`** (arquivo local, NÃO commitado no Git)

**Este arquivo contém:**
- ✅ Project ID e URLs
- ✅ API Keys (anon e service_role)
- ✅ Access Token para CLI
- ✅ Links do Dashboard
- ✅ Comandos úteis
- ✅ Informações de conexão PostgreSQL

**⚠️ NUNCA COMMITAR O ARQUIVO `SUPABASE_CREDENTIALS.md` NO GIT!**

O arquivo já está protegido no `.gitignore`, mas sempre verifique antes de fazer commit.

---

## 📋 PRÉ-REQUISITOS

### O que você precisa ter:
- [ ] Conta no Supabase (https://supabase.com)
- [ ] Projeto criado no Supabase Dashboard
- [ ] Windows com PowerShell OU Linux/Mac com terminal
- [ ] Permissões de administrador (para instalar CLI)

---

## 🚀 PASSO 1: CRIAR PROJETO NO SUPABASE

### 1.1 Acessar Dashboard
1. Ir para: https://supabase.com/dashboard
2. Clicar em "New Project"
3. Preencher:
   - **Name:** slim-quality-backend
   - **Database Password:** [gerar senha forte]
   - **Region:** South America (São Paulo)
4. Clicar em "Create new project"
5. **Aguardar ~2 minutos** (setup do banco)

### 1.2 Obter Credenciais

Após criação, ir em **Project Settings > API**:

**Anotar:**
- **Project URL:** `https://[seu-project-ref].supabase.co`
- **Project Reference ID:** `[seu-project-ref]` (ex: `amkelczfwazutrciqtlk`)
- **anon/public key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **service_role key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` ⚠️ SECRETA!

**⚠️ NUNCA COMMITAR SERVICE_ROLE KEY NO GIT!**

---

## 🛠️ PASSO 2: CONFIGURAR SUPABASE CLI

### 2.1 Instalar Scoop (Windows)
```powershell
# Permitir execução de scripts
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force

# Instalar Scoop
irm get.scoop.sh | iex
```

### 2.2 Instalar Supabase CLI
```powershell
# Adicionar repositório Supabase
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Instalar CLI
scoop install supabase

# Verificar instalação
supabase --version
```

**Deve retornar:** `2.51.0` (ou versão mais recente)

### 2.3 Obter Access Token

**⚠️ IMPORTANTE: Access Token ≠ API Keys do projeto**

1. Acessar: https://supabase.com/dashboard/account/tokens
2. Clicar em "Generate new token"
3. Nome: "Kiro CLI - Slim Quality"
4. Copiar token (formato: `sbp_xxxxx...`)

**Este token dá acesso a TODOS os seus projetos Supabase!**

### 2.4 Fazer Login
```powershell
# Método interativo (recomendado)
supabase login

# Método automático (para scripts)
echo "sbp_seu_token_aqui" | supabase login
```

**Resultado esperado:**
```
You are now logged in. Happy coding!
```

### 2.5 Linkar ao Projeto
```powershell
supabase link --project-ref seu-project-ref-aqui
```

**Resultado esperado:**
```
Initialising login role...
Connecting to remote database...
Finished supabase link.
```

### 2.6 Validar Configuração
```powershell
# Listar projetos
supabase projects list

# Testar query
supabase db execute "SELECT 1 as test"

# Ver estrutura do banco
supabase db dump --schema public
```

**Se todos retornarem dados: Configuração completa! ✅**

---

## 📊 MÉTODOS DE ACESSO

### Comparação Rápida

| Método | RLS Ativo? | Acesso | Uso Recomendado |
|--------|-----------|--------|-----------------|
| **Supabase CLI** | ❌ Não | Total | Migrations, queries, deploy |
| **Dashboard Web** | ❌ Não | Visual | Verificação visual, edição manual |
| **Python (anon key)** | ✅ Sim | Limitado | ❌ NÃO USAR para verificação |
| **Python (service_role)** | ❌ Não | Total | Scripts de análise apenas |

---

## 🔍 MÉTODO 1: SUPABASE CLI (RECOMENDADO)

### Gerenciamento de Migrações
```powershell
# Criar nova migração
supabase migration new descricao_da_mudanca

# Aplicar migrações pendentes
supabase db push

# Ver histórico
supabase migration list

# Verificar status
supabase migration repair
```

### Execução de SQL
```powershell
# Query simples
supabase db execute "SELECT COUNT(*) FROM profiles"

# Query complexa
supabase db execute "
SELECT 
  o.id,
  o.total,
  c.name as customer_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
WHERE o.status = 'paid'
ORDER BY o.created_at DESC
LIMIT 10
"

# Executar arquivo
supabase db execute -f caminho/para/script.sql

# Dump do banco
supabase db dump --schema public -f backup.sql
```

### Gerenciamento de Edge Functions
```powershell
# Listar functions
supabase functions list

# Deploy
supabase functions deploy webhook-asaas

# Ver logs em tempo real
supabase functions logs webhook-asaas --tail

# Testar localmente
supabase functions serve webhook-asaas
```

### Gerenciamento de Secrets
```powershell
# Listar secrets
supabase secrets list

# Definir secret
supabase secrets set ASAAS_API_KEY=valor

# Definir múltiplos
supabase secrets set KEY1=val1 KEY2=val2

# Remover
supabase secrets unset ASAAS_API_KEY
```

---

## 🐍 MÉTODO 2: PYTHON (APENAS ANÁLISE/VERIFICAÇÃO)

### ⚠️ REGRA CRÍTICA

**NUNCA use `anon key` para verificação de dados!**

- `anon key` está sujeita a RLS
- Retorna 0 registros mesmo quando dados existem
- Causa análises incorretas

**Use `service_role key` APENAS para scripts de análise/verificação**

### Script de Análise
```python
#!/usr/bin/env python3
"""
Script de Análise do Banco Supabase - Slim Quality
IMPORTANTE: Use service_role key, não anon key!
"""
from supabase import create_client, Client
import json
from datetime import datetime

# ⚠️ OBTER ESTAS CREDENCIAIS DO .env
SUPABASE_URL = "https://seu-project-ref.supabase.co"
SUPABASE_SERVICE_KEY = "eyJ...service_role_key..."  # NÃO COMMITAR!

def analyze_database():
    """Análise completa do banco de dados"""
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    print("=" * 80)
    print("ANÁLISE DO BANCO DE DADOS - SLIM QUALITY")
    print(f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Lista de tabelas para verificar (Slim Quality)
    tables = [
        # Autenticação e Usuários
        'profiles',
        'user_roles',
        
        # Produtos
        'products',
        'product_images',
        'product_technologies',
        'technologies',
        'inventory_logs',
        
        # Vendas
        'orders',
        'order_items',
        'order_status_history',
        'payments',
        'shipping_addresses',
        
        # Afiliados (CRÍTICO)
        'affiliates',
        'affiliate_network',
        'referral_codes',
        'referral_clicks',
        'referral_conversions',
        'commissions',
        'commission_splits',
        'commission_payments',
        'commission_logs',
        
        # Asaas
        'asaas_transactions',
        'asaas_splits',
        'asaas_wallets',
        'asaas_webhook_logs',
        
        # CRM
        'customers',
        'customer_tags',
        'customer_notes',
        'customer_timeline',
        'conversations',
        'messages',
        'appointments',
        
        # Automações
        'automations',
        'automation_triggers',
        'automation_actions',
        'automation_conditions',
        'automation_logs'
    ]
    
    results = {}
    
    for table in tables:
        print(f"\n{'='*60}")
        print(f"Tabela: {table}")
        print(f"{'='*60}")
        
        try:
            # 1. Contar registros
            count_response = supabase.table(table).select('*', count='exact').execute()
            count = count_response.count
            
            print(f"✅ Total de registros: {count}")
            
            # 2. Pegar amostra de dados
            if count > 0:
                sample_response = supabase.table(table).select('*').limit(3).execute()
                sample = sample_response.data
                
                print(f"\n📋 Amostra de dados (primeiros 3 registros):")
                for i, record in enumerate(sample, 1):
                    print(f"\n--- Registro {i} ---")
                    print(json.dumps(record, indent=2, default=str))
                
                # 3. Identificar colunas
                if sample:
                    columns = list(sample[0].keys())
                    print(f"\n🔍 Colunas ({len(columns)}):")
                    for col in columns:
                        print(f"  - {col}")
            
            results[table] = {
                'exists': True,
                'count': count,
                'status': 'OK'
            }
            
        except Exception as e:
            print(f"❌ Erro ao acessar tabela: {str(e)}")
            results[table] = {
                'exists': False,
                'error': str(e),
                'status': 'ERROR'
            }
    
    # Resumo final
    print(f"\n{'='*80}")
    print("RESUMO DA ANÁLISE")
    print(f"{'='*80}")
    
    total_tables = len(tables)
    success_tables = sum(1 for r in results.values() if r.get('status') == 'OK')
    total_records = sum(r.get('count', 0) for r in results.values() if r.get('status') == 'OK')
    
    print(f"\nTabelas analisadas: {total_tables}")
    print(f"Tabelas acessíveis: {success_tables}")
    print(f"Total de registros: {total_records}")
    
    return results

if __name__ == "__main__":
    analyze_database()
```

### Como Usar
```bash
# 1. Instalar biblioteca
pip install supabase

# 2. Criar .env com credenciais
echo "SUPABASE_URL=https://seu-project.supabase.co" > .env
echo "SUPABASE_SERVICE_KEY=sua-service-role-key" >> .env

# 3. Executar script
python analyze_database.py
```

---

## 📐 PROTOCOLO DE ANÁLISE PRÉVIA OBRIGATÓRIA

### ⚠️ REGRA FUNDAMENTAL

**SEMPRE que for necessário qualquer tipo de intervenção no banco de dados, você PRIMEIRO deve analisar o que temos no banco atualmente para não apagar ou corromper nada que já esteja funcionando.**

### Checklist de Verificação

ANTES de criar qualquer migração ou script SQL:

- [ ] Conectou ao banco real via Python ou CLI?
- [ ] Verificou se a tabela/estrutura já existe?
- [ ] Contou quantos registros existem?
- [ ] Analisou a estrutura atual dos dados?
- [ ] Identificou relacionamentos com outras tabelas?
- [ ] Verificou políticas RLS existentes?
- [ ] Buscou no código referências à estrutura?
- [ ] Avaliou o impacto em funcionalidades existentes?
- [ ] Documentou o estado atual antes da mudança?
- [ ] Criou estratégia de rollback se necessário?

### Exemplo de Análise
```python
# Verificar se tabela existe
try:
    response = supabase.table('affiliates').select('*').limit(1).execute()
    print(f"✅ Tabela existe com {response.count} registros")
except Exception as e:
    print(f"❌ Tabela não existe: {e}")
```

---

## 🔒 SEGURANÇA E BOAS PRÁTICAS

### ✅ O QUE FAZER

1. **Proteger credenciais:**
   - Usar `.env` para credenciais
   - Adicionar `.env` ao `.gitignore`
   - Nunca commitar keys no Git

2. **Gerar tokens específicos:**
   - Access Token para CLI
   - API Keys por ambiente (dev, staging, prod)

3. **Revogar tokens desnecessários:**
   - Dashboard > Account > Access Tokens
   - Revogar tokens antigos ou não usados

### ❌ O QUE NÃO FAZER

1. **NUNCA commitar:**
   - Service Role Key
   - Access Tokens
   - API Keys
   - Senhas de banco

2. **NUNCA usar:**
   - JWT Secret no CLI (é diferente!)
   - Anon Key para verificação de dados
   - Service Role Key no frontend

---

## 🚨 TROUBLESHOOTING

### Erro: "supabase não é reconhecido"

**Solução:**
```powershell
# Reiniciar PowerShell
# Ou adicionar ao PATH manualmente
$env:PATH += ";$HOME\scoop\shims"
```

### Erro: "Failed to authenticate"

**Causa:** Token incorreto ou expirado

**Solução:**
1. Verificar se é Access Token (não JWT Secret)
2. Gerar novo token
3. Fazer logout e login novamente:
```powershell
supabase logout
supabase login
```

### Python retorna 0 registros mas dados existem

**Causa:** Usando `anon key` (sujeita a RLS)

**Solução:**
- Usar `service_role key` em scripts de análise
- Ou acessar via CLI: `supabase db execute "SELECT ..."`

---

## 📚 CONFIGURAÇÃO DO .ENV

### Template
```bash
# .env.example (COMMITAR NO GIT)

# Supabase - PREENCHER APÓS CRIAR PROJETO
SUPABASE_URL=https://seu-project-ref.supabase.co
SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_KEY=sua-service-role-key-aqui

# Asaas - PREENCHER APÓS CONFIGURAR CONTA
ASAAS_API_KEY=sua-chave-asaas-aqui
ASAAS_WALLET_FABRICA=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx

# App
NODE_ENV=development
PORT=3000
```

---

**Este documento deve ser consultado TODA VEZ que for trabalhar com o banco de dados!**

**LEMBRE-SE: Análise prévia é OBRIGATÓRIA antes de qualquer intervenção!**
