/**
 * Unit Tests - Webhook Bundle Activation (Modelo 3 Planos)
 * 
 * Tests for detectBundlePayment() and activateBundle() functions
 * 
 * Validates:
 * - Individual COM mensalidade can activate bundle
 * - Logista can activate bundle
 * - Individual SEM mensalidade cannot activate bundle
 * - Field corrections (is_visible_in_showcase)
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
};

// Mock functions to test
async function detectBundlePayment(supabase: any, payment: any): Promise<boolean> {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('has_subscription, payment_status, affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  if (error || !affiliate) {
    return false;
  }
  
  // ✅ Check has_subscription AND payment_status
  return affiliate.has_subscription === true && 
         affiliate.payment_status === 'active';
}

async function activateBundle(supabase: any, affiliateId: string): Promise<string> {
  // 1. Create/update tenant (agent IA)
  const { data: tenant, error: tenantError } = await supabase
    .from('multi_agent_tenants')
    .upsert({
      affiliate_id: affiliateId,
      status: 'active',
      whatsapp_status: 'inactive',
      activated_at: new Date().toISOString(),
      personality: null
    }, {
      onConflict: 'affiliate_id'
    })
    .select('id')
    .single();
  
  if (tenantError) {
    throw tenantError;
  }
  
  // 2. Activate vitrine
  const { error: vitrineError } = await supabase
    .from('store_profiles')
    .update({ 
      is_visible_in_showcase: true,  // ✅ CORRECT FIELD
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (vitrineError) {
    console.warn('Vitrine activation failed:', vitrineError);
    // Don't block - vitrine can be activated manually
  }
  
  return tenant.id;
}

describe('detectBundlePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for individual with has_subscription=true and payment_status=active', async () => {
    // Mock affiliate data
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: true,
              payment_status: 'active',
              affiliate_type: 'individual'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_individual_123',
      id: 'pay_001',
      value: 69.00
    };

    const result = await detectBundlePayment(mockSupabase, payment);
    
    expect(result).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliates');
  });

  it('should return true for logista with has_subscription=true and payment_status=active', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: true,
              payment_status: 'active',
              affiliate_type: 'logista'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_logista_456',
      id: 'pay_002',
      value: 129.00
    };

    const result = await detectBundlePayment(mockSupabase, payment);
    
    expect(result).toBe(true);
  });

  it('should return false for individual with has_subscription=false', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: false,
              payment_status: 'active',
              affiliate_type: 'individual'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_individual_basic_789',
      id: 'pay_003',
      value: 500.00
    };

    const result = await detectBundlePayment(mockSupabase, payment);
    
    expect(result).toBe(false);
  });

  it('should return false for affiliate with payment_status=pending', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: true,
              payment_status: 'pending',
              affiliate_type: 'individual'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_pending_999',
      id: 'pay_004',
      value: 69.00
    };

    const result = await detectBundlePayment(mockSupabase, payment);
    
    expect(result).toBe(false);
  });

  it('should return false when affiliate not found', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' }
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_notfound_000',
      id: 'pay_005',
      value: 69.00
    };

    const result = await detectBundlePayment(mockSupabase, payment);
    
    expect(result).toBe(false);
  });
});

describe('activateBundle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create tenant and activate vitrine successfully', async () => {
    const mockTenantId = 'tenant_123';
    
    // Mock tenant creation
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'multi_agent_tenants') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockTenantId },
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'store_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: null
            })
          })
        };
      }
    });

    const tenantId = await activateBundle(mockSupabase, 'affiliate_test');
    
    expect(tenantId).toBe(mockTenantId);
    expect(mockSupabase.from).toHaveBeenCalledWith('multi_agent_tenants');
    expect(mockSupabase.from).toHaveBeenCalledWith('store_profiles');
  });

  it('should handle vitrine error gracefully (non-blocking)', async () => {
    const mockTenantId = 'tenant_456';
    
    // Mock tenant creation (success)
    // Mock vitrine update (error)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'multi_agent_tenants') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockTenantId },
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'store_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: { message: 'Vitrine update failed' }
            })
          })
        };
      }
    });

    // Should still return tenant_id (don't block on vitrine error)
    const tenantId = await activateBundle(mockSupabase, 'affiliate_test');
    
    expect(tenantId).toBe(mockTenantId);
  });

  it('should throw error when tenant creation fails', async () => {
    mockSupabase.from.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Tenant creation failed' }
          })
        })
      })
    });

    await expect(
      activateBundle(mockSupabase, 'affiliate_fail')
    ).rejects.toThrow();
  });

  it('should use correct field is_visible_in_showcase (not is_visible)', async () => {
    const mockTenantId = 'tenant_789';
    let updatePayload: any = null;
    
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'multi_agent_tenants') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockTenantId },
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'store_profiles') {
        return {
          update: vi.fn((payload) => {
            updatePayload = payload;
            return {
              eq: vi.fn().mockResolvedValue({ error: null })
            };
          })
        };
      }
    });

    await activateBundle(mockSupabase, 'affiliate_test');
    
    // Verify correct field is used
    expect(updatePayload).toHaveProperty('is_visible_in_showcase', true);
    expect(updatePayload).not.toHaveProperty('is_visible');
    expect(updatePayload).toHaveProperty('updated_at');
  });
});

describe('Bundle Activation - Integration Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle complete flow: detect + activate for individual premium', async () => {
    // Step 1: Detect bundle payment
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: true,
              payment_status: 'active',
              affiliate_type: 'individual'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_individual_premium',
      id: 'pay_premium',
      value: 69.00
    };

    const shouldActivate = await detectBundlePayment(mockSupabase, payment);
    expect(shouldActivate).toBe(true);

    // Step 2: Activate bundle
    const mockTenantId = 'tenant_premium';
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'multi_agent_tenants') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: mockTenantId },
                error: null
              })
            })
          })
        };
      }
      
      if (table === 'store_profiles') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null })
          })
        };
      }
    });

    const affiliateId = payment.externalReference.replace('affiliate_', '');
    const tenantId = await activateBundle(mockSupabase, affiliateId);
    
    expect(tenantId).toBe(mockTenantId);
  });

  it('should NOT activate for individual basic (no subscription)', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              has_subscription: false,
              payment_status: 'active',
              affiliate_type: 'individual'
            },
            error: null
          })
        })
      })
    });

    const payment = {
      externalReference: 'affiliate_individual_basic',
      id: 'pay_basic',
      value: 500.00
    };

    const shouldActivate = await detectBundlePayment(mockSupabase, payment);
    expect(shouldActivate).toBe(false);
    
    // Bundle activation should NOT be called
  });
});
