import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import Index from "./pages/Index";
import ProductPage from "./pages/produtos/ProductPage";
import Sobre from "./pages/Sobre";
import Login from "./pages/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import Conversas from "./pages/dashboard/Conversas";
import Produtos from "./pages/dashboard/Produtos";
import Vendas from "./pages/dashboard/Vendas";
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
          </Route>
          
          {/* Auth routes without header/footer */}
          <Route path="/login" element={<Login />} />
          
          {/* Dashboard routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="conversas" element={<Conversas />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="vendas" element={<Vendas />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
