# Listagem e paginação

Todos os endpoints da API que retornam uma lista de itens são paginados. Para navegar entre as páginas há 3 parâmetros:

*   `limit`: quantidade de itens por página
*   `offset`: posição do item a partir do qual a página deve ser carregada. O item inicial possui a posição 0.
*   `totalCount`: quantia total de itens para os filtros informados

Por exemplo, utilizando `limit` 10 e `offset` 0 será retornada a primeira página com 10 itens. Utilizando `limit` 10 e `offset` 10 trará a segunda página, `limit` 10 e `offset` 20 a terceira página, e assim por diante.

O `limit` deve ser um valor numérico entre 1 e 100. Caso seja omitido será utilizado o valor padrão: 10.

O atributo `hasMore` na resposta da requisição indica se há mais uma página a ser buscada para os filtros informados.

Essa regra apenas diferencia no caso de listagens de serviços municipais. Para a listagem de serviços seria:

*   `limit`: Itens por página
*   `offset`: número da página [começa em 0]

Então o `offset` seria 0, 1, 2, 3...

Updated about 1 month ago