# Análise de Integração Backend/Frontend

## Resumo Executivo

**Status:** Backend (Sprints 0 e 1) completo e funcional. Frontend React existe mas **NÃO está integrado** - usa dados mock.

**Complexidade da Integração:** 🟡 **MÉDIA** (2-3 dias)

**Ação Requerida:** Criar camada de integração completa entre frontend React e backend Express/Supabase.

---

## 1. Estado Atual do Frontend (Dyad)

### 1.1 Tecnologias Identificadas

**Framework e Build:**
- ✅ **React 18** com TypeScript
- ✅ **Vite** como bundler (porta 8080)
- ✅ **React Router** para navegação
- ✅ **TanStack Query** (React Query) para gerenciamento de estado assíncrono

**UI e Estilo:**
- ✅ **shadcn/ui** - Componentes UI completos
- ✅ **Tailwind CSS** - Estilização
- ✅ **Lucide React** - Ícones

**Estado e Dados:**
- ✅ **TanStack Query** configurado (QueryClient)
- ❌ **Sem Context API de autenticação**
- ❌ **Sem gerenciamento de estado global** (Redux, Zustand)
- ✅ **Dados mock** em `src/data/mockData.ts`

### 1.2 Estrutura de Pastas

```
src/
├── components/
│   ├── dashboard/      # Componentes do dashboard
│   ├── shared/         # Header, Footer, WhatsApp
│   └── ui/             # shadcn/ui components (50+ componentes)
├── pages/
│   ├── afiliados/      # Landing e cadastro de afiliados
│   ├── dashboard/      # Dashboard admin
│   └── produtos/       # Página de produtos
├── layouts/
│   ├── PublicLayout.tsx
│   ├── DashboardLayout.tsx
│   └── AffiliateDashboardLayout.tsx
├── hooks/              # use-mobile, use-toast
├── lib/                # utils
├── data/               # mockData.ts (MOCK)
└── services/           # VAZIO (apenas .gitkeep)
```

### 1.3 Páginas Existentes

**Públicas:**
- ✅ `/` - Home/Landing page
- ✅ `/produtos` - Catálogo de produtos
- ✅ `/tecnologias` - Sobre tecnologias
- ✅ `/afiliados` - Landing de afiliados

**Autenticação:**
- ✅ `/login` - Página de login (MOCK)
- ✅ `/afiliados/cadastro` - Cadastro de afiliado

**Dashboard Admin:**
- ✅ `/dashboard` - Overview
- ✅ `/dashboard/conversas` - Gestão de conversas
- ✅ `/dashboard/produtos` - Gestão de produtos
- ✅ `/dashboard/vendas` - Gestão de vendas
- ✅ `/dashboard/afiliados` - Lista de afiliados
- ✅ `/dashboard/afiliados/comissoes` - Gestão de comissões
- ✅ `/dashboard/afiliados/saques` - Gestão de saques

**Dashboard Afiliado:**
- ✅ `/afiliados/dashboard` - Dashboard do afiliado
- ✅ `/afiliados/dashboard/rede` - Minha rede
- ✅ `/afiliados/dashboard/comissoes` - Comissões
- ✅ `/afiliados/dashboard/recebimentos` - Recebimentos
- ✅ `/afiliados/dashboard/link` - Meu link de indicação
- ✅ `/afiliados/dashboard/configuracoes` - Configurações


### 1.4 Sistema de Autenticação Atual

**Status:** ❌ **NÃO INTEGRADO - MOCK COMPLETO**

**Análise do Login (`src/pages/Login.tsx`):**
```typescript
// Login atual é MOCK - não chama API real
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  // Mock login - simulate API call
  setTimeout(() => {
    setLoading(false);
    toast({ title: "Login realizado com sucesso!" });
    navigate("/dashboard");
  }, 1000);
};
```

**Problemas Identificados:**
- ❌ Não chama API real (`POST /api/auth/login`)
- ❌ Não armazena token JWT
- ❌ Não persiste sessão (localStorage/cookies)
- ❌ Não tem Context de autenticação
- ❌ Rotas não verificam autenticação real
- ❌ Não adiciona token em requisições

### 1.5 Cliente HTTP

**Status:** ❌ **NÃO CONFIGURADO**

- ❌ Não usa `fetch` ou `axios`
- ❌ Não tem interceptors
- ❌ Não adiciona tokens automaticamente
- ❌ Não trata erros globalmente
- ✅ TanStack Query está configurado (pronto para usar)

### 1.6 Variáveis de Ambiente

**Status:** ❌ **NÃO CONFIGURADAS PARA FRONTEND**

**Arquivo `.env.example` atual:**
```bash
# Apenas variáveis de BACKEND
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
PORT=3000
```

**Faltando:**
- ❌ `VITE_API_URL` - URL da API backend
- ❌ `VITE_SUPABASE_URL` - Para frontend usar Supabase diretamente
- ❌ `VITE_SUPABASE_ANON_KEY` - Chave pública do Supabase

### 1.7 Dados Mock Identificados

**Arquivo:** `src/data/mockData.ts`

**Dados mock:**
- ✅ `mockConversas` - 8 conversas fake
- ✅ `mockVendas` - 6 vendas fake
- ✅ `mockProdutos` - 4 produtos fake
- ✅ `mockAfiliados` - 1 afiliado fake

**Ação:** Substituir por chamadas reais à API.

---

## 2. Estado Atual do Backend

### 2.1 Infraestrutura (Sprint 0)

✅ **Completo e Funcional**

- Node.js 18+ com TypeScript 5.x
- Express 4.x rodando na porta 3000
- Supabase configurado e conectado
- Logger estruturado (JSON)
- Validações com Zod
- Error handling padronizado
- Health check: `GET /health`

### 2.2 Autenticação (Sprint 1)

✅ **Completo e Funcional**

**Banco de Dados:**
- Tabela `profiles` (1:1 com auth.users)
- Tabela `user_roles` (RBAC)
- Tabela `auth_logs` (auditoria)
- RLS ativo em todas as tabelas
- Triggers automáticos

**APIs Disponíveis:**
```
POST   /api/auth/register      - Registrar usuário
POST   /api/auth/login         - Login (retorna JWT)
POST   /api/auth/logout        - Logout
POST   /api/auth/forgot-password - Recuperar senha
GET    /api/auth/me            - Dados do usuário (requer auth)
PUT    /api/users/profile      - Atualizar perfil (requer auth)

# Admin
GET    /api/admin/users        - Listar usuários (requer admin)
POST   /api/admin/users/:id/roles - Atribuir role (requer admin)
DELETE /api/admin/users/:id/roles/:role - Remover role (requer admin)
```

**Middlewares:**
- `requireAuth` - Valida JWT token
- `requireRole(['admin'])` - Valida permissões
- Rate limiting configurado

**Roles Disponíveis:**
- `admin` - Acesso total
- `vendedor` - Gestão de vendas
- `afiliado` - Sistema de afiliados
- `cliente` - Acesso básico (padrão)

### 2.3 Preparação para Sprints Futuros

✅ **Campos preparatórios em `profiles`:**
- `wallet_id` (TEXT) - Para Sprint 4 (Afiliados)
- `is_affiliate` (BOOLEAN) - Para Sprint 4
- `affiliate_status` (TEXT) - Para Sprint 4

---

## 3. Gaps Identificados

### 3.1 Gaps Críticos (Bloqueiam uso)

1. ❌ **Sem cliente HTTP configurado**
   - Não há axios ou fetch configurado
   - Não há base URL da API
   - Não há interceptors

2. ❌ **Sem Context de Autenticação**
   - Não gerencia estado do usuário logado
   - Não persiste token
   - Não verifica autenticação em rotas

3. ❌ **Login é mock**
   - Não chama API real
   - Não armazena token JWT
   - Não funciona de verdade

4. ❌ **Rotas não protegidas**
   - Qualquer um acessa `/dashboard`
   - Não verifica token
   - Não redireciona para login

5. ❌ **Variáveis de ambiente**
   - Falta `VITE_API_URL`
   - Falta configuração para frontend


### 3.2 Gaps Importantes (Melhoram experiência)

6. ❌ **Sem tratamento de erros global**
   - Não trata 401 (redirecionar para login)
   - Não trata 403 (sem permissão)
   - Não mostra mensagens de erro da API

7. ❌ **Sem refresh de token**
   - Token expira em 1h
   - Não renova automaticamente

8. ❌ **Dados mock em produção**
   - `mockData.ts` precisa ser substituído
   - Componentes usam dados fake

### 3.3 Gaps Opcionais (Podem esperar)

9. ⚠️ **Sem loading states globais**
   - Cada componente gerencia próprio loading

10. ⚠️ **Sem cache de dados**
    - TanStack Query está pronto mas não usado

---

## 4. Plano de Integração

### 4.1 Fase 1: Configuração Base (30min)

**Objetivo:** Preparar ambiente e variáveis

**Tarefas:**

1. **Atualizar `.env.example`**
```bash
# Backend
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
PORT=3000

# Frontend (Vite)
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
VITE_SUPABASE_ANON_KEY=...
```

2. **Atualizar `.env` local**
   - Copiar valores reais
   - Testar que backend roda na porta 3000
   - Testar que frontend roda na porta 8080

**Validação:**
- ✅ Backend responde em `http://localhost:3000/health`
- ✅ Frontend carrega em `http://localhost:8080`
- ✅ Variáveis acessíveis via `import.meta.env.VITE_API_URL`

---

### 4.2 Fase 2: Cliente HTTP (1h)

**Objetivo:** Criar serviço HTTP com interceptors

**Arquivos a criar:**

**1. `src/lib/api-client.ts`**
```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

**2. Instalar axios**
```bash
npm install axios
```

**Validação:**
- ✅ Cliente HTTP criado
- ✅ Interceptors funcionando
- ✅ Axios instalado

---

### 4.3 Fase 3: Context de Autenticação (1.5h)

**Objetivo:** Gerenciar estado de autenticação global

**Arquivos a criar:**

**1. `src/contexts/AuthContext.tsx`**
```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário ao iniciar
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await apiClient.get('/api/auth/me');
      setUser(response.data.data);
    } catch (error) {
      localStorage.removeItem('access_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const { access_token, user: userData } = response.data.data;
    
    localStorage.setItem('access_token', access_token);
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      setUser(null);
    }
  };

  const hasRole = (role: string) => {
    return user?.roles.includes(role) || false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      isAuthenticated: !!user,
      hasRole,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

**2. Atualizar `src/App.tsx`**
```typescript
import { AuthProvider } from '@/contexts/AuthContext';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>  {/* ADICIONAR */}
      <TooltipProvider>
        {/* ... resto do código ... */}
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

**Validação:**
- ✅ Context criado
- ✅ Provider adicionado ao App
- ✅ Hook `useAuth()` disponível

---

### 4.4 Fase 4: Integrar Login Real (30min)

**Objetivo:** Conectar página de login à API

**Arquivo a modificar:**

**`src/pages/Login.tsx`**
```typescript
import { useAuth } from '@/contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();  // USAR CONTEXT

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);  // CHAMAR API REAL
      toast({
        title: "Login realizado com sucesso!",
        description: "Redirecionando para o dashboard...",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.response?.data?.error || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ... resto do código ...
}
```

**Validação:**
- ✅ Login chama API real
- ✅ Token é armazenado
- ✅ Usuário é carregado
- ✅ Redireciona para dashboard
- ✅ Mostra erros da API

---

### 4.5 Fase 5: Proteger Rotas (45min)

**Objetivo:** Impedir acesso não autenticado

**Arquivos a criar:**

**1. `src/components/ProtectedRoute.tsx`**
```typescript
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, hasRole, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

**2. Atualizar `src/App.tsx`**
```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

// Proteger rotas do dashboard
<Route path="/dashboard" element={
  <ProtectedRoute requiredRole="admin">
    <DashboardLayout />
  </ProtectedRoute>
}>
  {/* ... rotas do dashboard ... */}
</Route>

// Proteger rotas de afiliado
<Route path="/afiliados/dashboard" element={
  <ProtectedRoute requiredRole="afiliado">
    <AffiliateDashboardLayout />
  </ProtectedRoute>
}>
  {/* ... rotas do afiliado ... */}
</Route>
```

**Validação:**
- ✅ Rotas protegidas redirecionam para login
- ✅ Verificação de roles funciona
- ✅ Loading state durante verificação


### 4.6 Fase 6: Substituir Dados Mock (1h)

**Objetivo:** Conectar componentes à API real

**Exemplo: Produtos**

**Arquivo a criar: `src/services/product.service.ts`**
```typescript
import apiClient from '@/lib/api-client';

export const productService = {
  async getProducts() {
    const response = await apiClient.get('/api/products');
    return response.data.data;
  },

  async getProductBySlug(slug: string) {
    const response = await apiClient.get(`/api/products/${slug}`);
    return response.data.data;
  },
};
```

**Atualizar componente para usar TanStack Query:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';

function ProdutosPage() {
  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar produtos</div>;

  return (
    <div>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
```

**Serviços a criar:**
- `src/services/product.service.ts`
- `src/services/auth.service.ts` (complementar)
- `src/services/user.service.ts`

**Validação:**
- ✅ Dados vêm da API real
- ✅ TanStack Query gerencia cache
- ✅ Loading e error states funcionam

---

### 4.7 Fase 7: Testes de Integração (1h)

**Objetivo:** Validar fluxo completo

**Testes a realizar:**

1. **Fluxo de Login**
   - ✅ Login com credenciais válidas
   - ✅ Login com credenciais inválidas
   - ✅ Token é armazenado
   - ✅ Usuário é carregado
   - ✅ Redireciona para dashboard

2. **Fluxo de Logout**
   - ✅ Logout limpa token
   - ✅ Redireciona para home
   - ✅ Não acessa rotas protegidas

3. **Proteção de Rotas**
   - ✅ Sem token → redireciona para login
   - ✅ Com token → acessa dashboard
   - ✅ Role errada → não acessa

4. **Chamadas de API**
   - ✅ Token é enviado automaticamente
   - ✅ 401 redireciona para login
   - ✅ Erros são tratados

5. **Persistência**
   - ✅ Refresh da página mantém login
   - ✅ Token persiste no localStorage

---

## 5. Estimativas

### 5.1 Tempo de Desenvolvimento

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Configuração Base | 30 min |
| 2 | Cliente HTTP | 1h |
| 3 | Context de Autenticação | 1.5h |
| 4 | Integrar Login Real | 30 min |
| 5 | Proteger Rotas | 45 min |
| 6 | Substituir Dados Mock | 1h |
| 7 | Testes de Integração | 1h |
| **TOTAL** | **Integração Completa** | **6h 15min** |

**Considerando imprevistos:** 1 dia útil (8h)

### 5.2 Complexidade

**Geral:** 🟡 **MÉDIA**

**Por Fase:**
- Fase 1: 🟢 Baixa (configuração simples)
- Fase 2: 🟢 Baixa (axios padrão)
- Fase 3: 🟡 Média (Context API)
- Fase 4: 🟢 Baixa (substituir mock)
- Fase 5: 🟡 Média (lógica de proteção)
- Fase 6: 🟡 Média (múltiplos serviços)
- Fase 7: 🟢 Baixa (testes manuais)

### 5.3 Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| CORS no backend | Média | Alto | Backend já tem CORS configurado ✅ |
| Token expira rápido | Baixa | Médio | Implementar refresh token (Sprint 3) |
| Rotas não protegidas | Baixa | Alto | Testar todas as rotas |
| Dados mock persistem | Média | Baixo | Remover arquivo mockData.ts |

---

## 6. Padrão para Próximos Sprints

### 6.1 Abordagem Recomendada

**Modelo:** 🔄 **Backend-First com Integração Contínua**

**Fluxo:**
1. ✅ Desenvolver backend completo (APIs + testes)
2. ✅ Documentar APIs (Swagger/OpenAPI)
3. ✅ Criar serviços no frontend
4. ✅ Conectar componentes existentes
5. ✅ Testar integração
6. ✅ Deploy conjunto

### 6.2 Template de Integração por Sprint

**Para cada novo sprint:**

**1. Backend (2-3 dias)**
- Criar migrations
- Implementar serviços
- Criar controllers
- Criar rotas
- Testar endpoints
- Documentar APIs

**2. Frontend (1-2 dias)**
- Criar serviços TypeScript
- Conectar componentes
- Adicionar queries (TanStack Query)
- Testar fluxos
- Ajustar UI conforme dados reais

**3. Integração (0.5 dia)**
- Testar fluxo completo
- Ajustar tipos TypeScript
- Validar erros
- Deploy

### 6.3 Checklist de Integração

**Antes de considerar sprint completo:**

- [ ] Backend tem testes passando
- [ ] APIs documentadas
- [ ] Serviço frontend criado
- [ ] Componentes conectados
- [ ] Tipos TypeScript sincronizados
- [ ] Loading states implementados
- [ ] Error handling implementado
- [ ] Fluxo testado end-to-end
- [ ] Sem dados mock remanescentes

### 6.4 Ferramentas Recomendadas

**Para facilitar integração:**

1. **Geração de Tipos**
   - Usar `openapi-typescript` para gerar tipos do backend
   - Manter tipos sincronizados

2. **Documentação de API**
   - Adicionar Swagger ao backend
   - Gerar docs automaticamente

3. **Testes E2E**
   - Playwright ou Cypress (Sprint 9)
   - Testar fluxos críticos

4. **Monitoramento**
   - Sentry para erros (Sprint 9)
   - Analytics (Sprint 9)

---

## 7. Próximos Passos Imediatos

### 7.1 Prioridade ALTA (Fazer AGORA)

1. ✅ **Executar Plano de Integração (Fases 1-7)**
   - Tempo: 1 dia
   - Bloqueia: Tudo

2. ✅ **Testar Login Real**
   - Criar usuário de teste
   - Validar fluxo completo

3. ✅ **Remover Dados Mock**
   - Deletar `src/data/mockData.ts`
   - Conectar todos os componentes

### 7.2 Prioridade MÉDIA (Próxima semana)

4. ⚠️ **Sprint 2: Sistema de Produtos**
   - Backend já tem spec pronta
   - Frontend já tem páginas
   - Apenas conectar

5. ⚠️ **Melhorar Error Handling**
   - Toast para erros
   - Retry automático

### 7.3 Prioridade BAIXA (Pode esperar)

6. 📋 **Refresh Token Automático**
   - Sprint 3 ou 4

7. 📋 **Documentação Swagger**
   - Sprint 3

---

## 8. Arquivos a Criar/Modificar

### 8.1 Arquivos Novos

```
src/
├── lib/
│   └── api-client.ts                    # Cliente HTTP com interceptors
├── contexts/
│   └── AuthContext.tsx                  # Context de autenticação
├── components/
│   └── ProtectedRoute.tsx               # Componente de proteção
└── services/
    ├── auth.service.ts                  # Serviço de autenticação (frontend)
    ├── product.service.ts               # Serviço de produtos
    └── user.service.ts                  # Serviço de usuários
```

### 8.2 Arquivos a Modificar

```
- .env.example                           # Adicionar variáveis VITE_*
- .env                                   # Adicionar valores reais
- src/App.tsx                            # Adicionar AuthProvider e ProtectedRoute
- src/pages/Login.tsx                    # Conectar à API real
- src/pages/dashboard/*.tsx              # Remover mock, usar API
- src/pages/afiliados/*.tsx              # Remover mock, usar API
```

### 8.3 Arquivos a Deletar

```
- src/data/mockData.ts                   # Remover dados mock
```

---

## 9. Conclusão

**Status Atual:**
- ✅ Backend completo e funcional (Sprints 0 e 1)
- ✅ Frontend completo mas desconectado
- ❌ Integração inexistente

**Ação Requerida:**
- 🎯 Executar Plano de Integração (6-8 horas)
- 🎯 Testar fluxo completo
- 🎯 Remover dados mock

**Após Integração:**
- ✅ Sistema funcional end-to-end
- ✅ Login real funcionando
- ✅ Rotas protegidas
- ✅ Pronto para Sprint 2

**Complexidade:** 🟡 MÉDIA (1 dia de trabalho)

**Benefício:** 🟢 ALTO (Sistema totalmente funcional)

---

**Documento criado em:** 24/10/2025  
**Última atualização:** 24/10/2025  
**Autor:** Kiro AI
