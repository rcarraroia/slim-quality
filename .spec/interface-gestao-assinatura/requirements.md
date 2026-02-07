# Requisitos: Interface de Gestão de Assinatura Agente IA

**Objetivo**: Implementar interfaces gráficas para cadastro correto de produtos digitais (Admin) e gestão de assinaturas (Afiliado), garantindo integridade de dados e UX consistente.

> [!IMPORTANT]
> **Protocolos de Governança Obrigatórios**
> Toda implementação deve seguir estritamente as diretrizes dos seguintes documentos:
> 1. `analise-preventiva-obrigatoria.md`: Analisar antes de codar.
> 2. `compromisso-honestidade.md`: Reportar real status ("não validado" != "pronto").
> 3. `funcionalidade-sobre-testes.md`: Priorizar funcionamento real sobre mocks.
> 4. `verificacao-banco-real.md`: Validar dados no Supabase real.

---

## 1. Escopo Funcional

### Módulo Admin (Gestor)
*   **Problema Atual**: O formulário de produtos exige dados físicos (peso, dimensões) para o Agente IA.
*   **Requisito**: Adaptar o formulário `Produtos.tsx` para suportar `product_type = 'service'` ou basear-se na categoria `ferramenta_ia`.
    *   Ocultar campos de frete, peso e dimensões.
    *   Exibir campos de integração (Toggle de Ativo/Inativo global já existe, mas o cadastro do produto precisa ser limpo).

### Módulo Afiliado (Usuário Final)
*   **Problema Atual**: Não existe página para contratar/renovar o agente.
*   **Requisito A**: Criar página `FerramentasIA.tsx` no dashboard.
    *   Exibir dados do produto (Venda).
    *   Exibir status da assinatura (Ativo até..., Inativo, Cancelado).
    *   Botão de Checkout (Link de Pagamento).
*   **Requisito B (Condicional)**: O item "Ferramentas IA" no menu lateral só deve aparecer se o produto "Agente IA" estiver marcado como `is_active = true` no Admin.

---

## 2. Regras de Negócio

1.  **Visibilidade do Menu**:
    *   `SE` produto "Agente IA" (ou categoria `ferramenta_ia`) estiver `is_active = true` na tabela `products` → Mostrar link no menu lateral do afiliado.
    *   `SE` `is_active = false` → Ocultar link. (Afiliado não vê que existe).

2.  **Fluxo de Assinatura**:
    *   Se `affiliate_services` não tiver registro válido → Mostrar card de venda + Botão "Assinar Agora".
    *   Se tiver assinatura ativa (`expires_at > now()`) → Mostrar "Assinatura Ativa" + Data de validade.

3.  **Cadastro de Produto**:
    *   Produtos digitais não devem validar obrigatoriedade de `width_cm`, `height_cm`, `weight_kg`.
    *   Preço (`price_cents`) é obrigatório.

## 3. Critérios de Aceite (DoD)

*   [ ] Admin consegue salvar produto "Agente IA" sem preencher dimensões.
*   [ ] Menu "Ferramentas IA" some do painel de afiliado ao desativar produto no Admin.
*   [ ] Menu "Ferramentas IA" aparece ao ativar produto.
*   [ ] Página de Assinatura carrega corretamente status do banco real (sem mocks).
