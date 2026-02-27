import { supabase } from '@/config/supabase';

export interface StoreProfile {
  id: string;
  store_name: string;
  slug: string;
  description?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  logo_url?: string;
  banner_url?: string;
  business_hours?: BusinessHours;
  is_visible_in_showcase: boolean;
  affiliate_name?: string;
  affiliate_email?: string;
  referral_code?: string;
  distance?: number;
}

export interface BusinessHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface ShowcaseFilters {
  page?: number;
  limit?: number;
  city?: string;
  state?: string;
  search?: string;
}

export interface ShowcaseResponse {
  stores: StoreProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface NearbyFilters {
  latitude: number;
  longitude: number;
  radius?: number;
  limit?: number;
}

export interface NearbyResponse {
  stores: StoreProfile[];
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number;
}

class StoreFrontendService {
  private apiUrl = import.meta.env.VITE_API_URL || '/api';

  /**
   * Buscar lojas visíveis na vitrine pública
   */
  async getShowcase(filters: ShowcaseFilters = {}): Promise<ShowcaseResponse> {
    try {
      const params = new URLSearchParams({
        action: 'showcase',
        page: String(filters.page || 1),
        limit: String(filters.limit || 20),
        ...(filters.city && { city: filters.city }),
        ...(filters.state && { state: filters.state }),
        ...(filters.search && { search: filters.search })
      });

      const response = await fetch(`${this.apiUrl}/store-profiles?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar lojas');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar lojas');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar lojas:', error);
      throw error;
    }
  }

  /**
   * Buscar lojas próximas por coordenadas
   */
  async getNearby(filters: NearbyFilters): Promise<NearbyResponse> {
    try {
      const params = new URLSearchParams({
        action: 'nearby',
        latitude: String(filters.latitude),
        longitude: String(filters.longitude),
        radius: String(filters.radius || 10000),
        limit: String(filters.limit || 20)
      });

      const response = await fetch(`${this.apiUrl}/store-profiles?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar lojas próximas');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar lojas próximas');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar lojas próximas:', error);
      throw error;
    }
  }

  /**
   * Buscar loja por slug
   */
  async getBySlug(slug: string): Promise<StoreProfile> {
    try {
      const params = new URLSearchParams({
        action: 'by-slug',
        slug
      });

      const response = await fetch(`${this.apiUrl}/store-profiles?${params}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar loja');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar loja');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar loja:', error);
      throw error;
    }
  }

  /**
   * Buscar perfil de loja do logista autenticado
   */
  async getProfile(): Promise<StoreProfile | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams({
        action: 'profile'
      });

      const response = await fetch(`${this.apiUrl}/store-profiles?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Erro ao buscar perfil');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar perfil');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      throw error;
    }
  }

  /**
   * Criar ou atualizar perfil de loja
   */
  async saveProfile(profile: Partial<StoreProfile>): Promise<StoreProfile> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const params = new URLSearchParams({
        action: 'profile'
      });

      const response = await fetch(`${this.apiUrl}/store-profiles?${params}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(profile)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao salvar perfil');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Erro ao salvar perfil');
      }

      return data.data;
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      throw error;
    }
  }

  /**
   * Verificar se loja está aberta agora
   */
  isStoreOpen(business_hours?: BusinessHours): boolean {
    if (!business_hours) return false;

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()] as keyof BusinessHours;
    const schedule = business_hours[currentDay];

    if (!schedule || schedule.closed) return false;

    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    return currentTime >= schedule.open && currentTime <= schedule.close;
  }

  /**
   * Formatar horário de funcionamento para exibição
   */
  formatBusinessHours(business_hours?: BusinessHours): string[] {
    if (!business_hours) return [];

    const dayLabels: Record<keyof BusinessHours, string> = {
      monday: 'Segunda',
      tuesday: 'Terça',
      wednesday: 'Quarta',
      thursday: 'Quinta',
      friday: 'Sexta',
      saturday: 'Sábado',
      sunday: 'Domingo'
    };

    return Object.entries(business_hours).map(([day, schedule]) => {
      const label = dayLabels[day as keyof BusinessHours];
      if (schedule.closed) {
        return `${label}: Fechado`;
      }
      return `${label}: ${schedule.open} - ${schedule.close}`;
    });
  }
}

export const storeFrontendService = new StoreFrontendService();
