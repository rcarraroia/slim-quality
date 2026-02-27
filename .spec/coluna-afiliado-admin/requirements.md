# Requisitos: Coluna de Afiliado na Gestão de Usuários

## Objetivo
Incluir uma nova coluna na tabela de gerenciamento de usuários que identifique visualmente se o usuário é um afiliado ou não.

## Regras de Negócio
1. A coluna deve ser posicionada entre "Cargo" e "Status".
2. Deve exibir "Sim" se `is_affiliate` for verdadeiro.
3. Deve exibir "Não" se `is_affiliate` for falso ou nulo.
4. O estilo deve seguir o padrão de Badges já utilizado no sistema (StatusBadge e cores de cargo).

## Critérios de Aceite
- Coluna visível para administradores na aba "Usuários".
- Identificação clara do status de afiliado.
- Nenhuma alteração em outras funcionalidades ou dados.
