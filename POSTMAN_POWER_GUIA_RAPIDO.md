# 🚀 Guia Rápido - Postman Power

## ✅ Status da Configuração

- **Power:** Instalado e funcionando
- **API Key:** Configurada corretamente
- **Workspace ID:** 25c4e1e7-2c16-4f52-8579-6a4d623a4578
- **User ID:** 44515336
- **Team ID:** 7574507
- **Hook:** Ativo em `.kiro/hooks/api-postman-testing.kiro.hook`

---

## 🎯 Funcionalidades Disponíveis

### 1. **Testes Automáticos via Hook**
Quando você modificar arquivos da API, o hook automaticamente:
- Verifica se existe collection no Postman
- Executa os testes
- Mostra resultados e propõe correções

**Arquivos monitorados:**
- `src/**/*.ts` e `src/**/*.js`
- `api/**/*.ts` e `api/**/*.js`
- `agent/**/*.py`
- `supabase/functions/**/*.ts`
- `package.json`, `requirements.txt`, `.env`

### 2. **Comandos Disponíveis via Power**

#### Listar Workspaces
```
Use o power para chamar: getWorkspaces
```

#### Listar Collections
```
Use o power para chamar: getCollections
Parâmetro: workspace = "25c4e1e7-2c16-4f52-8579-6a4d623a4578"
```

#### Criar Nova Collection
```
Use o power para chamar: createCollection
Parâmetros:
- workspace: "25c4e1e7-2c16-4f52-8579-6a4d623a4578"
- collection: { info: { name: "Nome da Collection" } }
```

#### Executar Testes de uma Collection
```
Use o power para chamar: runCollection
Parâmetros:
- collectionId: "seu-collection-id"
- environmentId: "seu-environment-id" (opcional)
```

#### Criar Environment
```
Use o power para chamar: createEnvironment
Parâmetros:
- workspace: "25c4e1e7-2c16-4f52-8579-6a4d623a4578"
- environment: {
    name: "Local",
    values: [
      { key: "base_url", value: "http://localhost:3000", enabled: true }
    ]
  }
```

---

## 📋 Workflow Recomendado

### **Setup Inicial do Projeto**

1. **Criar Environment para desenvolvimento:**
   - Chame `createEnvironment` com variáveis como `base_url`, `api_key`
   - Salve o `environmentId` no `.postman.json`

2. **Importar Collection Existente:**
   - Você já tem `Slim_Quality_API_Afiliados.postman_collection.json`
   - Importe manualmente no Postman Web/Desktop
   - Ou use o power para criar uma nova

3. **Configurar Hook:**
   - Já está configurado! ✅
   - Modifique qualquer arquivo da API e veja a mágica acontecer

### **Desenvolvimento Diário**

1. **Modifique código da API**
2. **Hook detecta mudança automaticamente**
3. **Testes executam**
4. **Veja resultados e correções sugeridas**

---

## 🔧 Troubleshooting

### Erro: "Collection not found"
- Verifique se o `collectionId` está correto no `.postman.json`
- Liste collections com `getCollections` para pegar o ID correto

### Erro: "Environment not found"
- Crie um environment com `createEnvironment`
- Salve o ID retornado no `.postman.json`

### Testes falhando
- Verifique se a API está rodando (localhost:3000 ou URL configurada)
- Confira variáveis de ambiente no Postman
- Revise os scripts de teste em cada request

### Hook não está executando
- Verifique se o arquivo `.kiro/hooks/api-postman-testing.kiro.hook` existe
- Confirme que `"enabled": true` no arquivo do hook
- Reinicie o Kiro se necessário

---

## 📊 Limites da Conta

Seu plano atual permite:
- ✅ 25 collection runs por mês
- ✅ 1.000 mock requests
- ✅ 1.000 monitor runs
- ✅ 10.000 API calls
- ✅ 50 AI millicredits

---

## 🎓 Exemplos Práticos

### Exemplo 1: Criar Collection para API de Afiliados
```javascript
// Via power Postman
createCollection({
  workspace: "25c4e1e7-2c16-4f52-8579-6a4d623a4578",
  collection: {
    info: {
      name: "Slim Quality - API Afiliados",
      description: "Testes automatizados da API de afiliados",
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
    }
  }
})
```

### Exemplo 2: Criar Environment Local
```javascript
// Via power Postman
createEnvironment({
  workspace: "25c4e1e7-2c16-4f52-8579-6a4d623a4578",
  environment: {
    name: "Local Development",
    values: [
      { key: "base_url", value: "http://localhost:3000", enabled: true },
      { key: "api_key", value: "sua-api-key-aqui", enabled: true },
      { key: "supabase_url", value: "sua-url-supabase", enabled: true }
    ]
  }
})
```

### Exemplo 3: Executar Testes
```javascript
// Via power Postman
runCollection({
  collectionId: "seu-collection-id",
  environmentId: "seu-environment-id",
  stopOnError: false,
  stopOnFailure: false
})
```

---

## 📝 Próximos Passos

1. ✅ **Importar collection existente** no Postman Web
2. ✅ **Criar environment** com variáveis do projeto
3. ✅ **Testar hook** modificando um arquivo da API
4. ✅ **Executar testes** manualmente via power

---

## 🔗 Links Úteis

- **Postman Web:** https://web.postman.co
- **Documentação API:** https://learning.postman.com/docs/developer/postman-api/intro-api/
- **Collection Format:** https://schema.postman.com/collection/json/v2.1.0/draft-07/docs/index.html

---

**Configurado em:** 11/01/2026  
**Status:** ✅ Pronto para uso  
**Última atualização:** 11/01/2026
