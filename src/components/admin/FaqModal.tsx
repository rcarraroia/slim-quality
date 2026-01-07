// FAQ Management System - FAQ Modal Component
// Created: 06/01/2026
// Author: Kiro AI

import { useState, useEffect } from 'react';
import { FAQ, CreateFAQRequest } from '@/types/faq.types';
import { faqService } from '@/services/faq.service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye } from 'lucide-react';

interface FaqModalProps {
  faq: FAQ | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function FaqModal({ faq, isOpen, onClose, onSave }: FaqModalProps) {
  const [formData, setFormData] = useState<CreateFAQRequest>({
    question: '',
    answer: '',
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (faq) {
      setFormData({
        question: faq.question,
        answer: faq.answer,
        is_active: faq.is_active,
        display_order: faq.display_order
      });
    } else {
      setFormData({
        question: '',
        answer: '',
        is_active: true
      });
    }
    setErrors({});
    setShowPreview(false);
  }, [faq, isOpen]);

  const validateForm = (): boolean => {
    const validationErrors = faqService.validateFAQ(formData);
    const errorMap: Record<string, string> = {};
    
    validationErrors.forEach(error => {
      errorMap[error.field] = error.message;
    });

    setErrors(errorMap);
    return validationErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (faq) {
        await faqService.updateFAQ({ id: faq.id, ...formData });
        toast({
          title: "FAQ atualizada",
          description: "A FAQ foi atualizada com sucesso",
        });
      } else {
        await faqService.createFAQ(formData);
        toast({
          title: "FAQ criada",
          description: "A FAQ foi criada com sucesso",
        });
      }
      onSave();
    } catch (error) {
      console.error('Erro ao salvar FAQ:', error);
      toast({
        title: "Erro ao salvar FAQ",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {faq ? 'Editar FAQ' : 'Nova FAQ'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showPreview ? (
            <>
              {/* Pergunta */}
              <div className="space-y-2">
                <Label htmlFor="question">Pergunta *</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="Digite a pergunta..."
                  className={errors.question ? "border-destructive" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className={errors.question ? "text-destructive" : ""}>
                    {errors.question || "10-200 caracteres"}
                  </span>
                  <span>{formData.question.length}/200</span>
                </div>
              </div>

              {/* Resposta */}
              <div className="space-y-2">
                <Label htmlFor="answer">Resposta *</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="Digite a resposta..."
                  rows={6}
                  className={errors.answer ? "border-destructive" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className={errors.answer ? "text-destructive" : ""}>
                    {errors.answer || "20-1000 caracteres"}
                  </span>
                  <span>{formData.answer.length}/1000</span>
                </div>
              </div>

              {/* Configurações */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <Label htmlFor="is_active">FAQ ativa (visível no site)</Label>
              </div>

              {faq && (
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order || ''}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              )}
            </>
          ) : (
            /* Preview */
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Preview da FAQ:</h4>
                <div className="bg-white p-4 rounded border">
                  <button className="w-full text-left flex justify-between items-center">
                    <h3 className="text-lg font-medium">{formData.question}</h3>
                    <span>▼</span>
                  </button>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-gray-700 leading-relaxed">{formData.answer}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            disabled={loading}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            {showPreview ? 'Editar' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={loading} className="gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {faq ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}