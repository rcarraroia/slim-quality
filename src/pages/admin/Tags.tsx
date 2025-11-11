import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { tagFrontendService, type Tag, type TagStats } from '@/services/frontend/tag-frontend.service';

export default function Tags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [stats, setStats] = useState<TagStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [newTag, setNewTag] = useState({ name: '', color: '#3B82F6', category: '' });

  useEffect(() => {
    loadTags();
    loadStats();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const data = await tagFrontendService.getTags();
      setTags(data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
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

  const handleCreateTag = async () => {
    if (!newTag.name) return;
    
    try {
      await tagFrontendService.createTag(newTag);
      setNewTag({ name: '', color: '#3B82F6', category: '' });
      loadTags();
      loadStats();
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tag?')) return;
    
    try {
      await tagFrontendService.deleteTag(id);
      loadTags();
      loadStats();
    } catch (error) {
      console.error('Erro ao excluir tag:', error);
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

      {/* Criar Nova Tag */}
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Nova Tag</h2>
        <div className="flex gap-4">
          <Input
            placeholder="Nome da tag"
            value={newTag.name}
            onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
            className="flex-1"
          />
          <Input
            placeholder="Categoria (opcional)"
            value={newTag.category}
            onChange={(e) => setNewTag({ ...newTag, category: e.target.value })}
            className="w-48"
          />
          <div className="flex gap-2">
            {colors.slice(0, 5).map(color => (
              <button
                key={color}
                className={`w-8 h-8 rounded-full border-2 ${
                  newTag.color === color ? 'border-black' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setNewTag({ ...newTag, color })}
              />
            ))}
          </div>
          <Button onClick={handleCreateTag}>
            <Plus className="h-4 w-4 mr-2" />
            Criar
          </Button>
        </div>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-4 gap-4">
        {stats.slice(0, 8).map(stat => (
          <Card key={stat.tag_id} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Badge style={{ borderColor: stat.color, color: stat.color }} variant="outline">
                {stat.tag_name}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{stat.customer_count}</p>
            <p className="text-sm text-muted-foreground">clientes</p>
          </Card>
        ))}
      </div>

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
                    <Button variant="ghost" size="sm">
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
    </div>
  );
}
