/**
 * Testes de Integração - ETAPA 3: Show Row
 * Valida estrutura e configuração do controle de acesso
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Show Row - Integração', () => {
  describe('Estrutura de Arquivos', () => {
    it('Página ShowRow.tsx deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/afiliados/dashboard/ShowRow.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Migration RLS deve existir', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const rlsMigration = files.find(f => f.includes('add_show_row_rls'));
      expect(rlsMigration).toBeDefined();
    });

    it('Rota show-row deve estar configurada em App.tsx', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('show-row');
      expect(content).toContain('ShowRow');
    });
  });

  describe('Serviços', () => {
    it('AffiliateData deve ter campo affiliate_type no serviço', () => {
      const servicePath = path.resolve(process.cwd(), 'src/services/frontend/affiliate.service.ts');
      const content = fs.readFileSync(servicePath, 'utf-8');
      expect(content).toContain('affiliate_type');
      expect(content).toContain("'individual' | 'logista'");
    });

    it('AffiliateDashboardLayout deve ter função checkShowRowAvailability', () => {
      const layoutPath = path.resolve(process.cwd(), 'src/layouts/AffiliateDashboardLayout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('checkShowRowAvailability');
      expect(content).toContain('showShowRowMenu');
    });

    it('AffiliateDashboardLayout deve ter export default', () => {
      const layoutPath = path.resolve(process.cwd(), 'src/layouts/AffiliateDashboardLayout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('export default AffiliateDashboardLayout');
    });
  });

  describe('Documentação', () => {
    it('AFFILIATE_FEATURES.md deve existir', () => {
      const docPath = path.resolve(process.cwd(), 'docs/AFFILIATE_FEATURES.md');
      const exists = fs.existsSync(docPath);
      expect(exists).toBe(true);
    });

    it('AFFILIATE_FEATURES.md deve conter seção Show Row', () => {
      const docPath = path.resolve(process.cwd(), 'docs/AFFILIATE_FEATURES.md');
      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('Show Row');
      expect(content).toContain('Logista');
      expect(content).toContain('RLS');
      expect(content).toContain('show_row_access_control');
    });
  });

  describe('Migration SQL', () => {
    it('Migration deve conter política RLS', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const rlsMigration = files.find(f => f.includes('add_show_row_rls'));
      
      if (rlsMigration) {
        const migrationFile = path.join(migrationPath, rlsMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('show_row_access_control');
        expect(content).toContain('affiliate_type');
        expect(content).toContain('logista');
      }
    });
  });
});
