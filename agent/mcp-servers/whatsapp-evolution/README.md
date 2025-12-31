# MCP Server - WhatsApp Evolution API

Servidor MCP para integração com Evolution API (VPS).

## Tools Disponíveis

### send_message_evolution
Envia mensagem via Evolution API.

**Parâmetros:**
- `phone` (str): Número do destinatário
- `message` (str): Conteúdo da mensagem

**Retorna:** ID da mensagem

### get_instance_status
Verifica status da instância.

**Retorna:** Status da conexão

## Configuração

Variáveis de ambiente necessárias:
- `EVOLUTION_URL`: URL fixa VPS (default: https://slimquality-evolution-api.wpjtfd.easypanel.host)
- `EVOLUTION_API_KEY`: Chave de API (obter do Easypanel)
- `EVOLUTION_INSTANCE`: Nome da instância (default: "Slim Quality")

## Importante

- URL é fixa (VPS)
- Instância "Slim Quality" já existe
- Apenas API Key precisa ser configurada
