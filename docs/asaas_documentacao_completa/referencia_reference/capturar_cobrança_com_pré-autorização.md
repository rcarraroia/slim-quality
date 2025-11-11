# Capturar cobrança com Pré-Autorização

# Capturar cobrança com Pré-Autorização

**Método:** `POST`
**Endpoint:** `https://api-sandbox.asaas.com/v3/payments/{id}/captureAuthorizedPayment`

Para capturar uma cobrança de cartão de crédito criada com Pré-Autorização, é necessário que você tenha o ID retornado no momento da criação da cobrança e que o status da cobrança seja AUTHORIZED.
## Path Params

| Parâmetro | Tipo   | Obrigatório | Descrição                          |
| :-------- | :----- | :---------- | :--------------------------------- |
| `id`      | string | sim         | Identificador único da cobrança no Asaas |

## Respostas

| Código HTTP | Status       | Descrição                               |
| :---------- | :----------- | :-------------------------------------- |
| `200`       | OK           | Requisição bem-sucedida                 |
| `400`       | Bad Request  | Requisição inválida                     |
| `401`       | Unauthorized | Não autorizado                          |
| `404`       | Not Found    | Recurso não encontrado                  |
