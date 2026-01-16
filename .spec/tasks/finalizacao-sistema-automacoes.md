# 🚀 FINALIZAÇÃO DO SISTEMA DE AUTOMAÇÕES - TAREFAS CRÍTICAS

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 📋 INFORMAÇÕES DO PROJETO

**Data de Criação:** 15 de janeiro de 2026  
**Agente Responsável:** Kiro AI  
**Cliente:** Renato Carraro  
**Status:** AGUARDANDO AUTORIZAÇÃO PARA EXECUÇÃO

---

## 🎯 OBJETIVO

Finalizar a integração do Sistema de Automações, conectando o backend já implementado (95%) com o frontend mockado, tornando o módulo 100% funcional para o usuário final.

---

## 📊 SITUAÇÃO ATUAL (BASEADA NA ANÁLISE REALIZADA)

### ✅ **JÁ IMPLEMENTADO E FUNCIONAL:**
- **Backend Services:** AutomationService, RulesExecutor, ActionExecutor (95%)
- **Banco de Dados:** Tabelas automation_rules e rule_execution_logs (100%)
- **APIs REST:** Todos os endpoints implementados (100%)
- **Schemas Pydantic:** Validação completa (100%)
- **Integração LangGraph:** Node rules_evaluator (90%)

### ❌ **PROBLEMAS CRÍTICOS IDENTIFICADOS:**
- **API não registrada no main.py** - Frontend não consegue acessar
- **Frontend completamente mockado** - Dados falsos hardcoded
- **Zero integração** - Backend e frontend não se comunicam
- **Funcionalidades de UI não funcionais** - Botões não fazem nada

---

## 📋 TAREFAS CRÍTICAS PARA FINALIZAÇÃO

### 🔧 **TAREFA 1: REGISTRAR API NO SERVIDOR PRINCIPAL**

**Prioridade:** 🚨 **CRÍTICA**  
**Tempo Estimado:** 5 minutos  
**Dependências:** Nenhuma

**Descrição:**
Registrar o router de automações no `agent/src/api/main.py` para tornar as APIs acessíveis.

**Arquivos a Modificar:**
- `agent/src/api/main.py`

**Ações Específicas:**
1. Adicionar import: `from .automations import router as automations_router`
2. Registrar router: `app.include_router(automations_router)`
3. Testar acesso às APIs via curl/Postman

**Critérios de Aceitação:**
- [ ] API `/api/automations/rules` retorna 200 (não 404)
- [ ] API `/api/automations/stats` retorna dados reais
- [ ] Todas as rotas de automação acessíveis

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Verificar padrão de registro de outros routers
- ✅ **Verificação Banco Real:** Confirmar que APIs retornam dados do banco
- ✅ **Compromisso Honestidade:** Testar TODAS as APIs antes de reportar sucesso

---

### 🎨 **TAREFA 2: CONECTAR FRONTEND ÀS APIS REAIS**

**Prioridade:** 🚨 **CRÍTICA**  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefa 1 concluída

**Descrição:**
Substituir dados mockados no frontend por chamadas reais às APIs de automação.

**Arquivos a Modificar:**
- `src/pages/dashboard/Automacoes.tsx`
- Criar: `src/services/automation.service.ts` (se não existir)

**Ações Específicas:**
1. Remover array `mockAutomations` hardcoded
2. Implementar `useEffect` para carregar dados reais
3. Criar service para chamadas HTTP
4. Implementar estados de loading/error
5. Conectar botões de ação às APIs

**Critérios de Aceitação:**
- [ ] Dados carregados via API real (não mockados)
- [ ] Estatísticas vindas de `/api/automations/stats`
- [ ] Botão "Nova Automação" funcional
- [ ] Botões "Ativar/Pausar" funcionais
- [ ] Estados de loading implementados

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Estudar padrão de outros services do projeto
- ✅ **Verificação Banco Real:** Confirmar que dados vêm do banco Supabase
- ✅ **Compromisso Honestidade:** Testar TODAS as funcionalidades antes de reportar

---

### 🔗 **TAREFA 3: IMPLEMENTAR FUNCIONALIDADES DE CRUD**

**Prioridade:** 🔥 **ALTA**  
**Tempo Estimado:** 45 minutos  
**Dependências:** Tarefa 2 concluída

**Descrição:**
Conectar modal de criação/edição às APIs reais para permitir CRUD completo.

**Arquivos a Modificar:**
- `src/pages/dashboard/Automacoes.tsx`
- `src/services/automation.service.ts`

**Ações Específicas:**
1. Conectar formulário de criação à API POST
2. Implementar edição via API PUT
3. Conectar exclusão à API DELETE
4. Implementar toggle de status via API
5. Adicionar validação de formulário
6. Implementar feedback de sucesso/erro

**Critérios de Aceitação:**
- [ ] Criar nova automação funciona
- [ ] Editar automação existente funciona
- [ ] Deletar automação funciona
- [ ] Ativar/Pausar automação funciona
- [ ] Validações de formulário implementadas
- [ ] Mensagens de feedback ao usuário

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Verificar padrão de formulários em outros componentes
- ✅ **Verificação Banco Real:** Confirmar que mudanças persistem no banco
- ✅ **Compromisso Honestidade:** Testar TODOS os cenários (sucesso e erro)

---

### 📊 **TAREFA 4: IMPLEMENTAR VISUALIZAÇÃO DE LOGS**

**Prioridade:** 🟡 **MÉDIA**  
**Tempo Estimado:** 30 minutos  
**Dependências:** Tarefa 2 concluída

**Descrição:**
Conectar botão "Ver Logs" à API de logs para mostrar execuções reais.

**Arquivos a Modificar:**
- `src/pages/dashboard/Automacoes.tsx`
- Criar: `src/components/automation/LogsModal.tsx`

**Ações Específicas:**
1. Criar modal de logs
2. Conectar à API `/api/automations/logs`
3. Implementar filtros por regra
4. Mostrar detalhes de execução
5. Implementar paginação

**Critérios de Aceitação:**
- [ ] Modal de logs abre ao clicar "Ver Logs"
- [ ] Logs carregados da API real
- [ ] Filtros funcionais
- [ ] Paginação implementada
- [ ] Detalhes de execução visíveis

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Verificar padrão de modais no projeto
- ✅ **Verificação Banco Real:** Confirmar que logs vêm do banco
- ✅ **Compromisso Honestidade:** Testar com dados reais de execução

---

### 🧪 **TAREFA 5: TESTES DE INTEGRAÇÃO COMPLETA**

**Prioridade:** 🟡 **MÉDIA**  
**Tempo Estimado:** 20 minutos  
**Dependências:** Tarefas 1, 2 e 3 concluídas

**Descrição:**
Testar fluxo completo end-to-end do sistema de automações.

**Cenários de Teste:**
1. **Criar Automação:** Frontend → API → Banco → Frontend
2. **Listar Automações:** Banco → API → Frontend
3. **Editar Automação:** Frontend → API → Banco → Frontend
4. **Ativar/Desativar:** Frontend → API → Banco → Frontend
5. **Ver Logs:** Banco → API → Frontend
6. **Estatísticas:** Banco → API → Frontend

**Critérios de Aceitação:**
- [ ] Todos os cenários funcionam end-to-end
- [ ] Dados persistem corretamente no banco
- [ ] Interface atualiza em tempo real
- [ ] Não há dados mockados remanescentes
- [ ] Performance adequada (< 2s por operação)

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Planejar cenários de teste antes de executar
- ✅ **Verificação Banco Real:** Confirmar persistência via Power Supabase
- ✅ **Compromisso Honestidade:** Reportar APENAS o que realmente funciona

---

### 🔧 **TAREFA 6: LIMPEZA E OTIMIZAÇÃO**

**Prioridade:** 🟢 **BAIXA**  
**Tempo Estimado:** 15 minutos  
**Dependências:** Todas as tarefas anteriores

**Descrição:**
Remover código mockado, comentários desnecessários e otimizar performance.

**Ações Específicas:**
1. Remover completamente array `mockAutomations`
2. Remover comentários de desenvolvimento
3. Otimizar chamadas de API (cache se necessário)
4. Adicionar loading states adequados
5. Melhorar tratamento de erros

**Critérios de Aceitação:**
- [ ] Nenhum dado mockado remanescente
- [ ] Código limpo e otimizado
- [ ] Performance adequada
- [ ] Tratamento de erros robusto
- [ ] UX fluida para o usuário

**Regras Obrigatórias:**
- ✅ **Análise Preventiva:** Revisar todo o código antes de limpar
- ✅ **Verificação Banco Real:** Confirmar que tudo vem do banco
- ✅ **Compromisso Honestidade:** Testar após cada limpeza

---

## 📊 CRONOGRAMA DE EXECUÇÃO

### **FASE 1: CONEXÃO CRÍTICA (35 minutos)**
- Tarefa 1: Registrar API (5 min)
- Tarefa 2: Conectar Frontend (30 min)

### **FASE 2: FUNCIONALIDADES (75 minutos)**
- Tarefa 3: CRUD Completo (45 min)
- Tarefa 4: Logs (30 min)

### **FASE 3: VALIDAÇÃO E LIMPEZA (35 minutos)**
- Tarefa 5: Testes Integração (20 min)
- Tarefa 6: Limpeza (15 min)

**TEMPO TOTAL ESTIMADO:** 145 minutos (2h25min)

---

## 🚨 REGRAS OBRIGATÓRIAS PARA EXECUÇÃO

### **ANTES DE CADA TAREFA:**
- [ ] ✅ **Análise Preventiva Obrigatória** - Ler steering file e planejar
- [ ] ✅ **Verificação Banco Real** - Usar Power Supabase para confirmar dados
- [ ] ✅ **Compromisso Honestidade** - Testar TUDO antes de reportar sucesso

### **DURANTE CADA TAREFA:**
- [ ] Seguir exatamente o planejado na análise preventiva
- [ ] Usar padrões existentes do projeto
- [ ] Implementar tratamento de erros desde o início
- [ ] Não improvisar - seguir o plano

### **APÓS CADA TAREFA:**
- [ ] Testar funcionalidade implementada
- [ ] Verificar persistência no banco via Power Supabase
- [ ] Reportar status REAL (não assumir que funciona)
- [ ] Documentar problemas encontrados

---

## 🎯 CRITÉRIOS DE SUCESSO FINAL

### **SISTEMA 100% FUNCIONAL QUANDO:**
- [ ] ✅ Frontend carrega dados reais do banco (não mockados)
- [ ] ✅ Usuário consegue criar nova automação
- [ ] ✅ Usuário consegue editar automação existente
- [ ] ✅ Usuário consegue ativar/desativar automações
- [ ] ✅ Usuário consegue ver logs de execução
- [ ] ✅ Estatísticas mostram dados reais
- [ ] ✅ Todas as operações persistem no banco Supabase
- [ ] ✅ Performance adequada (< 2s por operação)
- [ ] ✅ Tratamento de erros funcional
- [ ] ✅ UX fluida e responsiva

---

## ⚠️ IMPORTANTE

**ESTE DOCUMENTO É UM PLANO DE EXECUÇÃO.**

**NÃO INICIAR NENHUMA TAREFA SEM AUTORIZAÇÃO EXPLÍCITA DO USUÁRIO.**

**CADA TAREFA DEVE SER EXECUTADA INDIVIDUALMENTE E VALIDADA ANTES DE PROSSEGUIR.**

**SEGUIR RIGOROSAMENTE AS REGRAS DE ANÁLISE PREVENTIVA, VERIFICAÇÃO DO BANCO REAL E COMPROMISSO DE HONESTIDADE.**

---

**Status:** 📋 **AGUARDANDO AUTORIZAÇÃO PARA EXECUÇÃO**  
**Próximo Passo:** Aguardar comando do usuário para iniciar Tarefa 1


---

## 📚 LIÇÕES APRENDIDAS E TROUBLESHOOTING

**Data de Atualização:** 16 de janeiro de 2026  
**Baseado em:** Implementação real do sistema de automações no projeto Slim Quality

Esta seção documenta TODOS os problemas encontrados durante a implementação e suas soluções, para que qualquer desenvolvedor possa reproduzir este módulo em outros projetos SEM cometer os mesmos erros.

---

### 🐛 PROBLEMA 1: APIs RETORNANDO 404 (Mais Comum)

**Sintoma:**
```
Failed to load resource: the server responded with a status of 404
GET /automations/rules - 404 Not Found
GET /automations/stats - 404 Not Found
```

**Causa Raiz:**
Router de automações não estava registrado no `main.py`, mesmo que o arquivo `automations.py` existisse e estivesse correto.

**Solução Completa:**

1. **Verificar se o router está importado:**
```python
# agent/src/api/main.py
from .automations import router as automations_router
```

2. **Verificar se o router está registrado:**
```python
# agent/src/api/main.py
app.include_router(automations_router)
```

3. **Verificar prefixo do router:**
```python
# agent/src/api/automations.py
router = APIRouter(prefix="/automations", tags=["automations"])
```

4. **IMPORTANTE:** NÃO adicionar `/api` no prefixo do router se já existe no `include_router`:
```python
# ❌ ERRADO - duplica o prefixo
router = APIRouter(prefix="/api/automations")
app.include_router(router)  # Resulta em /api/api/automations

# ✅ CORRETO
router = APIRouter(prefix="/automations")
app.include_router(router)  # Resulta em /automations
```

**Como Testar:**
```bash
# Verificar se API está acessível
curl http://localhost:8000/automations/rules
curl http://localhost:8000/automations/stats

# Deve retornar 200 OK, não 404
```

**Checklist de Verificação:**
- [ ] Router importado no main.py
- [ ] Router registrado com `app.include_router()`
- [ ] Prefixo correto (sem duplicação)
- [ ] Container reiniciado após alterações
- [ ] APIs retornam 200 OK

---

### 🐛 PROBLEMA 2: DEPENDÊNCIA FALTANDO (aiohttp)

**Sintoma:**
```
ModuleNotFoundError: No module named 'aiohttp'
```

**Causa Raiz:**
Backend usa `aiohttp` para chamadas HTTP assíncronas, mas a dependência não estava no `requirements.txt`.

**Solução Completa:**

1. **Adicionar ao requirements.txt:**
```txt
# agent/requirements.txt
aiohttp==3.9.1
```

2. **Reinstalar dependências:**
```bash
cd agent
pip install -r requirements.txt
```

3. **Rebuild do container Docker:**
```bash
docker build -t renumvscode/slim-agent:latest .
docker push renumvscode/slim-agent:latest
```

**Como Prevenir:**
- Sempre verificar imports no código
- Adicionar dependências ANTES de fazer deploy
- Testar localmente antes de subir para produção

**Checklist de Verificação:**
- [ ] Dependência adicionada ao requirements.txt
- [ ] Versão especificada (não usar `latest`)
- [ ] Container rebuilded
- [ ] Aplicação inicia sem erros

---

### 🐛 PROBLEMA 3: FRONTEND RECEBE OBJETO AO INVÉS DE ARRAY

**Sintoma:**
```typescript
// Frontend espera:
data: AutomationRule[]

// Backend retorna:
data: { rules: AutomationRule[] }

// Erro:
TypeError: data.map is not a function
```

**Causa Raiz:**
Backend retorna objeto com propriedade `rules`, mas frontend espera array direto.

**Solução Completa:**

**Opção 1: Ajustar Service (Recomendado)**
```typescript
// src/services/automation.service.ts
async getRules(): Promise<ApiResponse<AutomationRule[]>> {
  const response = await apiService.get<{ rules: AutomationRule[] }>(`${this.baseUrl}/rules`);
  
  // Extrair array de rules do objeto de resposta
  if (response.success && response.data) {
    return {
      success: true,
      data: response.data.rules || []  // ✅ Extrai o array
    };
  }
  
  return response as ApiResponse<AutomationRule[]>;
}
```

**Opção 2: Ajustar Backend**
```python
# agent/src/api/automations.py
@router.get("/rules")
async def get_rules():
    rules = await automation_service.get_rules()
    return rules  # ✅ Retorna array direto, não objeto
```

**Como Prevenir:**
- Definir contrato de API antes de implementar
- Usar TypeScript interfaces para validar tipos
- Testar integração frontend/backend cedo

**Checklist de Verificação:**
- [ ] Frontend recebe tipo esperado
- [ ] Service extrai dados corretamente
- [ ] Não há erros de `.map()` ou `.forEach()`
- [ ] Dados renderizam na tela

---

### 🐛 PROBLEMA 4: CORS BLOQUEANDO REQUISIÇÕES

**Sintoma:**
```
Access to fetch at 'http://api.slimquality.com.br/automations/rules' 
from origin 'https://slimquality.com.br' has been blocked by CORS policy
```

**Causa Raiz:**
Backend não permite requisições do domínio do frontend.

**Solução Completa:**

```python
# agent/src/api/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://slimquality.com.br",
        "https://www.slimquality.com.br",
        "http://localhost:8080",  # Desenvolvimento
        "http://localhost:3000"   # Desenvolvimento alternativo
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

**Como Prevenir:**
- Configurar CORS desde o início
- Adicionar domínios de desenvolvimento E produção
- Testar com frontend real, não apenas Postman

**Checklist de Verificação:**
- [ ] CORS configurado no backend
- [ ] Domínios corretos na lista
- [ ] Métodos HTTP permitidos
- [ ] Requisições funcionam do frontend

---

### 🐛 PROBLEMA 5: DADOS MOCKADOS PERSISTINDO

**Sintoma:**
Frontend mostra dados falsos mesmo após conectar às APIs reais.

**Causa Raiz:**
Array mockado ainda existe no código e é usado como fallback.

**Solução Completa:**

1. **Remover completamente dados mockados:**
```typescript
// ❌ ANTES
const mockAutomations = [
  { id: 1, nome: "Teste", ... }
];

const [automations, setAutomations] = useState(mockAutomations);

// ✅ DEPOIS
const [automations, setAutomations] = useState<AutomationRule[]>([]);
```

2. **Carregar dados reais no useEffect:**
```typescript
useEffect(() => {
  const loadAutomations = async () => {
    setLoading(true);
    const response = await automationService.getRules();
    if (response.success) {
      setAutomations(response.data);
    }
    setLoading(false);
  };
  
  loadAutomations();
}, []);
```

3. **Verificar que não há fallback para mock:**
```typescript
// ❌ ERRADO
const data = response.data || mockAutomations;

// ✅ CORRETO
const data = response.data || [];
```

**Como Prevenir:**
- Remover mocks assim que APIs estiverem prontas
- Usar estados vazios como padrão
- Buscar por "mock" no código antes de finalizar

**Checklist de Verificação:**
- [ ] Nenhum array mockado no código
- [ ] Estado inicial vazio
- [ ] Dados vêm 100% da API
- [ ] Busca por "mock" retorna 0 resultados

---

### 🐛 PROBLEMA 6: MODAL NÃO RESPONSIVO

**Sintoma:**
Usuário precisa reduzir zoom para 50% para ver formulário completo.

**Causa Raiz:**
Modal muito largo e sem controle de altura.

**Solução Completa:**

```typescript
// ❌ ANTES
<DialogContent className="max-w-2xl">

// ✅ DEPOIS
<DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
  <div className="space-y-4">  {/* Reduzir espaçamentos */}
    {/* Conteúdo */}
  </div>
</DialogContent>
```

**Ajustes Adicionais:**
```typescript
// Reduzir tamanhos de texto
<DialogTitle className="text-sm">  {/* era text-lg */}

// Botões compactos
<Button size="sm">  {/* adicionar size */}

// Layout responsivo
<div className="flex flex-wrap gap-2">  {/* adicionar flex-wrap */}
```

**Como Prevenir:**
- Testar em diferentes resoluções desde o início
- Usar `max-h-[90vh]` em modais
- Adicionar `overflow-y-auto` para scroll
- Usar tamanhos relativos, não fixos

**Checklist de Verificação:**
- [ ] Modal visível em 100% zoom
- [ ] Scroll funciona se conteúdo grande
- [ ] Responsivo em mobile
- [ ] Botões acessíveis

---

### 🐛 PROBLEMA 7: LOGS DO MCP MOSTRANDO ERROS IRRELEVANTES

**Sintoma:**
```
[stripe] Error: Unauthorized
[vercel] Error: fetch failed
```

**Causa Raiz:**
MCPs não autenticados ou com problemas temporários de rede.

**Solução:**
- Ignorar erros de MCPs não utilizados (ex: Stripe)
- Verificar se MCP está funcionando com teste direto:
```typescript
// Testar MCP Vercel
await mcp_vercel_list_teams();
await mcp_vercel_list_projects();
```

**Como Prevenir:**
- Autenticar apenas MCPs que serão usados
- Adicionar tratamento de erros para MCPs opcionais
- Não assumir que erro no log = sistema quebrado

**Checklist de Verificação:**
- [ ] MCPs necessários autenticados
- [ ] MCPs opcionais podem falhar sem quebrar sistema
- [ ] Logs de erro não impedem funcionalidade

---

### 📋 CHECKLIST COMPLETO DE IMPLEMENTAÇÃO

Use este checklist ao reproduzir o módulo de automações em outro projeto:

#### **FASE 1: BACKEND**
- [ ] Criar tabelas no Supabase (automation_rules, rule_execution_logs)
- [ ] Implementar AutomationService
- [ ] Implementar schemas Pydantic
- [ ] Criar router FastAPI com prefixo correto
- [ ] Adicionar TODAS as dependências ao requirements.txt
- [ ] Registrar router no main.py
- [ ] Configurar CORS com domínios corretos
- [ ] Testar APIs com curl/Postman (200 OK)

#### **FASE 2: FRONTEND**
- [ ] Criar service TypeScript para chamadas HTTP
- [ ] Definir interfaces TypeScript
- [ ] Implementar página com estado vazio (não mockado)
- [ ] Implementar useEffect para carregar dados
- [ ] Adicionar estados de loading/error
- [ ] Criar modal responsivo (max-w-lg, max-h-[90vh])
- [ ] Conectar formulários às APIs
- [ ] Implementar feedback de sucesso/erro

#### **FASE 3: INTEGRAÇÃO**
- [ ] Testar criação de automação end-to-end
- [ ] Testar edição de automação
- [ ] Testar exclusão de automação
- [ ] Testar toggle de status
- [ ] Verificar persistência no banco via Power Supabase
- [ ] Remover TODOS os dados mockados
- [ ] Testar em diferentes resoluções
- [ ] Verificar performance (< 2s por operação)

#### **FASE 4: DEPLOY**
- [ ] Rebuild container Docker
- [ ] Push para Docker Hub
- [ ] Rebuild no EasyPanel/servidor
- [ ] Testar em produção
- [ ] Verificar logs de erro
- [ ] Confirmar que tudo funciona

---

### 🎯 TEMPO REAL DE IMPLEMENTAÇÃO

**Baseado na experiência real:**

| Fase | Tempo Estimado | Tempo Real | Diferença |
|------|----------------|------------|-----------|
| Backend | 2h | 1h30min | -30min ✅ |
| Frontend | 1h30min | 2h | +30min ⚠️ |
| Integração | 1h | 2h30min | +1h30min 🚨 |
| Troubleshooting | 0h | 3h | +3h 🚨 |
| **TOTAL** | **4h30min** | **9h** | **+4h30min** |

**Lição:** Sempre adicione 100% de buffer para troubleshooting em integrações complexas.

---

### 💡 DICAS FINAIS PARA REPRODUÇÃO

1. **Análise Preventiva é OBRIGATÓRIA**
   - Leia TODOS os arquivos relacionados antes de começar
   - Entenda o padrão do projeto
   - Planeje antes de implementar

2. **Teste Incremental**
   - Teste cada endpoint individualmente
   - Não espere tudo estar pronto para testar
   - Use curl/Postman antes de conectar frontend

3. **Verificação do Banco Real**
   - Use Power Supabase para confirmar dados
   - Não assuma que dados foram salvos
   - Verifique persistência após cada operação

4. **Documentação Durante Implementação**
   - Documente problemas conforme encontra
   - Anote soluções que funcionaram
   - Crie este tipo de guia para próximos projetos

5. **Comunicação Honesta**
   - Reporte status REAL, não assumido
   - Admita quando algo não funciona
   - Peça ajuda quando travar

---

### 📞 SUPORTE

Se encontrar problemas não documentados aqui:

1. Verificar logs do container: `docker logs slim-agent`
2. Verificar logs do navegador: Console do DevTools
3. Testar APIs diretamente: curl/Postman
4. Verificar banco de dados: Power Supabase
5. Buscar por erros similares neste documento

**Este documento é vivo e deve ser atualizado sempre que novos problemas forem encontrados e resolvidos.**

---

**Última Atualização:** 16 de janeiro de 2026  
**Contribuidores:** Kiro AI, Renato Carraro  
**Status:** ✅ Validado em produção
