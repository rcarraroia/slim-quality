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
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Search, Eye, Check, X, Wallet, Clock, TrendingDown } from "lucide-react";

// Mock data de saques para admin
const mockSaquesAdmin = [
  {
    id: "S001",
    afiliadoId: "A001",
    afiliadoNome: "Carlos Mendes",
    valor: 3200.00,
    pixChave: "carlos.mendes@email.com",
    tipoChave: "Email",
    status: "pendente" as const,
    dataSolicitacao: "14/Out/25",
    dataProcessamento: null,
    comprovante: null,
  },
  {
    id: "S002",
    afiliadoId: "A002",
    afiliadoNome: "Juliana Santos",
    valor: 2100.00,
    pixChave: "11988887777",
    tipoChave: "Celular",
    status: "aprovado" as const,
    dataSolicitacao: "13/Out/25",
    dataProcessamento: "14/Out/25",
    comprovante: "comprovante_s002.pdf",
  },
  {
    id: "S003",
    afiliadoId: "A004",
    afiliadoNome: "Fernanda Costa",
    valor: 1200.00,
    pixChave: "31966665555",
    tipoChave: "Celular",
    status: "pendente" as const,
    dataSolicitacao: "14/Out/25",
    dataProcessamento: null,
    comprovante: null,
  },
  {
    id: "S004",
    afiliadoId: "A006",
    afiliadoNome: "Amanda Silva",
    valor: 4500.00,
    pixChave: "amanda.silva@email.com",
    tipoChave: "Email",
    status: "processando" as const,
    dataSolicitacao: "12/Out/25",
    dataProcessamento: null,
    comprovante: null,
  },
  {
    id: "S005",
    afiliadoId: "A001",
    afiliadoNome: "Carlos Mendes",
    valor: 5000.00,
    pixChave: "carlos.mendes@email.com",
    tipoChave: "Email",
    status: "aprovado" as const,
    dataSolicitacao: "08/Out/25",
    dataProcessamento: "09/Out/25",
    comprovante: "comprovante_s005.pdf",
  },
  {
    id: "S006",
    afiliadoId: "A003",
    afiliadoNome: "Roberto Oliveira",
    valor: 429.00,
    pixChave: "roberto.oliveira@email.com",
    tipoChave: "Email",
    status: "rejeitado" as const,
    dataSolicitacao: "10/Out/25",
    dataProcessamento: "11/Out/25",
    comprovante: null,
    motivoRejeicao: "Saldo insuficiente para processamento",
  },
];

export default function Solicitacoes() {
  const [selectedSaque, setSelectedSaque] = useState<typeof mockSaquesAdmin[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const filteredSaques = mockSaquesAdmin.filter(saque => {
    const matchesStatus = statusFilter === "todos" || saque.status === statusFilter;
    const matchesSearch = saque.afiliadoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         saque.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalPendente = filteredSaques
    .filter(s => s.status === "pendente")
    .reduce((acc, s) => acc + s.valor, 0);

  const totalProcessado = filteredSaques
    .filter(s => s.status === "aprovado")
    .reduce((acc, s) => acc + s.valor, 0);

  const handleAprovar = (saqueId: string) => {
    console.log(`Aprovando solicitação ${saqueId}`);
    // Aqui virá a lógica real de aprovação
  };

  const handleRejeitar = (saqueId: string, motivo: string) => {
    console.log(`Rejeitando solicitação ${saqueId} com motivo: ${motivo}`);
    // Aqui virá a lógica real de rejeição
    setShowRejectDialog(false);
    setRejectReason("");
    setSelectedSaque(null);
  };

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Solicitações</p>
              <p className="text-2xl font-bold">{mockSaquesAdmin.length}</p>
            </div>
            <Wallet className="h-8 w-8 text-primary" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
              <p className="text-2xl font-bold text-warning">
                {mockSaquesAdmin.filter(s => s.status === "pendente").length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Pendente</p>
              <p className="text-2xl font-bold text-warning">
                R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-warning" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Processado</p>
              <p className="text-2xl font-bold text-success">
                R$ {totalProcessado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <Check className="h-8 w-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por afiliado ou ID..."
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
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="processando">Processando</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
              <SelectItem value="rejeitado">Rejeitado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela de Saques */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Afiliado</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Chave PIX</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Data Solicitação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSaques.map((saque) => (
              <TableRow key={saque.id}>
                <TableCell className="font-medium">{saque.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{saque.afiliadoNome}</p>
                    <p className="text-xs text-muted-foreground">{saque.afiliadoId}</p>
                  </div>
                </TableCell>
                <TableCell className="font-bold text-success">
                  R$ {saque.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {saque.pixChave}
                  </code>
                </TableCell>
                <TableCell>{saque.tipoChave}</TableCell>
                <TableCell>{saque.dataSolicitacao}</TableCell>
                <TableCell>
                  <StatusBadge status={saque.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {saque.status === "pendente" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleAprovar(saque.id)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSaque(saque);
                            setShowRejectDialog(true);
                          }}
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedSaque(saque)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedSaque && !showRejectDialog} onOpenChange={() => setSelectedSaque(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Informações completas da solicitação {selectedSaque?.id}
            </DialogDescription>
          </DialogHeader>

          {selectedSaque && (
            <div className="space-y-6">
              {/* Informações do Afiliado */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Afiliado</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nome</p>
                    <p className="font-medium">{selectedSaque.afiliadoNome}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ID do Afiliado</p>
                    <p className="font-medium">{selectedSaque.afiliadoId}</p>
                  </div>
                </div>
              </div>

              {/* Informações do Saque */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Informações do Saque</h3>
                <Card className="p-4 bg-muted/50">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-muted-foreground">Valor Solicitado:</span>
                      <span className="text-2xl font-bold text-green-600">
                        R$ {selectedSaque.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo de Chave:</span>
                      <span className="font-medium">{selectedSaque.tipoChave}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Chave PIX:</span>
                      <code className="bg-background px-2 py-1 rounded text-sm">
                        {selectedSaque.pixChave}
                      </code>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Status e Datas */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Status e Datas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status Atual</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedSaque.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Solicitação</p>
                    <p className="font-medium">{selectedSaque.dataSolicitacao}</p>
                  </div>
                  {selectedSaque.dataProcessamento && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Processamento</p>
                      <p className="font-medium">{selectedSaque.dataProcessamento}</p>
                    </div>
                  )}
                  {selectedSaque.comprovante && (
                    <div>
                      <p className="text-sm text-muted-foreground">Comprovante</p>
                      <Button variant="link" className="h-auto p-0">
                        {selectedSaque.comprovante}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Motivo de Rejeição (se aplicável) */}
              {selectedSaque.status === "rejeitado" && selectedSaque.motivoRejeicao && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Motivo da Rejeição</h3>
                  <Card className="p-4 bg-destructive/10 border-destructive/20">
                    <p className="text-sm">{selectedSaque.motivoRejeicao}</p>
                  </Card>
                </div>
              )}

              {/* Ações */}
              {selectedSaque.status === "pendente" && (
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      handleAprovar(selectedSaque.id);
                      setSelectedSaque(null);
                    }}
                  >
                    <Check className="h-4 w-4" />
                    Aprovar e Processar Saque
                  </Button>
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <X className="h-4 w-4" />
                    Rejeitar Solicitação
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação de Saque</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição para o afiliado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo da Rejeição</label>
              <Textarea
                placeholder="Ex: Saldo insuficiente, documentação pendente, dados bancários incorretos..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedSaque && handleRejeitar(selectedSaque.id, rejectReason)}
                disabled={!rejectReason.trim()}
              >
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}