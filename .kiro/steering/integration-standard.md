ADRÃO DE INTEGRAÇÃO BACKEND/FRONTEND

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

⚠️ REGRA FUNDAMENTAL
TODA solicitação de sprint DEVE incluir EXPLICITAMENTE a integração frontend.
Este documento serve como referência para Claude ao criar solicitações de specs.

🎯 ESTRUTURA OBRIGATÓRIA DAS SOLICITAÇÕES
Seção de Backend (sempre teve)
markdown### 1. BACKEND

**Entregas necessárias:**
- Tabelas do banco
- Serviços
- Controllers
- APIs REST
- Validações
- etc.
Seção de Integração Frontend (OBRIGATÓRIA)
markdown### 2. INTEGRAÇÃO FRONTEND (OBRIGATÓRIA)

**Páginas a conectar/criar:**
- Lista de páginas que usam essa funcionalidade
- Rotas esperadas

**Componentes:**
- Componentes reutilizáveis necessários
- Funcionalidades de cada componente

**Serviços frontend:**
- `service-name.service.ts` (métodos que consomem APIs)

**Fluxo frontend:**
1. Usuário faz X
2. Sistema chama API Y
3. Exibe resultado Z
4. Trata erros W

**Funcionalidades de UI:**
- Loading states
- Error states
- Success feedback
- Empty states

📝 TEMPLATE DE SEÇÃO DE INTEGRAÇÃO
Para usar nas solicitações:
markdown## X. INTEGRAÇÃO FRONTEND

**Páginas a conectar:**

**Para [Tipo de Usuário]:**
- Página A (rota: /caminho-a)
  - Funcionalidade 1
  - Funcionalidade 2
  - APIs usadas: GET /api/..., POST /api/...

- Página B (rota: /caminho-b)
  - Funcionalidade 1
  - APIs usadas: GET /api/...

**Componentes a criar:**
- ComponenteX
  - Responsabilidade
  - Props esperadas
  
**Serviços frontend:**
- `service.service.ts`
  - metodo1() - GET /api/...
  - metodo2() - POST /api/...

**Hooks customizados (se necessário):**
- useHookName
  - Responsabilidade

**Estados de UI obrigatórios:**
- ✅ Loading (skeleton ou spinner)
- ✅ Error (mensagem amigável)
- ✅ Empty (quando sem dados)
- ✅ Success (feedback de ações)

🎯 CHECKLIST PARA CLAUDE
Ao criar solicitação de sprint, SEMPRE incluir:
Backend:

 Estrutura de banco
 Serviços
 Controllers
 APIs REST
 Validações

Frontend (OBRIGATÓRIO):

 Seção de integração frontend presente
 Páginas listadas por tipo de usuário
 Componentes especificados
 Serviços frontend listados
 Fluxo de dados explicado
 Estados de UI mencionados

❌ Se algum item frontend faltar, solicitação está INCOMPLETA!

📊 EXEMPLO COMPLETO
Sprint X: Sistema de Relatórios
markdown## 1. BACKEND

**Entregas:**
- Tabela `reports`
- ReportService
- APIs: GET /api/reports, POST /api/reports/generate

## 2. INTEGRAÇÃO FRONTEND (OBRIGATÓRIA)

**Páginas:**

**Para Admin:**
- Dashboard de Relatórios (/admin/relatorios)
  - Lista de relatórios disponíveis
  - Gerar novo relatório
  - Baixar relatório existente
  - APIs: GET /api/admin/reports, POST /api/admin/reports/generate

**Componentes:**
- ReportCard (exibe relatório)
  - Props: report (objeto)
  - Ações: download, visualizar

- ReportGeneratorForm (gera relatório)
  - Props: onSubmit
  - Campos: tipo, período, filtros

**Serviços frontend:**
- `report.service.ts`
  - getAllReports() - GET /api/admin/reports
  - generateReport(data) - POST /api/admin/reports/generate
  - downloadReport(id) - GET /api/admin/reports/:id/download

**Estados de UI:**
- ✅ Loading ao gerar relatório
- ✅ Progresso de geração (se demorado)
- ✅ Erro ao falhar
- ✅ Sucesso ao completar
```

---

## 🚀 BENEFÍCIOS

### Para Renato:
- ✅ Garantia que frontend sempre será incluído
- ✅ Não precisa lembrar toda vez
- ✅ Specs completas desde o início

### Para Claude:
- ✅ Referência clara sempre disponível
- ✅ Checklist para validar solicitações
- ✅ Template pronto para usar

### Para Kiro:
- ✅ Instruções completas desde o início
- ✅ Sabe exatamente o que fazer
- ✅ Não precisa perguntar sobre frontend

---

## 📌 NOTA IMPORTANTE

**Este padrão se aplica a TODOS os sprints futuros**, exceto:
- Sprint 0 (setup/infraestrutura)
- Sprints que sejam explicitamente "apenas backend"

**Na dúvida, SEMPRE incluir integração frontend!**

---

**Documento criado:** 24/01/2025  
**Autor:** Claude + Renato  
**Status:** Ativo e obrigatório
</document>

---

## ✅ **PRONTO PARA SALVAR!**

**Salve este conteúdo em:**
```
.kiro/steering/integration-standard.md