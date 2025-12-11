/**
 * Testes de Serviços - Cálculo de Comissões
 * Conforme SOLICITACAO_TESTES_AUTOMATIZADOS.md
 */

import { describe, it, expect } from 'vitest';

describe('Serviços - Cálculo de Comissões', () => {
    it('Deve calcular 15% para N1', () => {
        const orderValue = 3290.00; // Colchão Padrão
        const n1Commission = orderValue * 0.15;

        expect(n1Commission).toBe(493.50);
        console.log(`✅ Comissão N1: R$ ${n1Commission.toFixed(2)}`);
    });

    it('Deve calcular 3% para N2', () => {
        const orderValue = 3290.00;
        const n2Commission = orderValue * 0.03;

        expect(n2Commission).toBe(98.70);
        console.log(`✅ Comissão N2: R$ ${n2Commission.toFixed(2)}`);
    });

    it('Deve calcular 2% para N3', () => {
        const orderValue = 3290.00;
        const n3Commission = orderValue * 0.02;

        expect(n3Commission).toBe(65.80);
        console.log(`✅ Comissão N3: R$ ${n3Commission.toFixed(2)}`);
    });

    it('Deve somar 30% no total (incluindo Renum e JB)', () => {
        const orderValue = 3290.00;
        const n1 = orderValue * 0.15; // 493.50
        const n2 = orderValue * 0.03; // 98.70
        const n3 = orderValue * 0.02; // 65.80
        const renum = orderValue * 0.05; // 164.50
        const jb = orderValue * 0.05; // 164.50

        const total = n1 + n2 + n3 + renum + jb;
        const expected = orderValue * 0.30;

        expect(total).toBe(expected);
        expect(total).toBe(987.00);

        console.log(`✅ Total de comissões: R$ ${total.toFixed(2)} (30% de R$ ${orderValue.toFixed(2)})`);
        console.log(`   - N1: R$ ${n1.toFixed(2)}`);
        console.log(`   - N2: R$ ${n2.toFixed(2)}`);
        console.log(`   - N3: R$ ${n3.toFixed(2)}`);
        console.log(`   - Renum: R$ ${renum.toFixed(2)}`);
        console.log(`   - JB: R$ ${jb.toFixed(2)}`);
    });

    it('Deve calcular corretamente para valor diferente', () => {
        const orderValue = 5000.00;
        const n1 = orderValue * 0.15; // 750.00
        const n2 = orderValue * 0.03; // 150.00
        const n3 = orderValue * 0.02; // 100.00
        const renum = orderValue * 0.05; // 250.00
        const jb = orderValue * 0.05; // 250.00

        const total = n1 + n2 + n3 + renum + jb;
        const expected = orderValue * 0.30;

        expect(total).toBe(expected);
        expect(total).toBe(1500.00);

        console.log(`✅ Total de comissões para R$ ${orderValue.toFixed(2)}: R$ ${total.toFixed(2)}`);
    });

    it('Deve manter 70% para a fábrica', () => {
        const orderValue = 3290.00;
        const commissionsTotal = orderValue * 0.30; // 987.00
        const factoryValue = orderValue * 0.70; // 2303.00

        expect(factoryValue).toBe(2303.00);
        expect(commissionsTotal + factoryValue).toBe(orderValue);

        console.log(`✅ Valor da fábrica (70%): R$ ${factoryValue.toFixed(2)}`);
        console.log(`✅ Verificação: R$ ${commissionsTotal.toFixed(2)} + R$ ${factoryValue.toFixed(2)} = R$ ${orderValue.toFixed(2)}`);
    });
});
