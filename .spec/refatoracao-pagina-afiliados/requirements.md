# Refatoração da Página de Afiliados - Padronização de Valores e Texto

## Objetivo
Padronizar a comunicação de ganhos da página de afiliados da Slim Quality, utilizando o valor do colchão padrão (R$ 4.400,00) como base para todos os cálculos e exemplos, além de ajustar o posicionamento de marketing de "Renda Recorrente" para "Rendimento exponencial".

## Requisitos Funcionais
1. **Alteração de Header (Hero Section):** 
   - Onde se lê "Renda Recorrente", deve-se ler "Rendimento exponencial".
2. **Padronização da Estrutura de Comissões:**
   - O valor base para os exemplos nos 3 cards de níveis deve ser **R$ 4.400,00**.
   - Os cálculos devem ser atualizados:
     - **Nível 1 (15%):** R$ 660,00.
     - **Nível 2 (3%):** R$ 132,00.
     - **Nível 3 (2%):** R$ 88,00.
   - O texto descritivo do exemplo em cada card deve ser alterado para: `Exemplo (Venda Padrão R$ 4.400,00)`.
3. **Atualização do Simulador de Ganhos:**
   - O `Ticket Médio` utilizado no cálculo e exibido no texto da seção deve ser alterado de R$ 3.715,00 para **R$ 4.400,00**.
4. **Melhorias Visuais (UI/UX Pro Max):**
   - Refatorar as seções para um visual mais premium seguindo os princípios do `ui-ux-pro-max` (gradientes suaves, micro-animações, elevação de cards).

## Critérios de Aceite
- [ ] Texto do Hero atualizado para "Rendimento exponencial".
- [ ] Cards de comissão exibindo os valores corretos calculados sobre R$ 4.400,00.
- [ ] Simulador calculando ganhos com base no novo ticket médio de R$ 4.400,00.
- [ ] Interface validada visualmente com melhorias de design.
