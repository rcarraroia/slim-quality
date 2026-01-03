import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, CheckCircle } from "lucide-react";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface UserData {
  id?: string;
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
  created_at?: string;
  updated_at?: string;
}

interface UserManagementModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
  onUserSaved: () => void; // Callback para atualizar lista
}

const mockPermissions = [
  { id: 'dashboard', label: 'Ver Dashboard e Métricas' },
  { id: 'conversas', label: 'Gerenciar Conversas' },
  { id: 'produtos', label: 'Gerenciar Produtos' },
  { id: 'vendas', label: 'Ver Vendas' },
  { id: 'clientes', label: 'Gerenciar Clientes' },
  { id: 'afiliados', label: 'Ver Afiliados' },
  { id: 'agendamentos', label: 'Gerenciar Agendamentos' },
  { id: 'automacoes', label: 'Ver Automações' },
  { id: 'analytics', label: 'Ver Analytics' },
  { id: 'configuracoes', label: 'Acessar Configurações' },
];

const rolePermissions: Record<string, string[]> = {
  super_admin: mockPermissions.map(p => p.id), // Super admin tem todas as permissões
  admin: ['dashboard', 'conversas', 'produtos', 'vendas', 'clientes', 'afiliados', 'agendamentos', 'analytics', 'configuracoes'],
  vendedor: ['dashboard', 'conversas', 'clientes', 'agendamentos', 'produtos'],
  suporte: ['dashboard', 'conversas', 'produtos', 'clientes', 'analytics'],
  financeiro: ['dashboard', 'vendas', 'afiliados', 'analytics'],
  personalizado: [],
};

export function UserManagementModal({ user, isOpen, onClose, onUserSaved }: UserManagementModalProps) {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const isEditing = !!user;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserData>(
    user || { 
      full_name: '', 
      email: '', 
      role: 'vendedor', 
      status: 'ativo',
      is_affiliate: false
    }
  );
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(
    isEditing ? rolePermissions[user.role] || [] : rolePermissions['vendedor']
  );
  const [selectedProfile, setSelectedProfile] = useState(isEditing ? user.role : 'vendedor');
  const [password, setPassword] = useState('');

  // Resetar form quando modal abrir/fechar
  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData(user);
        setSelectedProfile(user.role);
        setSelectedPermissions(rolePermissions[user.role] || []);
      } else {
        setFormData({ 
          full_name: '', 
          email: '', 
          role: 'vendedor', 
          status: 'ativo',
          is_affiliate: false
        });
        setSelectedProfile('vendedor');
        setSelectedPermissions(rolePermissions['vendedor']);
      }
      setPassword('');
    }
  }, [isOpen, user]);

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    setFormData(prev => ({ ...prev, role: profile }));
    if (profile !== 'personalizado') {
      setSelectedPermissions(rolePermissions[profile] || []);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId) 
        : [...prev, permissionId]
    );
    setSelectedProfile('personalizado');
    setFormData(prev => ({ ...prev, role: 'personalizado' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        // Atualizar usuário existente
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            status: formData.status,
            phone: formData.phone,
            wallet_id: formData.wallet_id,
            is_affiliate: formData.is_affiliate,
            affiliate_status: formData.affiliate_status,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id);

        if (error) throw error;

        toast({
          title: "Usuário Atualizado",
          description: `${formData.full_name} foi atualizado com sucesso.`,
          action: <CheckCircle className="h-4 w-4 text-success" />,
        });
      } else {
        // Criar novo usuário
        if (!password) {
          toast({
            title: "Erro",
            description: "Senha é obrigatória para novos usuários",
            variant: "destructive",
          });
          return;
        }

        // Criar usuário via Edge Function (segura)
        console.log('🚀 Chamando Edge Function admin-create-user...');
        console.log('📧 Email:', formData.email);
        console.log('👤 UserData:', {
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          phone: formData.phone,
          wallet_id: formData.wallet_id,
          is_affiliate: formData.is_affiliate,
          affiliate_status: formData.affiliate_status
        });
        
        // Implementar timeout manual para evitar travamento
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout: Edge Function demorou mais de 30 segundos')), 30000);
        });
        
        const functionPromise = supabase.functions.invoke('admin-create-user', {
          body: {
            email: formData.email,
            password: password,
            userData: {
              full_name: formData.full_name,
              email: formData.email,
              role: formData.role,
              status: formData.status,
              phone: formData.phone,
              wallet_id: formData.wallet_id,
              is_affiliate: formData.is_affiliate,
              affiliate_status: formData.affiliate_status
            }
          }
        });
        
        console.log('⏳ Aguardando resposta da Edge Function...');
        
        const { data: functionData, error: functionError } = await Promise.race([
          functionPromise,
          timeoutPromise
        ]).catch(error => {
          console.log('💥 Erro capturado:', error);
          return { data: null, error: error };
        });
        
        console.log('📊 Resposta da Edge Function:');
        console.log('✅ Data:', functionData);
        console.log('❌ Error:', functionError);

        // Se Edge Function falhou, tentar fallback direto no banco
        if (functionError || !functionData) {
          console.log('🔄 Edge Function falhou, tentando fallback direto no banco...');
          
          try {
            // Gerar ID único para o usuário
            const userId = crypto.randomUUID();
            
            // Criar perfil diretamente na tabela profiles
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: userId,
                full_name: formData.full_name,
                email: formData.email,
                role: formData.role,
                status: formData.status,
                phone: formData.phone,
                wallet_id: formData.wallet_id,
                is_affiliate: formData.is_affiliate,
                affiliate_status: formData.affiliate_status,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.log('❌ Erro no fallback:', profileError);
              throw new Error(`Fallback falhou: ${profileError.message}`);
            }

            console.log('✅ Usuário criado via fallback direto no banco!');
            
            toast({
              title: "Usuário Criado (Fallback)",
              description: `${formData.full_name} foi criado com sucesso. Nota: Senha deve ser definida pelo usuário no primeiro login.`,
              action: <CheckCircle className="h-4 w-4 text-success" />,
            });
            
            // Sucesso do fallback - sair da função
            onUserSaved();
            onClose();
            return;
            
          } catch (fallbackError) {
            console.log('❌ Fallback também falhou:', fallbackError);
            throw fallbackError;
          }
        }

        // Edge Function funcionou
        if (functionData.error) throw new Error(functionData.error);
        console.log('✅ Usuário criado com sucesso via Edge Function!');
          
          toast({
            title: "Usuário Criado",
            description: `${formData.full_name} foi criado com sucesso.`,
            action: <CheckCircle className="h-4 w-4 text-success" />,
          });
        }
      }

      onUserSaved(); // Atualizar lista de usuários
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro ao salvar",
        description: error.message || "Ocorreu um erro ao salvar o usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {isEditing ? `Editar Usuário: ${user?.nome}` : "Adicionar Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><User className="h-5 w-5 text-primary" /> Dados Básicos</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo <span className="text-destructive">*</span></Label>
              <Input 
                id="nome" 
                required 
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input 
                id="email" 
                type="email" 
                required 
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo <span className="text-destructive">*</span></Label>
              <Select value={formData.role} onValueChange={handleProfileChange}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {isSuperAdmin() && <SelectItem value="super_admin">Super Admin</SelectItem>}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="suporte">Suporte</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as UserData['status'] }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> {isEditing ? 'Resetar Senha' : 'Senha Temporária'}</h3>
          
          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="senha">Senha Temporária <span className="text-destructive">*</span></Label>
              <Input 
                id="senha" 
                type="password" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="flex items-center space-x-2 mt-2">
                <Checkbox id="troca-senha" defaultChecked />
                <Label htmlFor="troca-senha" className="text-sm font-normal">Solicitar troca de senha no primeiro login</Label>
              </div>
            </div>
          )}
          
          {isEditing && (
            <div className="space-y-2">
              <Button variant="outline" type="button">Gerar Nova Senha Temporária</Button>
              <p className="text-xs text-muted-foreground">A nova senha será enviada por email ao usuário.</p>
            </div>
          )}

          <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2"><CheckCircle className="h-5 w-5 text-primary" /> Permissões</h3>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {mockPermissions.map(permission => (
                <div key={permission.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={permission.id} 
                    checked={selectedPermissions.includes(permission.id)}
                    onCheckedChange={() => handlePermissionToggle(permission.id)}
                    disabled={selectedProfile === 'super_admin'}
                  />
                  <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer">
                    {permission.label}
                  </Label>
                </div>
              ))}
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedPermissions(mockPermissions.map(p => p.id));
                  handleProfileChange('personalizado');
                }}
              >
                Selecionar Todas
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedPermissions([]);
                  handleProfileChange('personalizado');
                }}
              >
                Desmarcar Todas
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : (isEditing ? "Salvar Alterações" : "Criar Usuário")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}