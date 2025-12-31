# MCP Server - Google Workspace

Servidor MCP para integração com Google Calendar, Drive e Meet.

## Tools Disponíveis

### create_event
Cria evento no Google Calendar.

**Parâmetros:**
- `summary` (str): Título do evento
- `start` (str): Data/hora início (ISO 8601)
- `end` (str): Data/hora fim (ISO 8601)
- `attendee` (str): Email do participante

**Retorna:** ID do evento

### list_events
Lista eventos futuros.

**Parâmetros:**
- `days_ahead` (int, opcional): Dias à frente (padrão: 7)

**Retorna:** Lista de eventos

### upload_file
Upload arquivo no Google Drive.

**Parâmetros:**
- `file_path` (str): Caminho do arquivo
- `folder_id` (str, opcional): ID da pasta

**Retorna:** Link compartilhável

### create_meeting
Cria evento + link Google Meet.

**Parâmetros:**
- `summary` (str): Título da reunião
- `start` (str): Data/hora início (ISO 8601)
- `duration_min` (int): Duração em minutos

**Retorna:** Dict com event_id e meet_link

## Configuração

Variável de ambiente necessária:
- `GOOGLE_CREDENTIALS_JSON`: Credenciais OAuth em JSON

## Documentação

- Calendar: https://developers.google.com/calendar/api/guides/overview
- Drive: https://developers.google.com/drive/api/guides/about-sdk
