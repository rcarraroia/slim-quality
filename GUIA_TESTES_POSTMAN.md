# 🧪 GUIA DE TESTES - POSTMAN API AFILIADOS

## 📋 VISÃO GERAL

Coleção Postman criada para testar as correções dos 8 bugs do sistema de afiliados.

**Arquivo:** `Slim_Quality_API_Afiliados.postman_collection.json`

---

## 🚀 COMO USAR

### 1. Importar Coleção

**Opção A - Postman Desktop:**
1. Abrir Postman Desktop
2. Clicar em "Import" (canto superior esquerdo)
3. Selecionar arquivo `Slim_Quality_API_Afiliados.postman_collection.json`
4. Clicar "Import"

**Opção B - Postman Web:**
1. Acessar https://web.postman.co
2. Clicar em "Import"
3. Arrastar arquivo ou selecionar
4. Confirmar importação

### 2. Configurar Variáveis

**Variáveis da coleção:**
- `base_url`: URL do servidor (padrão: `http://localhost:3000`)
- `api_url`: URL da API (padrão: `{{base_url}}/api`)
- `affiliate_id`: Preenchido automaticamente após criar afiliado
- `referral_code`: Preenchido automaticamente após criar afiliado
- `order_id`: Preenchido automaticamente após criar pedido

**Para editar:**
1. Clicar na coleção
2. Aba "Variables"
3. Alterar `base_url` se necessário

### 3. Executar Testes

**Ordem recomendada:**

1. **Criar Afiliado** (salva ID e código automaticamente)
2. **Buscar por Código** (valida Bug 06)
3. **Buscar Rede** (valida Bug 01)
4. **Criar Pedido** (salva order_id automaticamente)
5. **Buscar Pedido** (valida hierarquia Bug 01)
6. **Processar Comissões** (valida Bugs 04 e 05)
7. **Métricas Dashboard** (valida Bug 02)

---

## 🧪 TESTES AUTOMATIZADOS

Cada request tem testes que validam:

### ✅ Criar Afiliado
- Status 201 Created
- Retorna ID e referral_code
- Salva variáveis para próximos testes

### ✅ Buscar por Código (Bug 06)
- Status 200 OK
- Retorna dados do afiliado
- Valida que query usa Supabase client (não SQL direto)

### ✅ Buscar Rede (Bug 01)
- Status 200 OK
- Retorna estrutura de rede
- Valida 3 níveis de hierarquia

### ✅ Buscar Ancestrais (Bug 01)
- Status 200 OK
- Retorna N2 e N3 corretos
- Valida função getAffiliateNetwork()

### ✅ Criar Pedido
- Status 201 Created
- Afiliado N1 vinculado
- Salva order_id para próximos testes

### ✅ Buscar Pedido (Bug 01)
- Status 200 OK
- Campos affiliate_n1_id, n2_id, n3_id populados
- Valida hierarquia completa

### ✅ Processar Comissões (Bugs 04, 05)
- Status 200 OK
- RPC executada com sucesso
- Valores calculados corretos (15%, 3%, 2%)
- Redistribuição aplicada se necessário

### ✅ Métricas Dashboard (Bug 02)
- Status 200 OK
- 4 métricas retornadas
- Valores numéricos corretos
- Formatação monetária (Bug 08)

---

## 📊 EXECUTAR COLEÇÃO COMPLETA

### Via Postman Desktop:

1. Clicar com botão direito na coleção
2. Selecionar "Run collection"
3. Clicar "Run Slim Quality - API Afiliados"
4. Aguardar execução
5. Ver relatório de testes

### Via Newman (CLI):

```bash
# Instalar Newman
npm install -g newman

# Executar coleção
newman run Slim_Quality_API_Afiliados.postman_collection.json

# Com relatório HTML
newman run Slim_Quality_API_Afiliados.postman_collection.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

---

## 🔍 VALIDAÇÃO DOS BUGS CORRIGIDOS

### Bug 01 - Hierarquia de Afiliados
**Testes:** "Buscar Rede", "Buscar Ancestrais", "Buscar Pedido"
**Validação:** Campos affiliate_n1_id, n2_id, n3_id populados

### Bug 02 - Métricas Dashboard
**Testes:** "Métricas do Afiliado"
**Validação:** 4 métricas calculadas corretamente

### Bug 03 - Rastreamento de Indicações
**Testes:** "Registrar Click de Indicação"
**Validação:** Click registrado com referral_code correto

### Bug 04 - Processamento de Comissões
**Testes:** "Processar Comissões de Pedido"
**Validação:** RPC process_order_commissions executada

### Bug 05 - Cálculo de Comissões
**Testes:** "Processar Comissões de Pedido"
**Validação:** Valores 15%, 3%, 2% corretos + redistribuição

### Bug 06 - Queries Diretas
**Testes:** "Buscar por Código de Indicação"
**Validação:** Usa Supabase client (não pool.query)

### Bug 07 - Hierarquia Admin
**Testes:** "Buscar Rede"
**Validação:** VIEW affiliate_hierarchy funciona

### Bug 08 - Tipos Monetários
**Testes:** "Métricas do Afiliado"
**Validação:** Valores em formato correto (cents/decimal)

---

## 🚨 TROUBLESHOOTING

### Erro: "Could not get any response"
- ✅ Verificar se servidor está rodando (`npm run dev`)
- ✅ Verificar se porta 3000 está acessível
- ✅ Verificar firewall/antivírus

### Erro: 404 Not Found
- ✅ Verificar se rota existe no backend
- ✅ Verificar se `base_url` está correto
- ✅ Verificar logs do servidor

### Erro: 500 Internal Server Error
- ✅ Ver console do servidor para detalhes
- ✅ Verificar conexão com Supabase
- ✅ Verificar se migrations foram aplicadas

### Testes Falhando
- ✅ Verificar se dados de teste existem
- ✅ Verificar se variáveis foram preenchidas
- ✅ Executar requests na ordem recomendada

---

## 📝 PRÓXIMOS PASSOS

Após executar todos os testes:

1. ✅ Verificar relatório de testes
2. ✅ Anotar quais testes passaram/falharam
3. ✅ Reportar problemas encontrados
4. ✅ Prosseguir com testes manuais (FASE B do plano)

---

**Criado em:** 11/01/2026  
**Versão:** 1.0  
**Status:** Pronto para uso
