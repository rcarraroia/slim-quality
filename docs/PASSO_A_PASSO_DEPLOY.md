# Deploy no Vercel - Configuração Completa

## ✅ Problemas Corrigidos

### 1. Merge Conflicts
- **Problema**: Marcadores de merge conflict (`<<<<<<<`, `=======`, `>>>>>>>`) nos arquivos
- **Arquivos afetados**: 
  - `src/services/affiliate-frontend.service.ts`
  - `src/services/crm/appointment.service.ts`
  - `src/services/crm/conversation.service.ts`
  - `src/services/crm/customer.service.ts`
  - `src/services/crm/timeline.service.ts`
- **Solução**: Removidos todos os marcadores de conflito

### 2. Configuração de Build
- **Problema**: `package.json` configurado apenas para backend (TypeScript)
- **Solução**: Atualizado para build do frontend com Vite
  ```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "start": "vite preview"
  }
  ```

### 3. Dependências Faltando
- **Problema**: Dependências do React não estavam instaladas
- **Solução**: Adicionadas todas as dependências necessárias:
  - `react` e `react-dom`
  - `react-router-dom`
  - `@tanstack/react-query`
  - `lucide-react`
  - `vite` e plugins
  - `express-rate-limit`, `multer`
  - Tipos TypeScript

### 4. Conflito de Peer Dependencies
- **Problema**: `lucide-react@0.344.0` não era compatível com React 18
- **Solução**: 
  - Atualizado `lucide-react` para `^0.454.0`
  - Criado `.npmrc` com `legacy-peer-deps=true`
  - Adicionado `overrides` no `package.json`

### 5. Configuração Híbrida Frontend/Backend
- **Problema**: Vercel não sabia como lidar com frontend + backend juntos
- **Solução**: 
  - Criado `vercel.json` com configuração de rotas
  - Criado `api/index.ts` como wrapper serverless
  - Modificado `src/server.ts` para não executar `app.listen()` quando importado

## 📁 Arquivos Criados/Modificados

### Novos Arquivos
- `.npmrc` - Configuração npm para resolver peer dependencies
- `vercel.json` - Configuração de deploy do Vercel
- `api/index.ts` - Wrapper serverless para o Express

### Arquivos Modificados
- `package.json` - Scripts de build e dependências
- `src/server.ts` - Condicional para `app.listen()`
- Todos os services com merge conflicts

## 🚀 Como o Deploy Funciona Agora

### Build Process
1. **Frontend**: `vite build` gera arquivos estáticos em `dist/`
2. **Backend**: Express app é exportado como serverless function
3. **Rotas**:
   - `/api/*` → Serverless function (backend)
   - `/*` → Arquivos estáticos (frontend)

### Estrutura no Vercel
```
dist/                    # Frontend estático (Vite)
├── index.html
├── assets/
└── ...

api/                     # Backend serverless
└── index.ts            # Express app wrapper
```

## 🔧 Variáveis de Ambiente Necessárias

Configure no Vercel Dashboard:

```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_KEY=sua-chave-privada

# Asaas
ASAAS_API_KEY=sua-chave-asaas
ASAAS_WALLET_FABRICA=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx

# App
NODE_ENV=production
FRONTEND_URL=https://seu-dominio.vercel.app
```

## ✅ Checklist de Deploy

- [x] Merge conflicts resolvidos
- [x] Scripts de build configurados
- [x] Dependências instaladas
- [x] Peer dependencies resolvidas
- [x] Configuração híbrida frontend/backend
- [x] `vercel.json` criado
- [x] Serverless function configurada
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Deploy testado

## 🎯 Próximos Passos

1. **Configurar Variáveis de Ambiente** no Vercel Dashboard
2. **Aguardar Build** completar
3. **Testar**:
   - Frontend: `https://seu-dominio.vercel.app`
   - Backend: `https://seu-dominio.vercel.app/api/health`
4. **Configurar Domínio Customizado** (opcional)

## � Notas ImpDortantes

- O backend roda como **serverless functions** (não como servidor tradicional)
- Cada requisição `/api/*` inicia uma nova instância da function
- Limite de **10 segundos** por requisição no plano gratuito
- Para operações longas, considere usar **Vercel Edge Functions** ou **Background Jobs**

## 🐛 Troubleshooting

### Build falha com erro de TypeScript
- Verifique se todos os merge conflicts foram resolvidos
- Execute `npm run type-check` localmente

### API não responde
- Verifique se as variáveis de ambiente estão configuradas
- Teste a rota `/api/health`

### Frontend carrega mas API falha
- Verifique CORS no `src/server.ts`
- Confirme que `FRONTEND_URL` está correto

---

**Última atualização**: 11/11/2025
**Status**: ✅ Pronto para deploy
