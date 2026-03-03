# Tasks - Gerenciamento de Assinaturas

## 📊 STATUS DA IMPLEMENTAÇÃO

**Data:** 03/03/2026  
**Status:** ✅ **PHASES 1-5 CONCLUÍDAS**  
**Commit:** `5206f02`

### Progresso Geral:
- ✅ **12 tasks concluídas** de 18 totais (67%)
- ✅ **5 phases concluídas** de 7 totais (71%)
- ✅ **Build production: PASSOU** (0 erros)
- ✅ **Deploy automático iniciado**
- ⏳ **Aguardando testes manuais em produção**

### Phases Concluídas:

#### ✅ Phase 1: Menu e Roteamento (2/2 tasks)
- Menu "Assinatura" com ícone Sparkles
- Visibilidade controlada por produtos ativos
- Rota `/afiliados/dashboard/assinatura` criada

#### ✅ Phase 2: Página de Gerenciamento (4/4 tasks)
- Card de Status (badges, benefícios, mensalidade)
- Card de Upgrade (só para individuais básicos)
- Card de Gerenciamento (próxima cobrança, ações)
- Loading states implementados

#### ✅ Phase 3: Modais de Ação (2/2 tasks)
- Modal de Upgrade (benefícios + confirmação)
- Modal de Cancelamento (avisos + confirmação)

#### ✅ Phase 4: Lógica de Negócio (2/2 tasks)
- Função `handleUpgrade()` integrada com API
- Função `handleCancelSubscription()` integrada com API

#### ✅ Phase 5: Backend (Webhook) (2/2 tasks)
- Função `handleUpgradePayment()` no webhook
- Função `handleSubscriptionCancelled()` no webhook
- Notificações automáticas

### Phases Pendentes:

#### ⏳ Phase 6: Testes e Validação (0/4 tasks)
- Testes manuais em produção
- Validação de fluxos
- Monitoramento de logs

#### ⏳ Phase 7: Documentação e Deploy (0/2 tasks)
- Atualização de documentação
- Validação final

### Evidências:
- ✅ getDiagnostics: 0 erros em todos os arquivos
- ✅ Build production: PASSOU (1m 6s)
- ✅ TypeScript check: 0 erros
- ✅ 6 arquivos alterados (807 inserções, 6 deleções)
- ✅ 3 arquivos novos criados

### Arquivos Criados:
- `src/pages/afiliados/dashboard/Assinatura.tsx` (200+ linhas)
- `src/components/affiliates/UpgradeModal.tsx` (100+ linhas)
- `src/components/affiliates/CancelSubscriptionModal.tsx` (80+ linhas)

### Arquivos Modificados:
- `src/layouts/AffiliateDashboardLayout.tsx` (menu + visibilidade)
- `src/App.tsx` (rota adicionada)
- `api/webhook-assinaturas.js` (upgrade + cancelamento)

### Próximos Passos (Validação Manual):
1. ⏳ Testar menu "Assinatura" aparece para afiliados
2. ⏳ Testar fluxo de upgrade (individual básico → premium)
3. ⏳ Testar fluxo de cancelamento
4. ⏳ Verificar notificações criadas
5. ⏳ Monitorar logs do webhook
6. ⏳ Validar comissionamento após upgrade

---

## Introdução

Este documento detalha as tasks para implementação do módulo completo de gerenciamento de assinaturas no painel de afiliados, permitindo que afiliados individuais façam upgrade para plano premium e que todos os afiliados (individuais + logistas) gerenciem suas assinaturas.

**Contexto:**
- Afiliados individuais existentes (25 no banco) não têm como fazer upgrade via painel
- Funcionalidade estava especificada no design (seção 4.3) mas não foi quebrada em tasks
- Gap identificado: Phase 3 focou em novos cadastros, não em upgrade de existentes

**Escopo Completo:**
1. Menu "Assinatura" visível para TODOS os afiliados (individuais + logistas)
2. Visibilidade controlada por produtos de assinatura ativos no admin (`is_active = true`)
3. Página de gerenciamento completo (upgrade + cancelamento + status + histórico)
4. Integração com API de assinatura existente

**Decisão do Usuário:**
- Menu aparece quando produtos de assinatura estão ativos no admin
- Regra temporária para testes, depois ficará sempre ativo
- Não é só upgrade, mas gerenciamento completo de assinaturas

---

## Phase 1 - Menu e Roteamento

### Task 1.1: Adicionar Menu "Assinatura" no Dashboard

**Objetivo:** Adicionar item de menu "Assinatura" visível para todos os afiliados quando produtos de assinatura estão ativos.

**Arquivo:** `src/layouts/AffiliateDashboardLayout.tsx`

**Implementação:**

1. Adicionar estado para controlar visibilidade do menu:
```typescript
const [showSubscriptionMenu, setShowSubscriptionMenu] = useState(false);
```

2. Criar função para verificar produtos de assinatura ativos:
```typescript
const checkSubscriptionAvailability = async () => {
  try {
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('category', 'adesao_afiliado')
      .eq('is_active', true);

    setShowSubscriptionMenu(!!count && count > 0);
  } catch (error) {
    console.error('Erro ao verificar disponibilidade de assinatura:', error);
    setShowSubscriptionMenu(false);
  }
};
```

3. Chamar função no useEffect:
```typescript
useEffect(() => {
  loadAffiliateData();
  checkIAAvailability();
  checkShowRowAvailability();
  checkSubscriptionAvailability(); // ✅ NOVO
}, []);
```

4. Adicionar item no array menuItems:
```typescript
const menuItems = [
  { icon: Home, label: "Início", path: "/afiliados/dashboard" },
  // ... outros itens ...
  { icon: CreditCard, label: "Pagamentos", path: "/afiliados/dashboard/pagamentos" },
  // ✅ NOVO: Menu Assinatura (visível para todos quando produtos ativos)
  ...(showSubscriptionMenu ? [{ 
    icon: Sparkles, 
    label: "Assinatura", 
    path: "/afiliados/dashboard/assinatura" 
  }] : []),
  { icon: Settings, label: "Configurações", path: "/afiliados/dashboard/configuracoes" },
];
```

**Critérios de Aceitação:**
- [ ] Menu "Assinatura" aparece quando produtos de assinatura estão ativos
- [ ] Menu visível para afiliados individuais E logistas
- [ ] Menu oculto quando produtos de assinatura estão inativos
- [ ] Ícone `Sparkles` usado para o menu
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---


### Task 1.2: Criar Rota para Página de Assinatura

**Objetivo:** Adicionar rota `/afiliados/dashboard/assinatura` no sistema de rotas.

**Arquivo:** `src/App.tsx`

**Implementação:**

1. Importar componente Assinatura:
```typescript
import Assinatura from "@/pages/afiliados/dashboard/Assinatura";
```

2. Adicionar rota no AffiliateDashboardLayout:
```typescript
<Route path="/afiliados/dashboard" element={<AffiliateDashboardLayout />}>
  <Route index element={<Inicio />} />
  {/* ... outras rotas ... */}
  <Route path="pagamentos" element={<Pagamentos />} />
  <Route path="assinatura" element={<Assinatura />} /> {/* ✅ NOVO */}
  <Route path="configuracoes" element={<Configuracoes />} />
</Route>
```

**Critérios de Aceitação:**
- [ ] Rota `/afiliados/dashboard/assinatura` criada
- [ ] Rota protegida (requer autenticação)
- [ ] Navegação funciona corretamente
- [ ] getDiagnostics: 0 erros

**Estimativa:** 10 minutos

---

## Phase 2 - Página de Gerenciamento de Assinatura

### Task 2.1: Criar Estrutura Base da Página

**Objetivo:** Criar componente base da página de gerenciamento de assinatura.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx` (NOVO)

**Implementação:**

1. Criar estrutura base do componente:
```typescript
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/config/supabase";

export default function Assinatura() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<any>(null);
  const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados do afiliado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setAffiliate(affiliateData);

      // Carregar produto de assinatura
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'adesao_afiliado')
        .eq('eligible_affiliate_type', affiliateData.affiliate_type)
        .eq('is_subscription', true)
        .eq('is_active', true)
        .maybeSingle();

      setSubscriptionProduct(productData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar informações da assinatura",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Conteúdo será adicionado nas próximas tasks */}
    </div>
  );
}
```

**Critérios de Aceitação:**
- [ ] Componente criado com estrutura base
- [ ] Loading state implementado
- [ ] Carrega dados do afiliado corretamente
- [ ] Carrega produto de assinatura correto (por tipo de afiliado)
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---


### Task 2.2: Card de Status da Assinatura

**Objetivo:** Exibir card com status atual da assinatura do afiliado.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx`

**Implementação:**

1. Adicionar card de status no return:
```typescript
{/* Card de Status */}
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-primary" />
      Status da Assinatura
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Status Atual</p>
          <div className="flex items-center gap-2 mt-1">
            {affiliate.has_subscription ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Plano Premium Ativo</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">Plano Básico</span>
              </>
            )}
          </div>
        </div>
        
        {affiliate.has_subscription && (
          <Badge variant={
            affiliate.payment_status === 'active' ? 'default' :
            affiliate.payment_status === 'pending' ? 'secondary' :
            'destructive'
          }>
            {affiliate.payment_status === 'active' ? 'Em dia' :
             affiliate.payment_status === 'pending' ? 'Pendente' :
             affiliate.payment_status === 'overdue' ? 'Vencido' :
             'Suspenso'}
          </Badge>
        )}
      </div>

      {/* Benefícios */}
      {affiliate.has_subscription && (
        <div className="pt-4 border-t">
          <p className="text-sm font-semibold mb-3">Benefícios Ativos:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Vitrine Pública</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Agente IA (Bia)</span>
            </div>
            {affiliate.affiliate_type === 'logista' && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Show Room</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mensalidade */}
      {affiliate.has_subscription && subscriptionProduct && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor da Mensalidade</p>
              <p className="text-2xl font-bold text-primary">
                R$ {(subscriptionProduct.monthly_fee_cents / 100).toFixed(2)}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/afiliados/dashboard/pagamentos')}>
              Ver Histórico
            </Button>
          </div>
        </div>
      )}
    </div>
  </CardContent>
</Card>
```

**Critérios de Aceitação:**
- [ ] Card exibe status correto (Plano Básico ou Premium)
- [ ] Badge de payment_status exibe cores corretas
- [ ] Benefícios listados corretamente (vitrine + agente + show room para logistas)
- [ ] Valor da mensalidade exibido corretamente
- [ ] Link para histórico de pagamentos funciona
- [ ] getDiagnostics: 0 erros

**Estimativa:** 45 minutos

---


### Task 2.3: Card de Upgrade (Para Individuais Básicos)

**Objetivo:** Exibir card de upgrade para afiliados individuais sem assinatura.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx`

**Implementação:**

1. Adicionar card de upgrade (renderizado condicionalmente):
```typescript
{/* Card de Upgrade - Só para Individual SEM assinatura */}
{!affiliate.has_subscription && affiliate.affiliate_type === 'individual' && subscriptionProduct && (
  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade para Plano Premium
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Tenha sua própria vitrine pública e agente IA para atender clientes 24/7
          </p>
        </div>
        <Badge variant="secondary">Novo</Badge>
      </div>
    </CardHeader>
    
    <CardContent>
      <div className="space-y-4">
        {/* Benefícios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Vitrine Pública</p>
              <p className="text-sm text-muted-foreground">
                Sua loja visível em /lojas com produtos e contatos
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Agente IA (Bia)</p>
              <p className="text-sm text-muted-foreground">
                Atendimento automatizado via WhatsApp 24/7
              </p>
            </div>
          </div>
        </div>
        
        {/* Pricing e Ação */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">Mensalidade</p>
            <p className="text-2xl font-bold text-primary">
              R$ {(subscriptionProduct.monthly_fee_cents / 100).toFixed(2)}
            </p>
          </div>
          
          <Button onClick={() => setShowUpgradeModal(true)} size="lg">
            Fazer Upgrade Agora
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

2. Adicionar estado para modal:
```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

**Critérios de Aceitação:**
- [ ] Card só aparece para individuais SEM assinatura
- [ ] Card NÃO aparece para logistas (já têm assinatura)
- [ ] Benefícios listados corretamente
- [ ] Valor da mensalidade exibido corretamente
- [ ] Botão "Fazer Upgrade Agora" abre modal
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---


### Task 2.4: Card de Gerenciamento (Para Quem Tem Assinatura)

**Objetivo:** Exibir card de gerenciamento para afiliados com assinatura ativa.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx`

**Implementação:**

1. Adicionar card de gerenciamento:
```typescript
{/* Card de Gerenciamento - Para quem TEM assinatura */}
{affiliate.has_subscription && (
  <Card>
    <CardHeader>
      <CardTitle>Gerenciar Assinatura</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {/* Próxima Cobrança */}
        {nextPayment && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Próxima Cobrança</p>
              <p className="text-lg font-semibold">
                {format(new Date(nextPayment.due_date), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Valor</p>
              <p className="text-lg font-semibold text-primary">
                R$ {(nextPayment.amount_cents / 100).toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate('/afiliados/dashboard/pagamentos')}
          >
            Ver Histórico de Pagamentos
          </Button>
          
          <Button 
            variant="destructive" 
            className="flex-1"
            onClick={() => setShowCancelModal(true)}
          >
            Cancelar Assinatura
          </Button>
        </div>

        {/* Aviso de Cancelamento */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Ao cancelar, você perderá acesso à vitrine e agente IA. 
            Seus dados serão mantidos caso deseje reativar no futuro.
          </AlertDescription>
        </Alert>
      </div>
    </CardContent>
  </Card>
)}
```

2. Adicionar estado para próximo pagamento:
```typescript
const [nextPayment, setNextPayment] = useState<any>(null);
```

3. Carregar próximo pagamento no loadData:
```typescript
// Carregar próximo pagamento
if (affiliateData.has_subscription) {
  const { data: paymentData } = await supabase
    .from('affiliate_payments')
    .select('*')
    .eq('affiliate_id', affiliateData.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  setNextPayment(paymentData);
}
```

4. Adicionar estado para modal de cancelamento:
```typescript
const [showCancelModal, setShowCancelModal] = useState(false);
```

**Critérios de Aceitação:**
- [ ] Card só aparece para afiliados COM assinatura
- [ ] Próxima cobrança exibida corretamente (data e valor)
- [ ] Botão "Ver Histórico" navega para /pagamentos
- [ ] Botão "Cancelar Assinatura" abre modal de confirmação
- [ ] Aviso de cancelamento exibido
- [ ] getDiagnostics: 0 erros

**Estimativa:** 45 minutos

---

## Phase 3 - Modais de Ação

### Task 3.1: Modal de Upgrade

**Objetivo:** Criar modal de confirmação de upgrade para plano premium.

**Arquivo:** `src/components/affiliates/UpgradeModal.tsx` (NOVO)

**Implementação:**

1. Criar componente UpgradeModal:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Store, Bot, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  monthlyFee: number;
}

export function UpgradeModal({ open, onOpenChange, onConfirm, monthlyFee }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade para Plano Premium</DialogTitle>
          <DialogDescription>
            Tenha acesso à vitrine pública e agente IA
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Benefits List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Vitrine Pública</p>
                <p className="text-sm text-muted-foreground">
                  Sua loja visível em /lojas/:seu-slug
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Agente IA (Bia)</p>
                <p className="text-sm text-muted-foreground">
                  Atendimento automatizado via WhatsApp
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Comissionamento</p>
                <p className="text-sm text-muted-foreground">
                  Mensalidade gera comissão para sua rede
                </p>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Valor da Mensalidade</p>
              <p className="text-2xl font-bold text-primary mt-1">
                R$ {(monthlyFee / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Cobrado mensalmente via Asaas
              </p>
            </AlertDescription>
          </Alert>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar Upgrade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

2. Importar e usar no Assinatura.tsx:
```typescript
import { UpgradeModal } from '@/components/affiliates/UpgradeModal';

// No return:
<UpgradeModal
  open={showUpgradeModal}
  onOpenChange={setShowUpgradeModal}
  onConfirm={handleUpgrade}
  monthlyFee={subscriptionProduct?.monthly_fee_cents || 0}
/>
```

**Critérios de Aceitação:**
- [ ] Modal exibe benefícios corretamente
- [ ] Valor da mensalidade exibido corretamente
- [ ] Botão "Cancelar" fecha modal
- [ ] Botão "Confirmar" chama função onConfirm
- [ ] Loading state durante processamento
- [ ] getDiagnostics: 0 erros

**Estimativa:** 45 minutos

---


### Task 3.2: Modal de Cancelamento

**Objetivo:** Criar modal de confirmação de cancelamento de assinatura.

**Arquivo:** `src/components/affiliates/CancelSubscriptionModal.tsx` (NOVO)

**Implementação:**

1. Criar componente CancelSubscriptionModal:
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { useState } from 'react';

interface CancelSubscriptionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}

export function CancelSubscriptionModal({ open, onOpenChange, onConfirm }: CancelSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancelar Assinatura
          </DialogTitle>
          <DialogDescription>
            Tem certeza que deseja cancelar sua assinatura?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Consequências */}
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold mb-2">Você perderá acesso a:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Vitrine pública (/lojas/:seu-slug)</li>
                <li>Agente IA (Bia) via WhatsApp</li>
                <li>Comissionamento de mensalidades</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          {/* Informação */}
          <Alert>
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-1">O que acontece após o cancelamento:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Seus dados serão mantidos</li>
                <li>Você pode reativar a qualquer momento</li>
                <li>Não haverá mais cobranças mensais</li>
              </ul>
            </AlertDescription>
          </Alert>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Manter Assinatura
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

2. Importar e usar no Assinatura.tsx:
```typescript
import { CancelSubscriptionModal } from '@/components/affiliates/CancelSubscriptionModal';

// No return:
<CancelSubscriptionModal
  open={showCancelModal}
  onOpenChange={setShowCancelModal}
  onConfirm={handleCancelSubscription}
/>
```

**Critérios de Aceitação:**
- [ ] Modal exibe consequências do cancelamento
- [ ] Informações sobre o que acontece após cancelamento
- [ ] Botão "Manter Assinatura" fecha modal
- [ ] Botão "Confirmar Cancelamento" chama função onConfirm
- [ ] Loading state durante processamento
- [ ] Cores e ícones de alerta (destructive)
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---

## Phase 4 - Lógica de Negócio

### Task 4.1: Implementar Função de Upgrade

**Objetivo:** Implementar lógica de upgrade para plano premium.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx`

**Implementação:**

1. Adicionar função handleUpgrade:
```typescript
const handleUpgrade = async () => {
  try {
    if (!affiliate || !subscriptionProduct) {
      toast({
        title: "Erro",
        description: "Dados não carregados. Tente novamente.",
        variant: "destructive"
      });
      return;
    }

    // Criar assinatura via API
    const response = await fetch('/api/subscriptions/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'create-subscription',
        affiliateId: affiliate.id,
        productId: subscriptionProduct.id
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao criar assinatura');
    }

    const data = await response.json();

    if (data.success && data.invoiceUrl) {
      // Redirecionar para pagamento
      window.location.href = data.invoiceUrl;
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('Erro ao fazer upgrade:', error);
    toast({
      title: "Erro ao processar upgrade",
      description: error instanceof Error ? error.message : "Tente novamente mais tarde",
      variant: "destructive"
    });
    setShowUpgradeModal(false);
  }
};
```

**Critérios de Aceitação:**
- [ ] Função valida dados antes de processar
- [ ] Chama API `/api/subscriptions/create-payment` com action `create-subscription`
- [ ] Redireciona para URL de pagamento do Asaas
- [ ] Exibe toast de erro em caso de falha
- [ ] Fecha modal após erro
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---


### Task 4.2: Implementar Função de Cancelamento

**Objetivo:** Implementar lógica de cancelamento de assinatura.

**Arquivo:** `src/pages/afiliados/dashboard/Assinatura.tsx`

**Implementação:**

1. Adicionar função handleCancelSubscription:
```typescript
const handleCancelSubscription = async () => {
  try {
    if (!affiliate) {
      toast({
        title: "Erro",
        description: "Dados não carregados. Tente novamente.",
        variant: "destructive"
      });
      return;
    }

    // Cancelar assinatura via API
    const response = await fetch('/api/subscriptions/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        action: 'cancel-subscription',
        affiliateId: affiliate.id
      })
    });

    if (!response.ok) {
      throw new Error('Erro ao cancelar assinatura');
    }

    const data = await response.json();

    if (data.success) {
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura foi cancelada com sucesso. Você ainda terá acesso até o fim do período pago.",
      });

      // Recarregar dados
      await loadData();
      setShowCancelModal(false);
    } else {
      throw new Error(data.error || 'Erro desconhecido');
    }
  } catch (error) {
    console.error('Erro ao cancelar assinatura:', error);
    toast({
      title: "Erro ao cancelar assinatura",
      description: error instanceof Error ? error.message : "Tente novamente mais tarde",
      variant: "destructive"
    });
    setShowCancelModal(false);
  }
};
```

**Critérios de Aceitação:**
- [ ] Função valida dados antes de processar
- [ ] Chama API `/api/subscriptions/create-payment` com action `cancel-subscription`
- [ ] Exibe toast de sucesso após cancelamento
- [ ] Recarrega dados da página após cancelamento
- [ ] Exibe toast de erro em caso de falha
- [ ] Fecha modal após processamento
- [ ] getDiagnostics: 0 erros

**Estimativa:** 30 minutos

---

## Phase 5 - Backend (Webhook)

### Task 5.1: Atualizar Webhook para Upgrade

**Objetivo:** Atualizar webhook Asaas para processar upgrade de Individual Básico para Premium.

**Arquivo:** `api/webhook-assinaturas.js`

**Implementação:**

1. Adicionar função handleUpgradePayment:
```javascript
async function handleUpgradePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Upgrade] 🔄 Processing upgrade payment:', affiliateId);
  
  // 1. Update affiliate
  const { error: updateError } = await supabase
    .from('affiliates')
    .update({
      has_subscription: true,
      payment_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);
  
  if (updateError) {
    console.error('[Upgrade] ❌ Error updating affiliate:', updateError);
    throw updateError;
  }
  
  console.log('[Upgrade] ✅ Affiliate updated to premium');
  
  // 2. Activate bundle
  const tenantId = await activateBundle(supabase, affiliateId);
  
  console.log('[Upgrade] ✅ Bundle activated:', tenantId);
  
  // 3. Create notification
  await supabase.from('notifications').insert({
    affiliate_id: affiliateId,
    type: 'upgrade_success',
    title: 'Upgrade realizado com sucesso!',
    message: 'Sua conta foi atualizada para o Plano Premium. Agora você tem acesso à vitrine e agente IA.',
    link: '/afiliados/dashboard/loja',
    read: false,
    created_at: new Date().toISOString()
  });
  
  console.log('[Upgrade] ✅ Notification created');
}
```

2. Integrar no handlePaymentSuccess:
```javascript
// In handlePaymentSuccess()
if (payment.externalReference.startsWith('affiliate_')) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('has_subscription')
    .eq('id', affiliateId)
    .single();
  
  // If was Individual Básico, now is Premium (UPGRADE)
  if (!affiliate.has_subscription) {
    await handleUpgradePayment(supabase, payment);
  } else {
    // Regular subscription payment
    await processBundleActivation(supabase, payment);
  }
}
```

**Critérios de Aceitação:**
- [ ] Função detecta upgrade (has_subscription = false → true)
- [ ] Atualiza campo has_subscription para true
- [ ] Atualiza payment_status para active
- [ ] Chama activateBundle() para ativar vitrine e agente
- [ ] Cria notificação de sucesso
- [ ] Logs detalhados adicionados
- [ ] Integrado no fluxo de handlePaymentSuccess
- [ ] getDiagnostics: 0 erros (se aplicável)

**Estimativa:** 45 minutos

---


### Task 5.2: Atualizar Webhook para Cancelamento

**Objetivo:** Atualizar webhook Asaas para processar cancelamento de assinatura.

**Arquivo:** `api/webhook-assinaturas.js`

**Implementação:**

1. Adicionar função handleSubscriptionCancelled:
```javascript
async function handleSubscriptionCancelled(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Cancel] 🔄 Processing subscription cancellation:', affiliateId);
  
  // 1. Update affiliate
  const { error: updateError } = await supabase
    .from('affiliates')
    .update({
      has_subscription: false,
      payment_status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);
  
  if (updateError) {
    console.error('[Cancel] ❌ Error updating affiliate:', updateError);
    throw updateError;
  }
  
  console.log('[Cancel] ✅ Affiliate downgraded to basic');
  
  // 2. Deactivate vitrine
  const { error: vitrineError } = await supabase
    .from('store_profiles')
    .update({
      is_visible_in_showcase: false,
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (vitrineError) {
    console.error('[Cancel] ⚠️ Error deactivating vitrine:', vitrineError);
  } else {
    console.log('[Cancel] ✅ Vitrine deactivated');
  }
  
  // 3. Deactivate agent
  const { error: tenantError } = await supabase
    .from('multi_agent_tenants')
    .update({
      status: 'inactive',
      suspended_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (tenantError) {
    console.error('[Cancel] ⚠️ Error deactivating agent:', tenantError);
  } else {
    console.log('[Cancel] ✅ Agent deactivated');
  }
  
  // 4. Create notification
  await supabase.from('notifications').insert({
    affiliate_id: affiliateId,
    type: 'subscription_cancelled',
    title: 'Assinatura cancelada',
    message: 'Sua assinatura foi cancelada. Você voltou para o Plano Básico. Pode reativar a qualquer momento.',
    link: '/afiliados/dashboard/assinatura',
    read: false,
    created_at: new Date().toISOString()
  });
  
  console.log('[Cancel] ✅ Notification created');
}
```

2. Adicionar roteamento no webhook principal:
```javascript
// In main webhook handler
switch (event.event) {
  case 'PAYMENT_CONFIRMED':
    await handlePaymentSuccess(supabase, payment);
    break;
  
  case 'PAYMENT_OVERDUE':
    await handlePaymentOverdue(supabase, payment);
    break;
  
  case 'SUBSCRIPTION_CANCELLED': // ✅ NOVO
    await handleSubscriptionCancelled(supabase, payment);
    break;
  
  default:
    console.log('[Webhook] ℹ️ Unhandled event:', event.event);
}
```

**Critérios de Aceitação:**
- [ ] Função detecta cancelamento de assinatura
- [ ] Atualiza has_subscription para false
- [ ] Atualiza payment_status para cancelled
- [ ] Desativa vitrine (is_visible_in_showcase = false)
- [ ] Desativa agente (status = inactive)
- [ ] Cria notificação de cancelamento
- [ ] Logs detalhados adicionados
- [ ] Integrado no roteamento principal do webhook
- [ ] getDiagnostics: 0 erros (se aplicável)

**Estimativa:** 45 minutos

---

## Phase 6 - Testes e Validação

### Task 6.1: Testes Manuais - Upgrade

**Objetivo:** Validar fluxo completo de upgrade de Individual Básico para Premium.

**Checklist de Validação:**

1. **Pré-condições:**
   - [ ] Afiliado individual com has_subscription = false
   - [ ] Produto de assinatura individual ativo no admin
   - [ ] Menu "Assinatura" visível no painel

2. **Fluxo de Upgrade:**
   - [ ] Acessar página /afiliados/dashboard/assinatura
   - [ ] Card de upgrade exibido corretamente
   - [ ] Benefícios listados (vitrine + agente)
   - [ ] Valor da mensalidade correto
   - [ ] Clicar em "Fazer Upgrade Agora"
   - [ ] Modal de confirmação abre
   - [ ] Clicar em "Confirmar Upgrade"
   - [ ] Redirecionamento para Asaas
   - [ ] Realizar pagamento no Asaas

3. **Pós-Pagamento:**
   - [ ] Webhook recebe PAYMENT_CONFIRMED
   - [ ] Campo has_subscription atualizado para true
   - [ ] Campo payment_status atualizado para active
   - [ ] Vitrine ativada (is_visible_in_showcase = true)
   - [ ] Agente IA criado (multi_agent_tenants)
   - [ ] Notificação de sucesso criada
   - [ ] Menu "Loja" aparece no painel
   - [ ] Card de upgrade desaparece
   - [ ] Card de gerenciamento aparece

4. **Validação Final:**
   - [ ] Afiliado consegue acessar página "Loja"
   - [ ] Vitrine visível em /lojas/:slug
   - [ ] Próxima cobrança exibida corretamente

**Estimativa:** 1 hora

---


### Task 6.2: Testes Manuais - Cancelamento

**Objetivo:** Validar fluxo completo de cancelamento de assinatura.

**Checklist de Validação:**

1. **Pré-condições:**
   - [ ] Afiliado com has_subscription = true
   - [ ] Assinatura ativa (payment_status = active)
   - [ ] Vitrine ativa
   - [ ] Agente IA ativo

2. **Fluxo de Cancelamento:**
   - [ ] Acessar página /afiliados/dashboard/assinatura
   - [ ] Card de gerenciamento exibido
   - [ ] Próxima cobrança exibida corretamente
   - [ ] Clicar em "Cancelar Assinatura"
   - [ ] Modal de confirmação abre
   - [ ] Consequências listadas corretamente
   - [ ] Clicar em "Confirmar Cancelamento"
   - [ ] Toast de sucesso exibido
   - [ ] Página recarrega

3. **Pós-Cancelamento:**
   - [ ] Campo has_subscription atualizado para false
   - [ ] Campo payment_status atualizado para cancelled
   - [ ] Vitrine desativada (is_visible_in_showcase = false)
   - [ ] Agente IA desativado (status = inactive)
   - [ ] Notificação de cancelamento criada
   - [ ] Menu "Loja" desaparece do painel
   - [ ] Card de gerenciamento desaparece
   - [ ] Card de upgrade aparece (se individual)

4. **Validação Final:**
   - [ ] Afiliado NÃO consegue acessar página "Loja"
   - [ ] Vitrine NÃO visível em /lojas/:slug
   - [ ] Pode fazer upgrade novamente

**Estimativa:** 1 hora

---

### Task 6.3: Testes Manuais - Logistas

**Objetivo:** Validar que logistas têm acesso ao gerenciamento de assinatura.

**Checklist de Validação:**

1. **Pré-condições:**
   - [ ] Afiliado logista com has_subscription = true
   - [ ] Assinatura ativa (payment_status = active)
   - [ ] Menu "Assinatura" visível

2. **Validação de Acesso:**
   - [ ] Acessar página /afiliados/dashboard/assinatura
   - [ ] Card de status exibido corretamente
   - [ ] Badge "Plano Premium Ativo"
   - [ ] Benefícios listados (vitrine + agente + show room)
   - [ ] Card de gerenciamento exibido
   - [ ] Próxima cobrança exibida
   - [ ] Botão "Cancelar Assinatura" disponível

3. **Validação de Funcionalidades:**
   - [ ] Card de upgrade NÃO aparece (logistas já têm assinatura)
   - [ ] Pode visualizar histórico de pagamentos
   - [ ] Pode cancelar assinatura (se necessário)
   - [ ] Menu "Show Room" continua visível
   - [ ] Menu "Loja" continua visível

4. **Validação Final:**
   - [ ] Zero impacto em funcionalidades existentes
   - [ ] Logistas podem gerenciar assinatura normalmente

**Estimativa:** 30 minutos

---

### Task 6.4: Testes de Regressão

**Objetivo:** Garantir que alterações não quebraram funcionalidades existentes.

**Checklist de Validação:**

1. **Cadastro de Novos Afiliados:**
   - [ ] Cadastro de individual SEM mensalidade funciona
   - [ ] Cadastro de individual COM mensalidade funciona
   - [ ] Cadastro de logista funciona
   - [ ] Checkbox de mensalidade aparece corretamente

2. **Ativação de Vitrine:**
   - [ ] Logistas conseguem ativar vitrine
   - [ ] Individuais premium conseguem ativar vitrine
   - [ ] Individuais básicos NÃO conseguem ativar vitrine

3. **Webhook Asaas:**
   - [ ] PAYMENT_CONFIRMED ativa bundle corretamente
   - [ ] PAYMENT_OVERDUE bloqueia vitrine e agente
   - [ ] SUBSCRIPTION_CANCELLED desativa serviços

4. **Menu do Painel:**
   - [ ] Menu "Loja" aparece para has_subscription = true
   - [ ] Menu "Show Room" aparece apenas para logistas
   - [ ] Menu "Assinatura" aparece quando produtos ativos

5. **Página de Pagamentos:**
   - [ ] Histórico de pagamentos funciona
   - [ ] Filtros funcionam corretamente
   - [ ] Download de comprovante funciona

**Estimativa:** 1 hora

---

## Phase 7 - Documentação e Deploy

### Task 7.1: Atualizar STATUS.md

**Objetivo:** Documentar implementação do gerenciamento de assinaturas no STATUS.md.

**Arquivo:** `.kiro/steering/STATUS.md`

**Conteúdo a Adicionar:**

```markdown
## GERENCIAMENTO DE ASSINATURAS ✅ CONCLUÍDA (DD/MM/2026)

### Objetivo:
Implementar módulo completo de gerenciamento de assinaturas permitindo upgrade, cancelamento e visualização de status.

### Funcionalidades Implementadas:
- ✅ Menu "Assinatura" visível para todos os afiliados
- ✅ Visibilidade controlada por produtos ativos no admin
- ✅ Página de gerenciamento completo
- ✅ Card de upgrade para individuais básicos
- ✅ Card de gerenciamento para quem tem assinatura
- ✅ Modal de confirmação de upgrade
- ✅ Modal de confirmação de cancelamento
- ✅ Integração com API de assinatura
- ✅ Webhook atualizado para upgrade e cancelamento
- ✅ Notificações de sucesso/cancelamento

### Evidências:
- ✅ 7 tasks de implementação concluídas
- ✅ 4 tasks de testes manuais concluídas
- ✅ getDiagnostics: 0 erros
- ✅ Testes de regressão passaram
- ✅ Zero impacto em logistas existentes
- ✅ 25 individuais existentes podem fazer upgrade

### Arquivos Criados/Modificados:
- `src/layouts/AffiliateDashboardLayout.tsx` (menu)
- `src/pages/afiliados/dashboard/Assinatura.tsx` (NOVO)
- `src/components/affiliates/UpgradeModal.tsx` (NOVO)
- `src/components/affiliates/CancelSubscriptionModal.tsx` (NOVO)
- `api/webhook-assinaturas.js` (upgrade + cancelamento)
- `src/App.tsx` (rota)

### Próximos Passos:
- ⏳ Monitorar upgrades em produção
- ⏳ Validar comissionamento de mensalidades
- ⏳ Coletar feedback de afiliados
```

**Critérios de Aceitação:**
- [ ] Seção adicionada ao STATUS.md
- [ ] Todas as funcionalidades listadas
- [ ] Evidências documentadas
- [ ] Arquivos modificados listados

**Estimativa:** 15 minutos

---

### Task 7.2: Deploy e Validação em Produção

**Objetivo:** Fazer deploy das alterações e validar em produção.

**Checklist de Deploy:**

1. **Pré-Deploy:**
   - [ ] Todos os testes manuais passaram
   - [ ] getDiagnostics: 0 erros em todos os arquivos
   - [ ] Build local passou sem erros
   - [ ] Commits realizados com mensagens claras

2. **Deploy:**
   - [ ] Push para repositório Git
   - [ ] Deploy automático no Vercel iniciado
   - [ ] Build no Vercel passou sem erros
   - [ ] Deploy concluído com sucesso

3. **Validação Pós-Deploy:**
   - [ ] Menu "Assinatura" visível em produção
   - [ ] Página /afiliados/dashboard/assinatura acessível
   - [ ] Card de upgrade funciona para individuais básicos
   - [ ] Card de gerenciamento funciona para quem tem assinatura
   - [ ] Modais abrem corretamente
   - [ ] Integração com API funciona

4. **Monitoramento:**
   - [ ] Verificar logs do Vercel (sem erros)
   - [ ] Verificar logs do webhook Asaas
   - [ ] Monitorar primeiros upgrades
   - [ ] Validar ativação de bundle após upgrade

**Estimativa:** 30 minutos

---

## Resumo de Estimativas

| Phase | Tasks | Tempo Estimado |
|-------|-------|----------------|
| Phase 1 - Menu e Roteamento | 2 tasks | 40 minutos |
| Phase 2 - Página de Gerenciamento | 4 tasks | 2h 30min |
| Phase 3 - Modais de Ação | 2 tasks | 1h 15min |
| Phase 4 - Lógica de Negócio | 2 tasks | 1h |
| Phase 5 - Backend (Webhook) | 2 tasks | 1h 30min |
| Phase 6 - Testes e Validação | 4 tasks | 3h 30min |
| Phase 7 - Documentação e Deploy | 2 tasks | 45 minutos |
| **TOTAL** | **18 tasks** | **~11 horas** |

---

## Dependências

### Dependências Externas:
- ✅ Campo `has_subscription` já existe no banco
- ✅ RLS policies já atualizadas
- ✅ Produtos de assinatura já criados
- ✅ API `/api/subscriptions/create-payment` já existe
- ✅ Webhook Asaas já configurado

### Dependências Internas:
- Task 1.2 depende de Task 2.1 (componente Assinatura.tsx)
- Task 3.1 e 3.2 dependem de Task 2.1 (estados e funções)
- Task 4.1 e 4.2 dependem de Task 3.1 e 3.2 (modais)
- Task 5.1 e 5.2 dependem de Task 4.1 e 4.2 (lógica frontend)
- Task 6.x dependem de todas as anteriores (testes)
- Task 7.x dependem de Task 6.x (deploy após testes)

---

## Riscos e Mitigações

### Risco 1: Produtos de assinatura inativos
**Impacto:** Menu não aparece, usuários não conseguem fazer upgrade  
**Mitigação:** Validar produtos ativos antes de deploy, documentar como ativar

### Risco 2: Webhook não processa upgrade
**Impacto:** Afiliado paga mas não recebe acesso  
**Mitigação:** Logs detalhados, monitoramento de webhooks, rollback plan

### Risco 3: Cancelamento não desativa serviços
**Impacto:** Afiliado cancela mas continua com acesso  
**Mitigação:** Testes manuais rigorosos, validação em staging

### Risco 4: Impacto em logistas existentes
**Impacto:** Logistas perdem funcionalidades  
**Mitigação:** Testes de regressão completos, validação com logista real

---

## Conclusão

Este documento detalha todas as tasks necessárias para implementar o módulo completo de gerenciamento de assinaturas, permitindo que:

1. Afiliados individuais básicos façam upgrade para premium
2. Todos os afiliados gerenciem suas assinaturas
3. Afiliados cancelem assinaturas quando necessário
4. Sistema processe upgrades e cancelamentos via webhook

**Próximos Passos:**
1. Revisar e aprovar este documento de tasks
2. Iniciar implementação pela Phase 1
3. Seguir ordem sequencial das phases
4. Validar cada task antes de prosseguir
5. Deploy após todos os testes passarem

---

**Data de Criação:** 03/03/2026  
**Status:** PRONTO PARA IMPLEMENTAÇÃO  
**Estimativa Total:** ~11 horas (2 dias de trabalho)
