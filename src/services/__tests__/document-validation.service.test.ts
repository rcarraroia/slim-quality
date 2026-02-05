/**
 * Testes básicos para DocumentValidationService
 * Foco: Validar funcionalidade essencial rapidamente
 */

import { DocumentValidationService } from '../document-validation.service';

describe('DocumentValidationService', () => {
  let service: DocumentValidationService;

  beforeEach(() => {
    service = new DocumentValidationService();
  });

  describe('validateFormat', () => {
    it('deve validar formato de CPF', () => {
      expect(service.validateFormat('12345678901')).toBe(true);
      expect(service.validateFormat('123.456.789-01')).toBe(true);
      expect(service.validateFormat('123')).toBe(false);
    });

    it('deve validar formato de CNPJ', () => {
      expect(service.validateFormat('12345678000195')).toBe(true);
      expect(service.validateFormat('12.345.678/0001-95')).toBe(true);
      expect(service.validateFormat('123')).toBe(false);
    });
  });

  describe('validateChecksum', () => {
    it('deve validar checksum de CPF válido', () => {
      expect(service.validateChecksum('11144477735')).toBe(true);
      expect(service.validateChecksum('12345678901')).toBe(false);
    });

    it('deve validar checksum de CNPJ válido', () => {
      expect(service.validateChecksum('11222333000181')).toBe(true);
      expect(service.validateChecksum('12345678000194')).toBe(false);
    });
  });

  describe('validateDocument (sem banco)', () => {
    it('deve validar documento completo - CPF válido', async () => {
      // Mock do checkDuplication para não acessar banco
      jest.spyOn(service, 'checkDuplication').mockResolvedValue({
        isDuplicate: false
      });
      
      jest.spyOn(service, 'logValidation').mockResolvedValue('log_123');

      const result = await service.validateDocument('11144477735');
      
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('CPF');
      expect(result.errors).toHaveLength(0);
      expect(result.isDuplicate).toBe(false);
    });

    it('deve rejeitar documento inválido', async () => {
      const result = await service.validateDocument('123');
      
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('INVALID');
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deve rejeitar CPF com checksum inválido', async () => {
      jest.spyOn(service, 'checkDuplication').mockResolvedValue({
        isDuplicate: false
      });

      const result = await service.validateDocument('12345678901');
      
      expect(result.isValid).toBe(false);
      expect(result.type).toBe('CPF');
      expect(result.errors).toContain('CPF com dígitos verificadores inválidos');
    });
  });
});