/**
 * Testes de Componente - ExistingWalletForm (ETAPA 2)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExistingWalletForm } from '@/components/affiliates/ExistingWalletForm';
import { asaasWalletService } from '@/services/asaas-wallet.service';

// Mock do serviço Asaas
vi.mock('@/services/asaas-wallet.service', () => ({
  asaasWalletService: {
    configureWallet: vi.fn()
  }
}));

// Mock do toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('ExistingWalletForm', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar formulário corretamente', () => {
    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByLabelText(/Wallet ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar Wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('deve exibir erro para Wallet ID vazio', async () => {
    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: /Salvar Wallet/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Wallet ID é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('deve exibir erro para formato UUID inválido', async () => {
    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText(/Wallet ID/i);
    fireEvent.change(input, { target: { value: 'wal_invalidformat' } });

    const submitButton = screen.getByRole('button', { name: /Salvar Wallet/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Formato de Wallet ID inválido/i)).toBeInTheDocument();
    });
  });

  it('deve aceitar UUID válido em lowercase', async () => {
    const validWalletId = 'c0c1688f-636b-42c0-b6ee-7339182276b7';
    
    vi.mocked(asaasWalletService.configureWallet).mockResolvedValue({
      affiliateId: 'aff_123',
      walletId: validWalletId,
      financial_status: 'ativo',
      message: 'Wallet configurada com sucesso'
    });

    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText(/Wallet ID/i);
    fireEvent.change(input, { target: { value: validWalletId } });

    const submitButton = screen.getByRole('button', { name: /Salvar Wallet/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(asaasWalletService.configureWallet).toHaveBeenCalledWith(validWalletId);
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('deve converter UUID para lowercase automaticamente', async () => {
    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText(/Wallet ID/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'C0C1688F-636B-42C0-B6EE-7339182276B7' } });

    expect(input.value).toBe('c0c1688f-636b-42c0-b6ee-7339182276b7');
  });

  it('deve desabilitar botão durante submissão', async () => {
    vi.mocked(asaasWalletService.configureWallet).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText(/Wallet ID/i);
    fireEvent.change(input, { target: { value: 'c0c1688f-636b-42c0-b6ee-7339182276b7' } });

    const submitButton = screen.getByRole('button', { name: /Salvar Wallet/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/Salvando.../i)).toBeInTheDocument();
    });
  });

  it('deve chamar onCancel ao clicar em Cancelar', () => {
    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('deve exibir erro ao falhar configuração', async () => {
    const errorMessage = 'Esta wallet já está cadastrada';
    vi.mocked(asaasWalletService.configureWallet).mockRejectedValue(
      new Error(errorMessage)
    );

    render(
      <ExistingWalletForm 
        onSuccess={mockOnSuccess}
        onCancel={mockOnCancel}
      />
    );

    const input = screen.getByLabelText(/Wallet ID/i);
    fireEvent.change(input, { target: { value: 'c0c1688f-636b-42c0-b6ee-7339182276b7' } });

    const submitButton = screen.getByRole('button', { name: /Salvar Wallet/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
});
