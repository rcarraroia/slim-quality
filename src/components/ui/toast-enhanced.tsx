/**
 * Toast Melhorado com Ações
 * BLOCO 5 - Integrações
 */

import { toast as baseToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, AlertCircle, Info, Download, Eye } from 'lucide-react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface EnhancedToastOptions {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: ToastAction;
}

class EnhancedToast {
  /**
   * Toast de sucesso
   */
  success(title: string, description?: string, action?: ToastAction) {
    return baseToast({
      title,
      description,
      variant: 'default',
      className: 'border-green-200 bg-green-50 text-green-900',
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    });
  }

  /**
   * Toast de erro
   */
  error(title: string, description?: string, action?: ToastAction) {
    return baseToast({
      title,
      description,
      variant: 'destructive',
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    });
  }

  /**
   * Toast de aviso
   */
  warning(title: string, description?: string, action?: ToastAction) {
    return baseToast({
      title,
      description,
      variant: 'default',
      className: 'border-yellow-200 bg-yellow-50 text-yellow-900',
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    });
  }

  /**
   * Toast de informação
   */
  info(title: string, description?: string, action?: ToastAction) {
    return baseToast({
      title,
      description,
      variant: 'default',
      className: 'border-blue-200 bg-blue-50 text-blue-900',
      action: action ? {
        altText: action.label,
        onClick: action.onClick,
        children: action.label
      } : undefined
    });
  }

  /**
   * Toast de loading
   */
  loading(title: string, description?: string) {
    return baseToast({
      title,
      description,
      variant: 'default',
      className: 'border-gray-200 bg-gray-50 text-gray-900',
      duration: Infinity // Não remove automaticamente
    });
  }

  /**
   * Toast de ação bem-sucedida com opção de desfazer
   */
  actionSuccess(title: string, description?: string, undoAction?: () => void) {
    return this.success(
      title,
      description,
      undoAction ? {
        label: 'Desfazer',
        onClick: undoAction
      } : undefined
    );
  }

  /**
   * Toast de download iniciado
   */
  downloadStarted(filename: string, onView?: () => void) {
    return this.info(
      'Download iniciado',
      `O arquivo ${filename} está sendo baixado...`,
      onView ? {
        label: 'Visualizar',
        onClick: onView
      } : undefined
    );
  }

  /**
   * Toast de exportação concluída
   */
  exportCompleted(filename: string, onOpen?: () => void) {
    return this.success(
      'Exportação concluída',
      `O arquivo ${filename} foi exportado com sucesso.`,
      onOpen ? {
        label: 'Abrir',
        onClick: onOpen
      } : undefined
    );
  }

  /**
   * Toast de confirmação de ação
   */
  confirmAction(title: string, description: string, onConfirm: () => void, onCancel?: () => void) {
    return baseToast({
      title,
      description,
      variant: 'default',
      className: 'border-orange-200 bg-orange-50 text-orange-900',
      duration: 10000, // 10 segundos para decidir
      action: {
        altText: 'Confirmar',
        onClick: onConfirm,
        children: 'Confirmar'
      }
    });
  }

  /**
   * Toast personalizado
   */
  custom(options: EnhancedToastOptions) {
    const { variant = 'default', ...rest } = options;
    
    let className = '';
    switch (variant) {
      case 'success':
        className = 'border-green-200 bg-green-50 text-green-900';
        break;
      case 'warning':
        className = 'border-yellow-200 bg-yellow-50 text-yellow-900';
        break;
      case 'info':
        className = 'border-blue-200 bg-blue-50 text-blue-900';
        break;
      case 'destructive':
        className = '';
        break;
      default:
        className = '';
    }

    return baseToast({
      ...rest,
      variant: variant === 'destructive' ? 'destructive' : 'default',
      className,
      action: options.action ? {
        altText: options.action.label,
        onClick: options.action.onClick,
        children: options.action.label
      } : undefined
    });
  }
}

export const enhancedToast = new EnhancedToast();
export default enhancedToast;