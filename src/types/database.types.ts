/**
 * TIPOS DO BANCO DE DADOS - ESTRUTURA REAL DESCOBERTA
 * Baseado na análise completa do banco Supabase
 * Data: 12/12/2025
 */

// ============================================
// CUSTOMERS
// ============================================
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf_cnpj?: string;
  birth_date?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  source: CustomerSource;
  referral_code?: string;
  assigned_to?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type CustomerSource = 
  | 'affiliate'
  | 'organic'
  | 'website'
  | 'whatsapp'
  | 'direct'
  | 'social'
  | 'email'
  | 'google'
  | 'facebook'
  | 'instagram'
  | 'referral';

export interface CreateCustomerData {
  name: string;
  email: string;
  phone: string;
  cpf_cnpj?: string;
  birth_date?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  source: CustomerSource;
  referral_code?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

// ============================================
// ORDERS
// ============================================
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  affiliate_id?: string;
  referral_code?: string;
  discount_cents: number;
  shipping_cents: number;
  subtotal_cents: number;
  total_cents: number;
  status: OrderStatus;
  payment_method?: string;
  payment_status?: string;
  asaas_payment_id?: string;
  asaas_split_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface CreateOrderData {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  // Usar campos reais do banco
  affiliate_n1_id?: string;
  affiliate_n2_id?: string;
  affiliate_n3_id?: string;
  referral_code?: string;
  discount_cents?: number;
  shipping_cents?: number;
  subtotal_cents: number;
  total_cents: number;
  status?: OrderStatus;
  notes?: string;
}

// ============================================
// ORDER ITEMS
// ============================================
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  created_at: string;
}

export interface CreateOrderItemData {
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

// ============================================
// PRODUCTS
// ============================================
export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  width_cm: number;
  length_cm: number;
  height_cm: number;
  weight_kg?: number;
  price_cents: number;
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  product_type: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

// ============================================
// SHIPPING ADDRESSES
// ============================================
export interface ShippingAddress {
  id: string;
  order_id: string;
  recipient_name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  phone?: string;
  created_at: string;
}

export interface CreateShippingAddressData {
  order_id: string;
  recipient_name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  phone?: string;
}

// ============================================
// CREDIT CARD DATA (para checkout transparente)
// ============================================
export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

// ============================================
// CHECKOUT DATA
// ============================================
export interface CheckoutData {
  // Dados do cliente
  customer: CreateCustomerData;
  
  // Dados do produto
  product: {
    id: string;
    name: string;
    sku: string;
    price_cents: number;
    quantity: number;
  };
  
  // Dados de entrega
  shipping: Omit<CreateShippingAddressData, 'order_id'>;
  
  // Dados de pagamento
  payment: {
    method: 'pix' | 'credit_card';
    installments?: number;
    creditCard?: CreditCardData; // Dados do cartão para checkout transparente
  };
  
  // Dados de afiliado (se houver)
  affiliate?: {
    referral_code: string;
    affiliate_id?: string;
  };
  
  // Totais
  totals: {
    subtotal_cents: number;
    shipping_cents: number;
    discount_cents: number;
    total_cents: number;
  };
}

// ============================================
// CHECKOUT RESULT
// ============================================
export interface CheckoutResult {
  success: boolean;
  customer_id?: string;
  order_id?: string;
  payment_url?: string;
  error?: string;
}

// ============================================
// AFFILIATES (para integração)
// ============================================
export interface Affiliate {
  id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  wallet_id: string;
  referral_code: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

// ============================================
// MARKETING MATERIALS (Nova Funcionalidade)
// ============================================
export type MaterialType = 'image' | 'video' | 'text' | 'pdf';

export interface MarketingMaterial {
  id: string;
  title: string;
  description?: string;
  type: MaterialType;
  content_url?: string;
  content_text?: string;
  product_id?: string;
  product?: Product; // Join opcional
  template_vars: string[]; // JSON array armazenado como string[]
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// UTILITY TYPES
// ============================================
export type DatabaseError = {
  message: string;
  code: string;
  details?: string;
  hint?: string;
};

export type ApiResponse<T> = {
  data?: T;
  error?: DatabaseError;
  count?: number;
};

export type PaginationParams = {
  page?: number;
  limit?: number;
  offset?: number;
};

export type SortParams = {
  column: string;
  ascending?: boolean;
};