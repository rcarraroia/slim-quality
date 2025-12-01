import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, MessageCircle, Calendar, Edit, User, ShoppingCart, Clock, MapPin } from "lucide-react";
import { StatusBadge, StatusType } from "@/components/dashboard/StatusBadge"; // Importando StatusType

interface Compra {
  data: string;
  produto: string;
  valor: number;
  status: string;
}

interface Cliente {
  id: number;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  status: 'ativo' | 'inativo' | 'lead';
  origem: string;
  ultimaCompra: string;
  ltv: number;
  cpf: string;
  dataNascimento: string;
  endereco: string;
  compras: Compra[];
  observacoes: string;
}

interface ClienteDetailModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (cliente: Cliente) => void;
  onSchedule: (cliente: Cliente) => void;
}

const mockConversas = [
  { data: "12/Out/25 10:34", tipo: "WhatsApp", mensagem: "Gostaria de comprar um Queen...", link: "#" },
  { data: "10/Abr/24 14:20", tipo: "Site", mensagem: "Qual a diferença entre Casal e Queen?", link: "#" },
];

export function ClienteDetailModal({ cliente, isOpen, onClose, onEdit, onSchedule }: ClienteDetailModalProps) {
  if (!cliente) return null;

  const handleEdit = () => {
    onEdit(cliente);
    onClose();
  };

  const handleSchedule = () => {
    onSchedule(cliente);
    onClose();
  };

  const handleSendMessage = () => {
    const encodedMessage = encodeURIComponent(`Olá ${cliente.nome}!`);
    window.open(`https://wa.me/55${cliente.telefone.replace(/\D/g, '')}?text=${encodedMessage}`, '_blank');
  };

  const totalGasto = cliente.compras.reduce((sum, c) => sum + c.valor, 0);
  const ticketMedio = cliente.compras.length > 0 ? totalGasto / cliente.compras.length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Cliente #{cliente.id} - {cliente.nome}</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="geral" className="gap-2"><User className="h-4 w-4" /> Geral</TabsTrigger>
            <TabsTrigger value="compras" className="gap-2"><ShoppingCart className="h-4 w-4" /> Compras</TabsTrigger>
            <TabsTrigger value="conversas" className="gap-2"><MessageCircle className="h-4 w-4" /> Conversas</TabsTrigger>
            <TabsTrigger value="observacoes" className="gap-2"><Clock className="h-4 w-4" /> Observações</TabsTrigger>
          </TabsList>

          {/* Aba 1: Informações Gerais */}
          <TabsContent value="geral" className="space-y-6 pt-4">
            <div className="grid grid-cols-3 gap-6">
              <Card className="col-span-2">
                <CardContent className="p-6 space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">📋 Dados Pessoais</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Nome:</p><p className="font-medium">{cliente.nome}</p></div>
                    <div><p className="text-muted-foreground">CPF:</p><p className="font-medium">{cliente.cpf || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">Email:</p><p className="font-medium">{cliente.email}</p></div>
                    <div><p className="text-muted-foreground">Telefone:</p><p className="font-medium">{cliente.telefone}</p></div>
                    <div><p className="text-muted-foreground">Data Nasc:</p><p className="font-medium">{cliente.dataNascimento || 'N/A'}</p></div>
                    <div><p className="text-muted-foreground">WhatsApp:</p><p className="font-medium text-success">Sim</p></div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6 space-y-4">
                  <h4 className="font-semibold text-lg border-b pb-2">🏷️ Status</h4>
                  <div className="space-y-2 text-sm">
                    <div><p className="text-muted-foreground">Status:</p><StatusBadge status={cliente.status as StatusType} /></div>
                    <div><p className="text-muted-foreground">Origem:</p><p className="font-medium">{cliente.origem}</p></div>
                    <div><p className="text-muted-foreground">Cadastro:</p><p className="font-medium">10/Abr/2024</p></div>
                    <div><p className="text-muted-foreground">Última Interação:</p><p className="font-medium">12/Out/2025</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <h4 className="font-semibold text-lg border-b pb-2">📍 Endereço</h4>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{cliente.endereco} - {cliente.cidade}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 2: Histórico de Compras */}
          <TabsContent value="compras" className="space-y-6 pt-4">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-semibold text-lg mb-4">Histórico de Compras ({cliente.compras.length})</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-sm">Data</th>
                        <th className="text-left p-3 font-medium text-sm">Produto</th>
                        <th className="text-left p-3 font-medium text-sm">Valor</th>
                        <th className="text-left p-3 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cliente.compras.map((compra, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                          <td className="p-3 text-sm">{compra.data}</td>
                          <td className="p-3 text-sm font-medium">{compra.produto}</td>
                          <td className="p-3 text-sm font-bold text-primary">R$ {compra.valor.toLocaleString('pt-BR')}</td>
                          <td className="p-3 text-sm"><Badge variant="secondary">{compra.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-muted-foreground">Total Gasto (LTV)</p>
                  <p className="text-3xl font-bold text-primary">R$ {totalGasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ticket Médio</p>
                  <p className="text-3xl font-bold">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Frequência</p>
                  <p className="text-3xl font-bold">{cliente.compras.length}x</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba 3: Conversas */}
          <TabsContent value="conversas" className="space-y-4 pt-4">
            <h4 className="font-semibold text-lg">Timeline de Conversas</h4>
            {mockConversas.map((conversa, index) => (
              <Card key={index} className="p-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{conversa.tipo} - {conversa.data}</p>
                    <p className="text-muted-foreground text-sm mt-1">"{conversa.mensagem}"</p>
                  </div>
                  <Button variant="link" size="sm">Ver conversa completa</Button>
                </div>
              </Card>
            ))}
            {mockConversas.length === 0 && <p className="text-muted-foreground">Nenhuma conversa registrada.</p>}
          </TabsContent>

          {/* Aba 4: Observações */}
          <TabsContent value="observacoes" className="space-y-4 pt-4">
            <h4 className="font-semibold text-lg">Anotações Internas</h4>
            <Textarea 
              defaultValue={cliente.observacoes}
              rows={6}
              placeholder="Adicione observações sobre o cliente..."
            />
            <Button size="sm">Salvar Observações</Button>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button variant="secondary" onClick={handleSchedule} className="gap-2">
            <Calendar className="h-4 w-4" /> Agendar Follow-up
          </Button>
          <Button variant="default" onClick={handleSendMessage} className="gap-2">
            <MessageCircle className="h-4 w-4" /> Enviar Mensagem
          </Button>
          <Button onClick={handleEdit} className="gap-2">
            <Edit className="h-4 w-4" /> Editar Cliente
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}