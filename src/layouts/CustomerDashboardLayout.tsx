/**
 * Layout do Dashboard do Cliente
 * Rota: /minha-conta/*
 */

import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  Home,
  ShoppingBag,
  User,
  Settings,
  LogOut,
  Bell,
  Search,
  Users,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/config/supabase";

export function CustomerDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, isLoading, isAffiliate, logout, updateUser, refreshUser } = useCustomerAuth();
  
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Redirecionar se não autenticado
  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/entrar');
    }
  }, [isLoading, user, navigate]);

  // Gerar iniciais do nome
  const getInitials = (name: string): string => {
    if (!name) return 'CL';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Menu items base
  const baseMenuItems = [
    { icon: Home, label: "Início", path: "/minha-conta" },
    { icon: ShoppingBag, label: "Meus Pedidos", path: "/minha-conta/pedidos" },
    { icon: User, label: "Meus Dados", path: "/minha-conta/dados" },
  ];

  // Adicionar link para painel de afiliado se for afiliado
  const menuItems = isAffiliate 
    ? [...baseMenuItems, { icon: Users, label: "Painel de Afiliado", path: "/afiliados/dashboard" }]
    : baseMenuItems;

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.label || "Minha Conta";
  };

  const handleLogout = async () => {
    await logout();
  };

  // Ativar conta de afiliado
  const handleActivateAffiliate = async () => {
    if (!user) return;
    
    setIsActivating(true);
    
    try {
      // Gerar código de indicação único (exatamente 6 caracteres alfanuméricos maiúsculos)
      const baseCode = user.name
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 3);
      
      // Completar com caracteres aleatórios para ter exatamente 6 caracteres
      const randomPart = Math.random().toString(36).substring(2, 2 + (6 - baseCode.length)).toUpperCase().replace(/[^A-Z0-9]/g, '');
      let referralCode = (baseCode + randomPart).substring(0, 6);
      
      // Garantir que tenha exatamente 6 caracteres
      while (referralCode.length < 6) {
        referralCode += Math.random().toString(36).substring(2, 3).toUpperCase();
      }
      referralCode = referralCode.substring(0, 6).replace(/[^A-Z0-9]/g, 'X');

      // Buscar quem indicou (referred_by) do localStorage
      let referredById: string | null = null;
      try {
        const storedReferral = localStorage.getItem('slim_referral_code');
        if (storedReferral) {
          const referralData = JSON.parse(storedReferral);
          if (referralData.code && Date.now() < referralData.expiry) {
            // Buscar o afiliado que indicou pelo código
            const { data: referrerAffiliate } = await supabase
              .from('affiliates')
              .select('id')
              .eq('referral_code', referralData.code.toUpperCase())
              .eq('status', 'active')
              .is('deleted_at', null)
              .single();
            
            if (referrerAffiliate) {
              referredById = referrerAffiliate.id;
              console.log('[Affiliate Activation] Vinculando à rede de:', referralData.code);
            }
          }
        }
      } catch (e) {
        console.warn('[Affiliate Activation] Erro ao buscar referrer:', e);
      }

      // Criar registro de afiliado (ativação automática)
      const { data: affiliateData, error } = await supabase
        .from('affiliates')
        .insert({
          user_id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          referral_code: referralCode,
          status: 'active',  // Ativação automática - admin só desativa se necessário
          referred_by: referredById  // Vincular à rede de quem indicou
        })
        .select('id, status')
        .single();

      if (error) {
        throw error;
      }

      // Se foi indicado por alguém, inserir na tabela affiliate_network
      if (referredById && affiliateData) {
        const { error: networkError } = await supabase
          .from('affiliate_network')
          .insert({
            affiliate_id: affiliateData.id,
            parent_affiliate_id: referredById,
            level: 1,
            path: `${referredById}.${affiliateData.id}`
          });
        
        if (networkError) {
          console.warn('[Affiliate Activation] Erro ao inserir na rede:', networkError);
          // Não falhar a ativação por causa disso, apenas logar
        } else {
          console.log('[Affiliate Activation] Afiliado inserido na rede com sucesso');
        }
      }

      // Atualizar estado do usuário
      updateUser({
        isAffiliate: true,
        affiliateId: affiliateData.id,
        affiliateStatus: affiliateData.status
      });

      toast({
        title: "Parabéns! 🎉",
        description: "Você agora é um afiliado Slim Quality! Configure sua carteira Asaas para receber comissões.",
      });

      setShowAffiliateModal(false);
      
      // Redirecionar para dashboard de afiliado
      navigate('/afiliados/dashboard');
      
    } catch (error: any) {
      console.error('Erro ao ativar afiliado:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível ativar sua conta de afiliado",
        variant: "destructive"
      });
    } finally {
      setIsActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card shadow-sm">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b p-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-green-600" />
              <div>
                <p className="font-bold text-lg">Slim Quality</p>
                <p className="text-xs text-muted-foreground">Minha Conta</p>
              </div>
            </Link>
          </div>

          {/* User Info */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-600 text-white">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-green-600 text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Botão Quero Ser Afiliado (se não for afiliado) */}
            {!isAffiliate && (
              <button
                onClick={() => setShowAffiliateModal(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 mt-4"
              >
                <Users className="h-4 w-4" />
                <span>Quero Ser Afiliado</span>
              </button>
            )}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col pl-64">
        {/* TopBar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card px-6 shadow-sm">
          <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
          
          <div className="ml-auto flex items-center gap-4">
            {/* User Avatar */}
            <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate('/minha-conta/dados')}>
              <AvatarFallback className="bg-green-600 text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Modal de Ativação de Afiliado */}
      <Dialog open={showAffiliateModal} onOpenChange={setShowAffiliateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quero Ser Afiliado! 🚀</DialogTitle>
            <DialogDescription>
              Ao se tornar um afiliado Slim Quality, você poderá:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
              <p className="text-sm">Ganhar <strong>15% de comissão</strong> em cada venda indicada</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
              <p className="text-sm">Receber comissões de até <strong>3 níveis</strong> da sua rede</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
              <p className="text-sm">Ter seu <strong>link exclusivo</strong> de indicação</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-sm">✓</div>
              <p className="text-sm">Receber pagamentos <strong>automáticos</strong> via Asaas</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Após a ativação, você precisará configurar sua carteira Asaas para receber os pagamentos.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAffiliateModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleActivateAffiliate}
              disabled={isActivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isActivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ativando...
                </>
              ) : (
                'Confirmar Ativação'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
