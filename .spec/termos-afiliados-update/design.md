# Design: Atualização dos Termos de Afiliados

## Arquitetura de UI
- **Página**: `/src/pages/afiliados/TermosAfiliados.tsx`
- **Layout**: Mantém o `min-h-screen bg-gradient-to-br`.
- **Componentes**: 
    - `Card` para o container principal.
    - `section` para cada item numerado.
    - Ícones `lucide-react` para cada seção (novos ícones para seções 7, 8, 9).

## Mapeamento de Seções
1. **Objeto e Aceite**: Usar ícone `Scale`.
2. **Estrutura de Comissionamento**: Usar ícone `Users`. Incluir grid de níveis + parágrafo sobre liquidez.
3. **Pagamentos e Wallet ID**: Usar ícone `CreditCard`.
4. **Práticas Proibidas**: Usar ícone `AlertTriangle` com cores de `destructive`.
5. **Privacidade e LGPD**: Usar ícone `ShieldCheck`.
6. **Alterações e Rescisão**: Usar ícone `Scale`. 
7. **Autonomia (Novo)**: Usar ícone `UserCheck` (ou similar). 
8. **Responsabilidade (Novo)**: Usar ícone `Gavel` (ou similar).
9. **Foro (Novo)**: Usar ícone `MapPin`.
