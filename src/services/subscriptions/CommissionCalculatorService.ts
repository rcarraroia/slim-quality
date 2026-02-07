import { subscriptionConfig } from '../../config/subscription.config.js';

export interface CommissionSplit {
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
    totalValue: number;
}

export interface CommissionResult {
    totalValue: number;
    splits: CommissionSplit[];
}

export class CommissionCalculatorService {
    /**
     * Calcula as comissões baseado nos itens do pedido e na estrutura de afiliados
     * Implementa Task 24 da spec: Comissão via Order Items
     */
    public calculateCommissions(orderItems: any[], affiliateData: any): CommissionResult {
        const totalValue = orderItems.reduce((acc, item) => acc + (item.totalPrice || 0), 0);
        const splits: CommissionSplit[] = [];

        // 1. Comissão do Afiliado N1 (Direto)
        if (affiliateData?.n1?.walletId) {
            const n1Percentual = 50; // Exemplo: 50% de comissão
            const n1Value = parseFloat((totalValue * (n1Percentual / 100)).toFixed(2));

            splits.push({
                walletId: affiliateData.n1.walletId,
                percentualValue: n1Percentual,
                totalValue: n1Value
            });
        }

        // 2. Taxa de Plataforma (Renum)
        const renumWallet = subscriptionConfig.asaas.wallets.renum;
        if (renumWallet) {
            const platformFee = 10; // 10% fixo para a plataforma
            const platformValue = parseFloat((totalValue * (platformFee / 100)).toFixed(2));

            splits.push({
                walletId: renumWallet,
                percentualValue: platformFee,
                totalValue: platformValue
            });
        }

        // Nota: O Asaas processa os splits subtraindo do valor total recebido.
        return {
            totalValue,
            splits
        };
    }

    /**
     * Valida se a carteira do afiliado está ativa no Asaas
     * Task 24.2: Validação Automática de Carteiras
     */
    public async validateWallet(walletId: string): Promise<boolean> {
        try {
            const response = await fetch(`${subscriptionConfig.asaas.baseUrl}/wallets/${walletId}`, {
                method: 'GET',
                headers: {
                    'access_token': subscriptionConfig.asaas.apiKey
                }
            });
            return response.ok;
        } catch (error) {
            console.error(`[CommissionCalculator] Wallet validation error for ${walletId}:`, error);
            return false;
        }
    }
}
