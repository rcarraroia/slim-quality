# Atualizar notificação existente

# Atualizar notificação existente

`PUT` https://api-sandbox.asaas.com/v3/notifications/{id}

## Path Params

**id*** `string`

Identificador único da notificação a ser atualizada

## Body Params

**enabled** `boolean`

Habilita/desabilita a notificação

**emailEnabledForProvider** `boolean`

habilita/desabilita o email enviado para você

**smsEnabledForProvider** `boolean`

habilita/desabilita o SMS enviado para você

**emailEnabledForCustomer** `boolean`

habilita/desabilita o email enviado para o seu cliente

**smsEnabledForCustomer** `boolean`

habilita/desabilita o SMS enviado para o seu cliente

**phoneCallEnabledForCustomer** `boolean`

habilita/desabilita a notificação por voz enviada para o seu cliente

**whatsappEnabledForCustomer** `boolean`

habilita/desabilita a mensagem de WhatsApp para seu cliente

**scheduleOffset** `int32` enum

Especifica quantos dias antes do vencimento a notificação deve se enviada. Para o evento `PAYMENT_DUEDATE_WARNING` os valores aceitos são: `0`, `5`, `10`, `15` e `30` Para o evento `PAYMENT_OVERDUE` os valores aceitos são: `1`, `7`, `15` e `30`

Allowed: `0`, `1`, `5`, `7`, `10`, `15`, `30`

## Responses

**200** OK

**400** Bad Request

**401** Unauthorized

**404** Not found