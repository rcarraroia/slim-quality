# Atualizar cliente existente

# Atualizar cliente existente

**URL:** https://docs.asaas.com/reference/atualizar-cliente-existente

## Parâmetros de Path

- **id** (string, *required*): Identificador único do cliente a ser atualizado

## Parâmetros de Body
- **name** (string): Nome do cliente
- **cpfCnpj** (string): CPF ou CNPJ do cliente
- **email** (string): Email do cliente
- **phone** (string): Fone fixo
- **mobilePhone** (string): Fone celular
- **address** (string): Logradouro

- **addressNumber** (string): Número do endereço
- **complement** (string): Complemento do endereço
- **province** (string): Bairro
- **postalCode** (string): CEP do endereço
- **externalReference** (string): Identificador do cliente no seu sistema
- **notificationDisabled** (boolean): `true` para desabilitar o envio de notificações de cobrança
- **additionalEmails** (string): Emails adicionais para envio de notificações de cobrança separados por ","
- **municipalInscription** (string): Inscrição municipal do cliente

- **stateInscription** (string): Inscrição estadual do cliente
- **observations** (string): Observações adicionais
- **groupName** (string): Nome do grupo ao qual o cliente pertence
- **company** (string): Empresa
- **foreignCustomer** (boolean): Informe `true` caso seja pagador estrangeiro
## Respostas

### 200 OK

### 400 Bad Request

### 401 Unauthorized

### 404 Not Found

