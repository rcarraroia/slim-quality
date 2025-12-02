import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Eye, UserCheck, UserX, Download, PackageOpen } from "lucide-react";
import { supabase } from "@/config/supabase";
import { useToast } from "@/hooks/use-toast";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  created_at: string;
  status: string;
  level: number;
  available_balance: number;
  pending_balance: number;
  pix_key: string;
}

export default function ListaAfiliados() {
  const [afiliados, setAfiliados] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAfiliado, setSelectedAfiliado] = useState<Affiliate | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState({
    totalIndicados: 0,
    vendasGeradas: 0,
    comissoesTotais: 0
  });
  const { toast } = useToast();

  useEffect(() => {
    loadAfiliados();
  }, []);

  const loadAfiliados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAfiliados(data || []);
      
      // Carregar estatísticas
      await loadStats(data || []);
    } catch (error) {
      console.error('Erro ao carregar afiliados:', error);
      toast({
        title: "Erro ao carregar afiliados",
        description: "Não foi possível carregar a lista de afiliados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async (affiliates: Affiliate[]) => {
    try {
      // Buscar comissões pagas
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('status', 'paid');

      const comissoesTotais = commissions?.reduce((acc, c) => acc + c.amount, 0) || 0;

      // Buscar vendas geradas por afiliados
      const { count: vendasCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('affiliate_id', 'is', null);

      // Buscar total de indicados (referrals)
      const { count: indicadosCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalIndicados: indicadosCount || 0,
        vendasGeradas: vendasCount || 0,
        comissoesTotais
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const filteredAfiliados = afiliados.filter(afiliado => {
    const matchesStatus = statusFilter === "todos" || afiliado.status === statusFilter;
    const matchesSearch = 
      afiliado.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      afiliado.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = async (afiliadoId: string, newStatus: "active" | "inactive") => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: newStatus })
        .eq('id', afiliadoId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Afiliado ${newStatus === 'active' ? 'ativado' : 'desativado'} com sucesso.`,
      });

      loadAfiliados();
      setSelectedAfiliado(null);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do afiliado.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Afiliados</p>
              <p className="text-2xl font-bold">{loading ? "..." : afiliados.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Afiliados Ativos</p>
              <p className="text-2xl font-bold">
                {loading ? "..." : afiliados.filter(a => a.status === "active").length}
              </p>
            </div>
            <UserCheck className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Comissões Pagas</p>
              <p className="text-2xl font-bold">
                {loading ? "..." : `R$ ${stats.comissoesTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </p>
            </div>
            <Download className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Vendas Geradas</p>
              <p className="text-2xl font-bold">
                {loading ? "..." : stats.vendasGeradas}
              </p>
            </div>
            <Download className="h-8 w-8 text-secondary" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2" disabled={loading}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Tabela de Afiliados */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Afiliado</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Cadastro</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Saldo Disponível</TableHead>
              <TableHead>Saldo Pendente</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 animate-pulse" />
                  <p className="text-muted-foreground">Carregando afiliados...</p>
                </TableCell>
              </TableRow>
            ) : filteredAfiliados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <PackageOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum afiliado encontrado</h3>
                  <p className="text-muted-foreground">
                    {searchTerm || statusFilter !== 'todos'
                      ? 'Tente ajustar os filtros de busca'
                      : 'Nenhum afiliado cadastrado ainda'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredAfiliados.map((afiliado) => (
                <TableRow key={afiliado.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {afiliado.name?.split(" ").map(n => n[0]).join("") || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{afiliado.name || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">#{afiliado.id.slice(0, 8)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{afiliado.email || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{afiliado.phone || 'N/A'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(afiliado.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                      {afiliado.level || 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    R$ {(afiliado.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-medium text-yellow-600">
                    R$ {(afiliado.pending_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={afiliado.status as any} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedAfiliado(afiliado)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedAfiliado} onOpenChange={() => setSelectedAfiliado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Afiliado</DialogTitle>
            <DialogDescription>
              Informações completas e ações administrativas
            </DialogDescription>
          </DialogHeader>

          {selectedAfiliado && (
            <div className="space-y-6">
              {/* Informações Pessoais */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações Pessoais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome Completo</p>
                    <p className="font-medium">{selectedAfiliado.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">#{selectedAfiliado.id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedAfiliado.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedAfiliado.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade</p>
                    <p className="font-medium">{selectedAfiliado.city || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                    <p className="font-medium">
                      {new Date(selectedAfiliado.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Métricas de Performance */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Nível Atual</p>
                    <p className="text-2xl font-bold text-primary">{selectedAfiliado.level || 1}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div className="mt-2">
                      <StatusBadge status={selectedAfiliado.status as any} />
                    </div>
                  </Card>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Financeiro</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {(selectedAfiliado.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Pendente</p>
                    <p className="text-xl font-bold text-yellow-600">
                      R$ {(selectedAfiliado.pending_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chave PIX</p>
                    <p className="font-medium">{selectedAfiliado.pix_key || 'Não cadastrada'}</p>
                  </div>
                </div>
              </div>

              {/* Ações Administrativas */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedAfiliado.status === "active" ? (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleStatusChange(selectedAfiliado.id, "inactive")}
                  >
                    <UserX className="h-4 w-4" />
                    Desativar Afiliado
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => handleStatusChange(selectedAfiliado.id, "active")}
                  >
                    <UserCheck className="h-4 w-4" />
                    Ativar Afiliado
                  </Button>
                )}
                <Button variant="outline">Ver Histórico Completo</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
