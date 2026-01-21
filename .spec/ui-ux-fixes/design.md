# Design: Correções UI/UX Site Slim Quality

## Erro 1: Scroll Top
- **Local**: `src/pages/produtos/ProdutoDetalhe.tsx`
- **Técnica**: Usar `useEffect` do React com `window.scrollTo(0, 0)` dependente do `slug`.

## Erro 2: Parcelamento "Sem Juros"
- **Local**: `src/pages/produtos/ProdutoDetalhe.tsx`
- **Estilo**: 
    ```tsx
    <span>Parcelamento disponível em até 12x <strong className="text-primary">Sem Juros</strong></span>
    ```

## Erro 3: Botão BIA Amarelo
- **Local**: `src/pages/produtos/ProdutoDetalhe.tsx`
- **Estilo**:
    - Fundo: `#FFD700` (ou variante amarela da marca).
    - Hover: `brightness-90` ou `shadow-lg`.
    - Componente: `<Button className="bg-[#FFD700] hover:bg-[#FFD700] hover:brightness-95 text-black ...">`

## Erro 4 & 5: Toggle de Senha e Botão Voltar
- **Toggle**: Criar componente `src/components/ui/PasswordInput.tsx` baseado no `Input` atual, usando `Eye` e `EyeOff` do `lucide-react`.
- **Botão Voltar**: Inserir link acima do `CardHeader` no `Login.tsx`.
    ```tsx
    <Link to="/" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
      <ChevronLeft className="h-4 w-4 mr-1" /> Voltar à Home
    </Link>
    ```
