import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AffiliateDashboardLayout } from "./layouts/AffiliateDashboardLayout";
import { Suspense } from 'react';
import { LoadingSpinner } from './components/ui/loading-spinner';
import { lazy } from 'react';
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Lazy load pages
const ProductPage = lazy(() => import("./pages/produtos/ProductPage"));
const Sobre = lazy(() => import("./pages/Sobre"));
const AfiliadosLanding = lazy(() => import("./pages/afiliados/AfiliadosLanding"));
const AfiliadosCadastro = lazy(() => import("./pages/afiliados/AfiliadosCadastro"));

// Dashboard pages - lazy load
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const Conversas = lazy(() => import("./pages/dashboard/Conversas"));
const Clientes = lazy(() => import("./pages/dashboard/Clientes"));
const ClienteDetalhes = lazy(() => import("./pages/dashboard/ClienteDetalhes"));
const Agendamentos = lazy(() => import("./pages/dashboard/Agendamentos"));
const Produtos = lazy(() => import("./pages/dashboard/Produtos"));
const Vendas = lazy(() => import("./pages/dashboard/Vendas"));
const ListaAfiliados = lazy(() => import("./pages/dashboard/afiliados/ListaAfiliados"));
const GestaoComissoes = lazy(() => import("./pages/dashboard/afiliados/GestaoComissoes"));
const GestaoSaques = lazy(() => import("./pages/dashboard/afiliados/GestaoSaques"));
const AdminAffiliatesPage = lazy(() => import("./pages/admin/Affiliates"));
const Tags = lazy(() => import("./pages/admin/Tags"));

// Affiliate dashboard pages - lazy load
const AffiliateDashboardInicio = lazy(() => import("./pages/afiliados/dashboard/Inicio"));
const AffiliateDashboardRede = lazy(() => import("./pages/afiliados/dashboard/MinhaRede"));
const AffiliateDashboardComissoes = lazy(() => import("./pages/afiliados/dashboard/Comissoes"));
const AffiliateDashboardRecebimentos = lazy(() => import("./pages/afiliados/dashboard/Recebimentos"));
const AffiliateDashboardLink = lazy(() => import("./pages/afiliados/dashboard/MeuLink"));
const AffiliateDashboardConfiguracoes = lazy(() => import("./pages/afiliados/dashboard/Configuracoes"));

const queryClient = new QueryClient();

// Componente interno para usar hooks do React Router
const AppContent = () => {
  // Ativar rastreamento de referência automaticamente
  useReferralTracking();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    }>
      <Routes>
      {/* Public routes with header/footer */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/produtos" element={<ProductPage />} />
        <Route path="/tecnologias" element={<Sobre />} />
        <Route path="/afiliados" element={<AfiliadosLanding />} />
      </Route>
      
      {/* Auth routes without header/footer */}
      <Route path="/login" element={<Login />} />
      <Route path="/afiliados/cadastro" element={<AfiliadosCadastro />} />
      
      {/* Dashboard routes - Protegidas (requer admin) */}
      <Route path="/dashboard" element={
        <ProtectedRoute requiredRole="admin">
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="conversas" element={<Conversas />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhes />} />
        <Route path="agendamentos" element={<Agendamentos />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="afiliados" element={<ListaAfiliados />} />
        <Route path="afiliados/completo" element={<AdminAffiliatesPage />} />
        <Route path="afiliados/comissoes" element={<GestaoComissoes />} />
        <Route path="afiliados/saques" element={<GestaoSaques />} />
        <Route path="admin/tags" element={<Tags />} />
      </Route>

      {/* Affiliate Dashboard routes - Protegidas (requer afiliado) */}
      <Route path="/afiliados/dashboard" element={
        <ProtectedRoute requiredRole="afiliado">
          <AffiliateDashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<AffiliateDashboardInicio />} />
        <Route path="rede" element={<AffiliateDashboardRede />} />
        <Route path="comissoes" element={<AffiliateDashboardComissoes />} />
        <Route path="recebimentos" element={<AffiliateDashboardRecebimentos />} />
        <Route path="link" element={<AffiliateDashboardLink />} />
        <Route path="configuracoes" element={<AffiliateDashboardConfiguracoes />} />
      </Route>
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;