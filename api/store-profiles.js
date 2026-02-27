/**
 * API CONSOLIDADA DE PERFIS DE LOJAS
 * Gerencia perfis de lojas de afiliados logistas
 * 
 * Rotas:
 * - GET/POST ?action=profile (autenticado)
 * - GET ?action=showcase (público)
 * - GET ?action=nearby (público)
 * - GET ?action=by-slug (público)
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  if (!action) {
    return res.status(400).json({ 
      success: false, 
      error: 'Parâmetro "action" é obrigatório' 
    });
  }

  // Inicializar Supabase
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ success: false, error: 'Configuração do servidor incompleta' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Roteamento
  switch (action) {
    case 'profile':
      return handleProfile(req, res, supabase);
    case 'showcase':
      return handleShowcase(req, res, supabase);
    case 'nearby':
      return handleNearby(req, res, supabase);
    case 'by-slug':
      return handleBySlug(req, res, supabase);
    default:
      return res.status(404).json({ success: false, error: 'Action não encontrada' });
  }
}

// ============================================
// HANDLER: PROFILE (GET/POST)
// ============================================
async function handleProfile(req, res, supabase) {
  // Autenticação obrigatória
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de autenticação não fornecido' 
    });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token inválido ou expirado' 
    });
  }

  if (req.method === 'GET') {
    return handleGetProfile(req, res, supabase, user);
  } else if (req.method === 'POST') {
    return handleSaveProfile(req, res, supabase, user);
  } else {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET ou POST.' 
    });
  }
}

// GET Profile
async function handleGetProfile(req, res, supabase, user) {
  try {
    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, affiliate_type')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Verificar se é logista
    if (affiliate.affiliate_type !== 'logista') {
      return res.status(403).json({ 
        success: false, 
        error: 'Apenas logistas podem ter perfil de loja' 
      });
    }

    // Buscar perfil da loja
    const { data: profile, error: profileError } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('affiliate_id', affiliate.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    return res.status(200).json({ 
      success: true, 
      data: profile || null 
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar perfil da loja' 
    });
  }
}

// POST Profile (Create/Update)
async function handleSaveProfile(req, res, supabase, user) {
  try {
    const profileData = req.body;

    // Buscar affiliate_id do usuário
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, affiliate_type, name, email, referral_code')
      .eq('user_id', user.id)
      .single();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Verificar se é logista
    if (affiliate.affiliate_type !== 'logista') {
      return res.status(403).json({ 
        success: false, 
        error: 'Apenas logistas podem criar perfil de loja' 
      });
    }

    // Validações
    if (!profileData.store_name || !profileData.city || !profileData.state) {
      return res.status(400).json({ 
        success: false, 
        error: 'Campos obrigatórios: store_name, city, state' 
      });
    }

    // Gerar slug se não fornecido
    if (!profileData.slug) {
      profileData.slug = generateSlug(profileData.store_name);
    }

    // Verificar se perfil já existe
    const { data: existingProfile } = await supabase
      .from('store_profiles')
      .select('id')
      .eq('affiliate_id', affiliate.id)
      .single();

    // Remover campos que não existem na tabela store_profiles
    const { affiliate_name, affiliate_email, referral_code, ...cleanProfileData } = profileData;

    let result;
    if (existingProfile) {
      // Atualizar
      const { data, error } = await supabase
        .from('store_profiles')
        .update({
          ...cleanProfileData,
          affiliate_id: affiliate.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Criar
      const { data, error } = await supabase
        .from('store_profiles')
        .insert({
          ...cleanProfileData,
          affiliate_id: affiliate.id
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({ 
      success: true, 
      data: result 
    });
  } catch (error) {
    console.error('Erro ao salvar perfil:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao salvar perfil da loja' 
    });
  }
}

// ============================================
// HANDLER: SHOWCASE (GET)
// ============================================
async function handleShowcase(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET.' 
    });
  }

  try {
    const { page = 1, limit = 20, city, state, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query base
    let query = supabase
      .from('store_profiles')
      .select('*', { count: 'exact' })
      .eq('is_visible_in_showcase', true)
      .order('created_at', { ascending: false });

    // Filtros
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (state) {
      query = query.eq('state', state);
    }
    if (search) {
      query = query.or(`store_name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: stores, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      data: {
        stores: stores || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar lojas:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar lojas' 
    });
  }
}

// ============================================
// HANDLER: NEARBY (GET)
// ============================================
async function handleNearby(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET.' 
    });
  }

  try {
    const { latitude, longitude, radius = 10000, limit = 20 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetros obrigatórios: latitude, longitude' 
      });
    }

    // Tentar usar função RPC (PostGIS)
    const { data: stores, error } = await supabase
      .rpc('get_nearby_stores', {
        user_lat: parseFloat(latitude),
        user_lng: parseFloat(longitude),
        radius_meters: parseInt(radius),
        max_results: parseInt(limit)
      });

    if (error) {
      // Fallback: Haversine formula
      console.warn('PostGIS não disponível, usando Haversine:', error);
      return handleNearbyFallback(req, res, supabase);
    }

    return res.status(200).json({ 
      success: true, 
      data: {
        stores: stores || [],
        center: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        radius: parseInt(radius)
      }
    });
  } catch (error) {
    console.error('Erro ao buscar lojas próximas:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar lojas próximas' 
    });
  }
}

// Fallback Haversine
async function handleNearbyFallback(req, res, supabase) {
  const { latitude, longitude, radius = 10000, limit = 20 } = req.query;

  const { data: stores, error } = await supabase
    .from('store_profiles')
    .select('*')
    .eq('is_visible_in_showcase', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  if (error) throw error;

  // Calcular distância com Haversine
  const storesWithDistance = stores.map(store => {
    const distance = haversineDistance(
      parseFloat(latitude),
      parseFloat(longitude),
      store.latitude,
      store.longitude
    );
    return { ...store, distance };
  });

  // Filtrar por raio e ordenar
  const nearbyStores = storesWithDistance
    .filter(store => store.distance <= parseInt(radius))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, parseInt(limit));

  return res.status(200).json({ 
    success: true, 
    data: {
      stores: nearbyStores,
      center: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      },
      radius: parseInt(radius)
    }
  });
}

// ============================================
// HANDLER: BY-SLUG (GET)
// ============================================
async function handleBySlug(req, res, supabase) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido. Use GET.' 
    });
  }

  try {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ 
        success: false, 
        error: 'Parâmetro obrigatório: slug' 
      });
    }

    const { data: store, error } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('slug', slug)
      .eq('is_visible_in_showcase', true)
      .single();

    if (error && error.code === 'PGRST116') {
      return res.status(404).json({ 
        success: false, 
        error: 'Loja não encontrada' 
      });
    }

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      data: store 
    });
  } catch (error) {
    console.error('Erro ao buscar loja:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro ao buscar loja' 
    });
  }
}

// ============================================
// UTILITÁRIOS
// ============================================

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
