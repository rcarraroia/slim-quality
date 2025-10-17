import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Lock, CheckCircle } from "lucide-react";

interface UserData {
  id?: number;
  nome: string;
  email: string;
  cargo: string;
  status: 'ativo' | 'inativo' | 'bloqueado';
}

interface UserManagementModalProps {
  user: UserData | null;
  isOpen: boolean;
  onClose: () => void;
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
  Admin: mockPermissions.map(p => p.id),
  Vendedor: ['dashboard', 'conversas', 'clientes', 'agendamentos', 'produtos'],
  Suporte: ['dashboard', 'conversas', 'produtos', 'clientes', 'analytics'],
  Financeiro: ['dashboard', 'vendas', 'afiliados', 'analytics'],
  Personalizado: [],
};

export function UserManagementModal({ user, isOpen, onClose }: UserManagementModalProps) {
  const { toast } = useToast();
  const isEditing = !!user;
  const [formData, setFormData] = useState<UserData>(user || { nome: '', email: '', cargo: 'Vendedor', status: 'ativo' });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(isEditing ? rolePermissions[user.cargo] || [] : rolePermissions['Vendedor']);
  const [selectedProfile, setSelectedProfile] = useState(isEditing ? user.cargo : 'Vendedor');

  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    setFormData(prev => ({ ...prev, cargo: profile }));
    if (profile !== 'Personalizado') {
      setSelectedPermissions(rolePermissions[profile] || []);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId) 
        ? prev.filter(id => id !== permissionId) 
        : [...prev, permissionId]
    );
    setSelectedProfile('Personalizado');
    setFormData(prev => ({ ...prev, cargo: 'Personalizado' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulação de salvamento
    toast({
      title: isEditing ? "Usuário Atualizado" : "Usuário Criado",
      description: `O usuário ${formData.nome} foi salvo com sucesso.`,
      action: <CheckCircle className="h-4 w-4 text-success" />,
    });
    onClose();
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
              <Input id="nome" required defaultValue={user?.nome} onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" required defaultValue={user?.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo <span className="text-destructive">*</span></Label>
              <Select value={formData.cargo} onValueChange={handleProfileChange}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder="Selecione o cargo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(rolePermissions).map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as UserData['status'] }))}>
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
              <Input id="senha" type="password" placeholder="••••••••" required />
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
                    disabled={selectedProfile === 'Admin'}
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
                  handleProfileChange('Personalizado');
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
                  handleProfileChange('Personalizado');
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
            <Button type="submit">
              {isEditing ? "Salvar Alterações" : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}