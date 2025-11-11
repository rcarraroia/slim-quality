/**
 * Customer Types
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 */

// ============================================
// CORE CUSTOMER TYPES
// ============================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf_cnpj?: string;
  birth_date?: string;
  
  // Address
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  
  // Metadata
  source: CustomerSource;
  referral_code?: string;
  assigned_to?: string;
  status: CustomerStatus;
  notes?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type CustomerSource = 'organic' | 'affiliate' | 'n8n' | 'manual';
export type CustomerStatus = 'active' | 'inactive' | 'blocked';

// ============================================
// CUSTOMER CREATION/UPDATE TYPES
// ============================================

export interface CreateCustomerData {
  name: string;
  email: string;
  phone?: string;
  cpf_cnpj?: string;
  birth_date?: string;
  
  // Address (optional)
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  
  // Metadata
  source?: CustomerSource;
  referral_code?: string;
  assigned_to?: string;
  notes?: string;
}

export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  cpf_cnpj?: string;
  birth_date?: string;
  
  // Address
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  
  // Metadata
  assigned_to?: string;
  status?: CustomerStatus;
  notes?: string;
}

// ============================================
// CUSTOMER FILTERS AND SEARCH
// ============================================

export interface CustomerFilters {
  search?: string;
  status?: CustomerStatus[];
  source?: CustomerSource[];
  assigned_to?: string;
  tags?: string[];
  city?: string;
  state?: string;
  created_after?: string;
  created_before?: string;
  has_orders?: boolean;
  min_ltv?: number;
  max_ltv?: number;
}

export interface CustomerSearchParams {
  page?: number;
  limit?: number;
  sort_by?: CustomerSortField;
  sort_order?: 'asc' | 'desc';
  filters?: CustomerFilters;
}

export type CustomerSortField = 
  | 'name' 
  | 'email' 
  | 'created_at' 
  | 'updated_at'
  | 'total_orders'
  | 'total_spent'
  | 'last_order_at';

// ============================================
// CUSTOMER TAGS
// ============================================

export interface CustomerTag {
  id: string;
  name: string;
  color: string;
  description?: string;
  auto_apply_rules: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerTagAssignment {
  id: string;
  customer_id: string;
  tag_id: string;
  assigned_by?: string;
  assigned_at: string;
  auto_applied: boolean;
  tag?: CustomerTag;
}

export interface CreateTagData {
  name: string;
  color?: string;
  description?: string;
  auto_apply_rules?: Record<string, any>;
}

// ============================================
// CUSTOMER TIMELINE
// ============================================

export type TimelineEventType = 
  | 'customer_created'
  | 'customer_updated'
  | 'order_placed'
  | 'payment_confirmed'
  | 'conversation_started'
  | 'conversation_resolved'
  | 'message_received'
  | 'message_sent'
  | 'note_added'
  | 'appointment_scheduled'
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'tag_added'
  | 'tag_removed'
  | 'status_changed'
  | 'assigned_changed'
  | 'referral_registered'
  | 'system_event';

export interface TimelineEvent {
  id: string;
  customer_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  related_order_id?: string;
  related_conversation_id?: string;
  related_appointment_id?: string;
  created_by?: string;
  created_at: string;
  is_system_event: boolean;
  is_visible_to_customer: boolean;
  priority: number;
  creator_name?: string;
}

export interface CreateTimelineEventData {
  customer_id: string;
  event_type: TimelineEventType;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  related_order_id?: string;
  related_conversation_id?: string;
  related_appointment_id?: string;
  is_system_event?: boolean;
  priority?: number;
}

export interface TimelineFilters {
  event_types?: TimelineEventType[];
  start_date?: string;
  end_date?: string;
  include_system?: boolean;
  priority?: number[];
}

// ============================================
// CUSTOMER STATISTICS AND METRICS
// ============================================

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  new_customers_this_month: number;
  customers_with_orders: number;
  average_ltv: number;
  top_cities: Array<{
    city: string;
    state: string;
    count: number;
  }>;
  source_distribution: Array<{
    source: CustomerSource;
    count: number;
    percentage: number;
  }>;
  monthly_growth: Array<{
    month: string;
    new_customers: number;
    total_customers: number;
  }>;
}

export interface CustomerMetrics {
  total_orders: number;
  total_spent_cents: number;
  average_order_value_cents: number;
  last_order_at?: string;
  first_order_at?: string;
  lifetime_value_cents: number;
  order_frequency_days?: number;
  tags: CustomerTag[];
  conversations_count: number;
  appointments_count: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface CustomerListResponse {
  data: Customer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  filters_applied: CustomerFilters;
}

export interface CustomerDetailsResponse {
  customer: Customer;
  metrics: CustomerMetrics;
  recent_timeline: TimelineEvent[];
  active_conversations: number;
  upcoming_appointments: number;
}

// ============================================
// VALIDATION SCHEMAS (ZOD)
// ============================================

export interface CustomerValidationErrors {
  name?: string[];
  email?: string[];
  phone?: string[];
  cpf_cnpj?: string[];
  birth_date?: string[];
  postal_code?: string[];
  state?: string[];
}

// ============================================
// UTILITY TYPES
// ============================================

export interface CustomerSelectOption {
  value: string;
  label: string;
  email?: string;
  phone?: string;
}

export interface CustomerBulkAction {
  action: 'add_tag' | 'remove_tag' | 'assign' | 'change_status' | 'export';
  customer_ids: string[];
  data?: any;
}

export interface CustomerExportOptions {
  format: 'csv' | 'xlsx';
  filters?: CustomerFilters;
  fields?: string[];
  include_timeline?: boolean;
  include_orders?: boolean;
}