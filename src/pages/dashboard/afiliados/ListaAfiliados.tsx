import { useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Eye, UserCheck, UserX, Download, Loader2 } from "lucide-react";
import { useAdminAffiliates } from "@/hooks/useAdminAffiliates";

interface Afiliado {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  dataCadastro: string;
  status: "ativo" | "pendente" | "inativo";
  nivel: number;
  totalIndicados: number;
  vendasGeradas: number;
  comissoesTotais: number;
  saldoDisponivel: number;
  pixChave: string;
}

export default function ListaAfiliados() {
  const { affiliatesTable, loading, error } = useAdminAffiliates();
  const [selectedAfiliado, setSelectedAfiliado] = useState<Afiliado | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");

  // Convert API data to component format
  const afiliadosData: Afiliado[] = (affiliatesTable as any[])?.map((affiliate: any) => ({
    id: affiliate.id,
    nome: affiliate.name,
    email: affiliate.email,
    telefone: affiliate.phone || '',
    cidade: affiliate.city || '',
    dataCadastro: new Date(affiliate.createdAt).toLocaleDateString('pt-BR'),
    status: affiliate.status === 'active' ? 'ativo' : affiliate.status === 'pending' ? 'pendente' : 'inativo',
    nivel: affiliate.level || 1,
    totalIndicados: affiliate.totalReferrals || 0,
    vendasGeradas: affiliate.totalSales || 0,
    comissoesTotais: (affiliate.totalCommissions || 0) / 100,
    saldoDisponivel: (affiliate.availableBalance || 0) / 100,
    pixChave: affiliate.pixKey || '',
  })) || [];

  const filteredAfiliados = afiliadosData.filter(afiliado => {
    const matchesStatus = statusFilter === "todos" || afiliado.status === statusFilter;
    const matchesSearch = afiliado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         afiliado.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = (afiliadoId: string, newStatus: "ativo" | "inativo") => {
    console.log(`Alterando status do afiliado ${afiliadoId} para ${newStatus}`);
    // Aqui virá a lógica real de atualização
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Afiliados</p>
              <p className="text-2xl font-bold">{afiliadosData.length}</p>
            </div>
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Afiliados Ativos</p>
              <p className="text-2xl font-bold">
                {afiliadosData.filter(a => a.status === "ativo").length}
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
                R$ {afiliadosData.reduce((acc, a) => acc + a.comissoesTotais, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                {afiliadosData.reduce((acc, a) => acc + a.vendasGeradas, 0)}
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
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
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
              <TableHead>Indicados</TableHead>
              <TableHead>Vendas</TableHead>
              <TableHead>Comissões</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAfiliados.map((afiliado) => (
              <TableRow key={afiliado.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback>
                        {afiliado.nome.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{afiliado.nome}</p>
                      <p className="text-sm text-muted-foreground">{afiliado.id}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{afiliado.email}</p>
                    <p className="text-xs text-muted-foreground">{afiliado.telefone}</p>
                  </div>
                </TableCell>
                <TableCell>{afiliado.dataCadastro}</TableCell>
                <TableCell>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                    {afiliado.nivel}
                  </span>
                </TableCell>
                <TableCell>{afiliado.totalIndicados}</TableCell>
                <TableCell>{afiliado.vendasGeradas}</TableCell>
                <TableCell className="font-medium">
                  R$ {afiliado.comissoesTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <StatusBadge status={afiliado.status} />
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
            ))}
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
                    <p className="font-medium">{selectedAfiliado.nome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">{selectedAfiliado.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedAfiliado.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{selectedAfiliado.telefone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cidade</p>
                    <p className="font-medium">{selectedAfiliado.cidade}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Cadastro</p>
                    <p className="font-medium">{selectedAfiliado.dataCadastro}</p>
                  </div>
                </div>
              </div>

              {/* Métricas de Performance */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Nível Atual</p>
                    <p className="text-2xl font-bold text-primary">{selectedAfiliado.nivel}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total Indicados</p>
                    <p className="text-2xl font-bold">{selectedAfiliado.totalIndicados}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Vendas Geradas</p>
                    <p className="text-2xl font-bold">{selectedAfiliado.vendasGeradas}</p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold">
                      {selectedAfiliado.totalIndicados > 0
                        ? ((selectedAfiliado.vendasGeradas / selectedAfiliado.totalIndicados) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </Card>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Financeiro</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Comissões Totais</p>
                    <p className="text-xl font-bold text-green-600">
                      R$ {selectedAfiliado.comissoesTotais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo Disponível</p>
                    <p className="text-xl font-bold text-primary">
                      R$ {selectedAfiliado.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Chave PIX</p>
                    <p className="font-medium">{selectedAfiliado.pixChave}</p>
                  </div>
                </div>
              </div>

              {/* Ações Administrativas */}
              <div className="flex gap-3 pt-4 border-t">
                {selectedAfiliado.status === "ativo" ? (
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => handleStatusChange(selectedAfiliado.id, "inativo")}
                  >
                    <UserX className="h-4 w-4" />
                    Desativar Afiliado
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => handleStatusChange(selectedAfiliado.id, "ativo")}
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
