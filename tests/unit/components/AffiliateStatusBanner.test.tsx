/**
 * Testes de Componente - AffiliateStatusBanner
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 4 - Frontend Update
 * Task: 4.4
 * 
 * Testa o banner de status financeiro que aparece quando
 * afiliado tem status pendente.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AffiliateStatusBanner } from '@/components/affiliates/AffiliateStatusBanner';

describe('AffiliateStatusBanner', () => {
  
  it('deve renderizar banner quando status é financeiro_pendente', () => {
    render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente" 
      />
    );
    
    // Verificar que banner aparece
    const message = screen.getByText(/configure sua carteira digital/i);
    expect(message).toBeInTheDocument();
    
    // Verificar que botão aparece
    const button = screen.getByRole('button', { name: /configurar wallet/i });
    expect(button).toBeInTheDocument();
  });

  it('não deve renderizar nada quando status é ativo', () => {
    const { container } = render(
      <AffiliateStatusBanner 
        financialStatus="ativo" 
      />
    );
    
    // Verificar que nada foi renderizado
    expect(container.firstChild).toBeNull();
  });

  it('deve exibir mensagem explicativa completa', () => {
    render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente" 
      />
    );
    
    // Verificar título
    const title = screen.getByText(/configure sua carteira digital para começar a receber comissões/i);
    expect(title).toBeInTheDocument();
    
    // Verificar descrição
    const description = screen.getByText(/você precisa configurar sua wallet id do asaas/i);
    expect(description).toBeInTheDocument();
  });

  it('deve chamar onConfigureWallet quando botão é clicado', () => {
    const mockOnConfigureWallet = vi.fn();
    
    render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente"
        onConfigureWallet={mockOnConfigureWallet}
      />
    );
    
    // Clicar no botão
    const button = screen.getByRole('button', { name: /configurar wallet/i });
    fireEvent.click(button);
    
    // Verificar que callback foi chamado
    expect(mockOnConfigureWallet).toHaveBeenCalledTimes(1);
  });

  it('deve desabilitar botão quando onConfigureWallet não é fornecido', () => {
    render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente"
      />
    );
    
    // Verificar que botão está desabilitado
    const button = screen.getByRole('button', { name: /configurar wallet/i });
    expect(button).toBeDisabled();
  });

  it('deve ter classes de estilo corretas para alerta amarelo', () => {
    const { container } = render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente"
      />
    );
    
    // Verificar que tem classes de cor amarela
    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveClass('bg-yellow-50');
    expect(alert).toHaveClass('border-yellow-200');
  });

  it('deve exibir ícone de alerta', () => {
    render(
      <AffiliateStatusBanner 
        financialStatus="financeiro_pendente"
      />
    );
    
    // Verificar que ícone está presente (AlertCircle do lucide-react)
    const icon = screen.getByRole('alert').querySelector('svg');
    expect(icon).toBeInTheDocument();
  });
});
