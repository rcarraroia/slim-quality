# Requisitos: Reparo do Checkout e Afiliados (Regressão)

## 🎯 Objetivo
Restaurar as funcionalidades de checkout de produtos físicos e rastreamento de afiliados que foram quebradas durante a remoção da lógica de assinatura antiga.

## ⚠️ Problemas Identificados
1. **Erro de Sintaxe Crítico**: O arquivo `api/checkout.js` não é interpretado pelo Node.js devido a um `else` órfão e chaves desbalanceadas.
2. **Falha de Integridade**: O registro de conversões em `checkout.service.ts` omite o campo `affiliate_id` (NOT NULL).

## 🛠 Critérios de Aceite
- [ ] O arquivo `api/checkout.js` deve ser validado sintaticamente (`node --check`) sem erros.
- [ ] O checkout de produtos físicos (PIX, Boleto e Cartão) deve retornar JSON válido, não HTML de erro.
- [ ] A tabela `referral_conversions` deve receber o `affiliate_id` correto em cada venda.
- [ ] Registro de evidências (screenshots/logs) de sucessos do checkout após a correção.

## 🚫 Restrições
- **Proibido** reintroduzir qualquer lógica de Agente IA no `checkout.js`.
- **Proibido** realizar deploys sem aprovação prévia de cada item da Spec.
- **Obrigatório** validação sintática via terminal antes de reportar conclusão.
