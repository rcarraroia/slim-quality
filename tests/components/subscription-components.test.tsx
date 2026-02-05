/**
 * Testes para componentes de assinatura
 * Task 14.2: Validar componentes React para fluxo de assinatura
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Configurar matchers customizados para DOM
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null && received !== undefined;
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass,
    };
  },
});

// Mock do toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock do customer auth
vi.mock('@/hooks/useCustomerAuth', () => ({
  useCustomerAuth: () => ({
    user: null,
    isAuthenticated: false
  })
}));

// Mock do subscription service
vi.mock('@/services/frontend/subscription.service', () => ({
  subscriptionFrontendService: {
    createSubscriptionPayment: vi.fn(),
    pollPaymentStatus: vi.fn(),
    getLoadingStates: vi.fn(() => ({
      creatingPayment: false,
      checkingStatus: false,
      cancelling: false,
      polling: false
    })),
    resetLoadingStates: vi.fn(),
    formatErrorMessage: vi.fn((msg) => msg)
  }
}));

// Importar componentes após os mocks
import SubscriptionCheckout from '../../src/components/subscriptions/SubscriptionCheckout';
import SubscriptionProgress from '../../src/components/subscriptions/SubscriptionProgress';

// Wrapper para testes com Router
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('SubscriptionCheckout', () => {
  const mockPlan = {
    id: 'plan_monthly',
    name: 'Plano Premium',
    description: 'Acesso completo aos recursos',
    price: 99.90,
    interval: 'monthly' as const,
    features: [
      'Acesso ilimitado',
      'Suporte prioritário',
      'Recursos avançados'
    ],
    orderItems: [
      {
        id: 'item_premium',
        name: 'Plano Premium',
        quantity: 1,
        value: 99.90,
        description: 'Assinatura mensal',
        metadata: { hasAI: true }
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render subscription checkout form', () => {
    render(
      <TestWrapper>
        <SubscriptionCheckout plan={mockPlan} />
      </TestWrapper>
    );

    expect(screen.getByText('Assinar Plano Premium')).toBeInTheDocument();
    expect(screen.getByText('Plano Premium')).toBeInTheDocument();
    expect(screen.getByText('R$ 99,90')).toBeInTheDocument();
    expect(screen.getByText('/mês')).toBeInTheDocument();
  });

  it('should show plan features', () => {
    render(
      <TestWrapper>
        <SubscriptionCheckout plan={mockPlan} />
      </TestWrapper>
    );

    expect(screen.getByText('Acesso ilimitado')).toBeInTheDocument();
    expect(screen.getByText('Suporte prioritário')).toBeInTheDocument();
    expect(screen.getByText('Recursos avançados')).toBeInTheDocument();
  });

  it('should show payment method selector', () => {
    render(
      <TestWrapper>
        <SubscriptionCheckout plan={mockPlan} />
      </TestWrapper>
    );

    expect(screen.getByText('PIX')).toBeInTheDocument();
    expect(screen.getByText('Cartão')).toBeInTheDocument();
  });

  it('should show affiliate information when provided', () => {
    const affiliateData = {
      referralCode: 'ABC123',
      affiliateId: 'aff_123'
    };

    render(
      <TestWrapper>
        <SubscriptionCheckout plan={mockPlan} affiliateData={affiliateData} />
      </TestWrapper>
    );

    expect(screen.getByText('Assinatura via indicação')).toBeInTheDocument();
    expect(screen.getByText('Código: ABC123')).toBeInTheDocument();
  });

  it('should validate required fields before submission', async () => {
    render(
      <TestWrapper>
        <SubscriptionCheckout plan={mockPlan} />
      </TestWrapper>
    );

    // Tentar submeter sem preencher campos
    const submitButton = screen.getByText(/Assinar por R\$/);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Dados inválidos",
          variant: "destructive"
        })
      );
    });
  });
});

describe('SubscriptionProgress', () => {
  it('should render processing step', () => {
    render(
      <SubscriptionProgress 
        step="processing" 
        paymentMethod="PIX" 
      />
    );

    expect(screen.getByText(/Processando Assinatura/)).toBeInTheDocument();
    expect(screen.getByText(/Criando cobrança PIX/)).toBeInTheDocument();
  });

  it('should render polling step with progress', () => {
    render(
      <SubscriptionProgress 
        step="polling" 
        paymentMethod="CREDIT_CARD"
        progress={{ current: 5, total: 15 }}
      />
    );

    expect(screen.getByText(/Aguardando Confirmação/)).toBeInTheDocument();
    expect(screen.getByText(/Confirmando pagamento do cartão/)).toBeInTheDocument();
    expect(screen.getByText('Tentativa 5 de 15')).toBeInTheDocument();
  });

  it('should show PIX instructions during polling', () => {
    render(
      <SubscriptionProgress 
        step="polling" 
        paymentMethod="PIX" 
      />
    );

    expect(screen.getByText('Como pagar com PIX:')).toBeInTheDocument();
    expect(screen.getByText(/Abra seu app do banco/)).toBeInTheDocument();
  });

  it('should show progress indicators', () => {
    render(
      <SubscriptionProgress 
        step="polling" 
        paymentMethod="PIX"
        progress={{ current: 3, total: 10 }}
      />
    );

    expect(screen.getByText('Criando')).toBeInTheDocument();
    expect(screen.getByText('Confirmando')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
  });

  it('should show warning not to close page', () => {
    render(
      <SubscriptionProgress 
        step="polling" 
        paymentMethod="PIX" 
      />
    );

    expect(screen.getByText(/Não feche esta página/)).toBeInTheDocument();
  });
});