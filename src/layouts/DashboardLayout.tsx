import { useState } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Package,
  DollarSign,
  Users,
  UserCircle,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  ChevronUp,
  CreditCard,
  List,
  Calendar,
  Bot,
  BarChart3,
  Menu,
  X,
  Brain,
  Lightbulb,
  ShoppingCart,
  Megaphone
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePendingLearningBadge } from '@/hooks/useRealtimeConversations';
import { useAuth } from '@/hooks/useAuth';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliatesMenuOpen, setAffiliatesMenuOpen] = useState(location.pathname.startsWith('/dashboard/afiliados'));
  const [agentMenuOpen, setAgentMenuOpen] = useState(
    location.pathname.startsWith('/dashboard/agente') ||
    location.pathname === '/dashboard/agendamentos' ||
    location.pathname === '/dashboard/automacoes'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Novo estado para mobile

  // Hook para badge dinâmico de aprendizados pendentes
  const { count: pendingLearningCount } = usePendingLearningBadge();

  // Hook de autenticação para logout
  const { logout } = useAuth();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', disabled: false },
    { icon: MessageSquare, label: 'Conversas', path: '/dashboard/conversas', disabled: false },
    { icon: Package, label: 'Produtos', path: '/dashboard/produtos', disabled: false },
    { icon: DollarSign, label: 'Vendas', path: '/dashboard/vendas', disabled: false },
    { icon: ShoppingCart, label: 'Pedidos', path: '/dashboard/pedidos', disabled: false },
  ];

  const affiliateSubmenu = [
    { label: 'Lista de Afiliados', path: '/dashboard/afiliados', icon: List },
    { label: 'Minha Rede', path: '/dashboard/afiliados/minha-rede', icon: Users },
    { label: 'Comissões', path: '/dashboard/afiliados/comissoes', icon: DollarSign },
    { label: 'Solicitações', path: '/dashboard/afiliados/solicitacoes', icon: CreditCard },
  ];

  const agentSubmenu = [
    { label: 'Overview', path: '/dashboard/agente', icon: LayoutDashboard },
    { label: 'Configuração', path: '/dashboard/agente/configuracao', icon: Settings },
    { label: 'SICC', path: '/dashboard/agente/sicc', icon: Brain },
    { label: 'Integrações', path: '/dashboard/agente/mcp', icon: Plug },
    { label: 'Métricas', path: '/dashboard/agente/metricas', icon: BarChart3 },
    { label: 'Aprendizados', path: '/dashboard/agente/aprendizados', icon: Lightbulb },
    { label: 'Agendamentos', path: '/dashboard/agendamentos', icon: Calendar },
    { label: 'Automações', path: '/dashboard/automacoes', icon: Bot },
  ];

  const secondaryItems = [
    { icon: Megaphone, label: 'Materiais Mkt', path: '/dashboard/materiais', disabled: false },
    { icon: UserCircle, label: 'Clientes', path: '/dashboard/clientes', disabled: false },
    { icon: BarChart3, label: 'Analytics', path: '/dashboard/analytics', disabled: false },
    { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes', disabled: false },
  ];

  const getPageTitle = () => {
    const allItems = [
      ...menuItems,
      ...affiliateSubmenu,
      ...agentSubmenu,
      ...secondaryItems
    ];
    const currentItem = allItems.find(item => item.path === location.pathname);
    return currentItem?.label || 'Dashboard';
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b">
        <Link to="/dashboard" className="flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Slim Quality"
            className="h-10 w-auto"
          />
        </Link>
      </div>

      {/* User Info */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">JA</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">João Admin</p>
            <p className="text-xs text-muted-foreground">Supervisor</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-primary/10 text-primary"
                  : item.disabled
                    ? "text-muted-foreground cursor-not-allowed opacity-50"
                    : "text-foreground hover:bg-muted hover:text-primary"
              )}
              onClick={(e) => {
                if (item.disabled) {
                  e.preventDefault();
                }
                handleNavigation(item.path);
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {/* Afiliados Menu (Dropdown) */}
        <div className="space-y-1">
          <button
            onClick={() => setAffiliatesMenuOpen(!affiliatesMenuOpen)}
            className={cn(
              "flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
              location.pathname.startsWith('/dashboard/afiliados')
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted hover:text-primary"
            )}
          >
            <Users className="h-5 w-5" />
            <span>Afiliados</span>
            {affiliatesMenuOpen ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </button>

          {affiliatesMenuOpen && (
            <div className="pl-8 space-y-1">
              {affiliateSubmenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Agente IA Menu (Dropdown) */}
        <div className="space-y-1">
          <button
            onClick={() => setAgentMenuOpen(!agentMenuOpen)}
            className={cn(
              "flex items-center w-full gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
              (location.pathname.startsWith('/dashboard/agente') ||
                location.pathname === '/dashboard/agendamentos' ||
                location.pathname === '/dashboard/automacoes')
                ? "bg-primary/10 text-primary"
                : "text-foreground hover:bg-muted hover:text-primary"
            )}
          >
            <Bot className="h-5 w-5" />
            <span>🤖 Meu Agente</span>
            {pendingLearningCount > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] h-5 flex items-center justify-center">
                {pendingLearningCount}
              </span>
            )}
            {agentMenuOpen ? (
              <ChevronUp className="h-4 w-4 ml-auto" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-auto" />
            )}
          </button>

          {agentMenuOpen && (
            <div className="pl-8 space-y-1">
              {agentSubmenu.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => handleNavigation(item.path)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {/* Badge para Aprendizados - usando dados reais */}
                    {item.path === '/dashboard/agente/aprendizados' && pendingLearningCount > 0 && (
                      <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                        {pendingLearningCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Secondary Items (Activated) */}
        <div className="pt-2 space-y-1 border-t mt-2">
          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-muted hover:text-primary"
                )}
                onClick={() => handleNavigation(item.path)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Sidebar (Desktop) */}
      <aside className="w-[260px] bg-background border-r flex-col fixed h-full hidden lg:flex">
        {renderSidebarContent()}
      </aside>

      {/* Sidebar (Mobile Overlay) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-[260px] bg-background h-full flex flex-col transition-transform duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-4 right-4">
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-[260px] flex flex-col">
        {/* TopBar */}
        <header className="h-16 bg-background border-b sticky top-0 z-10 flex items-center px-4 lg:px-6 gap-4 shadow-sm">

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <h1 className="text-lg lg:text-2xl font-bold truncate">{getPageTitle()}</h1>

          <div className="flex-1" />

          {/* Search (Hidden on small mobile, visible on tablet/desktop) */}
          <div className="relative w-[200px] sm:w-[300px] hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full" />
          </Button>

          {/* User Avatar */}
          <Avatar className="cursor-pointer">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary text-primary-foreground">JA</AvatarFallback>
          </Avatar>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}