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
  Bell
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', disabled: false },
    { icon: MessageSquare, label: 'Conversas', path: '/dashboard/conversas', badge: 8, disabled: false },
    { icon: Package, label: 'Produtos', path: '/dashboard/produtos', disabled: false },
    { icon: DollarSign, label: 'Vendas', path: '/dashboard/vendas', disabled: false },
    { icon: Users, label: 'Afiliados', path: '/dashboard/afiliados', disabled: true },
    { icon: UserCircle, label: 'Clientes', path: '/dashboard/clientes', disabled: true },
    { icon: Settings, label: 'Configurações', path: '/dashboard/configuracoes', disabled: true },
  ];

  const getPageTitle = () => {
    const currentItem = menuItems.find(item => item.path === location.pathname);
    return currentItem?.label || 'Dashboard';
  };

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Sidebar */}
      <aside className="w-[260px] bg-background border-r flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary" />
            <span className="text-xl font-bold">Slim Quality</span>
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
        <nav className="flex-1 p-4 space-y-1">
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
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
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
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-[260px] flex flex-col">
        {/* TopBar */}
        <header className="h-16 bg-background border-b sticky top-0 z-10 flex items-center px-6 gap-4">
          <h1 className="text-2xl font-bold">{getPageTitle()}</h1>
          
          <div className="flex-1" />

          {/* Search */}
          <div className="relative w-[300px]">
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
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
