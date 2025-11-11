/**
 * Referral Tracker Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Rastreamento de links de afiliados
 * - Registro de cliques com deduplicação
 * - Rastreamento de conversões
 * - Analytics de performance
 * - Integração com sistema de pedidos
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  ReferralClick,
  ReferralConversion,
  AffiliateAnalytics,
  ServiceResponse,
} from '@/types/affiliate.types';

export interface TrackClickRequest {
  referralCode: string;
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  sessionId?: string;
}

export interface TrackConversionRequest {
  orderId: string;
  referralCode: string;
}

export class ReferralTrackerService {
  /**
   * Registra clique em link de afiliado
   */
  async trackClick(request: TrackClickRequest): Promise<ServiceResponse<ReferralClick>> {
    try {
      Logger.info('ReferralTracker', 'Tracking click', {
        referralCode: request.referralCode,
        ipAddress: request.ipAddress,
        utmSource: request.utmSource,
      });

      // Usar função do banco que já faz deduplicação
      const { data: clickId, error } = await supabase
        .rpc('track_referral_click', {
          p_referral_code: request.referralCode,
          p_ip_address: request.ipAddress,
          p_user_agent: request.userAgent,
          p_referer: request.referer,
          p_utm_source: request.utmSource,
          p_utm_medium: request.utmMedium,
          p_utm_campaign: request.utmCampaign,
          p_utm_term: request.utmTerm,
          p_utm_content: request.utmContent,
          p_session_id: request.sessionId,
        })
        .single();

      if (error) {
        Logger.error('ReferralTracker', 'Error tracking click', error);
        return {
          success: false,
          error: 'Erro ao registrar clique',
          code: 'TRACK_CLICK_ERROR',
        };
      }

      // Buscar dados completos do clique
      const { data: clickData } = await supabase
        .from('referral_clicks')
        .select('*')
        .eq('id', clickId)
        .single();

      Logger.info('ReferralTracker', 'Click tracked successfully', {
        clickId,
        referralCode: request.referralCode,
        isNewClick: true, // A função retorna o ID mesmo se for deduplicado
      });

      return { success: true, data: clickData };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in trackClick', error as Error);
      return {
        success: false,
        error: 'Erro interno ao registrar clique',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Registra conversão (venda) de afiliado
   */
  async trackConversion(request: TrackConversionRequest): Promise<ServiceResponse<ReferralConversion>> {
    try {
      Logger.info('ReferralTracker', 'Tracking conversion', {
        orderId: request.orderId,
        referralCode: request.referralCode,
      });

      // Usar função do banco que já faz toda a lógica
      const { data: conversionId, error } = await supabase
        .rpc('track_referral_conversion', {
          p_order_id: request.orderId,
          p_referral_code: request.referralCode,
        })
        .single();

      if (error) {
        Logger.error('ReferralTracker', 'Error tracking conversion', error);
        return {
          success: false,
          error: 'Erro ao registrar conversão',
          code: 'TRACK_CONVERSION_ERROR',
        };
      }

      // Buscar dados completos da conversão
      const { data: conversionData } = await supabase
        .from('referral_conversions')
        .select('*')
        .eq('id', conversionId)
        .single();

      Logger.info('ReferralTracker', 'Conversion tracked successfully', {
        conversionId,
        orderId: request.orderId,
        referralCode: request.referralCode,
      });

      return { success: true, data: conversionData };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in trackConversion', error as Error);
      return {
        success: false,
        error: 'Erro interno ao registrar conversão',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém analytics de um afiliado
   */
  async getAffiliateAnalytics(
    affiliateId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ServiceResponse<AffiliateAnalytics>> {
    try {
      const { data: analytics, error } = await supabase
        .rpc('get_referral_analytics', {
          p_affiliate_id: affiliateId,
          p_start_date: startDate,
          p_end_date: endDate,
        })
        .single();

      if (error) {
        Logger.error('ReferralTracker', 'Error getting analytics', error);
        return {
          success: false,
          error: 'Erro ao obter analytics',
          code: 'GET_ANALYTICS_ERROR',
        };
      }

      return { success: true, data: analytics };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getAffiliateAnalytics', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter analytics',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém cliques de um afiliado
   */
  async getAffiliateClicks(
    affiliateId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResponse<ReferralClick[]>> {
    try {
      const { data: clicks, error } = await supabase
        .from('referral_clicks')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('clicked_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        Logger.error('ReferralTracker', 'Error getting clicks', error);
        return {
          success: false,
          error: 'Erro ao obter cliques',
          code: 'GET_CLICKS_ERROR',
        };
      }

      return { success: true, data: clicks || [] };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getAffiliateClicks', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter cliques',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém conversões de um afiliado
   */
  async getAffiliateConversions(
    affiliateId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ServiceResponse<ReferralConversion[]>> {
    try {
      const { data: conversions, error } = await supabase
        .from('referral_conversions')
        .select(`
          *,
          orders!inner(
            order_number,
            customer_name,
            total_cents
          )
        `)
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        Logger.error('ReferralTracker', 'Error getting conversions', error);
        return {
          success: false,
          error: 'Erro ao obter conversões',
          code: 'GET_CONVERSIONS_ERROR',
        };
      }

      return { success: true, data: conversions || [] };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getAffiliateConversions', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter conversões',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém estatísticas de cliques por período
   */
  async getClickStats(
    affiliateId: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
    days: number = 30
  ): Promise<ServiceResponse<Array<{ date: string; clicks: number; uniqueClicks: number }>>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let dateFormat: string;
      switch (groupBy) {
        case 'week':
          dateFormat = 'YYYY-"W"WW';
          break;
        case 'month':
          dateFormat = 'YYYY-MM';
          break;
        default:
          dateFormat = 'YYYY-MM-DD';
      }

      const { data: stats, error } = await supabase
        .from('referral_clicks')
        .select('clicked_at, ip_address')
        .eq('affiliate_id', affiliateId)
        .gte('clicked_at', startDate.toISOString());

      if (error) {
        Logger.error('ReferralTracker', 'Error getting click stats', error);
        return {
          success: false,
          error: 'Erro ao obter estatísticas de cliques',
          code: 'GET_CLICK_STATS_ERROR',
        };
      }

      // Agrupar dados por período
      const groupedStats = new Map<string, { clicks: number; uniqueIps: Set<string> }>();

      (stats || []).forEach(click => {
        const date = new Date(click.clicked_at);
        let key: string;

        switch (groupBy) {
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        if (!groupedStats.has(key)) {
          groupedStats.set(key, { clicks: 0, uniqueIps: new Set() });
        }

        const stat = groupedStats.get(key)!;
        stat.clicks++;
        stat.uniqueIps.add(click.ip_address);
      });

      // Converter para array
      const result = Array.from(groupedStats.entries()).map(([date, stat]) => ({
        date,
        clicks: stat.clicks,
        uniqueClicks: stat.uniqueIps.size,
      })).sort((a, b) => a.date.localeCompare(b.date));

      return { success: true, data: result };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getClickStats', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter estatísticas',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém top países por cliques
   */
  async getTopCountries(
    affiliateId: string,
    limit: number = 10
  ): Promise<ServiceResponse<Array<{ country: string; clicks: number }>>> {
    try {
      const { data: countries, error } = await supabase
        .from('referral_clicks')
        .select('country')
        .eq('affiliate_id', affiliateId)
        .not('country', 'is', null);

      if (error) {
        Logger.error('ReferralTracker', 'Error getting top countries', error);
        return {
          success: false,
          error: 'Erro ao obter países',
          code: 'GET_COUNTRIES_ERROR',
        };
      }

      // Contar países
      const countryCount = new Map<string, number>();
      (countries || []).forEach(item => {
        const country = item.country;
        countryCount.set(country, (countryCount.get(country) || 0) + 1);
      });

      // Converter para array e ordenar
      const result = Array.from(countryCount.entries())
        .map(([country, clicks]) => ({ country, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, limit);

      return { success: true, data: result };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getTopCountries', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter países',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém top fontes UTM
   */
  async getTopUtmSources(
    affiliateId: string,
    limit: number = 10
  ): Promise<ServiceResponse<Array<{ source: string; clicks: number }>>> {
    try {
      const { data: sources, error } = await supabase
        .from('referral_clicks')
        .select('utm_source')
        .eq('affiliate_id', affiliateId)
        .not('utm_source', 'is', null);

      if (error) {
        Logger.error('ReferralTracker', 'Error getting UTM sources', error);
        return {
          success: false,
          error: 'Erro ao obter fontes UTM',
          code: 'GET_UTM_SOURCES_ERROR',
        };
      }

      // Contar fontes
      const sourceCount = new Map<string, number>();
      (sources || []).forEach(item => {
        const source = item.utm_source;
        sourceCount.set(source, (sourceCount.get(source) || 0) + 1);
      });

      // Converter para array e ordenar
      const result = Array.from(sourceCount.entries())
        .map(([source, clicks]) => ({ source, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, limit);

      return { success: true, data: result };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in getTopUtmSources', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter fontes UTM',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Atualiza status de conversão
   */
  async updateConversionStatus(
    conversionId: string,
    status: 'pending' | 'processed' | 'paid' | 'cancelled'
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('referral_conversions')
        .update({
          status,
          processed_at: status === 'processed' ? new Date().toISOString() : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversionId);

      if (error) {
        Logger.error('ReferralTracker', 'Error updating conversion status', error);
        return {
          success: false,
          error: 'Erro ao atualizar status da conversão',
          code: 'UPDATE_CONVERSION_ERROR',
        };
      }

      Logger.info('ReferralTracker', 'Conversion status updated', {
        conversionId,
        newStatus: status,
      });

      return { success: true };

    } catch (error) {
      Logger.error('ReferralTracker', 'Error in updateConversionStatus', error as Error);
      return {
        success: false,
        error: 'Erro interno ao atualizar conversão',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

export const referralTrackerService = new ReferralTrackerService();