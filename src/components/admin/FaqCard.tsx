// FAQ Management System - FAQ Card Component
// Created: 06/01/2026
// Author: Kiro AI

import { FAQ } from '@/types/faq.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaqCardProps {
  faq: FAQ;
  index: number;
  onEdit: (faq: FAQ) => void;
  onDelete: (id: string, question: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

export function FaqCard({ faq, index, onEdit, onDelete, onToggleStatus, onReorder }: FaqCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      !faq.is_active && "opacity-60 border-dashed"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Número da ordem */}
          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium text-primary">
            {faq.display_order}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant={faq.is_active ? "default" : "secondary"}>
                  {faq.is_active ? "Ativa" : "Inativa"}
                </Badge>
              </div>
              
              {/* Ações */}
              <div className="flex items-center gap-1">
                {/* Reordenação */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReorder(index, Math.max(0, index - 1))}
                  disabled={index === 0}
                  className="h-8 w-8"
                  title="Mover para cima"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onReorder(index, index + 1)}
                  className="h-8 w-8"
                  title="Mover para baixo"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>

                {/* Toggle Status */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleStatus(faq.id, faq.is_active)}
                  className="h-8 w-8"
                  title={faq.is_active ? "Desativar FAQ" : "Ativar FAQ"}
                >
                  {faq.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>

                {/* Editar */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(faq)}
                  className="h-8 w-8"
                  title="Editar FAQ"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                {/* Excluir */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(faq.id, faq.question)}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  title="Excluir FAQ"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pergunta */}
            <h4 className="font-semibold text-sm mb-2 text-foreground">
              P: {truncateText(faq.question, 100)}
            </h4>

            {/* Resposta */}
            <p className="text-sm text-muted-foreground">
              R: {truncateText(faq.answer, 150)}
            </p>

            {/* Metadados */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>Criada em: {new Date(faq.created_at).toLocaleDateString('pt-BR')}</span>
              {faq.updated_at !== faq.created_at && (
                <span>Atualizada em: {new Date(faq.updated_at).toLocaleDateString('pt-BR')}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}