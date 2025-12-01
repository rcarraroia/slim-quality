// Common Types
export interface ServiceResponse<T = any> {
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
    hasMore?: boolean;
  };
}

// Affiliate Types and Interfaces
export interface Affiliate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  walletId: string;
  referralCode: string;
  level: number;
  parentAffiliateId?: string;
  totalReferrals: number;
  totalSales: number;
  totalCommissionsCents: number;
  availableBalanceCents: number;
  status: 'active' | 'inactive' | 'pending';
  pixKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAffiliateDTO {
  userId: string;
  name: string;
  email: string;
  phone: string;
  document: string;
  walletId: string;
  referralCode?: string;
  pixKey?: string;
}

export interface UpdateAffiliateDTO {
  name?: string;
  phone?: string;
  pixKey?: string;
  status?: 'active' | 'inactive' | 'pending';
}

export interface CreateAffiliateRequest {
  name: string;
  email: string;
  phone: string;
  document: string;
  walletId: string;
  referralCode?: string;
  pixKey?: string;
}

export interface UpdateAffiliateRequest {
  name?: string;
  phone?: string;
  pixKey?: string;
}

export interface UpdateAffiliateStatusRequest {
  status: 'active' | 'inactive' | 'pending' | 'rejected';
  reason?: string;
}

export interface AffiliateStatsResponse {
  totalAffiliates: number;
  activeAffiliates: number;
  totalCommissions: number;
  totalReferrals: number;
}

export interface AffiliateNetwork {
  affiliate: Affiliate;
  children: AffiliateNetwork[];
  level: number;
}

export interface NetworkTreeNode {
  affiliate: Affiliate;
  children: NetworkTreeNode[];
  level: number;
  totalReferrals: number;
  totalCommissions: number;
  path?: string[];
}

export interface AffiliateQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  level?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface AffiliateFilters {
  status?: string;
  level?: number;
  parentAffiliateId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface WalletValidation {
  isValid: boolean;
  isActive: boolean;
  walletId?: string;
  asaasId?: string;
  error?: string;
}

// Repository Interface
export interface IAffiliateRepository {
  findById(id: string): Promise<Affiliate | null>;
  findByUserId(userId: string): Promise<Affiliate | null>;
  findByReferralCode(referralCode: string): Promise<Affiliate | null>;
  findByWalletId(walletId: string): Promise<Affiliate | null>;
  findAll(filters: AffiliateFilters): Promise<PaginatedResponse<Affiliate>>;
  create(data: CreateAffiliateDTO): Promise<Affiliate>;
  update(id: string, data: UpdateAffiliateDTO): Promise<Affiliate>;
  delete(id: string): Promise<void>;
  getNetworkStats(affiliateId: string): Promise<{
    totalReferrals: number;
    totalSales: number;
    totalCommissionsCents: number;
    networkDepth: number;
  }>;
}

// Response DTOs (Remove PII)
export interface AffiliateResponseDTO {
  id: string;
  name: string;
  referralCode: string;
  level: number;
  status: 'active' | 'inactive' | 'pending';
  totalReferrals: number;
  totalSales: number;
  totalCommissions: number; // in reais
  availableBalance: number; // in reais
  createdAt: string;
}

export interface AffiliateDetailResponseDTO extends AffiliateResponseDTO {
  phone?: string; // Only for own affiliate
  pixKey?: string; // Only for own affiliate
}

export interface AffiliateAdminResponseDTO extends AffiliateResponseDTO {
  email: string;
  phone: string;
  document: string; // Masked for admin
  walletId: string; // Masked for admin
  pixKey?: string;
  dataCadastro: string;
  cidade?: string;
  totalIndicados: number;
  vendasGeradas: number;
  comissoesTotais: number;
  saldoDisponivel: number;
}