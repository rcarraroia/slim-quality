# Listar subcontas

# Listar subcontas

**URL:** https://docs.asaas.com/reference/listar-subcontas

---

## Query Params

| Parâmetro | Tipo | Descrição |
|---|---|---|
| `offset` | `integer` | Elemento inicial da lista |
| `limit` | `integer` | Número de elementos da lista (max: 100) |
| `cpfCnpj` | `string` | Filtrar pelo cpf ou cnpj da subconta |
| `email` | `string` | Filtrar pelo email da subconta |
| `name` | `string` | Filtrar pelo nome da subconta |
| `walletId` | `string` | Filtrar pelo walletId da subconta |

## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 403 Forbidden

Ocorre quando o body da requisição está preenchido, chamadas de método GET precisam ter um body vazio.

## Exemplo de Requisição cURL

```bash
curl --request GET \
     --url https://api-sandbox.asaas.com/v3/accounts \
     --header 'accept: application/json'
```

Click `Try It!` to start a request and see the response here! Or choose an example:

`application/json`

## Outras informações

Updated 28 days ago

Did this page help you?

Yes

No

## Navegação

*   [Criar subconta](https://docs.asaas.com/reference/criar-subconta)
*   [Recuperar uma única subconta](https://docs.asaas.com/reference/recuperar-uma-unica-subconta)
*   [Guia de subcontas](https://docs.asaas.com/guides/subcontas)
*   [Guia de split](https://docs.asaas.com/guides/split)
*   [Salvar ou atualizar configuração da Conta Escrow para a subconta](https://docs.asaas.com/reference/salvar-ou-atualizar-configuracao-da-conta-escrow-para-a-subconta)
*   [Recuperar configuração da Conta Escrow para a subconta](https://docs.asaas.com/reference/recuperar-configuracao-da-conta-escrow-para-a-subconta)
*   [Envio de documentos White Label](https://docs.asaas.com/reference/envio-de-documentos-white-label)
*   [Chargeback](https://docs.asaas.com/reference/chargeback)