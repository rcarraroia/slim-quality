# Design Técnico - Refatoração da Página de Afiliados

## Arquitetura de Componentes
A lógica reside inteiramente no componente funcional `AfiliadosLanding.tsx`. As alterações serão puramente em nível de interface (Render) e constantes de cálculo.

## Alterações Propostas

### 1. Constantes de Cálculo
- Alterar a variável `ticketMedio` de `3715` para `4400`.
- Atualizar o comentário que explica o cálculo do ticket médio para refletir a nova padronização.

### 2. Seção Hero
- Localizar o `<span>` que contém "Renda Recorrente" e substituir por "Rendimento exponencial".

### 3. Estrutura de Comissões (Cards)
- **Nível 1:**
  - Label: `Exemplo (Venda Padrão R$ 4.400,00)`
  - Valor: `R$ 660,00`
- **Nível 2:**
  - Label: `Exemplo (Venda Padrão R$ 4.400,00)` (Substituindo "Venda Queen R$ 3.490")
  - Valor: `R$ 132,00`
- **Nível 3:**
  - Label: `Exemplo (Venda Padrão R$ 4.400,00)` (Substituindo "Venda King R$ 4.890")
  - Valor: `R$ 88,00`

### 4. Simulador Interativo
- Atualizar o texto do parágrafo da seção: `Veja quanto você pode ganhar mensalmente (Ticket Médio R$ 4.400,00)`.

### 5. UI/UX Pro Max
- Aplicar `backdrop-blur` e `glassmorphism` nos cards de comissão.
- Melhorar os gradientes de fundo usando as cores primárias do sistema.
- Adicionar transições suaves de hover nos itens de benefício.

## Schema de Cores (Design System)
- **Primary:** Original Slim Quality (Dourado/Amarelo premium).
- **Secondary:** Complementar.
- **Background:** Mistura de gradientes suaves com opacidade reduzida para profundidade.
