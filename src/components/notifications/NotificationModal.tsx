/**
 * Componente NotificationModal
 * FASE 3 - Sistema de Notificações
 * Modal para criar notificação broadcast
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminNotificationService } from '@/services/admin/notification.service';
import { useToast } from '@/hooks/use-toast';

// ========================================
// SCHEMA DE VALIDAÇÃO
// ========================================

const broadcastSchema = z.object({
  title: z.string().min(3, 'Título deve ter no mínimo 3 caracteres').max(100, 'Título muito longo'),
  message: z.string().min(10, 'Mensagem deve ter no mínimo 10 caracteres').max(500, 'Mensagem muito longa'),
});

type BroadcastFormData = z.infer<typeof broadcastSchema>;

// ========================================
// COMPONENTE
// ========================================

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function NotificationModal({ isOpen, onClose, onSuccess }: NotificationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BroadcastFormData>({
    resolver: zodResolver(broadcastSchema),
  });

  const onSubmit = async (data: BroadcastFormData) => {
    setIsSubmitting(true);

    try {
      const response = await adminNotificationService.createBroadcast({
        title: data.title,
        message: data.message,
      });

      if (response.success) {
        toast({
          title: 'Notificação enviada!',
          description: `Enviada para ${response.data.sent_count} afiliado(s)`,
        });

        reset();
        onSuccess?.();
      } else {
        throw new Error(response.error || 'Erro ao enviar notificação');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar notificação',
        description: error.message || 'Tente novamente mais tarde',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Notificação</DialogTitle>
          <DialogDescription>
            Envie uma notificação para todos os afiliados ativos
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Título <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Ex: Nova funcionalidade disponível"
              {...register('title')}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Mensagem <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="message"
              rows={4}
              placeholder="Digite a mensagem da notificação..."
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register('message')}
              disabled={isSubmitting}
            />
            {errors.message && (
              <p className="text-sm text-destructive">{errors.message.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Notificação
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
