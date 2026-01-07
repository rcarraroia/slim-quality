# 🚀 CONFIGURAÇÃO VERCEL MCP SERVER

## ✅ CONFIGURAÇÃO CONCLUÍDA

O Vercel MCP Server foi adicionado ao workspace. Agora precisa apenas da autenticação.

## 🔑 PRÓXIMOS PASSOS (2 minutos)

### 1. **Obter Token Vercel**
```bash
# Opção A: Via CLI Vercel (se já tem)
vercel login
vercel token create

# Opção B: Via Dashboard Vercel
# 1. Acesse: https://vercel.com/account/tokens
# 2. Clique "Create Token"
# 3. Nome: "Kiro MCP Integration"
# 4. Copie o token gerado
```

### 2. **Configurar Token no Kiro**
```bash
# Edite o arquivo .kiro/settings/mcp.json
# Substitua VERCEL_TOKEN: "" pelo seu token:
"VERCEL_TOKEN": "seu_token_aqui"
```

### 3. **Reiniciar MCP (automático)**
O Kiro detectará a mudança e reconectará automaticamente.

---

## 🛠️ FERRAMENTAS DISPONÍVEIS

Após configuração, Kiro terá acesso a:

| Ferramenta | Uso no Projeto |
|------------|----------------|
| **list_projects** | Ver projetos Slim Quality + Builder |
| **get_project** | Status detalhado de cada projeto |
| **list_deployments** | Histórico de deploys |
| **get_deployment** | Detalhes de deploy específico |
| **create_deployment** | Deploy forçado (emergência) |
| **get_logs** | Logs de runtime/build |
| **get_env_vars** | Listar variáveis de ambiente |
| **create_env_var** | Adicionar novas ENVs |

---

## 🎯 BENEFÍCIOS IMEDIATOS

### **Antes (manual):**
```
1. Kiro: "Código pronto"
2. Você: git push
3. Você: abre Vercel dashboard
4. Você: confere deploy
5. Se erro: copia logs manualmente
```

### **Depois (automatizado):**
```
1. Kiro: "Código pronto, deploying..."
2. Kiro: "✅ Deploy successful: https://seu-site.vercel.app"
   OU
   Kiro: "❌ Deploy failed: [logs + sugestão de fix]"
```

---

## 🔧 CONFIGURAÇÃO ATUAL

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["@vercel/mcp"],
      "env": {
        "VERCEL_TOKEN": "CONFIGURE_SEU_TOKEN_AQUI"
      },
      "autoApprove": [
        "list_projects",
        "get_project", 
        "list_deployments",
        "get_deployment",
        "get_logs"
      ]
    }
  }
}
```

**Status:** ⚠️ Aguardando token Vercel para ativação completa

---

## 🚨 IMPORTANTE

- **Segurança:** Token Vercel dá acesso total aos seus projetos
- **Escopo:** Configure token apenas com permissões necessárias
- **Backup:** Mantenha token seguro (não commitar no Git)

---

**Configuração realizada por:** Kiro AI  
**Data:** 07/01/2026  
**Próximo passo:** Adicionar VERCEL_TOKEN