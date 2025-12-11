# Limites da API

# Limites da API

# 

Rate limit

Possuímos limites de solicitações em certos endpoints onde o abuso pode de certa forma comprometer o desempenho e o uso das APIs do Asaas. Medimos as requisições e podemos restringi-las quando a quantidade permitida é ultrapassada.

Você pode verificar o status nos cabeçalhos de resposta após uma requisição:

`RateLimit-Limit: 100 RateLimit-Remaining: 50 RateLimit-Reset: 30`

O cabeçalho `RateLimit-Reset` possui os segundos faltantes para resetar o limite.

Se o limite for atingido ou ultrapassado (`RateLimit-Remaining: 0`), você receberá um erro `HTTP 429 Too Many Requests`.

# 

Limite de cota

Possuímos limite de cota de uso da API a cada 12 horas. O limite é de 25.000 requisições por conta independente do endpoint acessado. O contador inicia a partir do horário da primeira requisição e é incrementado pelas próximas 12h, quando o contador recomeça do zero e é contado novamente por 12h.

Se o limite for atingido ou ultrapassado, você receberá um erro `HTTP 429 Too Many Requests`.

# 

Limite de requisições concorrentes

Requisições concorrentes são aquelas que são submetidas ao Asaas antes que a requisição anterior tenha sido respondida.

É possível realizar até 50 requisições concorrentes do tipo `GET` à nossa API. Caso esse limite seja ultrapassado sua aplicação receberá como retorno o erro `HTTP 429 Too Many Requests` nas requisições.

Updated about 1 month ago

Did this page help you?

Yes

No