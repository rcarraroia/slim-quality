import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  Settings,
  LogOut,
  Bell,
  Search,
  CreditCard,
  Home,
  TreeDeciduous,
  Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

export function AffiliateDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados para dados do afiliado
  const [affiliate, setAffiliate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Carregar dados do afiliado ao montar
  useEffect(() => {
    loadAffiliateData();
  }, []);

  const loadAffiliateData = async () => {
    try {
      setLoading(true);
      const { isAffiliate, affiliate: affiliateData } = await affiliateFrontendService.checkAffiliateStatus();
      
      if (isAffiliate && affiliateData) {
        setAffiliate(affiliateData);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do afiliado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar iniciais do nome
  const getInitials = (name: string): string => {
    if (!name) return 'AF';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Obter label do status
  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'active': 'Afiliado Ativo',
      'pending': 'Aguardando Aprovação',
      'inactive': 'Inativo',
      'suspended': 'Suspenso',
      'rejected': 'Rejeitado'
    };
    return statusMap[status] || 'Afiliado';
  };

  const menuItems = [
    { icon: Home, label: "Início", path: "/afiliados/dashboard" },
    { icon: TreeDeciduous, label: "Minha Rede", path: "/afiliados/dashboard/rede" },
    { icon: DollarSign, label: "Comissões", path: "/afiliados/dashboard/comissoes" },
    { icon: CreditCard, label: "Recebimentos", path: "/afiliados/dashboard/recebimentos" },
    { icon: Settings, label: "Configurações", path: "/afiliados/dashboard/configuracoes" },
  ];

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.label || "Dashboard Afiliado";
  };

  const handleLogout = () => {
    navigate("/entrar");
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-card shadow-sm">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b p-6">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary" />
              <div>
                <p className="font-bold text-lg">Slim Quality</p>
                <p className="text-xs text-muted-foreground">Programa de Afiliados</p>
              </div>
            </Link>
          </div>

          {/* User Info (Top of Menu) */}
          <div className="p-4 border-b">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(affiliate?.name || 'Afiliado')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {affiliate?.name || 'Afiliado'}
                  </p>
                  <p className={cn(
                    "text-xs font-semibold",
                    affiliate?.status === 'active' ? 'text-success' :
                    affiliate?.status === 'pending' ? 'text-orange-500' :
                    'text-muted-foreground'
                  )}>
                    {getStatusLabel(affiliate?.status || 'pending')}
                  </p>
                </div>
              </div>
            )}
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
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
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
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar..."
                className="pl-8"
              />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                3
              </span>
            </Button>

            {/* User Avatar */}
            <Avatar className="h-9 w-9 cursor-pointer" onClick={() => navigate('/afiliados/dashboard/configuracoes')}>
              <AvatarFallback>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  getInitials(affiliate?.name || 'Afiliado')
                )}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}