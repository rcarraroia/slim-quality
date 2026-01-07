/**
 * Testes de Autenticação JWT
 * Task 0.6: Validar sistema de autenticação
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../server';

describe('Auth API', () => {
  let accessToken: string;
  let refreshToken: string;

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'renato@slimquality.com.br',
          password: 'Admin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('admin');
      expect(response.body.admin.email).toBe('renato@slimquality.com.br');
      expect(response.body.admin.role).toBe('super_admin');

      // Salvar tokens para próximos testes
      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'wrong@email.com',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Credenciais inválidas');
    });

    it('should reject missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@test.com'
          // password missing
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Email e senha são obrigatórios');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return admin data with valid token', async () => {
      // Primeiro fazer login para obter token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'renato@slimquality.com.br',
          password: 'Admin@123'
        });

      const token = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.admin).toHaveProperty('adminId');
      expect(response.body.admin).toHaveProperty('email');
      expect(response.body.admin).toHaveProperty('role');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token de autorização ausente ou inválido');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token inválido');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      // Primeiro fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'renato@slimquality.com.br',
          password: 'Admin@123'
        });

      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Refresh token inválido');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Primeiro fazer login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'renato@slimquality.com.br',
          password: 'Admin@123'
        });

      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logout realizado com sucesso');
    });
  });
});