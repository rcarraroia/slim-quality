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
import Sobre from "./pages/Sobre";
import Login from "./pages/Login";
import AfiliadosLanding from "./pages/afiliados/AfiliadosLanding";
import AfiliadosCadastro from "./pages/afiliados/AfiliadosCadastro";
import Dashboard from "./pages/dashboard/Dashboard";
import Conversas from "./pages/dashboard/Conversas";
import Produtos from "./pages/dashboard/Produtos";
import Vendas from "./pages/dashboard/Vendas";
import ListaAfiliados from "./pages/dashboard/afiliados/ListaAfiliados";
import GestaoComissoes from "./pages/dashboard/afiliados/GestaoComissoes";
import GestaoSaques from "./pages/dashboard/afiliados/GestaoSaques";
import AffiliateDashboardInicio from "./pages/afiliados/dashboard/Inicio";
import AffiliateDashboardRede from "./pages/afiliados/dashboard/MinhaRede";
import AffiliateDashboardComissoes from "./pages/afiliados/dashboard/Comissoes";
import AffiliateDashboardRecebimentos from "./pages/afiliados/dashboard/Recebimentos";
import AffiliateDashboardLink from "./pages/afiliados/dashboard/MeuLink";
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
          
          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="conversas" element={<Conversas />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="afiliados" element={<ListaAfiliados />} />
            <Route path="afiliados/comissoes" element={<GestaoComissoes />} />
            <Route path="afiliados/saques" element={<GestaoSaques />} />
          </Route>

          {/* Affiliate Dashboard routes */}
          <Route path="/afiliados/dashboard" element={<AffiliateDashboardLayout />}>
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
