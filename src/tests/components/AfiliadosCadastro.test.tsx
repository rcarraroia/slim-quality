/**
 * Testes unitários para componente AfiliadosCadastro
 * Valida cadastro simplificado sem wallet_id
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AfiliadosCadastro from '@/pages/afiliados/AfiliadosCadastro';
import { affiliateFrontendService } from '@/services/frontend/affiliate.service';

// Mock do serviço
vi.mock('@/services/frontend/affiliate.service');

// Mock do Supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } }
      })
    }
  }
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('AfiliadosCadastro - Cadastro Simplificado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar formulário sem campo wallet_id', () => {
    renderWithProviders(<AfiliadosCadastro />);
    
    // Verificar campos obrigatórios presentes
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/telefone/i)).toBeInTheDocument();
    
    // Verificar que wallet_id NÃO está presente
    expect(screen.queryByLabelText(/wallet.*id/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/asaas/i)).not.toBeInTheDocument();
  });

  it('deve permitir cadastro com dados mínimos válidos', async () => {
    const mockRegister = vi.mocked(affiliateFrontendService.registerAffiliate);
    mockRegister.mockResolvedValue({
      id: 'test-affiliate-id',
      name: 'João Silva',
      email: 'joao@teste.com',
      phone: '11999999999',
      referralCode: 'ABC123',
      walletId: null, // Inicialmente null
      status: 'pending',
      totalClicks: 0,
      totalConversions: 0,
      totalCommissions: 0,
      createdAt: new Date().toISOString()
    });

    renderWithProviders(<AfiliadosCadastro />);
    
    // Preencher formulário
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'joao@teste.com' }
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '11999999999' }
    });

    // Submeter formulário
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'João Silva',
        email: 'joao@teste.com',
        phone: '11999999999',
        document: undefined
      });
    });
  });

  it('deve validar campos obrigatórios', async () => {
    renderWithProviders(<AfiliadosCadastro />);
    
    // Tentar submeter sem preencher
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument();
      expect(screen.getByText(/email é obrigatório/i)).toBeInTheDocument();
    });
  });

  it('deve validar formato de email', async () => {
    renderWithProviders(<AfiliadosCadastro />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'email-inválido' }
    });
    
    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(screen.getByText(/email inválido/i)).toBeInTheDocument();
    });
  });

  it('deve redirecionar para dashboard após cadastro bem-sucedido', async () => {
    const mockRegister = vi.mocked(affiliateFrontendService.registerAffiliate);
    mockRegister.mockResolvedValue({
      id: 'test-affiliate-id',
      name: 'João Silva',
      email: 'joao@teste.com',
      phone: '11999999999',
      referralCode: 'ABC123',
      walletId: null,
      status: 'pending',
      totalClicks: 0,
      totalConversions: 0,
      totalCommissions: 0,
      createdAt: new Date().toISOString()
    });

    // Mock do navigate
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', async () => {
      const actual = await vi.importActual('react-router-dom');
      return {
        ...actual,
        useNavigate: () => mockNavigate
      };
    });

    renderWithProviders(<AfiliadosCadastro />);
    
    // Preencher e submeter
    fireEvent.change(screen.getByLabelText(/nome completo/i), {
      target: { value: 'João Silva' }
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'joao@teste.com' }
    });
    fireEvent.change(screen.getByLabelText(/telefone/i), {
      target: { value: '11999999999' }
    });

    fireEvent.click(screen.getByRole('button', { name: /cadastrar/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/afiliados/dashboard');
    });
  });
});