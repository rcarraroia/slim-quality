# Design: Termos do Programa de Afiliados

## Arquitetura
A página será um componente funcional React utilizando `shadcn/ui` e Tailwind CSS, mantendo a consistência visual com o restante do site.

## Componentes
- `PublicLayout`: A página deve ser renderizada dentro do layout público para manter o Header e Footer (se aplicável).
- `Card`: Para organizar o conteúdo dos termos.
- `Typography`: Uso correto de `h1`, `h2`, `p` para SEO e legibilidade.

## Fluxo de Dados
- Estático: O conteúdo dos termos será codificado no componente para garantir performance e simplicidade (não requer backend dedicado neste momento).
