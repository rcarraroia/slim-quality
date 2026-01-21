# Requisitos: Correções UI/UX Site Slim Quality

## Objetivo
Corrigir falhas de interface, usabilidade e branding em páginas críticas do site (Produto, Login, Cadastro).

## Critérios de Aceite
### Erro 1: Scroll Automático
- [ ] Ao abrir `ProdutoDetalhe.tsx`, o scroll deve ser posicionado no topo da página (0,0).

### Erro 2: Texto Parcelamento
- [ ] Em `ProdutoDetalhe.tsx`, o texto de parcelamento deve ser: "Parcelamento disponível em até 12x **Sem Juros**".
- [ ] O termo "Sem Juros" deve ter destaque visual (negrito ou cor diferenciada).

### Erro 3: Botão BIA
- [ ] Em `ProdutoDetalhe.tsx`, o botão "Falar com BIA" deve ter fundo amarelo (cor da marca).
- [ ] O hover deve ser sutil, sem inverter as cores drasticamente.

### Erros 4 e 5: Usabilidade de Formulários
- [ ] Adicionar botão "← Voltar à Home" na página de Login.
- [ ] Implementar toggle de visibilidade de senha (ícone olho) em todos os campos de senha no Login e Cadastro de Afiliados.
