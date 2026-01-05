/**
 * Testes de Integração - Tracking Persistence
 * Valida persistência e funcionamento do sistema de tracking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { affiliateFrontendService } from '@/services/frontend/affiliate.service';

// Mock do localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock do sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// Mock do Supabase
const mockSupabase = {
  from: vi.fn().mockReturnValue({
    insert: vi.fn().mockResolvedValue({ error: null }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'affiliate-123' } })
      })
    })
  })
};

vi.mock('@/config/supabase', () => ({
  supabase: mockSupabase
}));

// Mock do fetch para IP
global.fetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({ ip: '192.168.1.1' })
});

describe('Integração: Tracking Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    sessionStorageMock.getItem.mockReturnValue(null);
    
    // Mock do window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: '',
        href: 'https://slimquality.com.br'
      },
      writable: true
    });

    // Mock do window.history
    Object.defineProperty(window, 'history', {
      value: {
        replaceState: vi.fn()
      },
      writable: true
    });

    // Mock do document
    Object.defineProperty(document, 'referrer', {
      value: 'https://google.com',
      writable: true
    });

    // Mock do navigator
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 Test Browser',
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('deve capturar e persistir código de referência da URL', async () => {
    // Arrange: URL com parâmetro ref
    window.location.search = '?ref=ABC123&utm_source=google&utm_medium=cpc';

    // Act: Capturar parâmetros de tracking
    const params = affiliateFrontendService.captureTrackingParams();

    // Assert: Parâmetros capturados corretamente
    expect(params.referralCode).toBe('ABC123');
    expect(params.utmParams).toEqual({
      utm_source: 'google',
      utm_medium: 'cpc'
    });
  });

  it('deve rastrear clique e salvar no localStorage', async () => {
    // Arrange: Código de referência
    const referralCode = 'ABC123';
    const utmParams = {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'afiliados'
    };

    // Act: Rastrear clique
    await affiliateFrontendService.trackReferralClick(referralCode, utmParams);

    // Assert: Dados salvos no localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('referralCode', referralCode);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('referralClickedAt', expect.any(String));
    expect(localStorageMock.setItem).toHaveBeenCalledWith('utmParams', JSON.stringify(utmParams));

    // Assert: Clique registrado no banco
    expect(mockSupabase.from).toHaveBeenCalledWith('referral_clicks');
  });

  it('deve inicializar tracking automaticamente', async () => {
    // Arrange: URL com parâmetros e sessionStorage vazio
    window.location.search = '?ref=XYZ789&utm_source=facebook';
    sessionStorageMock.getItem.mockReturnValue(null);

    // Spy no método trackReferralClick
    const trackSpy = vi.spyOn(affiliateFrontendService, 'trackReferralClick');

    // Act: Inicializar tracking
    await affiliateFrontendService.initializeTracking();

    // Assert: Tracking foi chamado com parâmetros corretos
    expect(trackSpy).toHaveBeenCalledWith('XYZ789', {
      utm_source: 'facebook'
    });

    // Assert: SessionStorage marcado como inicializado
    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('trackingInitialized', 'true');

    // Assert: URL limpa após captura
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('deve recuperar código salvo do localStorage', () => {
    // Arrange: Código salvo
    const savedCode = 'SAVED123';
    localStorageMock.getItem.mockReturnValue(savedCode);

    // Act: Recuperar código
    const retrievedCode = affiliateFrontendService.getSavedReferralCode();

    // Assert: Código recuperado corretamente
    expect(retrievedCode).toBe(savedCode);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('referralCode');
  });

  it('deve registrar conversão e limpar dados de tracking', async () => {
    // Arrange: Dados de tracking salvos
    const referralCode = 'CONV123';
    const orderId = 'order_456';
    const orderValue = 3290.00;
    const clickedAt = new Date().toISOString();
    const utmParams = { utm_source: 'google', utm_medium: 'cpc' };

    localStorageMock.getItem.mockImplementation((key) => {
      switch (key) {
        case 'referralCode': return referralCode;
        case 'referralClickedAt': return clickedAt;
        case 'utmParams': return JSON.stringify(utmParams);
        default: return null;
      }
    });

    // Act: Registrar conversão
    await affiliateFrontendService.trackConversion(orderId, orderValue);

    // Assert: Conversão registrada no banco
    expect(mockSupabase.from).toHaveBeenCalledWith('referral_conversions');

    // Assert: Dados de tracking limpos
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('referralCode');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('referralClickedAt');
  });

  it('deve filtrar UTMs vazios', () => {
    // Arrange: URL com UTMs parciais
    window.location.search = '?ref=TEST123&utm_source=google&utm_medium=&utm_campaign=test&utm_content=&utm_term=';

    // Act: Capturar parâmetros
    const params = affiliateFrontendService.captureTrackingParams();

    // Assert: Apenas UTMs com valor são incluídos
    expect(params.utmParams).toEqual({
      utm_source: 'google',
      utm_campaign: 'test'
    });
  });

  it('deve lidar com URLs sem parâmetros de tracking', () => {
    // Arrange: URL limpa
    window.location.search = '';

    // Act: Capturar parâmetros
    const params = affiliateFrontendService.captureTrackingParams();

    // Assert: Nenhum parâmetro capturado
    expect(params.referralCode).toBeUndefined();
    expect(params.utmParams).toBeUndefined();
  });

  it('deve evitar inicialização dupla do tracking', async () => {
    // Arrange: Tracking já inicializado
    sessionStorageMock.getItem.mockReturnValue('true');
    window.location.search = '?ref=DOUBLE123';

    // Spy no método trackReferralClick
    const trackSpy = vi.spyOn(affiliateFrontendService, 'trackReferralClick');

    // Act: Tentar inicializar novamente
    await affiliateFrontendService.initializeTracking();

    // Assert: Tracking não foi chamado novamente
    expect(trackSpy).not.toHaveBeenCalled();
  });

  it('deve persistir dados entre recarregamentos de página', () => {
    // Arrange: Simular dados persistidos
    const persistedData = {
      referralCode: 'PERSIST123',
      clickedAt: '2024-01-01T10:00:00Z',
      utmParams: '{"utm_source":"email","utm_campaign":"newsletter"}'
    };

    localStorageMock.getItem.mockImplementation((key) => {
      return persistedData[key as keyof typeof persistedData] || null;
    });

    // Act: Verificar persistência
    const code = affiliateFrontendService.getSavedReferralCode();
    const clickedAt = localStorage.getItem('referralClickedAt');
    const utmParams = localStorage.getItem('utmParams');

    // Assert: Dados persistidos corretamente
    expect(code).toBe('PERSIST123');
    expect(clickedAt).toBe('2024-01-01T10:00:00Z');
    expect(utmParams).toBe('{"utm_source":"email","utm_campaign":"newsletter"}');
  });
});