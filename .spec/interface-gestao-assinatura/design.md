# Design Técnico: Interface Gestão Assinatura

## 1. Arquitetura da Solução

### Frontend Admin (`src/pages/dashboard/Produtos.tsx`)
*   **Componente Atual**: Formulário monolítico com validação hardcoded para colchões.
*   **Alteração**:
    *   Adicionar estado `isDigital` derivado do `formData.category` ou `product_type`.
    *   Envolver campos físicos (`Dimensões`, `Peso`, `Frete`) em condicional `{!isDigital && (...)}`.
    *   Ajustar função `handleSave` para enviar `null` ou `0` nos campos físicos quando for digital, evitando erro de constraint (se houver, caso contrário, `null`).

### Frontend Afiliado (`src/layouts/AffiliateDashboardLayout.tsx`)
*   **Lógica de Menu**:
    *   Hoje: Array estático `menuItems`.
    *   Novo: `menuItems` se torna um state ou memoizado.
    *   **Fetch**: No `useEffect` de load, fazer uma query rápida no Supabase:
        ```sql
        SELECT count(*) FROM products WHERE category = 'ferramenta_ia' AND is_active = true
        ```
    *   **Render**: Se count > 0, adicionar item `{ label: "Ferramentas IA", path: "/afiliados/dashboard/ferramentas-ia" }`.

### Nova Página (`src/pages/afiliados/dashboard/FerramentasIA.tsx`)
*   **Layout**:
    *   Topo: Header com Título.
    *   Corpo:
        *   **Estado Loading**: Skeleton.
        *   **Estado Não Assinante**: Card de Venda (Cópia simplificada do `ProductPage`, mas focada em conversão interna). Botão "Contratar" leva ao Checkout.
        *   **Estado Assinante**: Card de Status (Verde). Mostra "Assinatura Ativa", "Expira em: DD/MM/AAAA". Botão "Falar com Suporte" ou "Cancelar".
*   **Integração**:
    *   Usa `affiliateFrontendService` para checar status (RPC `check_service_status`).

## 2. Modelagem de Dados

Nenhuma alteração de schema necessária. Utilizaremos as tabelas já existentes e validadas na Fase anterior:
*   `products` (para checar `is_active`).
*   `affiliate_services` (para checar status da assinatura).

## 3. Estratégia de Validação (Banco Real)

Conforme `verificacao-banco-real.md`:
1.  **Validar Admin**: Criar produto "Teste Digital" -> Verificar no Supabase se campos físicos ficaram NULL.
2.  **Validar Menu**:
    *   Setar `is_active = false` no banco -> Verificar se menu sumiu.
    *   Setar `is_active = true` no banco -> Verificar se menu apareceu.
3.  **Validar Assinatura**:
    *   Inserir registro manual em `affiliate_services` -> Verificar se página muda de "Venda" para "Status".
