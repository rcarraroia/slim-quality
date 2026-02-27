/**
 * Testes de Componente - AfiliadosCadastro
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 4 - Frontend Update
 * Task: 4.4
 * 
 * Testa o formulário de cadastro de afiliados com validação
 * de tipos e documentos (CPF/CNPJ).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AfiliadosCadastro from '@/pages/afiliados/AfiliadosCadastro';

// Mock do useCustomerAuth
vi.mock('@/hooks/useCustomerAuth', () => ({
  useCustomerAuth: () => ({
    registerWithAffiliate: vi.fn(),
    isAuthenticated: false,
  }),
}));

// Mock do supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        or: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
        }),
      }),
    }),
  },
}));

// Mock do toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Wrapper com Router
const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AfiliadosCadastro - Tipo de Afiliado', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar campo de seleção de tipo de afiliado', () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    expect(selectTrigger).toBeInTheDocument();
  });

  it('deve mostrar campo CPF quando Individual é selecionado', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Individual
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    // Verificar que campo CPF aparece
    await waitFor(() => {
      const cpfLabel = screen.getByText(/CPF/i);
      expect(cpfLabel).toBeInTheDocument();
    });
    
    const cpfInput = screen.getByPlaceholderText('000.000.000-00');
    expect(cpfInput).toBeInTheDocument();
  });

  it('deve mostrar campo CNPJ quando Logista é selecionado', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Logista
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    
    const logistaOption = await screen.findByText('Logista (Loja Física)');
    fireEvent.click(logistaOption);
    
    // Verificar que campo CNPJ aparece
    await waitFor(() => {
      const cnpjLabel = screen.getByText(/CNPJ/i);
      expect(cnpjLabel).toBeInTheDocument();
    });
    
    const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
    expect(cnpjInput).toBeInTheDocument();
  });

  it('deve limpar campo de documento ao trocar tipo de afiliado', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Individual e preencher CPF
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    const cpfInput = await screen.findByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });
    
    expect(cpfInput).toHaveValue('123.456.789-09');
    
    // Trocar para Logista
    fireEvent.click(selectTrigger);
    const logistaOption = await screen.findByText('Logista (Loja Física)');
    fireEvent.click(logistaOption);
    
    // Verificar que campo foi limpo
    await waitFor(() => {
      const cnpjInput = screen.getByPlaceholderText('00.000.000/0000-00');
      expect(cnpjInput).toHaveValue('');
    });
  });
});

describe('AfiliadosCadastro - Validação de CPF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve formatar CPF automaticamente', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Individual
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    // Digitar CPF sem formatação
    const cpfInput = await screen.findByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });
    
    // Verificar formatação
    expect(cpfInput).toHaveValue('123.456.789-09');
  });

  it('deve mostrar erro para CPF inválido', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Individual
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    // Digitar CPF inválido (dígitos verificadores errados)
    const cpfInput = await screen.findByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678900' } });
    
    // Verificar mensagem de erro
    await waitFor(() => {
      const errorMessage = screen.getByText(/CPF inválido/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it('não deve mostrar erro para CPF válido', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Individual
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    // Digitar CPF válido
    const cpfInput = await screen.findByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678909' } });
    
    // Verificar que não há mensagem de erro
    await waitFor(() => {
      const errorMessage = screen.queryByText(/CPF inválido/i);
      expect(errorMessage).not.toBeInTheDocument();
    });
  });
});

describe('AfiliadosCadastro - Validação de CNPJ', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve formatar CNPJ automaticamente', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Logista
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const logistaOption = await screen.findByText('Logista (Loja Física)');
    fireEvent.click(logistaOption);
    
    // Digitar CNPJ sem formatação
    const cnpjInput = await screen.findByPlaceholderText('00.000.000/0000-00');
    fireEvent.change(cnpjInput, { target: { value: '11222333000181' } });
    
    // Verificar formatação
    expect(cnpjInput).toHaveValue('11.222.333/0001-81');
  });

  it('deve mostrar erro para CNPJ inválido', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Logista
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const logistaOption = await screen.findByText('Logista (Loja Física)');
    fireEvent.click(logistaOption);
    
    // Digitar CNPJ inválido (dígitos verificadores errados)
    const cnpjInput = await screen.findByPlaceholderText('00.000.000/0000-00');
    fireEvent.change(cnpjInput, { target: { value: '11222333000100' } });
    
    // Verificar mensagem de erro
    await waitFor(() => {
      const errorMessage = screen.getByText(/CNPJ inválido/i);
      expect(errorMessage).toBeInTheDocument();
    });
  });

  it('não deve mostrar erro para CNPJ válido', async () => {
    renderWithRouter(<AfiliadosCadastro />);
    
    // Selecionar Logista
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const logistaOption = await screen.findByText('Logista (Loja Física)');
    fireEvent.click(logistaOption);
    
    // Digitar CNPJ válido
    const cnpjInput = await screen.findByPlaceholderText('00.000.000/0000-00');
    fireEvent.change(cnpjInput, { target: { value: '11222333000181' } });
    
    // Verificar que não há mensagem de erro
    await waitFor(() => {
      const errorMessage = screen.queryByText(/CNPJ inválido/i);
      expect(errorMessage).not.toBeInTheDocument();
    });
  });
});

describe('AfiliadosCadastro - Submissão do Formulário', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve validar campos obrigatórios antes de submeter', async () => {
    const { useToast } = await import('@/hooks/use-toast');
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    renderWithRouter(<AfiliadosCadastro />);
    
    // Tentar submeter sem preencher campos
    const submitButton = screen.getByRole('button', { name: /criar minha conta/i });
    fireEvent.click(submitButton);
    
    // Verificar que toast de erro foi chamado
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Campos obrigatórios',
          variant: 'destructive',
        })
      );
    });
  });

  it('deve validar CPF antes de submeter', async () => {
    const { useToast } = await import('@/hooks/use-toast');
    const mockToast = vi.fn();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    
    renderWithRouter(<AfiliadosCadastro />);
    
    // Preencher formulário com CPF inválido
    fireEvent.change(screen.getByPlaceholderText(/ex: carlos mendes/i), { 
      target: { value: 'João Silva' } 
    });
    
    const selectTrigger = screen.getByRole('combobox', { name: /tipo de afiliado/i });
    fireEvent.click(selectTrigger);
    const individualOption = await screen.findByText('Individual (Pessoa Física)');
    fireEvent.click(individualOption);
    
    const cpfInput = await screen.findByPlaceholderText('000.000.000-00');
    fireEvent.change(cpfInput, { target: { value: '12345678900' } }); // CPF inválido
    
    fireEvent.change(screen.getByPlaceholderText('seu@email.com'), { 
      target: { value: 'joao@test.com' } 
    });
    
    fireEvent.change(screen.getByPlaceholderText('(00) 00000-0000'), { 
      target: { value: '11987654321' } 
    });
    
    const passwordInputs = screen.getAllByPlaceholderText(/senha/i);
    fireEvent.change(passwordInputs[0], { target: { value: 'senha123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'senha123' } });
    
    // Aceitar termos
    const termsCheckbox = screen.getByRole('checkbox');
    fireEvent.click(termsCheckbox);
    
    // Submeter
    const submitButton = screen.getByRole('button', { name: /criar minha conta/i });
    fireEvent.click(submitButton);
    
    // Verificar que toast de erro foi chamado
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'CPF inválido',
          variant: 'destructive',
        })
      );
    });
  });
});
