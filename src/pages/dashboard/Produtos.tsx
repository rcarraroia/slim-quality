import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockProdutos } from '@/data/mockData';
import { Edit, Trash2, Plus, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

export default function Produtos() {
  const [produtos] = useState(mockProdutos);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<typeof mockProdutos[0] | null>(null);

  const handleEdit = (produto: typeof mockProdutos[0]) => {
    setEditingProduto(produto);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduto(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Produtos</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de colchões</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {produtos.map((produto) => (
          <Card key={produto.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
              <CardTitle className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{produto.nome}</h3>
                  <p className="text-sm text-muted-foreground font-normal mt-1">
                    {produto.dimensoes.largura}x{produto.dimensoes.comprimento}x{produto.dimensoes.altura}cm
                  </p>
                </div>
                {produto.maisVendido && (
                  <Badge className="bg-success/10 text-success border-success/20">
                    Mais Vendido
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold text-primary">
                R$ {produto.preco.toLocaleString('pt-BR')}
              </p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">📊 Vendas este mês:</span>
                  <span className="font-medium">{produto.vendasMes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">📦 Em estoque:</span>
                  <span className="font-medium">{produto.estoque} unidades</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2"
                  onClick={() => handleEdit(produto)}
                >
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Produto</Label>
              <Input placeholder="Ex: Slim Quality Casal" />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Largura (cm)</Label>
                <Input type="number" placeholder="138" />
              </div>
              <div className="space-y-2">
                <Label>Comprimento (cm)</Label>
                <Input type="number" placeholder="188" />
              </div>
              <div className="space-y-2">
                <Label>Altura (cm)</Label>
                <Input type="number" placeholder="28" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input type="number" placeholder="3690" />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descrição do produto..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Estoque</Label>
              <Input type="number" placeholder="42" />
            </div>

            <div className="space-y-3">
              <Label>Status</Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="ativo" />
                  <label htmlFor="ativo" className="text-sm">Ativo</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="mais-vendido" />
                  <label htmlFor="mais-vendido" className="text-sm">Mais Vendido</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="destaque" />
                  <label htmlFor="destaque" className="text-sm">Em Destaque</label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
