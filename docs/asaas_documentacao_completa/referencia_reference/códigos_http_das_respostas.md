# Códigos HTTP das respostas

Nossa API utiliza respostas HTTP convencionais para indicar sucesso ou falha nas requisições. Respostas com status 200 indicam sucesso, status 4xx indicam falhas decorrentes de erros nas informações enviadas, e status 500 indicam erros internos em nosso servidor.

| Código HTTP | Descrição |
| --- | --- |
| **200** OK | Sua requisição foi bem sucedida. |
| **400** Bad Request | Algum parâmetro obrigatório não foi enviado ou é inválido. Neste caso a própria resposta indicará qual é o problema. |
| **401** Unauthorized | Não foi enviada API Key ou ela é inválida. |
| **403** Forbidden | Requisição não autorizada. Abuso da API ou uso de parâmetros não permitidos podem gerar este código. País de origem do IP bloqueado. |
| **403** Forbidden / Cloudfront (GET) | Erros 403 em chamadas GET indicam que você está enviando um `body` junto da requisição. Você não deve enviar nenhuma informação no `body` em chamadas do tipo GET. |
| **403** Forbidden - Acesso negado. Code: XXXXXXXXX | Erro 403 seguido de "Acesso Negado" indica que você está realizando sua requisição através de um IP não autorizado. Confira os IPs autorizados na seção de [Mecanismos de Segurança](https://docs.asaas.com/reference/mecanismos-de-seguranca) da sua conta Asaas. Caso sua conta seja uma subconta, entre em contato com o administrador do seu sistema para mais informações |
| **404** Not Found | O endpoint ou o objeto solicitado não existe. Ou está informando atributo de outra conta. |
| **429** Too Many Requests (Limite de requisições concorrentes atingido) | Ocorre quando mais de 50 requisições GET são enviadas simultaneamente antes das anteriores serem concluídas. [Ver mais sobre requisições concorrentes](https://docs.asaas.com/reference/limites-da-api#limite-de-requisições-concorrentes). |
| **429** Too Many Requests (Cota de requisições das últimas 12 horas excedida.) | Indica que a conta excedeu o limite de requisições em 12 horas; o contador reinicia após esse período. [Ver mais sobre quota limit](https://docs.asaas.com/reference/limites-da-api#cota-de-requisições). |
| **429** Too Many Requests (Seu IP XXXXXXXX foi bloqueado até XXXXXXX. Em caso de dúvida, contate o suporte.) | Indica que o limite de requisições à API foi ultrapassado; o IP é temporariamente bloqueado e só será liberado após o tempo indicado no cabeçalho RateLimit-Reset. [Ver mais sobre rate limit](https://docs.asaas.com/reference/limites-da-api#rate-limit). |
| **500** Internal Server Error | Algo deu errado no servidor do Asaas. |

> ❗️ **Importante**
> Todos os endpoints da API recebem e respondem em JSON.

**Exemplo de resposta para HTTP 400:**

```json
{
    "errors":[
        {
            "code":"invalid_value",
            "description":"O campo value deve ser informado"
        },
        {
            "code":"invalid_dueDate",
            "description":"A data de vencimento não pode ser inferior à hoje"
        }
    ]
}
```