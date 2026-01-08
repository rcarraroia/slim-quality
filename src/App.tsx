import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAffiliateTracking } from "@/hooks/useAffiliateTracking";
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
import ConversaDetalhes from "./pages/dashboard/ConversaDetalhes";
import Produtos from "./pages/dashboard/Produtos";
import Vendas from "./pages/dashboard/Vendas";
import Pedidos from "./pages/dashboard/Pedidos";
import Clientes from "./pages/dashboard/Clientes";
import Configuracoes from "./pages/dashboard/Configuracoes";
import Agendamentos from "./pages/dashboard/Agendamentos";
import Automacoes from "./pages/dashboard/Automacoes";
import Analytics from "./pages/dashboard/Analytics";
import ListaAfiliados from "./pages/dashboard/afiliados/ListaAfiliados";
import GestaoComissoes from "./pages/dashboard/afiliados/GestaoComissoes";
import Solicitacoes from "./pages/dashboard/afiliados/Solicitacoes";
import AgenteIA from "./pages/dashboard/agente/AgenteIA";
import AgenteConfiguracao from "./pages/dashboard/agente/AgenteConfiguracao";
import AgenteSicc from "./pages/dashboard/agente/AgenteSicc";
import ChatTest from "./pages/ChatTest";
import AgenteMcp from "./pages/dashboard/agente/AgenteMcp";
import AgenteMetricas from "./pages/dashboard/agente/AgenteMetricas";
import AgenteAprendizados from "./pages/dashboard/agente/AgenteAprendizados";
import AffiliateDashboardInicio from "./pages/afiliados/dashboard/Inicio";
import AffiliateDashboardRede from "./pages/afiliados/dashboard/MinhaRede";
import AffiliateDashboardComissoes from "./pages/afiliados/dashboard/Comissoes";
import AffiliateDashboardRecebimentos from "./pages/afiliados/dashboard/Recebimentos";
import AffiliateDashboardConfiguracoes from "./pages/afiliados/dashboard/Configuracoes";
import TermosAfiliados from "./pages/afiliados/TermosAfiliados";
import LandingPageWithRef from "./pages/LandingPageWithRef";
import NotFound from "./pages/NotFound";
import PagamentoErro from "./pages/PagamentoErro";
import PagamentoPix from "./pages/PagamentoPix";

const queryClient = new QueryClient();

// Componente interno para inicializar tracking
function TrackingInitializer() {
  useAffiliateTracking();
  return null;
}

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <TrackingInitializer />
            <Routes>
              {/* 1. CONTEXTO PÚBLICO (Site de Vendas) */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/produtos" element={<ProductPage />} />
                <Route path="/produtos/:slug" element={<ProdutoDetalhe />} />
                <Route path="/tecnologias" element={<Sobre />} />
                <Route path="/afiliados" element={<AfiliadosLanding />} />
                <Route path="/termos-afiliados" element={<TermosAfiliados />} />
              </Route>

              {/* Auth routes without header/footer */}
              <Route path="/login" element={<Login />} />
              <Route path="/afiliados/cadastro" element={<AfiliadosCadastro />} />

              {/* Teste do Chat Widget */}
              <Route path="/chat-test" element={<ChatTest />} />

              {/* Páginas de Pagamento (sem layout) */}
              <Route path="/pagamento-erro" element={<PagamentoErro />} />
              <Route path="/pagamento-pix" element={<PagamentoPix />} />

              {/* 2. CONTEXTO ADMIN (Dashboard Administrativo) */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="conversas" element={<Conversas />} />
                <Route path="conversas/:id" element={<ConversaDetalhes />} />
                <Route path="produtos" element={<Produtos />} />
                <Route path="vendas" element={<Vendas />} />
                <Route path="pedidos" element={<Pedidos />} />

                {/* Novos Itens da Fase 4 */}
                <Route path="clientes" element={<Clientes />} />
                <Route path="agendamentos" element={<Agendamentos />} />
                <Route path="automacoes" element={<Automacoes />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="configuracoes" element={<Configuracoes />} />

                {/* Submenu Afiliados Admin */}
                <Route path="afiliados" element={<ListaAfiliados />} />
                <Route path="afiliados/comissoes" element={<GestaoComissoes />} />
                <Route path="afiliados/solicitacoes" element={<Solicitacoes />} />

                {/* NOVO: Submenu Agente IA */}
                <Route path="agente" element={<AgenteIA />} />
                <Route path="agente/configuracao" element={<AgenteConfiguracao />} />
                <Route path="agente/sicc" element={<AgenteSicc />} />
                <Route path="agente/mcp" element={<AgenteMcp />} />
                <Route path="agente/metricas" element={<AgenteMetricas />} />
                <Route path="agente/aprendizados" element={<AgenteAprendizados />} />
              </Route>

              {/* 3. CONTEXTO AFILIADO (Dashboard do Afiliado) */}
              <Route path="/afiliados/dashboard" element={<AffiliateDashboardLayout />}>
                <Route index element={<AffiliateDashboardInicio />} />
                <Route path="rede" element={<AffiliateDashboardRede />} />
                <Route path="comissoes" element={<AffiliateDashboardComissoes />} />
                <Route path="recebimentos" element={<AffiliateDashboardRecebimentos />} />
                <Route path="configuracoes" element={<AffiliateDashboardConfiguracoes />} />
              </Route>

              {/* Captura de slug/referral_code (DEVE VIR ANTES DO 404) */}
              <Route path="/:slug" element={<LandingPageWithRef />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;