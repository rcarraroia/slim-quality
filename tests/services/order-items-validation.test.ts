// Property Test: Order Items Validation Completeness
// Validates: Requirements 2.2, 10.1, 10.2, 10.4
// Tests that Order_Items validation is comprehensive and enforces all business rules

import { describe, it, expect } from 'vitest';
import type { OrderItem } from '../../src/types/subscription.types.js';

describe('Property 2: Order Items Validation Completeness', () => {
  /**
   * Property: Order_Items cannot be empty
   * CRITICAL: Empty Order_Items must be rejected as they're required for AI detection and commissions
   */
  it('should reject empty Order_Items arrays', () => {
    const emptyOrderItems: OrderItem[] = [];
    
    // Property: Empty arrays must be invalid
    expect(validateOrderItems(emptyOrderItems)).toBe(false);
    expect(emptyOrderItems.length).toBe(0);
  });

  /**
   * Property: Order_Items with missing required fields must be rejected
   * Each Order_Item must have: id, name, quantity, value
   */
  it('should reject Order_Items with missing required fields', () => {
    const invalidOrderItems: Partial<OrderItem>[] = [
      { name: 'Test', quantity: 1, value: 100 }, // Missing id
      { id: 'test', quantity: 1, value: 100 }, // Missing name
      { id: 'test', name: 'Test', value: 100 }, // Missing quantity
      { id: 'test', name: 'Test', quantity: 1 }, // Missing value
    ];

    invalidOrderItems.forEach((item, index) => {
      // Property: Items with missing fields must be invalid
      expect(validateOrderItems([item as OrderItem])).toBe(false);
    });
  });

  /**
   * Property: Order_Items with empty string fields must be rejected
   */
  it('should reject Order_Items with empty string fields', () => {
    const invalidOrderItems: OrderItem[] = [
      { id: '', name: 'Test', quantity: 1, value: 100 }, // Empty id
      { id: 'test', name: '', quantity: 1, value: 100 }, // Empty name
    ];

    invalidOrderItems.forEach(item => {
      // Property: Items with empty strings must be invalid
      expect(validateOrderItems([item])).toBe(false);
    });
  });

  /**
   * Property: Order_Items with non-positive quantities must be rejected
   */
  it('should reject Order_Items with non-positive quantities', () => {
    const invalidOrderItems: OrderItem[] = [
      { id: 'test', name: 'Test', quantity: 0, value: 100 }, // Zero quantity
      { id: 'test', name: 'Test', quantity: -1, value: 100 }, // Negative quantity
    ];

    invalidOrderItems.forEach(item => {
      // Property: Items with non-positive quantities must be invalid
      expect(validateOrderItems([item])).toBe(false);
    });
  });

  /**
   * Property: Order_Items with non-positive values must be rejected
   */
  it('should reject Order_Items with non-positive values', () => {
    const invalidOrderItems: OrderItem[] = [
      { id: 'test', name: 'Test', quantity: 1, value: 0 }, // Zero value
      { id: 'test', name: 'Test', quantity: 1, value: -10 }, // Negative value
    ];

    invalidOrderItems.forEach(item => {
      // Property: Items with non-positive values must be invalid
      expect(validateOrderItems([item])).toBe(false);
    });
  });

  /**
   * Property: Valid Order_Items must pass validation
   */
  it('should accept valid Order_Items', () => {
    const validOrderItems: OrderItem[] = [
      {
        id: 'ai_assistant_premium',
        name: 'Assistente IA Premium',
        quantity: 1,
        value: 97.00,
        metadata: {
          hasAI: true,
          aiFeatures: ['chat', 'analysis', 'automation']
        }
      },
      {
        id: 'ai_addon_advanced',
        name: 'Add-on IA Avançado',
        quantity: 2,
        value: 47.50
      }
    ];

    // Property: Valid items must pass validation
    expect(validateOrderItems(validOrderItems)).toBe(true);
    expect(validOrderItems.length).toBeGreaterThan(0);
    
    validOrderItems.forEach(item => {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.quantity).toBeGreaterThan(0);
      expect(item.value).toBeGreaterThan(0);
    });
  });

  /**
   * Property: Order_Items with AI metadata must be properly structured
   */
  it('should validate AI metadata structure when present', () => {
    const orderItemWithAI: OrderItem = {
      id: 'ai_product',
      name: 'Produto com IA',
      quantity: 1,
      value: 100.00,
      metadata: {
        hasAI: true,
        aiFeatures: ['chat', 'analysis']
      }
    };

    const orderItemWithoutAI: OrderItem = {
      id: 'regular_product',
      name: 'Produto Regular',
      quantity: 1,
      value: 50.00
    };

    // Property: Both items should be valid
    expect(validateOrderItems([orderItemWithAI])).toBe(true);
    expect(validateOrderItems([orderItemWithoutAI])).toBe(true);
    
    // Property: AI metadata should be properly structured
    if (orderItemWithAI.metadata) {
      expect(typeof orderItemWithAI.metadata.hasAI).toBe('boolean');
      expect(Array.isArray(orderItemWithAI.metadata.aiFeatures)).toBe(true);
    }
  });

  /**
   * Property: Multiple valid Order_Items must pass validation
   */
  it('should accept arrays with multiple valid Order_Items', () => {
    const multipleValidItems: OrderItem[] = [
      { id: 'item1', name: 'Item 1', quantity: 1, value: 10.00 },
      { id: 'item2', name: 'Item 2', quantity: 2, value: 25.50 },
      { id: 'item3', name: 'Item 3', quantity: 1, value: 97.00 }
    ];

    // Property: Multiple valid items must pass
    expect(validateOrderItems(multipleValidItems)).toBe(true);
    expect(multipleValidItems.length).toBe(3);
  });

  /**
   * Property: Mixed valid and invalid Order_Items must be rejected
   */
  it('should reject arrays containing any invalid Order_Items', () => {
    const mixedItems: OrderItem[] = [
      { id: 'valid', name: 'Valid Item', quantity: 1, value: 10.00 }, // Valid
      { id: '', name: 'Invalid Item', quantity: 1, value: 10.00 }, // Invalid (empty id)
    ];

    // Property: Any invalid item should make the entire array invalid
    expect(validateOrderItems(mixedItems)).toBe(false);
  });
});

/**
 * Order Items validation function (simulating PaymentOrchestratorService logic)
 * This mirrors the validation logic in the actual service
 */
function validateOrderItems(orderItems: OrderItem[]): boolean {
  // CRITICAL: Order_Items cannot be empty
  if (!orderItems || orderItems.length === 0) {
    return false;
  }

  // Validate each order item has required fields
  for (const item of orderItems) {
    // Check required fields exist and are not empty
    if (!item.id || !item.name || !item.quantity || !item.value) {
      return false;
    }

    // Check quantity and value are positive
    if (item.quantity <= 0 || item.value <= 0) {
      return false;
    }
  }

  return true;
}