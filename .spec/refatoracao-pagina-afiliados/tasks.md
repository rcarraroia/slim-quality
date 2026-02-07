# Tarefas Técnicas - Refatoracao da Página de Afiliados

- [x] **Fase 1: Preparação e Auditoria**
    - [x] Validar acesso visual e estrutura atual do arquivo `AfiliadosLanding.tsx`.
    - [x] Confirmar cálculos manuais: 15% de 4400 = 660 | 3% de 4400 = 132 | 2% de 4400 = 88.

- [x] **Fase 2: Implementação de Texto e Lógica**
    - [x] Substituir "Renda Recorrente" por "Rendimento exponencial" no Hero.
    - [x] Atualizar constante `ticketMedio` para `4400` (Linha 25).
    - [x] Atualizar textos estáticos dos 3 cards de comissão (Linhas 211, 230, 249).
    - [x] Atualizar valores monetários exibidos nos 3 cards de comissão (Linhas 213, 232, 251).
    - [x] Atualizar label do Simulador de Ganhos (Linha 267).

- [x] **Fase 3: Refatoração UI/UX (Pro Max)**
    - [x] Aplicar classes de `glassmorphism` nos cards.
    - [x] Refinar gradientes da seção Hero e Simulação.
    - [x] Garantir responsividade pós-alteração.

- [x] **Fase 4: Validação e Evidência**
    - [x] Testar simulador arrastando os sliders e verificando se a base de cálculo está correta (ex: 1 venda N1 deve resultar em exatos R$ 660,00).
    - [x] Capturar screenshot da página atualizada.
    - [x] Gerar relatório final de implementação.

- [x] **Ajustes de Layout (Feedback Usuário)**
    - [x] Corrigir capitalização para '**Rendimento Exponencial**'.
    - [x] Diminuir fonte do Hero para `text-3xl` / `lg:text-5xl` para caber em 2 linhas.
    - [x] Commit e Push dos ajustes finais.
