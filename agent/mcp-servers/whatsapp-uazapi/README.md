# MCP Server - WhatsApp Uazapi

Servidor MCP para integração com Uazapi WhatsApp API.

## Tools Disponíveis

### send_message
Envia mensagem via Uazapi.

**Parâmetros:**
- `phone` (str): Número do destinatário
- `message` (str): Conteúdo da mensagem

**Retorna:** ID da mensagem

### get_messages
Busca últimas mensagens recebidas.

**Parâmetros:**
- `limit` (int, opcional): Número máximo de mensagens (padrão: 50)

**Retorna:** Lista de mensagens

## Configuração

Variáveis de ambiente necessárias:
- `UAZAPI_URL`: URL da API Uazapi
- `UAZAPI_INSTANCE_ID`: ID da instância
- `UAZAPI_API_KEY`: Chave de API

## Documentação

https://docs.uazapi.com/
