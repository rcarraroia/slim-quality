// FAQ Management System - Main Management Component
// Created: 06/01/2026
// Author: Kiro AI

import { useState, useEffect } from 'react';
import { FAQ, FAQFilters } from '@/types/faq.types';
import { faqService } from '@/services/faq.service';
import { FaqCard } from './FaqCard';
import { FaqModal } from './FaqModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, HelpCircle, CheckCircle, XCircle, BarChart3 } from 'lucide-react';

export function FaqManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FAQFilters>({ page: 1, limit: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getAllFAQs(filters);
      setFaqs(response.data);
      setTotalPages(Math.ceil(response.total / (filters.limit || 10)));
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
      toast({
        title: "Erro ao carregar FAQs",
        description: "Não foi possível carregar a lista de FAQs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await faqService.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  useEffect(() => {
    loadFaqs();
  }, [filters]);

  useEffect(() => {
    loadStats();
  }, [faqs]);

  const handleCreateFaq = () => {
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  const handleEditFaq = (faq: FAQ) => {
    setEditingFaq(faq);
    setIsModalOpen(true);
  };

  const handleDeleteFaq = async (id: string, question: string) => {
    if (confirm(`Tem certeza que deseja excluir a FAQ: "${question}"?`)) {
      try {
        await faqService.deleteFAQ(id);
        toast({
          title: "FAQ excluída",
          description: "A FAQ foi excluída com sucesso",
        });
        loadFaqs();
      } catch (error) {
        console.error('Erro ao excluir FAQ:', error);
        toast({
          title: "Erro ao excluir FAQ",
          description: "Não foi possível excluir a FAQ",
          variant: "destructive",
        });
      }
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await faqService.toggleFAQStatus(id, !currentStatus);
      toast({
        title: "Status alterado",
        description: `FAQ ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`,
      });
      loadFaqs();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro ao alterar status",
        description: "Não foi possível alterar o status da FAQ",
        variant: "destructive",
      });
    }
  };

  const handleReorder = async (dragIndex: number, hoverIndex: number) => {
    const draggedFaq = faqs[dragIndex];
    const newFaqs = [...faqs];
    newFaqs.splice(dragIndex, 1);
    newFaqs.splice(hoverIndex, 0, draggedFaq);

    // Atualizar ordem local imediatamente
    setFaqs(newFaqs);

    // Preparar dados para reordenação
    const reorderData = newFaqs.map((faq, index) => ({
      id: faq.id,
      display_order: index + 1
    }));

    try {
      await faqService.reorderFAQs(reorderData);
      toast({
        title: "Ordem atualizada",
        description: "A ordem das FAQs foi atualizada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao reordenar FAQs:', error);
      toast({
        title: "Erro ao reordenar",
        description: "Não foi possível atualizar a ordem das FAQs",
        variant: "destructive",
      });
      // Reverter mudança local em caso de erro
      loadFaqs();
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value, page: 1 });
  };

  const handleStatusFilter = (value: string) => {
    const is_active = value === 'all' ? undefined : value === 'active';
    setFilters({ ...filters, is_active, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Gerenciamento de FAQ
        </h3>
        <Button onClick={handleCreateFaq} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova FAQ
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de FAQs</p>
                <p className="text-2xl font-bold text-blue-500">{stats.total}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">FAQs Ativas</p>
                <p className="text-2xl font-bold text-success">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-success/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">FAQs Inativas</p>
                <p className="text-2xl font-bold text-warning">{stats.inactive}</p>
              </div>
              <XCircle className="h-8 w-8 text-warning/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por pergunta ou resposta..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de FAQs */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando FAQs...</p>
            </CardContent>
          </Card>
        ) : faqs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma FAQ encontrada</p>
              <Button onClick={handleCreateFaq} className="mt-4">
                Criar primeira FAQ
              </Button>
            </CardContent>
          </Card>
        ) : (
          faqs.map((faq, index) => (
            <FaqCard
              key={faq.id}
              faq={faq}
              index={index}
              onEdit={handleEditFaq}
              onDelete={handleDeleteFaq}
              onToggleStatus={handleToggleStatus}
              onReorder={handleReorder}
            />
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => handlePageChange((filters.page || 1) - 1)}
                disabled={filters.page === 1}
              >
                ← Anterior
              </Button>
              <span className="text-sm text-muted-foreground">
                Página {filters.page} de {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange((filters.page || 1) + 1)}
                disabled={filters.page === totalPages}
              >
                Próxima →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal */}
      <FaqModal
        faq={editingFaq}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          loadFaqs();
          setIsModalOpen(false);
        }}
      />
    </div>
  );
}