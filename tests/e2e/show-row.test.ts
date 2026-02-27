/**
 * Testes E2E - ETAPA 3: Show Row
 * Valida experiência completa do usuário
 */

import { test, expect } from '@playwright/test';

test.describe('Show Row - E2E', () => {
  test.describe('Fluxo Logista', () => {
    test('Logista deve ver menu Show Row e acessar página', async ({ page }) => {
      // Login como Logista
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'logista-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');

      // Aguardar redirecionamento para dashboard
      await page.waitForURL('/afiliados/dashboard');

      // Verificar que menu Show Row aparece
      const showRowMenu = page.locator('text=Show Row');
      await expect(showRowMenu).toBeVisible();

      // Clicar no menu
      await showRowMenu.click();

      // Verificar que página carregou
      await page.waitForURL('/afiliados/dashboard/show-row');
      await expect(page.locator('h2:has-text("Show Row")')).toBeVisible();

      // Verificar que produtos são exibidos (se houver)
      const productsGrid = page.locator('[class*="grid"]');
      await expect(productsGrid).toBeVisible();
    });

    test('Logista deve conseguir abrir modal de checkout', async ({ page }) => {
      // Login e navegação
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'logista-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/afiliados/dashboard');

      // Navegar para Show Row
      await page.click('text=Show Row');
      await page.waitForURL('/afiliados/dashboard/show-row');

      // Verificar se há produtos
      const productCard = page.locator('[class*="Card"]').first();
      if (await productCard.isVisible()) {
        // Clicar em "Ver Detalhes"
        await productCard.locator('button:has-text("Ver Detalhes")').click();

        // Verificar que modal abre
        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible();

        // Verificar que checkout está presente
        await expect(modal.locator('text=Finalizar Compra')).toBeVisible();
      }
    });
  });

  test.describe('Fluxo Individual', () => {
    test('Individual NÃO deve ver menu Show Row', async ({ page }) => {
      // Login como Individual
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'individual-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');

      // Aguardar redirecionamento para dashboard
      await page.waitForURL('/afiliados/dashboard');

      // Verificar que menu Show Row NÃO aparece
      const showRowMenu = page.locator('text=Show Row');
      await expect(showRowMenu).not.toBeVisible();
    });

    test('Individual deve ser redirecionado ao tentar acessar via URL', async ({ page }) => {
      // Login como Individual
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'individual-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/afiliados/dashboard');

      // Tentar acessar via URL direta
      await page.goto('/afiliados/dashboard/show-row');

      // Verificar redirecionamento para dashboard
      await page.waitForURL('/afiliados/dashboard');

      // Verificar toast de erro
      await expect(page.locator('text=Acesso negado')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('Deve exibir empty state quando não há produtos ativos', async ({ page, context }) => {
      // Desativar todos os produtos Show Row via API
      // (assumindo que há uma forma de fazer isso via admin)

      // Login como Logista
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'logista-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/afiliados/dashboard');

      // Verificar que menu Show Row NÃO aparece (sem produtos ativos)
      const showRowMenu = page.locator('text=Show Row');
      await expect(showRowMenu).not.toBeVisible();

      // Tentar acessar via URL direta
      await page.goto('/afiliados/dashboard/show-row');

      // Verificar empty state
      await expect(page.locator('text=Nenhum produto Show Row disponível')).toBeVisible();
    });
  });

  test.describe('Responsividade', () => {
    test('Grid deve ser responsivo em mobile', async ({ page }) => {
      // Configurar viewport mobile
      await page.setViewportSize({ width: 375, height: 667 });

      // Login e navegação
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'logista-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/afiliados/dashboard');

      // Navegar para Show Row
      await page.click('text=Show Row');
      await page.waitForURL('/afiliados/dashboard/show-row');

      // Verificar que grid está em 1 coluna
      const grid = page.locator('[class*="grid"]');
      const gridClass = await grid.getAttribute('class');
      expect(gridClass).toContain('grid-cols-1');
    });

    test('Grid deve ter 2 colunas em desktop', async ({ page }) => {
      // Configurar viewport desktop
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Login e navegação
      await page.goto('/entrar');
      await page.fill('input[type="email"]', 'logista-test@test.com');
      await page.fill('input[type="password"]', 'test123456');
      await page.click('button[type="submit"]');
      await page.waitForURL('/afiliados/dashboard');

      // Navegar para Show Row
      await page.click('text=Show Row');
      await page.waitForURL('/afiliados/dashboard/show-row');

      // Verificar que grid está em 2 colunas
      const grid = page.locator('[class*="grid"]');
      const gridClass = await grid.getAttribute('class');
      expect(gridClass).toContain('md:grid-cols-2');
    });
  });
});
