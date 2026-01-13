import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Plus, Package, Upload, X } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { toast } from 'sonner';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price_cents: number;
  width_cm: number;
  length_cm: number;
  height_cm: number;
  weight_kg: number | null;
  product_type: string;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  product_images?: { image_url: string }[];
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    dimensions: '',
    weight: '',
    product_type: 'mattress',
    status: 'active',
    featured: false,
    display_order: '0'
  });

  useEffect(() => {
    loadProdutos();
  }, []);

  const loadProdutos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_images(image_url)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProdutos(data || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (produto: Product) => {
    setEditingProduto(produto);
    setFormData({
      name: produto.name,
      sku: produto.sku,
      description: produto.description || '',
      price: (produto.price_cents / 100).toString(),
      dimensions: `${produto.width_cm}x${produto.length_cm}x${produto.height_cm}cm`,
      weight: produto.weight_kg?.toString() || '',
      product_type: produto.product_type || 'mattress',
      status: produto.is_active ? 'active' : 'inactive',
      featured: produto.is_featured,
      display_order: produto.display_order.toString()
    });
    // Limpar imagens do modal anterior
    setImageFiles([]);
    setImagePreviews([]);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingProduto(null);
    setFormData({
      name: '',
      sku: '',
      description: '',
      price: '',
      dimensions: '',
      weight: '',
      product_type: 'mattress',
      status: 'active',
      featured: false,
      display_order: '0'
    });
    setImageFiles([]);
    setImagePreviews([]);
    setIsModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImageFiles(prev => [...prev, ...files]);

    // Criar previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (productId: string, isUpdate: boolean = false) => {
    // Se for atualização, remover imagens antigas primeiro
    if (isUpdate) {
      // 1. Buscar imagens antigas do banco
      const { data: oldImages } = await supabase
        .from('product_images')
        .select('image_url')
        .eq('product_id', productId);

      // 2. Deletar arquivos do storage
      if (oldImages && oldImages.length > 0) {
        for (const img of oldImages) {
          // Extrair o caminho do arquivo da URL
          const urlParts = img.image_url.split('/product-images/');
          if (urlParts.length > 1) {
            const filePath = urlParts[1];
            await supabase.storage
              .from('product-images')
              .remove([filePath]);
          }
        }
      }

      // 3. Deletar registros do banco
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
    }

    // Upload das novas imagens
    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    // Salvar URLs no banco
    for (const url of uploadedUrls) {
      await supabase.from('product_images').insert({
        product_id: productId,
        image_url: url,
        is_primary: uploadedUrls.indexOf(url) === 0
      });
    }
  };

  const handleSave = async () => {
    try {
      setUploading(true);

      // Converter dimensões do formato "138x188x28cm" para campos separados
      let width_cm = 138, length_cm = 188, height_cm = 28;
      
      if (formData.dimensions && formData.dimensions.trim()) {
        const dimensions = formData.dimensions.split('x');
        width_cm = dimensions[0] ? parseFloat(dimensions[0]) : 138;
        length_cm = dimensions[1] ? parseFloat(dimensions[1]) : 188;
        height_cm = dimensions[2] ? parseFloat(dimensions[2].replace('cm', '')) : 28;
      }

      const productData = {
        name: formData.name,
        sku: formData.sku || `COL-${Date.now().toString(36).toUpperCase()}`, // Gerar SKU se não fornecido
        description: formData.description || null,
        price_cents: Math.round(parseFloat(formData.price) * 100), // Converter para centavos
        width_cm,
        length_cm,
        height_cm,
        weight_kg: formData.weight ? parseFloat(formData.weight) : null,
        product_type: formData.product_type,
        is_active: formData.status === 'active',
        is_featured: formData.featured,
        display_order: parseInt(formData.display_order) || 0
      };

      if (editingProduto) {
        // Atualizar
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduto.id);

        if (error) throw error;

        // Upload de novas imagens
        if (imageFiles.length > 0) {
          await uploadImages(editingProduto.id, true); // true = é atualização
        }

        toast.success('Produto atualizado com sucesso!');
      } else {
        // Criar
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        // Upload de imagens
        if (imageFiles.length > 0) {
          await uploadImages(data.id);
        }

        toast.success('Produto criado com sucesso!');
      }

      setIsModalOpen(false);
      loadProdutos();
      
      // Disparar evento para atualizar outras páginas
      window.dispatchEvent(new CustomEvent('productsUpdated'));
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso!');
      loadProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Produtos</h2>
          <p className="text-muted-foreground">Gerencie o catálogo de produtos</p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      {/* Grid de Produtos */}
      {produtos.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece adicionando seu primeiro produto
              </p>
              <Button onClick={handleAddNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Produto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {produtos.map((produto) => (
            <Card key={produto.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                  {produto.product_images && produto.product_images.length > 0 ? (
                    <img 
                      src={produto.product_images[0].image_url} 
                      alt={produto.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
                <CardTitle className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{produto.name}</h3>
                    <p className="text-sm text-muted-foreground font-normal mt-1">
                      SKU: {produto.sku}
                    </p>
                    <p className="text-sm text-muted-foreground font-normal">
                      {produto.width_cm}x{produto.length_cm}x{produto.height_cm}cm
                      {produto.weight_kg && ` • ${produto.weight_kg}kg`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    {produto.is_active && (
                      <Badge className="bg-success/10 text-success border-success/20">
                        Ativo
                      </Badge>
                    )}
                    {produto.is_featured && (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                        Destaque
                      </Badge>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold text-primary">
                  R$ {(produto.price_cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">📏 Dimensões:</span>
                    <span className="font-medium">{produto.width_cm}x{produto.length_cm}x{produto.height_cm}cm</span>
                  </div>
                  {produto.weight_kg && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">⚖️ Peso:</span>
                      <span className="font-medium">{produto.weight_kg}kg</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">📦 SKU:</span>
                    <span className="font-medium font-mono text-xs">{produto.sku}</span>
                  </div>
                  {produto.display_order > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">🔢 Ordem:</span>
                      <span className="font-medium">{produto.display_order}</span>
                    </div>
                  )}
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
                    onClick={() => handleDelete(produto.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Edição/Criação */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Produto *</Label>
              <Input 
                placeholder="Ex: Slim Quality Casal" 
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SKU (Código do Produto)</Label>
                <Input 
                  placeholder="Ex: COL-CASAL-001" 
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Deixe vazio para gerar automaticamente
                </p>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Produto *</Label>
                <Select 
                  value={formData.product_type}
                  onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mattress">Colchão</SelectItem>
                    <SelectItem value="pillow">Travesseiro</SelectItem>
                    <SelectItem value="accessory">Acessório</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            <div className="space-y-2">
              <Label>Dimensões</Label>
              <Input 
                placeholder="Ex: 138x188x28cm" 
                value={formData.dimensions}
                onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Formato livre - adapte conforme o tipo de produto
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Preço (R$) *</Label>
                <Input 
                  type="number" 
                  placeholder="3690" 
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Peso (kg)</Label>
                <Input 
                  type="number" 
                  step="0.1"
                  placeholder="25.5" 
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea 
                placeholder="Descrição do produto..."
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ordem de Exibição</Label>
                <Input 
                  type="number" 
                  placeholder="0" 
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="featured"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="featured">Produto em Destaque</Label>
              <p className="text-xs text-muted-foreground ml-2">
                Aparecerá em seções especiais do site
              </p>
            </div>

            {/* Upload de Imagens */}
            <div className="space-y-2">
              <Label>Imagens do Produto</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                  id="image-upload"
                />
                <label 
                  htmlFor="image-upload"
                  className="flex flex-col items-center justify-center cursor-pointer"
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique para fazer upload de imagens
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG até 5MB
                  </p>
                </label>
              </div>

              {/* Preview de Imagens */}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={preview} 
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsModalOpen(false)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={uploading || !formData.name || !formData.price}
            >
              {uploading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
