import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag as TagIcon, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { tagFrontendService, type Tag, type TagStats } from '@/services/frontend/tag-frontend.service';
import { toast } from 'sonner';

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    category: '',
    description: ''
  });

  useEffect(() => {
    loadTags();
    loadStats();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const result = await tagFrontendService.getTags({ limit: 100 });
      setTags(result.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
      toast.error('Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await tagFrontendService.getTagStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleOpenModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color,
        category: tag.category || '',
        description: tag.description || ''
      });
    } else {
      setEditingTag(null);
      setFormData({
        name: '',
        color: '#3B82F6',
        category: '',
        description: ''
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Nome da tag é obrigatório');
      return;
    }
    
    try {
      if (editingTag) {
        await tagFrontendService.updateTag(editingTag.id, formData);
        toast.success('Tag atualizada com sucesso');
      } else {
        await tagFrontendService.createTag(formData);
        toast.success('Tag criada com sucesso');
      }
      
      setModalOpen(false);
      loadTags();
      loadStats();
    } catch (error) {
      console.error('Erro ao salvar tag:', error);
      toast.error('Erro ao salvar tag');
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tag? Esta ação não pode ser desfeita.')) return;
    
    try {
      await tagFrontendService.deleteTag(id);
      toast.success('Tag excluída com sucesso');
      loadTags();
      loadStats();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
      toast.error('Erro ao excluir tag');
    }
  };

  const colors = tagFrontendService.getDefaultColors();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Gestão de Tags</h1>
        <p className="text-muted-foreground">
          {tags.length} tag(s) cadastrada(s)
        </p>
      </div>

      {/* Ações */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Tag
          </Button>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tags</CardTitle>
            <TagIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
            <p className="text-xs text-muted-foreground">tags cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tags Mais Usadas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.length > 0 ? Math.max(...stats.map(s => s.customer_count)) : 0}
            </div>
            <p className="text-xs text-muted-foreground">clientes na tag mais popular</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atribuições</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.reduce((acc, s) => acc + s.customer_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">tags atribuídas no total</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Tags */}
      {stats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags Mais Utilizadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {stats.slice(0, 8).map(stat => (
                <div key={stat.tag_id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="font-medium text-sm">{stat.tag_name}</span>
                  </div>
                  <p className="text-2xl font-bold">{stat.customer_count}</p>
                  <p className="text-xs text-muted-foreground">clientes</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Tags */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Todas as Tags</h2>
        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : tags.length === 0 ? (
          <p className="text-center text-muted-foreground">Nenhuma tag cadastrada</p>
        ) : (
          <div className="space-y-2">
            {tags.map(tag => {
              const tagStat = stats.find(s => s.tag_id === tag.id);
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{tag.name}</p>
                      {tag.category && (
                        <p className="text-sm text-muted-foreground">{tag.category}</p>
                      )}
                    </div>
                    {tagStat && (
                      <Badge variant="secondary">
                        {tagStat.customer_count} cliente(s)
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(tag)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal de Criar/Editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Editar Tag' : 'Nova Tag'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Cliente VIP, Lead Qualificado..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Status, Origem, Comportamento..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva quando esta tag deve ser usada..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="grid grid-cols-8 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color
                        ? 'border-black scale-110'
                        : 'border-gray-200 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Label htmlFor="custom-color" className="text-sm">Cor personalizada:</Label>
                <input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">{formData.color}</span>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <Badge
                style={{
                  backgroundColor: formData.color + '20',
                  borderColor: formData.color,
                  color: formData.color
                }}
                variant="outline"
              >
                {formData.name || 'Nome da Tag'}
              </Badge>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {editingTag ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
