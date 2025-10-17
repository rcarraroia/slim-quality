import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AffiliateDashboardLayout } from "./layouts/AffiliateDashboardLayout";
import Index from "./pages/Index";
import ProductPage from "./pages/produtos/ProductPage";
import ProdutoDetalhe from "./pages/produtos/ProdutoDetalhe";
import Sobre from "./pages/Sobre";
import Login from "./pages/Login";
import AfiliadosLanding from "./pages/afiliados/AfiliadosLanding";
import AfiliadosCadastro from "./pages/afiliados/AfiliadosCadastro";
import Dashboard from "./pages/dashboard/Dashboard";
import Conversas from "./pages/dashboard/Conversas";
import Produtos from "./pages/dashboard/Produtos";
import Vendas from "./pages/dashboard/Vendas";
import Clientes from "./pages/dashboard/Clientes";
import Configuracoes from "./pages/dashboard/Configuracoes";
import ListaAfiliados from "./pages/dashboard/afiliados/ListaAfiliados";
import GestaoComissoes from "./pages/dashboard/afiliados/GestaoComissoes";
import Solicitacoes from "./pages/dashboard/afiliados/Solicitacoes";
import AffiliateDashboardInicio from "./pages/afiliados/dashboard/Inicio";
import AffiliateDashboardRede from "./pages/afiliados/dashboard/MinhaRede";
import AffiliateDashboardComissoes from "./pages/afiliados/dashboard/Comissoes";
import AffiliateDashboardRecebimentos from "./pages/afiliados/dashboard/Recebimentos";
import AffiliateDashboardConfiguracoes from "./pages/afiliados/dashboard/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* 1. CONTEXTO PÚBLICO (Site de Vendas) */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/produtos" element={<ProductPage />} />
            <Route path="/produtos/:slug" element={<ProdutoDetalhe />} />
            <Route path="/tecnologias" element={<Sobre />} />
            <Route path="/afiliados" element={<AfiliadosLanding />} />
          </Route>
          
          {/* Auth routes without header/footer */}
          <Route path="/login" element={<Login />} />
          <Route path="/afiliados/cadastro" element={<AfiliadosCadastro />} />
          
          {/* 2. CONTEXTO ADMIN (Dashboard Administrativo) */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="conversas" element={<Conversas />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="vendas" element={<Vendas />} />
            
            {/* Submenu Afiliados Admin */}
            <Route path="afiliados" element={<ListaAfiliados />} />
            <Route path="afiliados/comissoes" element={<GestaoComissoes />} />
            <Route path="afiliados/solicitacoes" element={<Solicitacoes />} />
            
            {/* Desabilitados */}
            <Route path="clientes" element={<Clientes />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* 3. CONTEXTO AFILIADO (Dashboard do Afiliado) */}
          <Route path="/afiliados/dashboard" element={<AffiliateDashboardLayout />}>
            <Route index element={<AffiliateDashboardInicio />} />
            <Route path="rede" element={<AffiliateDashboardRede />} />
            <Route path="comissoes" element={<AffiliateDashboardComissoes />} />
            <Route path="recebimentos" element={<AffiliateDashboardRecebimentos />} />
            <Route path="configuracoes" element={<AffiliateDashboardConfiguracoes />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;