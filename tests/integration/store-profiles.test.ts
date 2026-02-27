/**
 * Testes de Integração - ETAPA 4: Vitrine Pública de Logistas
 * Valida estrutura, arquivos e configuração do sistema de perfis de lojas
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Store Profiles - Integração ETAPA 4', () => {
  describe('Estrutura de Arquivos - Backend', () => {
    it('Migration store_profiles deve existir', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      expect(storeMigration).toBeDefined();
    });

    it('API store-profiles.js deve existir', () => {
      const apiPath = path.resolve(process.cwd(), 'api', 'store-profiles.js');
      const exists = fs.existsSync(apiPath);
      expect(exists).toBe(true);
    });

    it('API deve ter tamanho maior que zero', () => {
      const apiPath = path.resolve(process.cwd(), 'api', 'store-profiles.js');
      const stats = fs.statSync(apiPath);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Estrutura de Arquivos - Frontend Componentes', () => {
    it('Componente StoreCard deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Componente StoreFilters deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/store/StoreFilters.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('StoreCard deve usar componentes shadcn/ui', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('@/components/ui/card');
      expect(content).toContain('Card');
    });

    it('StoreCard deve usar variáveis CSS', () => {
      const filePath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      // Não deve ter cores hardcoded
      expect(content).not.toContain('bg-indigo-');
      expect(content).not.toContain('text-slate-');
    });
  });

  describe('Estrutura de Arquivos - Frontend Páginas', () => {
    it('Página Showcase deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/lojas/Showcase.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Página StoreDetail deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/lojas/StoreDetail.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Página Loja (dashboard afiliado) deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/afiliados/dashboard/Loja.tsx');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Showcase deve usar StoreCard', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/lojas/Showcase.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('StoreCard');
      expect(content).toContain('@/components/store/StoreCard');
    });

    it('Showcase deve usar StoreFilters', () => {
      const filePath = path.resolve(process.cwd(), 'src/pages/lojas/Showcase.tsx');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('StoreFilters');
      expect(content).toContain('@/components/store/StoreFilters');
    });
  });

  describe('Estrutura de Arquivos - Serviços', () => {
    it('Serviço store.service.ts deve existir', () => {
      const filePath = path.resolve(process.cwd(), 'src/services/frontend/store.service.ts');
      const exists = fs.existsSync(filePath);
      expect(exists).toBe(true);
    });

    it('Serviço deve ter métodos principais', () => {
      const filePath = path.resolve(process.cwd(), 'src/services/frontend/store.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('getProfile');
      expect(content).toContain('saveProfile');
      expect(content).toContain('getShowcase');
      expect(content).toContain('getNearby');
      expect(content).toContain('getBySlug');
    });

    it('Serviço deve usar API store-profiles', () => {
      const filePath = path.resolve(process.cwd(), 'src/services/frontend/store.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('store-profiles'); // URL da API
    });
  });

  describe('Rotas e Navegação', () => {
    it('Rotas de lojas devem estar em App.tsx', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('/lojas');
      expect(content).toContain('Showcase');
    });

    it('Rota de detalhes deve estar em App.tsx', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('/lojas/:slug');
      expect(content).toContain('StoreDetail');
    });

    it('Rota de gestão deve estar em App.tsx', () => {
      const appPath = path.resolve(process.cwd(), 'src/App.tsx');
      const content = fs.readFileSync(appPath, 'utf-8');
      expect(content).toContain('path="loja"');
      expect(content).toContain('Loja');
    });

    it('Menu deve ter link para Loja no dashboard', () => {
      const layoutPath = path.resolve(process.cwd(), 'src/layouts/AffiliateDashboardLayout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf-8');
      expect(content).toContain('loja');
      expect(content).toContain('Loja');
    });
  });

  describe('Migration SQL', () => {
    it('Migration deve criar tabela store_profiles', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('CREATE TABLE');
        expect(content).toContain('store_profiles');
      }
    });

    it('Migration deve ter campos obrigatórios', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('affiliate_id');
        expect(content).toContain('store_name');
        expect(content).toContain('slug');
        expect(content).toContain('street'); // address está como street
        expect(content).toContain('city');
        expect(content).toContain('state');
        expect(content).toContain('location'); // coordenadas estão em location (PostGIS)
      }
    });

    it('Migration deve ter suporte PostGIS', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('PostGIS'); // Comentário menciona PostGIS
        expect(content).toContain('GEOGRAPHY'); // Tipo de dado PostGIS
      }
    });

    it('Migration deve ter função get_nearby_stores', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('get_nearby_stores');
        expect(content).toContain('CREATE OR REPLACE FUNCTION');
      }
    });

    it('Migration deve ter políticas RLS', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('ENABLE ROW LEVEL SECURITY');
        expect(content).toContain('CREATE POLICY');
      }
    });

    it('Migration deve ter índices', () => {
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations');
      const files = fs.readdirSync(migrationPath);
      const storeMigration = files.find(f => f.includes('create_store_profiles'));
      
      if (storeMigration) {
        const migrationFile = path.join(migrationPath, storeMigration);
        const content = fs.readFileSync(migrationFile, 'utf-8');
        expect(content).toContain('CREATE INDEX');
        expect(content).toContain('idx_store_profiles');
      }
    });
  });

  describe('TypeScript e Tipos', () => {
    it('Serviço deve ter tipos definidos', () => {
      const filePath = path.resolve(process.cwd(), 'src/services/frontend/store.service.ts');
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('interface');
      expect(content).toContain('StoreProfile');
    });

    it('Componentes devem ter props tipadas', () => {
      const storeCardPath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(storeCardPath, 'utf-8');
      expect(content).toContain('interface');
      expect(content).toContain('Props');
    });
  });

  describe('Design System', () => {
    it('Componentes devem usar variáveis CSS', () => {
      const storeCardPath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(storeCardPath, 'utf-8');
      // Verificar que não usa cores hardcoded
      expect(content).not.toContain('bg-indigo-600');
      expect(content).not.toContain('text-slate-600');
    });

    it('Componentes devem usar shadcn/ui', () => {
      const storeCardPath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(storeCardPath, 'utf-8');
      expect(content).toContain('@/components/ui/');
    });

    it('Componentes devem ter transition-colors', () => {
      const storeCardPath = path.resolve(process.cwd(), 'src/components/store/StoreCard.tsx');
      const content = fs.readFileSync(storeCardPath, 'utf-8');
      expect(content).toContain('transition');
    });
  });

  describe('Documentação', () => {
    it('Documentação da ETAPA 4 deve existir', () => {
      const docPath = path.resolve(process.cwd(), '.context/docs/etapa4-phase6-documentation.md');
      const exists = fs.existsSync(docPath);
      expect(exists).toBe(true);
    });

    it('Documentação deve conter visão geral', () => {
      const docPath = path.resolve(process.cwd(), '.context/docs/etapa4-phase6-documentation.md');
      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('Vitrine Pública');
      expect(content).toContain('Logistas');
    });

    it('Documentação deve conter API reference', () => {
      const docPath = path.resolve(process.cwd(), '.context/docs/etapa4-phase6-documentation.md');
      const content = fs.readFileSync(docPath, 'utf-8');
      expect(content).toContain('API');
      expect(content).toContain('store-profiles');
    });
  });
});
