import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { UserManagementModal } from "@/components/admin/UserManagementModal";
import { FaqManagement } from "@/components/admin/FaqManagement";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Settings, User, Building2, Users, CreditCard, Bell, Shield, Link, Palette, Edit, Trash2, CheckCircle, Clock, Plus, Loader2, HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const settingsTabs = [
  { id: 'perfil', label: 'Meu Perfil', icon: User },
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'usuarios', label: 'Usuários', icon: Users },
  { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'integracoes', label: 'Integrações', icon: Link },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
];

const cargoColors: Record<string, string> = {
  super_admin: 'bg-red-600 text-white',
  admin: 'bg-purple-600 text-white',
  vendedor: 'bg-blue-500 text-white',
  suporte: 'bg-success text-white',
  financeiro: 'bg-orange-500 text-white',
};

type UserData = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
  phone?: string;
  avatar_url?: string;
  wallet_id?: string;
  is_affiliate: boolean;
  affiliate_status?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
};

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('usuarios'); // Mudando para usuarios por padrão
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [cargoFilter, setCargoFilter] = useState('todos');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  // Carregar usuários do banco
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // Verificar se usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('Usuário não autenticado - não carregando usuários');
        setUsers([]);
        return;
      }
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Carregar usuários ao montar componente
  useEffect(() => {
    loadUsers();
  }, []);

  const handleSave = (section: string) => {
    toast({ title: "Configurações salvas!", description: `A seção ${section} foi atualizada.` });
  };

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleAddNewUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (user: UserData) => {
    if (!isSuperAdmin()) {
      toast({
        title: "Acesso negado",
        description: "Apenas o Super Admin pode deletar usuários",
        variant: "destructive",
      });
      return;
    }

    if (user.email === 'rcarrarocoach@gmail.com') {
      toast({
        title: "Operação não permitida",
        description: "Não é possível deletar o Super Admin",
        variant: "destructive",
      });
      return;
    }

    try {
      // Soft delete - marcar como deletado
      const { error } = await supabase
        .from('profiles')
        .update({ 
          deleted_at: new Date().toISOString(),
          status: 'inativo'
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Usuário removido",
        description: `${user.full_name} foi removido com sucesso`,
      });

      loadUsers(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast({
        title: "Erro ao remover usuário",
        description: "Não foi possível remover o usuário",
        variant: "destructive",
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesStatus = statusFilter === 'todos' || user.status === statusFilter;
    const matchesCargo = cargoFilter === 'todos' || user.role === cargoFilter;
    return matchesStatus && matchesCargo;
  });

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ativo').length;
  const lastActiveUser = users.find(u => u.last_login_at);

  const renderContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">👤 Meu Perfil</h3>
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">JA</AvatarFallback>
              </Avatar>
              <Button variant="outline">Alterar Foto</Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome</Label><Input defaultValue="João Admin" /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" defaultValue="joao@slimquality.com.br" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input defaultValue="(31) 99999-8888" /></div>
              <div className="space-y-2"><Label>Cargo</Label><Input defaultValue="Supervisor" disabled /></div>
            </div>
            <Button onClick={() => handleSave('Perfil')}>Salvar Alterações</Button>

            <Separator />

            <h4 className="font-semibold text-lg">Alterar Senha</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Senha Atual</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2"><Label>Nova Senha</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2"><Label>Confirmar Senha</Label><Input type="password" placeholder="••••••••" /></div>
            </div>
            <Button variant="outline">Alterar Senha</Button>
          </div>
        );
      case 'empresa':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🏢 Informações da Empresa</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Nome Fantasia</Label><Input defaultValue="Slim Quality" /></div>
              <div className="space-y-2"><Label>Razão Social</Label><Input defaultValue="Slim Quality Colchões Ltda" /></div>
              <div className="space-y-2"><Label>CNPJ</Label><Input defaultValue="12.345.678/0001-90" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input defaultValue="(31) 3847-XXXX" /></div>
            </div>
            <div className="space-y-2"><Label>Endereço</Label><Input defaultValue="Rua Principal, 123" /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Cidade</Label><Input defaultValue="Timóteo" /></div>
              <div className="space-y-2"><Label>Estado</Label><Input defaultValue="MG" /></div>
              <div className="space-y-2"><Label>CEP</Label><Input defaultValue="35180-000" /></div>
            </div>
            <Button onClick={() => handleSave('Empresa')}>Salvar</Button>
          </div>
        );
      case 'usuarios':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">👥 Gerenciamento de Usuários</h3>
            <p className="text-muted-foreground text-sm">
              Gerencie os usuários do sistema, suas permissões e níveis de acesso. Apenas administradores podem adicionar ou remover usuários.
            </p>

            {/* Cards de Resumo */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Usuários</p>
                    <p className="text-2xl font-bold text-blue-500">{totalUsers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-success">{activeUsers}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success/50" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Último Acesso</p>
                    <p className="text-lg font-bold text-warning">
                      {lastActiveUser?.last_login_at ? new Date(lastActiveUser.last_login_at).toLocaleDateString('pt-BR') : 'Nunca'}
                    </p>
                    <p className="text-xs text-muted-foreground">{lastActiveUser?.full_name}</p>
                  </div>
                  <Clock className="h-8 w-8 text-warning/50" />
                </div>
              </Card>
            </div>

            {/* Barra de Ações */}
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <Select value={cargoFilter} onValueChange={setCargoFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Cargo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Cargos</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Vendedor">Vendedor</SelectItem>
                  <SelectItem value="Suporte">Suporte</SelectItem>
                  <SelectItem value="Financeiro">Financeiro</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <Button onClick={handleAddNewUser} className="gap-2 w-full md:w-auto">
                <Plus className="h-4 w-4" /> Adicionar Usuário
              </Button>
            </div>

            {/* Tabela de Usuários */}
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className={cn("text-white", cargoColors[user.role] || 'bg-gray-500')}>
                              {user.full_name.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-medium">{user.full_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={cn("px-3 py-1 rounded-full text-xs font-medium", cargoColors[user.role])}>
                          {user.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString('pt-BR') : 'Nunca'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        );
      case 'pagamentos':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">💳 Configuração Asaas</h3>
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="font-semibold">Status: Conectado</span>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" defaultValue="************************************" />
                <Button variant="outline" size="sm">Testar Conexão</Button>
              </div>
              <div className="space-y-2">
                <Label>Wallet ID (Split)</Label>
                <Input defaultValue="wal_000005162549" />
                <Button variant="outline" size="sm">Validar Wallet ID</Button>
              </div>
            </Card>

            <h4 className="font-semibold text-lg">Configurações de Split</h4>
            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Label>Split Automático</Label>
                <Toggle defaultPressed>ON</Toggle>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nível 1 (Direto)</Label><Input defaultValue="15%" /></div>
                <div className="space-y-2"><Label>Nível 2</Label><Input defaultValue="3%" /></div>
                <div className="space-y-2"><Label>Nível 3</Label><Input defaultValue="2%" /></div>
                <div className="space-y-2"><Label>Taxa Plataforma (Renum + JB)</Label><Input defaultValue="10%" /></div>
              </div>
              <p className="text-sm text-muted-foreground">
                A soma das comissões de N1, N2, N3 e Taxa Plataforma deve ser igual a 30% do valor total da venda.
              </p>
            </Card>
            <Button onClick={() => handleSave('Pagamentos')}>Salvar Configurações</Button>
          </div>
        );
      case 'notificacoes':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">📧 Preferências de Notificação</h3>
            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">Email</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Nova venda</Label><Checkbox defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Nova conversa</Label><Checkbox defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Solicitação de saque</Label><Checkbox defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Resumo diário (8h)</Label><Checkbox /></div>
              </div>
              <Separator />
              <h4 className="font-semibold">WhatsApp (Aviso para admin)</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Vendas acima de R$ 5.000</Label><Checkbox defaultChecked /></div>
                <div className="flex items-center justify-between"><Label>Problemas com pagamento</Label><Checkbox /></div>
              </div>
            </Card>
            <Button onClick={() => handleSave('Notificações')}>Salvar Preferências</Button>
          </div>
        );
      case 'seguranca':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🔐 Segurança</h3>
            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">Autenticação em 2 Fatores (2FA)</h4>
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">Adicione uma camada extra de segurança.</p>
                <Button variant="outline">Ativar 2FA</Button>
              </div>
              <Separator />
              <h4 className="font-semibold">Sessões Ativas</h4>
              <div className="space-y-2 text-sm">
                <p>• Windows - Chrome - 192.168.1.100 - Agora</p>
                <p>• Android - App - 192.168.1.50 - Há 2 horas</p>
              </div>
              <Button variant="destructive" size="sm">Encerrar Todas as Sessões</Button>
            </Card>
          </div>
        );
      case 'integracoes':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🔗 Integrações Disponíveis</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'Asaas', status: 'Conectado', desc: 'Gateway de pagamento e split', color: 'text-success' },
                { name: 'N8N (Automação)', status: 'Não conectado', desc: 'Automações e workflows', color: 'text-warning' },
                { name: 'WhatsApp Business', status: 'Conectado', desc: 'Conversas e notificações', color: 'text-success' },
                { name: 'Google Analytics', status: 'Não conectado', desc: 'Análise de tráfego', color: 'text-warning' },
              ].map((integration, i) => (
                <Card key={i} className="p-4 space-y-2">
                  <h4 className="font-semibold">{integration.name}</h4>
                  <p className={`text-sm font-medium ${integration.color}`}>{integration.status}</p>
                  <p className="text-xs text-muted-foreground">{integration.desc}</p>
                  <Button variant="outline" size="sm">
                    {integration.status === 'Conectado' ? 'Configurar' : 'Conectar'}
                  </Button>
                </Card>
              ))}
            </div>
          </div>
        );
      case 'aparencia':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold">🎨 Aparência</h3>
            <Card className="p-6 space-y-4">
              <h4 className="font-semibold">Tema do Sistema</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2"><input type="radio" name="theme" defaultChecked /><Label>Tema Escuro</Label></div>
                <div className="flex items-center space-x-2"><input type="radio" name="theme" /><Label>Tema Claro</Label></div>
                <div className="flex items-center space-x-2"><input type="radio" name="theme" /><Label>Automático (sistema)</Label></div>
              </div>
              <Separator />
              <h4 className="font-semibold">Cor Primária</h4>
              <Input type="color" defaultValue="#10B981" className="w-24 h-10 p-0" />
              <Button onClick={() => handleSave('Aparência')}>Salvar Aparência</Button>
            </Card>
          </div>
        );
      case 'faq':
        return <FaqManagement />;
      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-100px)] gap-6">
      {/* Sidebar de Tabs */}
      <Card className="w-64 flex-shrink-0">
        <CardContent className="p-4 space-y-1">
          {settingsTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant={isActive ? 'default' : 'ghost'}
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {/* Conteúdo Principal */}
      <Card className="flex-1">
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
      
      {/* Modal de Gerenciamento de Usuários */}
      <UserManagementModal 
        user={editingUser}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserSaved={loadUsers}
      />
    </div>
  );
}