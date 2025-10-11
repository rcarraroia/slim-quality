import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import Index from "./pages/Index";
import ProductPage from "./pages/produtos/ProductPage";
import Sobre from "./pages/Sobre";
import Login from "./pages/Login";
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
            <Route path="/produtos/:slug" element={<ProductPage />} />
            <Route path="/tecnologias" element={<Sobre />} />
            <Route path="/afiliados" element={<Index />} />
          </Route>
          
          {/* Auth routes without header/footer */}
          <Route path="/login" element={<Login />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
