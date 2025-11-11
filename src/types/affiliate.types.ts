/**
 * Affiliate Types
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Tipos TypeScript para o sistema de afiliados
 */

// ============================================
// ENUMS
// ============================================

export type AffiliateStatus = 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
export type ConversionStatus = 'pending' | 'processed' | 'paid' | 'cancelled';
export type CommissionStatus = 'calculated' | 'pending' | 'paid' | 'failed' | 'cancelled';
export type CommissionSplitStatus = 'calculated' | 'sent' | 'confirmed' | 'failed' | 'cancelled';
export type LogOperationType = 
  | 'commission_calculated'
  | 'redistribution_applied'
  | 'split_sent'
  | 'split_confirmed'
  | 'commission_paid'
  | 'commission_failed'
  | 'manual_adjustment';

export type SplitStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

// ============================================
// CORE ENTITIES
// ============================================

export interface Affiliate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  referralCode: string;
  walletId: string;
  walletValidatedAt?: string;
  status: AffiliateStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  totalClicks: number;
  totalConversions: number;
  totalCommissionsCents: number;
  notificationEmail: boolean;
  notificationWhatsapp: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateNetwork {
  id: string;
  affiliateId: string;
  parentId?: string;
  level: number;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralClick {
  id: string;
  referralCode: string;
  affiliateId: string;
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  country?: string;
  region?: string;
  city?: string;
  sessionId?: string;
  clickedAt: string;
}

export interface ReferralConversion {
  id: string;
  orderId: string;
  affiliateId: string;
  referralCode: string;
  orderValueCents: number;
  commissionPercentage: number;
  commissionValueCents: number;
  clickId?: string;
  conversionTimeHours?: number;
  status: ConversionStatus;
  processedAt?: string;
  customerId: string;
  customerEmail?: string;
  customerCity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Commission {
  id: string;
  orderId: string;
  affiliateId: string;
  level: number;
  percentage: number;
  baseValueCents: number;
  commissionValueCents: number;
  originalPercentage?: number;
  redistributionApplied: boolean;
  status: CommissionStatus;
  asaasSplitId?: string;
  paidAt?: string;
  calculatedBy?: string;
  calculationDetails?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSplit {
  id: string;
  orderId: string;
  totalOrderValueCents: number;
  factoryPercentage: number;
  factoryValueCents: number;
  commissionPercentage: number;
  commissionValueCents: number;
  n1AffiliateId?: string;
  n1Percentage?: number;
  n1ValueCents?: number;
  n2AffiliateId?: string;
  n2Percentage?: number;
  n2ValueCents?: number;
  n3AffiliateId?: string;
  n3Percentage?: number;
  n3ValueCents?: number;
  renumPercentage: number;
  renumValueCents: number;
  jbPercentage: number;
  jbValueCents: number;
  redistributionApplied: boolean;
  redistributionDetails?: any;
  status: CommissionSplitStatus;
  asaasSplitId?: string;
  asaasResponse?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionLog {
  id: string;
  orderId: string;
  operationType: LogOperationType;
  operationDetails: any;
  beforeState?: any;
  afterState: any;
  totalValueCents?: number;
  commissionValueCents?: number;
  n1AffiliateId?: string;
  n2AffiliateId?: string;
  n3AffiliateId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  createdAt: string;
}

export interface AsaasWallet {
  id: string;
  walletId: string;
  name?: string;
  email?: string;
  status?: string;
  accountType?: string;
  document?: string;
  bankCode?: string;
  bankName?: string;
  agency?: string;
  account?: string;
  lastValidatedAt: string;
  validationResponse?: any;
  isValid: boolean;
  validationError?: string;
  cacheExpiresAt: string;
  validationAttempts: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateAffiliateRequest {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  walletId: string;
  referralCode?: string; // Código de quem indicou
}

export interface UpdateAffiliateRequest {
  name?: string;
  phone?: string;
  notificationEmail?: boolean;
  notificationWhatsapp?: boolean;
}

export interface UpdateAffiliateStatusRequest {
  status: AffiliateStatus;
  reason?: string;
}

export interface AffiliateStatsResponse {
  totalClicks: number;
  totalConversions: number;
  totalCommissionsCents: number;
  conversionRate: number;
  avgCommissionCents: number;
  lastConversionAt?: string;
}

export interface NetworkTreeNode {
  affiliate: Affiliate;
  children: NetworkTreeNode[];
  level: number;
  path: string;
}

export interface AffiliateAnalytics {
  totalClicks: number;
  uniqueClicks: number;
  totalConversions: number;
  conversionRate: number;
  totalRevenueCents: number;
  totalCommissionsCents: number;
  avgConversionTimeHours: number;
  topUtmSource?: string;
  topCountry?: string;
}

// ============================================
// ASAAS INTEGRATION TYPES
// ============================================

export interface WalletValidation {
  isValid: boolean;
  isActive: boolean;
  name?: string;
  email?: string;
  error?: string;
}

export interface WalletInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  accountType: string;
  document?: string;
  createdAt: string;
}

export interface SplitItem {
  walletId: string;
  fixedValue: number;
  description?: string;
}

export interface SplitResponse {
  id: string;
  status: SplitStatus;
  splits: SplitItem[];
  totalValue: number;
  createdAt: string;
}

// ============================================
// COMMISSION CALCULATION TYPES
// ============================================

export interface CommissionCalculationInput {
  orderId: string;
  orderValueCents: number;
  affiliateId?: string; // N1 se houver
}

export interface CommissionCalculationResult {
  orderId: string;
  totalValueCents: number;
  
  // Distribuição
  factory: { percentage: number; valueCents: number };
  n1?: { affiliateId: string; percentage: number; valueCents: number };
  n2?: { affiliateId: string; percentage: number; valueCents: number };
  n3?: { affiliateId: string; percentage: number; valueCents: number };
  renum: { percentage: number; valueCents: number };
  jb: { percentage: number; valueCents: number };
  
  // Controle
  redistributionApplied: boolean;
  totalPercentage: number; // Deve ser sempre 100%
  redistributionDetails?: RedistributionResult;
}

export interface RedistributionResult {
  renumBonus: number;
  jbBonus: number;
  details: {
    availablePercentage: number;
    distributionMethod: string;
  };
}

export interface AffiliateNetworkForOrder {
  n1?: { id: string; walletId: string };
  n2?: { id: string; walletId: string };
  n3?: { id: string; walletId: string };
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface AffiliateListResponse extends PaginatedResponse<Affiliate> {}
export interface CommissionListResponse extends PaginatedResponse<Commission> {}
export interface ConversionListResponse extends PaginatedResponse<ReferralConversion> {}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface AffiliateQueryParams {
  page?: number;
  limit?: number;
  status?: AffiliateStatus;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'totalConversions' | 'totalCommissions';
  sortOrder?: 'asc' | 'desc';
}

export interface CommissionQueryParams {
  page?: number;
  limit?: number;
  status?: CommissionStatus;
  affiliateId?: string;
  startDate?: string;
  endDate?: string;
  level?: number;
}

export interface AnalyticsQueryParams {
  affiliateId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

// ============================================
// DASHBOARD TYPES
// ============================================

export interface AffiliateDashboardData {
  stats: AffiliateStatsResponse;
  recentCommissions: Commission[];
  networkSummary: {
    directReferrals: number;
    totalNetworkSize: number;
    activeReferrals: number;
  };
  referralLink: string;
  qrCode?: string;
}

export interface AdminDashboardData {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingApprovals: number;
  totalCommissionsPaid: number;
  monthlyStats: {
    newAffiliates: number;
    totalSales: number;
    totalCommissions: number;
    conversionRate: number;
  };
  topPerformers: Array<{
    affiliate: Affiliate;
    conversions: number;
    commissions: number;
  }>;
}

// ============================================
// VALIDATION SCHEMAS (ZOD)
// ============================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface NotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface CommissionNotification {
  affiliateId: string;
  orderId: string;
  commissionValueCents: number;
  level: number;
  orderNumber: string;
  customerName: string;
}

// ============================================
// EXPORT ALL
// ============================================

export type {
  // Re-export all types for convenience
  Affiliate as AffiliateEntity,
  Commission as CommissionEntity,
  CommissionSplit as CommissionSplitEntity,
};