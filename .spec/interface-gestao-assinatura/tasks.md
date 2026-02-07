# Tasks: Interface de Gestão de Assinatura

## Fase 1: Interface Admin (Correção de Produto Digital)
- [ ] **Análise Preventiva**
    - [ ] Ler `src/pages/dashboard/Produtos.tsx` e mapear dependências de campos físicos.
    - [ ] Verificar constraints da tabela `products` (se permite null em `width`, `height`, etc).
- [ ] **Implementação**
    - [ ] Adicionar switch/checkbox "Produto Digital" ou inferir pela Categoria 'ferramenta_ia'.
    - [ ] Condicionar renderização dos campos de Dimensões, Peso e Frete.
    - [ ] Ajustar `handleSave` para limpar dados físicos se for digital.
- [ ] **Validação (Obrigatório Evidência)**
    - [ ] Screenshot: Formulário limpo (sem erros de validação).
    - [ ] Screenshot: Tabela do Banco de Dados mostrando registro salvo sem dimensões.

## Fase 2: Painel Afiliado (Menu e Página)
- [ ] **Análise Preventiva**
    - [ ] Ler `src/layouts/AffiliateDashboardLayout.tsx` e identificar ponto de injeção no menu.
- [ ] **Implementação - Menu**
    - [ ] Criar serviço ou query hook para checar `products?category=eq.ferramenta_ia&is_active=eq.true`.
    - [ ] Atualizar `menuItems` dinamicamente baseado na query.
- [ ] **Implementação - Página FerramentasIA**
    - [ ] Criar arquivo `src/pages/afiliados/dashboard/FerramentasIA.tsx`.
    - [ ] Implementar visualização "Estado: Não Assinante" (Card de Venda).
    - [ ] Implementar visualização "Estado: Assinante" (Card de Status + Validade).
    - [ ] Registrar rota no `App.tsx` (ou arquivo de rotas do afiliado).
- [ ] **Validação (Obrigatório Evidência)**
    - [ ] Screenshot: Menu some quando produto inativo no banco.
    - [ ] Screenshot: Menu aparece quando produto ativo no banco.
    - [ ] Screenshot: Página carrega status correto de uma assinatura simulada no banco.

## Referências Obrigatórias
Antes de marcar qualquer item como `[x]`, consultar:
- `verificacao-banco-real.md`
- `compromisso-honestidade.md`
