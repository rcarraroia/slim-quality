/**
 * Rotas de Autenticação JWT
 * Task 0.2: Sistema de autenticação para admins
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/supabase';

const router = Router();

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validação básica
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    // Buscar admin
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !admin) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Validar senha
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    // Verificar variáveis JWT
    if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
      console.error('Variáveis JWT_SECRET ou JWT_REFRESH_SECRET não configuradas');
      return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }
    
    // Gerar tokens
    const accessToken = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    
    const refreshToken = jwt.sign(
      { adminId: admin.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    // Salvar refresh token
    await supabase.from('admin_sessions').insert({
      admin_id: admin.id,
      refresh_token: refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    });
    
    // Atualizar last_login
    await supabase
      .from('admins')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', admin.id);
    
    res.json({
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// REFRESH TOKEN
router.post('/refresh', async (req, res) => {
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
});

// LOGOUT
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token é obrigatório' });
    }
    
    // Deletar sessão
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('refresh_token', refreshToken);
    
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ME (dados do admin logado)
import { verifyAdmin, AdminRequest } from '../middleware/auth';

router.get('/me', verifyAdmin, async (req: AdminRequest, res) => {
  res.json({ admin: req.admin });
});

export default router;