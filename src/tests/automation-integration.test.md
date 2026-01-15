# 🧪 TESTES DE INTEGRAÇÃO - SISTEMA DE AUTOMAÇÕES

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 CENÁRIOS DE TESTE OBRIGATÓRIOS

### 🎯 **CENÁRIO 1: CRIAR AUTOMAÇÃO**
**Fluxo:** Frontend → API → Banco → Frontend

**Passos:**
1. Abrir página `/dashboard/automacoes`
2. Clicar em "Nova Automação"
3. Preencher formulário:
   - Nome: "Teste Automação"
   - Gatilho: "Cliente cadastrado"
   - Ação: "Enviar email"
4. Clicar em "Criar Automação"

**Validações:**
- [ ] Modal fecha após sucesso
- [ ] Toast de sucesso aparece
- [ ] Nova automação aparece na lista
- [ ] Dados persistem no banco Supabase
- [ ] Status inicial é "ativa"

**API Chamada:** `POST /api/automations/rules`

---

### 🎯 **CENÁRIO 2: LISTAR AUTOMAÇÕES**
**Fluxo:** Banco → API → Frontend

**Passos:**
1. Acessar página `/dashboard/automacoes`
2. Aguardar carregamento

**Validações:**
- [ ] Loading aparece inicialmente
- [ ] Dados carregam da API real
- [ ] Estatísticas mostram valores corretos
- [ ] Cards de automação exibem dados reais
- [ ] Não há dados mockados

**APIs Chamadas:** 
- `GET /api/automations/rules`
- `GET /api/automations/stats`

---

### 🎯 **CENÁRIO 3: EDITAR AUTOMAÇÃO**
**Fluxo:** Frontend → API → Banco → Frontend

**Passos:**
1. Clicar no ícone de editar em uma automação
2. Modal abre com dados preenchidos
3. Alterar nome para "Teste Editado"
4. Clicar em "Salvar Alterações"

**Validações:**
- [ ] Modal abre com dados corretos
- [ ] Formulário permite edição
- [ ] Toast de sucesso aparece
- [ ] Lista atualiza com novo nome
- [ ] Mudança persiste no banco

**API Chamada:** `PUT /api/automations/rules/{id}`

---

### 🎯 **CENÁRIO 4: ATIVAR/DESATIVAR AUTOMAÇÃO**
**Fluxo:** Frontend → API → Banco → Frontend

**Passos:**
1. Clicar em "Pausar" em automação ativa
2. Aguardar resposta
3. Clicar em "Ativar" na mesma automação

**Validações:**
- [ ] Status muda visualmente (badge)
- [ ] Toast de confirmação aparece
- [ ] Mudança persiste no banco
- [ ] Botão alterna entre "Pausar"/"Ativar"

**API Chamada:** `PUT /api/automations/rules/{id}/status`

---

### 🎯 **CENÁRIO 5: VER LOGS**
**Fluxo:** Banco → API → Frontend

**Passos:**
1. Clicar em "Ver Logs" em uma automação
2. Modal de logs abre
3. Verificar paginação (se houver dados)

**Validações:**
- [ ] Modal abre corretamente
- [ ] Logs carregam da API real
- [ ] Paginação funciona (se aplicável)
- [ ] Estados de sucesso/erro visíveis
- [ ] Formatação de data correta

**API Chamada:** `GET /api/automations/logs?rule_id={id}`

---

### 🎯 **CENÁRIO 6: ESTATÍSTICAS**
**Fluxo:** Banco → API → Frontend

**Passos:**
1. Verificar cards de estatísticas no topo
2. Comparar com dados reais do banco

**Validações:**
- [ ] "Fluxos Ativos" conta automações ativas
- [ ] "Mensagens Enviadas Hoje" vem do banco
- [ ] "Taxa Média de Abertura" calculada corretamente
- [ ] Valores não são hardcoded

**API Chamada:** `GET /api/automations/stats`

---

## 🔍 VALIDAÇÕES TÉCNICAS

### ✅ **CÓDIGO PREPARADO PARA TESTES:**
- [x] Dados mockados removidos completamente
- [x] APIs conectadas via service
- [x] Estados de loading implementados
- [x] Tratamento de erros funcional
- [x] TypeScript sem erros
- [x] Componentes seguem padrões do projeto

### 🚨 **BLOQUEADORES ATUAIS:**
- [ ] Servidor backend offline (localhost:8000)
- [ ] APIs não acessíveis para teste real
- [ ] Dados do banco não validados

---

## 📊 MÉTRICAS DE PERFORMANCE

### 🎯 **OBJETIVOS:**
- **Carregamento inicial:** < 2 segundos
- **Operações CRUD:** < 1 segundo cada
- **Abertura de modais:** < 500ms
- **Paginação de logs:** < 1 segundo

### 📈 **COMO MEDIR:**
```javascript
// Exemplo de medição no DevTools
console.time('loadAutomations');
// ... operação ...
console.timeEnd('loadAutomations');
```

---

## 🧪 SCRIPT DE TESTE AUTOMATIZADO

### **Para executar quando servidor estiver online:**

```bash
# 1. Verificar se servidor está rodando
curl -f http://localhost:8000/api/automations/rules || echo "❌ Servidor offline"

# 2. Testar endpoints básicos
curl -X GET http://localhost:8000/api/automations/rules
curl -X GET http://localhost:8000/api/automations/stats

# 3. Abrir frontend e executar testes manuais
npm run dev
```

### **Checklist de Validação Manual:**
```
□ Página carrega sem erros no console
□ Dados vêm da API (não mockados)
□ Criar automação funciona
□ Editar automação funciona
□ Toggle status funciona
□ Ver logs funciona
□ Estatísticas são reais
□ Performance adequada
□ Sem dados hardcoded
```

---

## 🎯 CRITÉRIOS DE SUCESSO

### ✅ **SISTEMA 100% FUNCIONAL QUANDO:**
- [ ] Frontend carrega dados reais do banco
- [ ] Usuário consegue criar nova automação
- [ ] Usuário consegue editar automação existente
- [ ] Usuário consegue ativar/desativar automações
- [ ] Usuário consegue ver logs de execução
- [ ] Estatísticas mostram dados reais
- [ ] Todas as operações persistem no banco
- [ ] Performance < 2s por operação
- [ ] Tratamento de erros funcional
- [ ] UX fluida e responsiva

---

## 📝 RELATÓRIO DE PREPARAÇÃO

### ✅ **CÓDIGO PRONTO PARA TESTES:**
- **Service implementado:** `automation.service.ts` com todas as APIs
- **Componente principal:** `Automacoes.tsx` conectado às APIs
- **Modal de logs:** `LogsModal.tsx` funcional
- **Estados gerenciados:** Loading, error, success
- **Validações:** Formulário com feedback
- **TypeScript:** Sem erros de compilação

### ⚠️ **AGUARDANDO:**
- **Deploy do backend:** Para APIs ficarem acessíveis
- **Rebuild no EasyPanel:** Para testar com dados reais
- **Validação final:** Execução dos cenários de teste

---

**STATUS:** 📋 **PREPARADO PARA TESTES** - Aguardando servidor backend online