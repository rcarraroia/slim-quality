/**
 * Vercel Function - Refresh Token
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }
    
    if (!process.env.JWT_REFRESH_SECRET) {
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }
    
    // Validar refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET) as any;
    
    // Verificar se token existe no banco
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('admin_id', decoded.adminId)
      .gt('expires_at', new Date().toISOString())
      .single();
    
    if (!session) {
      return res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    }
    
    // Buscar admin
    const { data: admin } = await supabase
      .from('admins')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single();
    
    if (!admin) {
      return res.status(401).json({ error: 'Admin não encontrado ou inativo' });
    }
    
    // Gerar novo access token
    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '1d' }
    );
    
    res.json({ accessToken });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Refresh token expirado' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    console.error('Erro no refresh:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}