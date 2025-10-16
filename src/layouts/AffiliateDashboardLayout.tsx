import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Link as LinkIcon,
  LogOut,
  Bell,
  Search,
  Wallet
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function AffiliateDashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Início", path: "/afiliados/dashboard" },
    { icon: Users, label: "Minha Rede", path: "/afiliados/dashboard/rede" },
    { icon: DollarSign, label: "Comissões", path: "/afiliados/dashboard/comissoes" },
    { icon: Wallet, label: "Recebimentos", path: "/afiliados/dashboard/recebimentos" },
    { icon: LinkIcon, label: "Meu Link", path: "/afiliados/dashboard/link" },
  ];

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.label || "Dashboard Afiliado";
  };

  const handleLogout = () => {
    navigate("/login");
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

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>CM</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Carlos Mendes</p>
                <p className="text-xs text-muted-foreground">Afiliado Nível 3</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="mt-3 w-full justify-start gap-2"
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
            {/* Saldo Flutuante */}
            <Card className="bg-primary/10 border-primary/20 px-4 py-2">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Disponível</p>
                  <p className="text-lg font-bold text-primary">R$ 3.200,00</p>
                </div>
                <Button size="sm" className="ml-2">
                  Sacar
                </Button>
              </div>
            </Card>

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
            <Avatar className="h-9 w-9 cursor-pointer">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback>CM</AvatarFallback>
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
