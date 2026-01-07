// FAQ Management System - Types
// Created: 06/01/2026
// Author: Kiro AI

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface CreateFAQRequest {
  question: string;
  answer: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateFAQRequest extends Partial<CreateFAQRequest> {
  id: string;
}

export interface FAQFilters {
  search?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}

export interface FAQResponse {
  data: FAQ[];
  total: number;
  page: number;
  limit: number;
}

export interface FAQValidationError {
  field: string;
  message: string;
}

export interface FAQStats {
  total: number;
  active: number;
  inactive: number;
}