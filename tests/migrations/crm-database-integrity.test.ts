/**
 * CRM Database Integrity Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes para validar integridade das migrations e estrutura do banco
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'test-key'
);

describe('CRM Database Integrity', () => {
  beforeAll(async () => {
    // Executar migrations se necessário
    console.log('Verificando estrutura do banco CRM...');
  });

  afterAll(async () => {
    // Cleanup se necessário
  });

  describe('Tabela customers', () => {
    it('deve existir com todas as colunas necessárias', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'customers')
        .order('ordinal_position');

      expect(error).toBeNull();
      expect(data).toBeDefined();

      const columns = data?.map(col => col.column_name) || [];
      
      // Verificar colunas obrigatórias
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('email');
      expect(columns).toContain('phone');
      expect(columns).toContain('cpf_cnpj');
      expect(columns).toContain('source');
      expect(columns).toContain('assigned_to');
      expect(columns).toContain('created_at');
      expect(columns).toContain('updated_at');
      expect(columns).toContain('deleted_at');
    });

    it('deve ter constraints de validação funcionando', async () => {
      // Testar constraint de email inválido
      const { error: emailError } = await supabase
        .from('customers')
        .insert({
          name: 'Teste',
          email: 'email-invalido',
          source: 'manual'
        });

      expect(emailError).toBeDefined();
      expect(emailError?.message).toContain('customers_email_format');
    });

    it('deve ter índices criados corretamente', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'customers');

      expect(error).toBeNull();
      
      const indexes = data?.map(idx => idx.indexname) || [];
      expect(indexes).toContain('idx_customers_email');
      expect(indexes).toContain('idx_customers_phone');
      expect(indexes).toContain('idx_customers_assigned_to');
    });

    it('deve ter RLS habilitado', async () => {
      const { data, error } = await supabase
        .from('pg_tables')
        .select('rowsecurity')
        .eq('tablename', 'customers');

      expect(error).toBeNull();
      expect(data?.[0]?.rowsecurity).toBe(true);
    });
  });

  describe('Tabela customer_tags', () => {
    it('deve existir com estrutura correta', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'customer_tags');

      expect(error).toBeNull();
      
      const columns = data?.map(col => col.column_name) || [];
      expect(columns).toContain('id');
      expect(columns).toContain('name');
      expect(columns).toContain('color');
      expect(columns).toContain('auto_apply_rules');
      expect(columns).toContain('is_system');
    });

    it('deve ter tags padrão inseridas', async () => {
      const { data, error } = await supabase
        .from('customer_tags')
        .select('name, is_system')
        .eq('is_system', true);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);

      const tagNames = data?.map(tag => tag.name) || [];
      expect(tagNames).toContain('Cliente Ativo');
      expect(tagNames).toContain('Indicação');
      expect(tagNames).toContain('Novo Cliente');
    });
  });

  describe('Tabela customer_timeline', () => {
    it('deve existir com ENUM correto', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'customer_timeline')
        .eq('column_name', 'event_type');

      expect(error).toBeNull();
      expect(data?.[0]?.data_type).toBe('USER-DEFINED');
    });

    it('deve ter função add_timeline_event disponível', async () => {
      const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_name', 'add_timeline_event');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(1);
    });
  });

  describe('Tabela conversations', () => {
    it('deve existir com ENUMs corretos', async () => {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'conversations')
        .in('column_name', ['status', 'channel']);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBe(2);
      
      data?.forEach(col => {
        expect(col.data_type).toBe('USER-DEFINED');
      });
    });

    it('deve ter função create_conversation_if_not_exists', async () => {
      const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_name', 'create_conversation_if_not_exists');

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });
  });

  describe('Tabela appointments', () => {
    it('deve existir com constraints de validação', async () => {
      const { data, error } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name')
        .eq('table_name', 'appointments')
        .eq('constraint_type', 'CHECK');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const constraints = data?.map(c => c.constraint_name) || [];
      expect(constraints).toContain('appointments_duration_positive');
      expect(constraints).toContain('appointments_scheduled_future');
    });

    it('deve ter função check_appointment_conflicts', async () => {
      const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_name', 'check_appointment_conflicts');

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });
  });

  describe('Integridade Referencial', () => {
    it('deve ter foreign keys corretas', async () => {
      const { data, error } = await supabase
        .from('information_schema.table_constraints')
        .select('table_name, constraint_name')
        .eq('constraint_type', 'FOREIGN KEY')
        .in('table_name', ['customers', 'customer_tag_assignments', 'customer_timeline', 'conversations', 'messages', 'appointments']);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(5); // Pelo menos 5 foreign keys
    });

    it('deve ter triggers funcionando', async () => {
      const { data, error } = await supabase
        .from('information_schema.triggers')
        .select('trigger_name, event_object_table')
        .in('event_object_table', ['customers', 'customer_tag_assignments', 'appointments']);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      const triggers = data?.map(t => t.trigger_name) || [];
      expect(triggers).toContain('trigger_customers_auto_tags');
      expect(triggers).toContain('trigger_customer_timeline_created');
    });
  });

  describe('Funções Utilitárias', () => {
    it('deve ter função validate_cpf_cnpj funcionando', async () => {
      // Testar CPF válido
      const { data: validCpf, error: errorValid } = await supabase
        .rpc('validate_cpf_cnpj', { doc: '12345678901' });

      expect(errorValid).toBeNull();
      expect(validCpf).toBe(true);

      // Testar CPF inválido
      const { data: invalidCpf, error: errorInvalid } = await supabase
        .rpc('validate_cpf_cnpj', { doc: '123' });

      expect(errorInvalid).toBeNull();
      expect(invalidCpf).toBe(false);
    });

    it('deve ter função apply_automatic_tags funcionando', async () => {
      const { data, error } = await supabase
        .from('information_schema.routines')
        .select('routine_name')
        .eq('routine_name', 'apply_automatic_tags');

      expect(error).toBeNull();
      expect(data!.length).toBe(1);
    });
  });

  describe('Performance e Índices', () => {
    it('deve ter índices GIN para busca full-text', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .like('indexdef', '%gin%')
        .eq('tablename', 'customers');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
    });

    it('deve ter índices compostos para consultas frequentes', async () => {
      const { data, error } = await supabase
        .from('pg_indexes')
        .select('indexname')
        .eq('tablename', 'conversations');

      expect(error).toBeNull();
      
      const indexes = data?.map(idx => idx.indexname) || [];
      expect(indexes).toContain('idx_conversations_status_assigned');
      expect(indexes).toContain('idx_conversations_channel_status');
    });
  });
});