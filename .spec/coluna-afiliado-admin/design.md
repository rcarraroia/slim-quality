# Design: Coluna de Afiliado na Gestão de Usuários

## Arquivos Afetados
- `src/pages/dashboard/Configuracoes.tsx`: Componente principal da página de configurações.

## Detalhes Técnicos
Os dados necessários (`is_affiliate` e `affiliate_status`) já são retornados pela query SQL no método `loadUsers`.

### Alterações na UI
1. **TableHeader**: Adicionar `<TableHead>Afiliado</TableHead>`.
2. **TableBody / TableRow**: Adicionar uma nova `<TableCell>` com lógica condicional:
   ```tsx
   <TableCell>
     <Badge variant="outline" className={user.is_affiliate ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}>
       {user.is_affiliate ? "Sim" : "Não"}
     </Badge>
   </TableCell>
   ```

## UI/UX Pro Max
- Manter o uso de cores harmônicas (Verde para Sim, Cinza para Não).
- Alinhamento consistente com as colunas adjacentes.
