🧪 PLANO DE TESTES - SISTEMA AFILIADOS SLIM QUALITY
Versão: 1.0
Data: 11/01/2026
Executor: Kiro
Aprovador: Renato

📋 ÍNDICE

Visão Geral
FASE A - Setup Ambiente
FASE B - Testes Fase 1 (5 Bugs)
FASE C - Testes Fase 2 (3 Bugs)
FASE D - Testes de Regressão
FASE E - Validação de Performance
FASE F - Preparação Produção


📊 VISÃO GERAL
O que será testado:
yamlFase 1 (5 bugs):
  - Bug 01: Hierarquia de afiliados
  - Bug 03: Rastreamento de indicações
  - Bug 04: Processamento de comissões
  - Bug 05: Cálculo de comissões
  - Bug 06: Queries diretas

Fase 2 (3 bugs):
  - Bug 02: Métricas dashboard
  - Bug 07: Hierarquia admin
  - Bug 08: Tipos monetários

Total: 8 bugs corrigidos
Arquivos modificados: 13
Linhas alteradas: ~800
Tempo estimado total: 60-90 minutos

🚀 FASE A - SETUP AMBIENTE
Objetivo: Preparar ambiente de testes local
A1. Iniciar servidor DEV
bash# Terminal 1 - Backend
cd /caminho/projeto
npm run dev

# Aguardar mensagem:
# "Server running on http://localhost:3000"
Validação:

 Servidor iniciou sem erros
 Console limpo (sem warnings)
 Porta 3000 acessível


A2. Verificar banco de dados
bash# Verificar conexão Supabase
npm run db:status

# Ou acessar Supabase Studio:
# https://supabase.com/dashboard/project/[seu-projeto]
Validação:

 Conexão com Supabase OK
 Tabelas existem (affiliates, orders, commissions)
 VIEW affiliate_hierarchy existe

Query de validação:
sql-- No Supabase SQL Editor
SELECT COUNT(*) FROM affiliates;
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM commissions;
SELECT COUNT(*) FROM affiliate_hierarchy;
Resultado esperado:

Pelo menos 1 afiliado
Tabelas respondem (mesmo que vazias)


A3. Criar dados de teste
Dados mínimos necessários:
yamlAfiliados (hierarquia de 3 níveis):
  - Afiliado N1: João (raiz)
  - Afiliado N2: Maria (indicada por João)
  - Afiliado N3: Pedro (indicado por Maria)

Pedidos:
  - 1 pedido com afiliado N1
  - 1 pedido com afiliado N3 (testa hierarquia completa)
  
Valores sugeridos:
  - Pedido 1: R$ 3.290,00 (Colchão Padrão)
  - Pedido 2: R$ 3.490,00 (Colchão Queen)
Como criar:

Acessar: http://localhost:3000/admin/afiliados
Criar afiliados na ordem:

João (sem indicador)
Maria (indicador: código de João)
Pedro (indicador: código de Maria)


Anotar códigos de indicação de cada um

Checklist:

 3 afiliados criados
 Hierarquia configurada (N1 → N2 → N3)
 Códigos de indicação anotados


🧪 FASE B - TESTES FASE 1
Objetivo: Validar correções de 5 bugs da Fase 1

B1. Bug 01 - Hierarquia de Afiliados
O que foi corrigido:

Função getAffiliateNetwork() busca corretamente 3 níveis
Pedidos populam campos affiliate_n1_id, n2_id, n3_id

Como testar:

Criar pedido com afiliado N3 (Pedro)
Verificar no banco:

sqlSELECT 
  id,
  affiliate_n1_id,
  affiliate_n2_id,
  affiliate_n3_id
FROM orders
WHERE id = '[id-do-pedido-criado]';
Resultado esperado:
yamlaffiliate_n1_id: [ID do João]
affiliate_n2_id: [ID da Maria]  
affiliate_n3_id: [ID do Pedro]

❌ Se algum campo estiver NULL → Bug não corrigido
✅ Se todos campos preenchidos → OK
```

**Checklist:**
- [ ] Pedido criado via sistema
- [ ] Query executada no Supabase
- [ ] 3 níveis populados corretamente
- [ ] Nenhum campo NULL

**Se falhar:**
- Screenshot da query
- ID do pedido
- IDs dos afiliados usados
- Reportar ao Renato

---

### **B2. Bug 03 - Rastreamento de Indicações**

**O que foi corrigido:**
- Chave padronizada: `slim_referral_code`
- Middleware `referral-tracker.ts` deletado

**Como testar:**

1. Limpar localStorage/cookies do navegador
2. Acessar com código de indicação:
```
   http://localhost:3000?ref=[codigo-do-joao]

Abrir DevTools → Application → localStorage
Verificar chave armazenada

Resultado esperado:
javascriptlocalStorage: {
  "slim_referral_code": "[codigo-do-joao]"
}

❌ Se chave diferente (ex: referral_code) → Bug não corrigido
✅ Se chave = slim_referral_code → OK
Checklist:

 localStorage limpo antes do teste
 URL com ?ref= acessada
 Chave slim_referral_code presente
 Valor correto (código do afiliado)

Teste adicional (migração de dados antigos):
javascript// No console do navegador:
localStorage.setItem('referral_code', 'OLD_CODE');
localStorage.setItem('ref_code', 'OLD_CODE2');

// Recarregar página
location.reload();

// Verificar migração:
console.log(localStorage.getItem('slim_referral_code'));
// Deve mostrar: "OLD_CODE" (primeira chave encontrada)
Checklist migração:

 Chaves antigas removidas
 Valor migrado para slim_referral_code


B3. Bug 04 - Processamento de Comissões
O que foi corrigido:

RPC process_order_commissions criada
Lógica de cálculo no banco (PostgreSQL)

Como testar:

Criar pedido com pagamento confirmado
Verificar chamada da RPC:

sql-- No Supabase SQL Editor
SELECT * FROM commissions
WHERE order_id = '[id-do-pedido]'
ORDER BY level;
Resultado esperado:
yamlPedido de R$ 3.290,00 com hierarquia completa:

level | amount_cents | percentage | affiliate_id
------|--------------|------------|-------------
1     | 49350        | 15.00      | [João]
2     | 9870         | 3.00       | [Maria]
3     | 6580         | 2.00       | [Pedro]

Conversão: 49350 centavos = R$ 493,50 (15% de 3290)

❌ Se valores errados → Bug no cálculo
❌ Se comissões não criadas → RPC não executada
✅ Se 3 registros corretos → OK
Checklist:

 3 comissões criadas
 Valores em centavos corretos
 Percentuais corretos (15%, 3%, 2%)
 affiliate_id correto por nível

Se falhar:

Anotar valores calculados
Comparar com cálculo manual
Verificar logs do servidor


B4. Bug 05 - Cálculo de Comissões
O que foi corrigido:

Migration com lógica de cálculo SQL
Redistribuição quando rede incompleta

Como testar:
Teste 1: Rede completa (N1 + N2 + N3)
sql-- Pedido de R$ 3.290,00
-- Esperado: 15% + 3% + 2% = 20% distribuído
SELECT 
  level,
  amount_cents,
  amount_cents / 100.0 as amount_reais,
  percentage
FROM commissions
WHERE order_id = '[pedido-com-3-niveis]';
```

**Resultado esperado:**
```
Level 1: R$ 493,50 (15%)
Level 2: R$ 98,70 (3%)
Level 3: R$ 65,80 (2%)
Total: R$ 658,00 (20% do pedido)
Teste 2: Rede incompleta (apenas N1)

Criar afiliado sem indicador (raiz)
Fazer pedido
Verificar redistribuição:

sqlSELECT 
  level,
  amount_cents / 100.0 as amount_reais,
  percentage
FROM commissions
WHERE order_id = '[pedido-so-n1]';
```

**Resultado esperado:**
```
Level 1: R$ 493,50 (15%)
Gestores recebem os 5% restantes (não visível nesta tabela)

❌ Se aparecer N2/N3 sem afiliado → Bug redistribuição
✅ Se só N1 aparece → OK
```

**Checklist:**
- [ ] Teste com rede completa OK
- [ ] Teste com rede incompleta OK
- [ ] Valores calculados corretos
- [ ] Redistribuição funciona

---

### **B5. Bug 06 - Queries Diretas**

**O que foi corrigido:**
- 6 queries reescritas para usar Supabase client
- Função `getAffiliateByReferralCode()` deletada

**Como testar:**

1. Acessar endpoint de busca:
```
   GET http://localhost:3000/api/affiliates/referral/[codigo]

Verificar resposta

Resultado esperado:
json{
  "success": true,
  "data": {
    "id": "...",
    "name": "João",
    "referral_code": "JOAO123",
    "level": 1
  }
}

❌ Se erro 500 → Query direta ainda presente
❌ Se erro RLS → Permissões incorretas
✅ Se retorna afiliado → OK
Checklist:

 Endpoint responde sem erros
 Dados corretos retornados
 Sem erros no console do servidor
 Sem warnings de RLS

Validação de código:
bash# Verificar se queries diretas foram removidas
grep -r "pool.query" src/services/
grep -r "client.query" src/services/

# Resultado esperado: 0 ocorrências (ou só em locais permitidos)

📊 RESUMO FASE B
Checklist geral:
yamlBug 01 - Hierarquia: [ ]
Bug 03 - Rastreamento: [ ]
Bug 04 - RPC Comissões: [ ]
Bug 05 - Cálculo: [ ]
Bug 06 - Queries: [ ]

Status:
  [ ] Todos OK → Prosseguir Fase C
  [ ] Algum falhou → Reportar ao Renato
```

---

## 🧪 FASE C - TESTES FASE 2

### **Objetivo:** Validar correções de 3 bugs da Fase 2

---

### **C1. Bug 02 - Dashboard Métricas**

**O que foi corrigido:**
- Métricas calculadas com queries reais
- Conversão cents → decimal padronizada

**Como testar:**

1. Acessar dashboard do afiliado:
```
   http://localhost:3000/dashboard/afiliados

Verificar métricas exibidas:

Métricas esperadas:
yamlTotal de Vendas:
  - Deve mostrar soma de orders.total do afiliado
  - Formato: R$ 1.234,56
  
Total de Comissões:
  - Deve mostrar soma de commissions.amount_cents / 100
  - Formato: R$ 123,45
  
Número de Indicados:
  - Deve contar afiliados com sponsor_id = [afiliado-logado]
  - Número inteiro
  
Taxa de Conversão:
  - (Vendas / Indicados) * 100
  - Formato: 45,67%
Validação manual:
sql-- Calcular manualmente no Supabase
-- Substituir [afiliado_id] pelo ID do afiliado logado

-- Total de vendas
SELECT COALESCE(SUM(total), 0) as total_vendas
FROM orders
WHERE affiliate_n1_id = '[afiliado_id]'
  AND status = 'paid';

-- Total de comissões
SELECT COALESCE(SUM(amount_cents), 0) / 100.0 as total_comissoes
FROM commissions
WHERE affiliate_id = '[afiliado_id]'
  AND status = 'paid';

-- Número de indicados
SELECT COUNT(*) as indicados
FROM affiliates
WHERE sponsor_id = '[afiliado_id]';
```

**Comparar:**
- Valores no dashboard === Valores da query manual

**Checklist:**
- [ ] Dashboard carrega sem erros
- [ ] 4 cards de métricas visíveis
- [ ] Valores corretos (comparados com SQL manual)
- [ ] Formatação brasileira (R$ 1.234,56)
- [ ] Sem "NaN" ou "undefined"

**Se falhar:**
- Screenshot do dashboard
- Resultado das queries manuais
- Console do navegador (F12)
- Reportar ao Renato

---

### **C2. Bug 07 - Hierarquia Admin**

**O que foi corrigido:**
- VIEW `affiliate_hierarchy` criada
- Componente `MinhaRede.tsx` usa a view

**Como testar:**

1. Acessar painel de rede:
```
   http://localhost:3000/dashboard/afiliados/rede
```

2. Verificar estrutura hierárquica

**Estrutura esperada:**
```
João (N1)
├─ 2 vendas | R$ 987,00 comissões
├─ Maria (N2)
│  ├─ 1 venda | R$ 98,70 comissões
│  └─ Pedro (N3)
│     └─ 0 vendas | R$ 0,00 comissões
Validações:
yamlVisual:
  - [ ] Árvore hierárquica renderiza
  - [ ] 3 níveis visíveis
  - [ ] Nomes corretos
  - [ ] Indentação visual por nível

Métricas por afiliado:
  - [ ] Conversões (vendas)
  - [ ] Comissões totais
  - [ ] Formatação R$ brasileira
  
Interatividade:
  - [ ] Expandir/colapsar níveis funciona
  - [ ] Tooltip com detalhes (se houver)
Validação da VIEW:
sql-- No Supabase SQL Editor
SELECT 
  id,
  name,
  level,
  total_conversions,
  total_commissions_cents / 100.0 as comissoes_reais,
  path
FROM affiliate_hierarchy
ORDER BY path;
```

**Resultado esperado:**
```
João  | level 1 | 2 vendas | R$ 987,00 | path: João
Maria | level 2 | 1 venda  | R$ 98,70  | path: João > Maria
Pedro | level 3 | 0 vendas | R$ 0,00   | path: João > Maria > Pedro
```

**Checklist:**
- [ ] VIEW retorna dados corretos
- [ ] Componente renderiza hierarquia
- [ ] Métricas por nível corretas
- [ ] Formatação monetária brasileira
- [ ] Performance < 500ms (ver Network tab)

**Se falhar:**
- Screenshot da hierarquia
- Resultado da query da VIEW
- Tempo de carregamento (Network tab F12)
- Reportar ao Renato

---

### **C3. Bug 08 - Tipos Monetários**

**O que foi corrigido:**
- Helper `currency.ts` criado
- Imports padronizados em 7 arquivos

**Como testar:**

**Teste 1: Formatação no componente Comissões**

1. Acessar:
```
   http://localhost:3000/afiliados/comissoes

Verificar formatação de valores:

Exemplos esperados:
yamlValores pequenos:
  R$ 12,34 (não R$ 12,3)
  R$ 0,50 (não R$ 0,5)
  R$ 1,00 (não R$ 1)

Valores grandes:
  R$ 1.234,56 (ponto milhar, vírgula decimal)
  R$ 12.345,67
  R$ 123.456,78

Valores zero:
  R$ 0,00 (não R$ 0)
Regras de formatação:
yaml✅ Sempre 2 casas decimais
✅ Vírgula como separador decimal
✅ Ponto como separador de milhares
✅ Prefixo R$ com espaço
✅ Valores negativos: -R$ 123,45

❌ R$ 123.45 (ponto decimal)
❌ R$ 1234,56 (sem separador milhar)
❌ R$ 12,3 (1 casa decimal)
❌ 123,45 (sem prefixo R$)
Teste 2: Conversão cents → decimal
javascript// No console do navegador (F12)
// Testar helper (se exposto globalmente, ou via API)

// Teste 1: Centavos para decimal
centsToDecimal(49350); // Deve retornar 493.50

// Teste 2: Decimal para centavos
decimalToCents(493.50); // Deve retornar 49350

// Teste 3: Formatação
formatCurrency(49350); // Deve retornar "R$ 493,50"
Checklist:

 Todos valores com 2 casas decimais
 Separador milhar correto (ponto)
 Separador decimal correto (vírgula)
 Prefixo R$ presente
 Sem valores quebrados (R$ 123.4)
 Helper conversão funciona

Validação em múltiplas páginas:
yamlTestar formatação em:
  [ ] /dashboard/afiliados (cards métricas)
  [ ] /afiliados/comissoes (tabela)
  [ ] /dashboard/afiliados/rede (hierarquia)
  [ ] /admin/comissoes (painel admin)
Se falhar:

Screenshot dos valores incorretos
Página onde falhou
Formato esperado vs formato exibido
Reportar ao Renato


📊 RESUMO FASE C
Checklist geral:
yamlBug 02 - Métricas Dashboard: [ ]
Bug 07 - Hierarquia Admin: [ ]
Bug 08 - Tipos Monetários: [ ]

Status:
  [ ] Todos OK → Prosseguir Fase D
  [ ] Algum falhou → Reportar ao Renato
```

---

## 🔄 FASE D - TESTES DE REGRESSÃO

### **Objetivo:** Garantir que funcionalidades antigas ainda funcionam

---

### **D1. Criar Afiliado**
```
Página: /admin/afiliados/novo
```

**Fluxo:**

1. Preencher formulário:
   - Nome: "Teste Afiliado"
   - Email: teste@afiliado.com
   - Telefone: (11) 99999-9999
   - Código indicação: [vazio ou código existente]

2. Clicar "Cadastrar"

**Resultado esperado:**
- [ ] Afiliado criado sem erros
- [ ] Redirecionou para lista de afiliados
- [ ] Novo afiliado aparece na lista
- [ ] Código de indicação gerado automaticamente

---

### **D2. Criar Pedido**
```
Página: /admin/pedidos/novo
```

**Fluxo:**

1. Selecionar:
   - Cliente: [existente ou criar novo]
   - Produto: Colchão Padrão
   - Afiliado: João
   - Forma pagamento: PIX

2. Confirmar pedido

**Resultado esperado:**
- [ ] Pedido criado sem erros
- [ ] Status inicial: "pending"
- [ ] Afiliado vinculado corretamente
- [ ] Valor correto (R$ 3.290,00)

---

### **D3. Processar Pagamento**
```
Simular webhook Asaas (ou marcar como pago manualmente)
```

**Fluxo:**

1. Localizar pedido criado
2. Marcar como "paid"
3. Verificar efeitos colaterais

**Resultado esperado:**
- [ ] Status mudou para "paid"
- [ ] Comissões foram criadas automaticamente
- [ ] 3 registros na tabela `commissions`
- [ ] Valores calculados corretos

---

### **D4. Solicitar Saque**
```
Página: /afiliados/saques
Fluxo:

Login como afiliado com comissão disponível
Clicar "Solicitar Saque"
Valor: R$ 100,00
Confirmar

Resultado esperado:

 Solicitação criada
 Status: "pending"
 Saldo disponível atualizado
 Notificação exibida


📊 RESUMO FASE D
Checklist geral:
yamlCriar afiliado: [ ]
Criar pedido: [ ]
Processar pagamento: [ ]
Solicitar saque: [ ]

Status:
  [ ] Todos OK → Prosseguir Fase E
  [ ] Algum quebrou → CRÍTICO, reportar imediatamente

⚡ FASE E - VALIDAÇÃO DE PERFORMANCE
Objetivo: Garantir que sistema está rápido

E1. Tempo de Carregamento
Páginas para medir:
yamlDashboard Afiliado:
  - URL: /dashboard/afiliados
  - Métrica: Tempo até renderizar métricas
  - Aceitável: < 2s
  - Ideal: < 1s
  
Rede Hierárquica:
  - URL: /dashboard/afiliados/rede
  - Métrica: Tempo até renderizar árvore
  - Aceitável: < 3s (VIEW recursiva)
  - Ideal: < 1.5s
  
Lista de Comissões:
  - URL: /afiliados/comissoes
  - Métrica: Tempo até renderizar tabela
  - Aceitável: < 2s
  - Ideal: < 1s
Como medir:
javascript// No console do navegador (F12)
// Antes de carregar página:
console.time('page-load');

// Após página carregar completamente:
console.timeEnd('page-load');
Ou usar DevTools:

F12 → Network tab
Reload página (Ctrl+R)
Ver coluna "Time"

Checklist:

 Dashboard < 2s
 Rede hierárquica < 3s
 Lista comissões < 2s
 Sem timeout de queries


E2. Performance da VIEW
Testar VIEW affiliate_hierarchy:
sql-- No Supabase SQL Editor
EXPLAIN ANALYZE
SELECT * FROM affiliate_hierarchy;
```

**Resultado esperado:**
```
Execution Time: < 500ms

❌ Se > 1000ms → VIEW precisa otimização (índices)
⚠️ Se 500-1000ms → Aceitável, mas monitorar
✅ Se < 500ms → Ótimo
Checklist:

 VIEW executa em < 500ms
 Sem "Seq Scan" em tabelas grandes
 Índices estão sendo usados


E3. Queries N+1
Verificar no console do servidor:
bash# Ao carregar /dashboard/afiliados/rede
# Contar quantas queries SQL aparecem nos logs

Aceitável:
  - 1-3 queries (ótimo)
  - 4-10 queries (OK)
  
Problemático:
  - 10+ queries (N+1 problem)
  - 100+ queries (CRÍTICO)
Checklist:

 Máximo 10 queries por página
 Sem queries repetidas em loop
 Eager loading funcionando


📊 RESUMO FASE E
Checklist geral:
yamlTempos de carregamento: [ ]
Performance da VIEW: [ ]
Queries N+1: [ ]

Status:
  [ ] Tudo rápido → Prosseguir Fase F
  [ ] Lentidão detectada → Reportar ao Renato

🚀 FASE F - PREPARAÇÃO PRODUÇÃO
Objetivo: Garantir que código está pronto para deploy

F1. Build Production
bashnpm run build
Resultado esperado:
bash✓ Build completed successfully
✓ No TypeScript errors
✓ No ESLint errors
✓ Bundle size: ~2MB

❌ Se erros de build → NÃO PODE ir pra produção
✅ Se build limpo → OK
Checklist:

 Build sem erros
 Sem warnings críticos
 Bundle size aceitável (<5MB)


F2. Linting
bashnpm run lint
Resultado esperado:
bash✓ No linting errors

Warnings permitidos:
  - Console.logs (remover antes de produção)
  - Unused vars (se comentadas)
  
Erros bloqueantes:
  - Syntax errors
  - Type errors
  - Import errors
Checklist:

 Zero erros de lint
 Máximo 5 warnings
 Nenhum erro de tipo TypeScript


F3. Testes Unitários (se houver)
bashnpm test
Resultado esperado:
bashTest Suites: X passed, X total
Tests:       Y passed, Y total
Checklist:

 Todos testes passam
 Sem testes quebrados
 Cobertura > 70% (ideal)


F4. Checklist Pré-Deploy
yamlCódigo:
  [ ] Build production OK
  [ ] Lint sem erros
  [ ] Testes passando
  [ ] Sem console.log() em código crítico
  [ ] Sem TODOs críticos pendentes
  
Funcional:
  [ ] Todas as 8 correções funcionando
  [ ] Testes de regressão OK
  [ ] Performance aceitável
  
Documentação:
  [ ] TASKS executadas 100%
  [ ] Bugs marcados como resolvidos
  [ ] Changelog atualizado (se houver)
  
Banco de Dados:
  [ ] Migrations aplicadas em DEV
  [ ] VIEW affiliate_hierarchy criada
  [ ] Dados de teste OK
  
Backups:
  [ ] Backup do banco atual feito
  [ ] Rollback testado (se possível)
  [ ] Plano B documentado

📊 RELATÓRIO FINAL
Template de Report ao Renato:
markdown# RELATÓRIO DE TESTES - SISTEMA AFILIADOS

**Data:** [dd/mm/yyyy]
**Executor:** Kiro
**Versão testada:** Fase 1 + Fase 2 (8 bugs)

---

## ✅ TESTES APROVADOS

FASE A - Setup:
  ✅ Ambiente DEV configurado
  ✅ Banco conectado
  ✅ Dados de teste criados

FASE B - Fase 1 (5 bugs):
  ✅ Bug 01 - Hierarquia: OK
  ✅ Bug 03 - Rastreamento: OK
  ✅ Bug 04 - RPC Comissões: OK
  ✅ Bug 05 - Cálculo: OK
  ✅ Bug 06 - Queries: OK

FASE C - Fase 2 (3 bugs):
  ✅ Bug 02 - Métricas: OK
  ✅ Bug 07 - Hierarquia Admin: OK
  ✅ Bug 08 - Tipos Monetários: OK

FASE D - Regressão:
  ✅ Criar afiliado: OK
  ✅ Criar pedido: OK
  ✅ Processar pagamento: OK
  ✅ Solicitar saque: OK

FASE E - Performance:
  ✅ Tempos carregamento: OK
  ✅ VIEW affiliate_hierarchy: 420ms ✅
  ✅ Sem queries N+1: OK

FASE F - Pré-Deploy:
  ✅ Build production: OK
  ✅ Lint: OK
  ✅ Checklist: 100%

---

## 📊 MÉTRICAS

Tempo total de testes: [X] minutos
Bugs encontrados: 0
Correções necessárias: 0
Performance geral: ✅ Ótima

---

## 🚀 RECOMENDAÇÃO

✅ **SISTEMA APROVADO PARA PRODUÇÃO**

Próximos passos:
1. Backup do banco produção
2. Deploy do código (git push)
3. Aplicar migrations (se houver pending)
4. Smoke test produção (5 min)
5. Monitorar logs por 1-2 horas

---

## ❌ PROBLEMAS ENCONTRADOS

[Se houver, listar aqui com detalhes]

OU

Nenhum problema encontrado. ✅

---

**Assinatura:** Kiro  
**Aprovação Renato:** [ ]

🆘 INSTRUÇÕES DE REPORTE DE PROBLEMAS
Se algum teste falhar:
yaml1. NÃO continue para próxima fase

2. Documente:
   - Qual teste falhou (ex: "FASE C1 - Bug 02")
   - O que era esperado
   - O que aconteceu
   - Screenshot (se visual)
   - Logs do console
   - Query manual (se banco)

3. Template de report:

   PROBLEMA ENCONTRADO - [FASE X - TESTE Y]
   
   Teste: [Nome do teste]
   Resultado esperado: [Descrição]
   Resultado obtido: [Descrição]
   
   Evidências:
   - [Screenshot/log/query]
   
   Possível causa: [Se souber]

4. Enviar ao Renato e AGUARDAR aprovação

⏱️ ESTIMATIVA DE TEMPO
yamlFASE A - Setup: 10 min
FASE B - Fase 1: 25 min
FASE C - Fase 2: 20 min
FASE D - Regressão: 15 min
FASE E - Performance: 10 min
FASE F - Pré-Deploy: 10 min

TOTAL: ~90 minutos (1h30)

✅ APROVAÇÃO FINAL
yamlRenato:
  [ ] Relatório de testes revisado
  [ ] Todos checkboxes validados
  [ ] Performance aceitável
  [ ] Sem bugs críticos
  
  ✅ AUTORIZADO DEPLOY PRODUÇÃO
  ❌ NECESSÁRIO CORREÇÕES

FIM DO DOCUMENTO

PRÓXIMA AÇÃO: Kiro executar FASE A (Setup) e reportar status.Claude é uma IA e pode cometer erros. Por favor, verifique as respostas. Sonnet 4.5


---

## 🔄 ATUALIZAÇÃO: WEBHOOK ASAAS MIGRADO

**Data:** 12/01/2026  
**Status:** ✅ CONCLUÍDO  

### **Contexto:**
O webhook Asaas estava no servidor Python (VPS Easypanel) que caiu por falta de pagamento. Sistema de pagamentos ficou PARADO.

### **Solução Implementada:**
Webhook migrado para backend Express (Docker Swarm) com alta disponibilidade.

### **Correção Crítica Aplicada:**
- ❌ **ANTES:** Validação HMAC SHA256 (INCORRETA)
- ✅ **DEPOIS:** Validação via header `asaas-access-token` (OFICIAL)

### **Arquivos Modificados:**
1. `src/api/routes/webhooks/asaas-webhook.ts` - Webhook Express atualizado
2. `docs/WEBHOOK_ASAAS_ATUALIZACAO.md` - Documentação completa

### **Validações Realizadas:**
- [x] Build passou sem erros
- [x] Variável `ASAAS_WEBHOOK_TOKEN` configurada no `.env`
- [x] Lógica de comissões mantida intacta
- [x] RPC `calculate_commission_split` preservado
- [x] Logs de debug adicionados
- [x] Resposta padrão Asaas implementada

### **Próximos Passos (Renato):**
1. [ ] Deploy do Express para Docker Swarm
2. [ ] Configurar URL no painel Asaas: `https://api.slimquality.com.br/api/webhooks/asaas`
3. [ ] Configurar token: `1013e1fa-12d3-4b89-bc23-704068796447`
4. [ ] Testar com pagamento real
5. [ ] Remover webhook Python do painel (após validação)

### **Teste Manual (após deploy):**
```bash
curl -X POST https://api.slimquality.com.br/api/webhooks/asaas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: 1013e1fa-12d3-4b89-bc23-704068796447" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test123",
      "value": 3290.00,
      "externalReference": "order_uuid_aqui"
    }
  }'
```

**Resultado esperado:**
```json
{
  "received": true,
  "success": true,
  "message": "Webhook processado com sucesso"
}
```

---

**Commit:** `6abcef5` - fix: atualizar webhook Asaas com autenticacao correta  
**Documentação:** `docs/WEBHOOK_ASAAS_ATUALIZACAO.md`  
**Status:** ✅ Código pronto - Aguardando deploy
