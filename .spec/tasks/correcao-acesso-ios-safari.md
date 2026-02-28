# CORREÇÃO: Acesso ao Painel de Afiliados no iOS Safari

**Data de Criação:** 28/02/2026  
**Prioridade:** 🔴 CRÍTICA  
**Status:** 📋 PLANEJADA  
**Tipo:** Bug Fix + Melhoria de Compatibilidade

---

## 📋 CONTEXTO

### Problema Reportado:
Afiliados não conseguem acessar o painel via iOS Safari, ficando presos em loop de redirecionamento para a tela de login.

### Análise Realizada:
Diagnóstico completo identificou 4 problemas críticos que impedem o acesso no iOS Safari.

---

## 🔍 PROBLEMAS IDENTIFICADOS

### **PROBLEMA 1: localStorage Bloqueado no Safari iOS Modo Privado** 🚨

**Severidade:** CRÍTICA  
**Impacto:** Usuários em modo privado não conseguem fazer login

**Diagnóstico:**
- Sistema armazena tokens JWT exclusivamente no `localStorage`
- Safari iOS em modo privado **bloqueia completamente** o `localStorage`
- Qualquer tentativa de `setItem()` lança exceção ou falha silenciosamente
- Não há tratamento de erro ao salvar no localStorage
- Não há fallback para cookies ou sessionStorage
- Não há detecção de modo privado/incognito

**Evidências:**
```typescript
// src/services/admin-auth.service.ts (linha 102-107)
localStorage.setItem('admin_token', authData.session.access_token);
localStorage.setItem('admin_refresh_token', authData.session.refresh_token);
localStorage.setItem('admin_user', JSON.stringify(adminUser));
localStorage.setItem('admin_token_expires', expirationTime.toString());
```

**Fluxo do Problema:**
1. Usuário faz login → token não é salvo (localStorage bloqueado)
2. Sistema redireciona para dashboard
3. ProtectedRoute verifica autenticação → `user` é `null`
4. Redireciona de volta para login → **LOOP INFINITO**

---

### **PROBLEMA 2: Loop de Redirecionamento no ProtectedRoute** 🚨

**Severidade:** CRÍTICA  
**Impacto:** Loop infinito de redirecionamento

**Diagnóstico:**
```typescript
// src/components/auth/ProtectedRoute.tsx (linha 19-42)
useEffect(() => {
  if (!loading) {
    if (!user) {
      navigate('/admin/login');  // ❌ Redireciona imediatamente
      return;
    }
  }
}, [user, profile, loading, navigate, ...]);
```

**Problemas:**
- Não há verificação de quantas vezes o redirecionamento ocorreu
- Não há timeout ou limite de tentativas
- Não há mensagem de erro para o usuário
- Loop continua indefinidamente

---

### **PROBLEMA 3: Falta de Fallback para Cookies** 🚨

**Severidade:** ALTA  
**Impacto:** Incompatibilidade com Safari iOS

**Diagnóstico:**
- Sistema usa `localStorage` como **única** forma de armazenamento
- Cookies funcionam perfeitamente no Safari iOS (mesmo em modo privado)
- Não há implementação de cookies como fallback
- Sistema ignora completamente essa alternativa

**Comparação:**
```typescript
// ❌ ATUAL (só localStorage)
localStorage.setItem('admin_token', token);

// ✅ DEVERIA SER (com fallback)
try {
  localStorage.setItem('admin_token', token);
} catch (e) {
  // Safari modo privado - usar cookie
  document.cookie = `admin_token=${token}; path=/; max-age=3600; SameSite=Strict; Secure`;
}
```

---

### **PROBLEMA 4: Propriedades CSS Problemáticas no Safari iOS** ⚠️

**Severidade:** MÉDIA  
**Impacto:** Layout quebrado, modais não rolam corretamente

**Diagnóstico:**
- Uso extensivo de `vh` (viewport height) - 25+ ocorrências
- `overflow-y-auto` em modais - 23 ocorrências
- `overflow-x-auto` em tabelas - 8 ocorrências

**Problemas Específicos:**
- `vh` no Safari iOS é calculado **incluindo** a barra de endereço
- Quando usuário rola, a barra some e o layout "pula"
- `overflow-y-auto` em modais pode não funcionar corretamente
- Botões podem ficar inacessíveis

**Exemplos Encontrados:**
```css
max-h-[90vh] overflow-y-auto    /* 23 ocorrências */
h-[calc(100vh-100px)]            /* 2 ocorrências */
overflow-x-auto                  /* 8 ocorrências */
```

---

## 🎯 SOLUÇÃO PROPOSTA

### **FASE 1: Storage Híbrido (localStorage + Cookies)** ⚡ PRIORITÁRIO

#### Task 1.1: Criar StorageHelper Utility
**Arquivo:** `src/utils/storage-helper.ts` (NOVO)

**Funcionalidades:**
- Detectar disponibilidade do localStorage
- Tentar localStorage primeiro
- Fallback automático para cookies se localStorage falhar
- Métodos: `setItem()`, `getItem()`, `removeItem()`

**Implementação:**
```typescript
export class StorageHelper {
  private static isLocalStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  static setItem(key: string, value: string, maxAge: number = 3600): void {
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch (e) {
        console.warn('localStorage falhou, usando cookie:', e);
      }
    }
    
    // Fallback para cookie
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
  }

  static getItem(key: string): string | null {
    // Tentar localStorage primeiro
    if (this.isLocalStorageAvailable()) {
      try {
        const value = localStorage.getItem(key);
        if (value !== null) return value;
      } catch (e) {
        console.warn('localStorage.getItem falhou:', e);
      }
    }
    
    // Fallback para cookie
    const name = key + '=';
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) === 0) {
        return c.substring(name.length, c.length);
      }
    }
    
    return null;
  }

  static removeItem(key: string): void {
    // Remover do localStorage
    if (this.isLocalStorageAvailable()) {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage.removeItem falhou:', e);
      }
    }
    
    // Remover cookie
    document.cookie = `${key}=; path=/; max-age=0`;
  }
}
```

**Critérios de Aceitação:**
- ✅ Detecta disponibilidade do localStorage corretamente
- ✅ Fallback para cookies funciona no Safari iOS modo privado
- ✅ Métodos compatíveis com API do localStorage
- ✅ Cookies com flags de segurança (Secure, SameSite)

---

#### Task 1.2: Atualizar admin-auth.service.ts
**Arquivo:** `src/services/admin-auth.service.ts`

**Alterações:**
```typescript
import { StorageHelper } from '@/utils/storage-helper';

// SUBSTITUIR todas as 12 ocorrências de localStorage por StorageHelper:

// Antes:
localStorage.setItem('admin_token', authData.session.access_token);
localStorage.getItem('admin_token');
localStorage.removeItem('admin_token');

// Depois:
StorageHelper.setItem('admin_token', authData.session.access_token, 3600);
StorageHelper.getItem('admin_token');
StorageHelper.removeItem('admin_token');
```

**Ocorrências a substituir:**
- Linha 102: `setItem('admin_token', ...)`
- Linha 103: `setItem('admin_refresh_token', ...)`
- Linha 105: `setItem('admin_user', ...)`
- Linha 107: `setItem('admin_token_expires', ...)`
- Linha 173: `setItem('admin_token', ...)`
- Linha 174: `setItem('admin_refresh_token', ...)`
- Linha 177: `setItem('admin_token_expires', ...)`
- Linha 252: `getItem('admin_token')` (2x)
- Linha 253: `getItem('admin_token_expires')`
- Linha 289: `getItem('admin_token')`
- Linha 296: `getItem('admin_token_expires')`
- Linha 310-313: `removeItem()` (4x)

**Critérios de Aceitação:**
- ✅ Todas as 12 ocorrências substituídas
- ✅ getDiagnostics: 0 erros
- ✅ Login funciona no Safari iOS modo normal
- ✅ Login funciona no Safari iOS modo privado

---

#### Task 1.3: Atualizar customer-auth.service.ts
**Arquivo:** `src/services/customer-auth.service.ts`

**Alterações:**
```typescript
import { StorageHelper } from '@/utils/storage-helper';

// SUBSTITUIR todas as 16 ocorrências de localStorage por StorageHelper
```

**Ocorrências a substituir:**
- Linha 110: `setItem('customer_token', ...)`
- Linha 111: `setItem('customer_refresh_token', ...)`
- Linha 113: `setItem('customer_user', ...)`
- Linha 115: `setItem('customer_token_expires', ...)`
- Linha 224-229: `setItem()` (4x)
- Linha 364-365: `getItem()` (2x)
- Linha 497-501: `setItem()` (4x)
- Linha 515-518: `removeItem()` (4x)
- Linha 525: `getItem('customer_token')`

**Critérios de Aceitação:**
- ✅ Todas as 16 ocorrências substituídas
- ✅ getDiagnostics: 0 erros
- ✅ Login de afiliados funciona no iOS

---

#### Task 1.4: Atualizar api.service.ts
**Arquivo:** `src/services/api.service.ts`

**Alterações:**
```typescript
import { StorageHelper } from '@/utils/storage-helper';

// Linha 30: Substituir localStorage.getItem
const token = StorageHelper.getItem('admin_token');

// Linha 49-50: Substituir localStorage.removeItem
StorageHelper.removeItem('admin_token');
StorageHelper.removeItem('admin_refresh_token');
```

**Critérios de Aceitação:**
- ✅ 3 ocorrências substituídas
- ✅ getDiagnostics: 0 erros
- ✅ Interceptor de API funciona corretamente

---

#### Task 1.5: Atualizar AffiliateDashboardLayout.tsx
**Arquivo:** `src/layouts/AffiliateDashboardLayout.tsx`

**Alterações:**
```typescript
import { StorageHelper } from '@/utils/storage-helper';

// Linha 119-122: Substituir localStorage.removeItem
StorageHelper.removeItem('customer_token');
StorageHelper.removeItem('customer_refresh_token');
StorageHelper.removeItem('customer_user');
StorageHelper.removeItem('customer_token_expires');
```

**Critérios de Aceitação:**
- ✅ 4 ocorrências substituídas
- ✅ getDiagnostics: 0 erros
- ✅ Logout funciona corretamente

---

### **FASE 2: Detecção de Loop no ProtectedRoute** ⚡ PRIORITÁRIO

#### Task 2.1: Adicionar Detecção de Loop
**Arquivo:** `src/components/auth/ProtectedRoute.tsx`

**Implementação:**
```typescript
import { useEffect, useRef } from 'react';

export function ProtectedRoute({ children, ... }: ProtectedRouteProps) {
  const redirectCount = useRef(0);
  const lastRedirect = useRef(0);
  
  useEffect(() => {
    if (!loading) {
      if (!user) {
        const now = Date.now();
        
        // Detectar loop: mais de 3 redirecionamentos em 10 segundos
        if (now - lastRedirect.current < 10000) {
          redirectCount.current++;
          
          if (redirectCount.current > 3) {
            // LOOP DETECTADO!
            console.error('Loop de redirecionamento detectado - possível problema com Safari iOS');
            
            // Mostrar mensagem de erro ao usuário
            alert('Problema de autenticação detectado. Se você está usando Safari no iOS em modo privado, tente usar o modo normal ou outro navegador.');
            
            // Resetar contador
            redirectCount.current = 0;
            return;
          }
        } else {
          // Resetar contador se passou mais de 10 segundos
          redirectCount.current = 1;
        }
        
        lastRedirect.current = now;
        navigate('/admin/login');
        return;
      }
    }
  }, [user, loading, navigate, ...]);
  
  // ... resto do código
}
```

**Critérios de Aceitação:**
- ✅ Detecta loop após 3 tentativas em 10 segundos
- ✅ Mostra mensagem de erro clara ao usuário
- ✅ Não bloqueia login legítimo
- ✅ getDiagnostics: 0 erros

---

#### Task 2.2: Adicionar Detecção no CustomerProtectedRoute
**Arquivo:** `src/components/auth/CustomerProtectedRoute.tsx`

**Implementação:**
Mesma lógica da Task 2.1, adaptada para rotas de cliente.

**Critérios de Aceitação:**
- ✅ Detecta loop após 3 tentativas em 10 segundos
- ✅ Mostra mensagem de erro clara ao usuário
- ✅ getDiagnostics: 0 erros

---

### **FASE 3: Correções CSS para Safari iOS** ⚠️ IMPORTANTE

#### Task 3.1: Criar Arquivo de Fixes CSS
**Arquivo:** `src/styles/safari-fixes.css` (NOVO)

**Implementação:**
```css
/**
 * Fixes para Safari iOS
 */

/* Usar dvh (dynamic viewport height) ao invés de vh */
@supports (height: 100dvh) {
  .min-h-screen {
    min-height: 100dvh;
  }
}

/* Fallback para navegadores antigos */
@supports not (height: 100dvh) {
  .min-h-screen {
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }
}

/* Corrigir overflow em modais no iOS */
.modal-content {
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* Prevenir zoom em inputs no iOS */
input, select, textarea {
  font-size: 16px !important;
}

/* Corrigir vh em containers */
.h-screen {
  height: 100vh;
  height: 100dvh;
}

/* Corrigir overflow em tabelas */
.overflow-x-auto {
  -webkit-overflow-scrolling: touch;
}
```

**Critérios de Aceitação:**
- ✅ Arquivo criado
- ✅ Importado no `src/main.tsx`
- ✅ Layout não "pula" ao rolar no iOS
- ✅ Modais rolam corretamente

---

#### Task 3.2: Importar Fixes no main.tsx
**Arquivo:** `src/main.tsx`

**Alterações:**
```typescript
import './styles/safari-fixes.css';
```

**Critérios de Aceitação:**
- ✅ Import adicionado
- ✅ Build passa sem erros
- ✅ Fixes aplicados em produção

---

### **FASE 4: Verificação Supabase** 📋 VALIDAÇÃO

#### Task 4.1: Verificar URLs Permitidas
**Plataforma:** Supabase Dashboard

**Ações:**
1. Acessar Supabase Dashboard
2. Ir em Authentication > URL Configuration
3. Verificar "Site URL" e "Redirect URLs"

**URLs que DEVEM estar configuradas:**
- `https://slimquality.com.br`
- `https://www.slimquality.com.br`
- `http://localhost:5173` (desenvolvimento)

**Critérios de Aceitação:**
- ✅ Todas as URLs estão configuradas
- ✅ Não há URLs inválidas ou antigas

---

## 📊 PLANO DE EXECUÇÃO

### **Ordem de Implementação:**

1. **FASE 1 (CRÍTICA):** Storage Híbrido
   - Task 1.1: Criar StorageHelper
   - Task 1.2: Atualizar admin-auth.service.ts
   - Task 1.3: Atualizar customer-auth.service.ts
   - Task 1.4: Atualizar api.service.ts
   - Task 1.5: Atualizar AffiliateDashboardLayout.tsx

2. **FASE 2 (CRÍTICA):** Detecção de Loop
   - Task 2.1: ProtectedRoute
   - Task 2.2: CustomerProtectedRoute

3. **FASE 3 (IMPORTANTE):** Fixes CSS
   - Task 3.1: Criar safari-fixes.css
   - Task 3.2: Importar no main.tsx

4. **FASE 4 (VALIDAÇÃO):** Supabase
   - Task 4.1: Verificar URLs permitidas

---

## ✅ CRITÉRIOS DE ACEITAÇÃO GLOBAL

### **Funcionalidade:**
- ✅ Afiliados conseguem fazer login no Safari iOS (modo normal)
- ✅ Afiliados conseguem fazer login no Safari iOS (modo privado)
- ✅ Não há loop de redirecionamento
- ✅ Layout funciona corretamente no iOS
- ✅ Modais rolam corretamente
- ✅ Mensagem de erro clara se houver problema

### **Qualidade:**
- ✅ getDiagnostics: 0 erros em todos os arquivos modificados
- ✅ Build passa sem erros
- ✅ Não há regressões em outros navegadores
- ✅ Cookies com flags de segurança (Secure, SameSite)

### **Testes:**
- ✅ Testar login no Safari iOS (modo normal)
- ✅ Testar login no Safari iOS (modo privado)
- ✅ Testar login no Chrome iOS
- ✅ Testar login no Firefox iOS
- ✅ Testar em iPhone real (não apenas simulador)

---

## 📝 CHECKLIST DE VALIDAÇÃO MANUAL

### **Pré-Deploy:**
- [ ] Todas as tasks implementadas
- [ ] getDiagnostics: 0 erros
- [ ] Build passa sem erros
- [ ] Commit criado com mensagem descritiva

### **Pós-Deploy:**
- [ ] Login funciona no Safari iOS modo normal
- [ ] Login funciona no Safari iOS modo privado
- [ ] Login funciona no Chrome iOS
- [ ] Não há loop de redirecionamento
- [ ] Layout não "pula" ao rolar
- [ ] Modais rolam corretamente
- [ ] Mensagem de erro aparece se houver problema

---

## 🚀 ESTIMATIVA DE TEMPO

**Fase 1 (Storage Híbrido):** 1-2 horas  
**Fase 2 (Detecção de Loop):** 30 minutos  
**Fase 3 (Fixes CSS):** 1 hora  
**Fase 4 (Validação Supabase):** 15 minutos  

**TOTAL:** 2h45min - 3h45min

---

## 📚 REFERÊNCIAS

### **Documentação:**
- [Safari iOS localStorage limitations](https://developer.apple.com/forums/thread/659467)
- [Using cookies as fallback](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie)
- [Safari iOS viewport units](https://caniuse.com/viewport-unit-variants)

### **Arquivos Relacionados:**
- `src/services/admin-auth.service.ts`
- `src/services/customer-auth.service.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/CustomerProtectedRoute.tsx`
- `src/hooks/useAuth.ts`
- `src/hooks/useCustomerAuth.ts`

---

## 🔒 SEGURANÇA

### **Considerações:**
- ✅ Cookies com flag `Secure` (apenas HTTPS)
- ✅ Cookies com flag `SameSite=Strict` (proteção CSRF)
- ✅ Cookies com `HttpOnly` não são necessários (JS precisa acessar)
- ✅ Tokens JWT continuam com mesma segurança
- ✅ Fallback não compromete segurança

---

## 📌 NOTAS IMPORTANTES

1. **Compatibilidade:** Solução funciona em todos os navegadores (não apenas iOS)
2. **Fallback Transparente:** Usuário não percebe diferença entre localStorage e cookies
3. **Sem Regressões:** Navegadores que suportam localStorage continuam usando-o
4. **Mensagem Clara:** Se houver problema, usuário recebe orientação específica
5. **Testável:** Pode ser testado localmente simulando falha do localStorage

---

**Documento criado em:** 28/02/2026  
**Autor:** Kiro AI  
**Status:** 📋 PLANEJADA - Aguardando aprovação para implementação  
**Prioridade:** 🔴 CRÍTICA - Afeta acesso de afiliados no iOS
