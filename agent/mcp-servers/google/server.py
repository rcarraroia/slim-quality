"""
MCP Server - Google Workspace

Ferramentas:
- create_event: Cria evento no Google Calendar
- list_events: Lista eventos futuros
- upload_file: Upload arquivo no Google Drive
- create_meeting: Cria evento + link Google Meet
"""
import os
import json
from datetime import datetime, timedelta
from uuid import uuid4
from mcp.server import Server
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Configuração
GOOGLE_CREDS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON")

# Criar servidor MCP
mcp = Server("google-workspace")


def get_credentials():
    """Retorna credenciais Google OAuth"""
    if not GOOGLE_CREDS_JSON:
        raise ValueError("GOOGLE_CREDENTIALS_JSON não configurado")
    
    creds_data = json.loads(GOOGLE_CREDS_JSON)
    return Credentials.from_authorized_user_info(creds_data)


@mcp.tool()
async def create_event(summary: str, start: str, end: str, attendee: str) -> str:
    """
    Cria evento no Google Calendar.
    
    Args:
        summary: Título do evento
        start: Data/hora início (ISO 8601: 2025-01-15T10:00:00)
        end: Data/hora fim (ISO 8601: 2025-01-15T11:00:00)
        attendee: Email do participante
        
    Returns:
        ID do evento criado
    """
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    
    event = {
        'summary': summary,
        'start': {
            'dateTime': start,
            'timeZone': 'America/Sao_Paulo',
        },
        'end': {
            'dateTime': end,
            'timeZone': 'America/Sao_Paulo',
        },
        'attendees': [
            {'email': attendee},
        ],
    }
    
    result = service.events().insert(calendarId='primary', body=event).execute()
    return result['id']


@mcp.tool()
async def list_events(days_ahead: int = 7) -> list:
    """
    Lista eventos futuros.
    
    Args:
        days_ahead: Número de dias à frente (padrão: 7)
        
    Returns:
        Lista de eventos
    """
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    
    now = datetime.utcnow().isoformat() + 'Z'
    max_time = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + 'Z'
    
    events_result = service.events().list(
        calendarId='primary',
        timeMin=now,
        timeMax=max_time,
        maxResults=10,
        singleEvents=True,
        orderBy='startTime'
    ).execute()
    
    events = events_result.get('items', [])
    
    return [
        {
            'id': event['id'],
            'summary': event.get('summary', 'Sem título'),
            'start': event['start'].get('dateTime', event['start'].get('date')),
            'end': event['end'].get('dateTime', event['end'].get('date')),
        }
        for event in events
    ]


@mcp.tool()
async def upload_file(file_path: str, folder_id: str = None) -> str:
    """
    Upload arquivo no Google Drive.
    
    Args:
        file_path: Caminho do arquivo local
        folder_id: ID da pasta de destino (opcional)
        
    Returns:
        Link compartilhável do arquivo
    """
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)
    
    file_metadata = {'name': os.path.basename(file_path)}
    if folder_id:
        file_metadata['parents'] = [folder_id]
    
    media = MediaFileUpload(file_path)
    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields='id, webViewLink'
    ).execute()
    
    return file.get('webViewLink', '')


@mcp.tool()
async def create_meeting(summary: str, start: str, duration_min: int) -> dict:
    """
    Cria evento com link Google Meet.
    
    Args:
        summary: Título da reunião
        start: Data/hora início (ISO 8601: 2025-01-15T10:00:00)
        duration_min: Duração em minutos
        
    Returns:
        Dict com event_id e meet_link
    """
    creds = get_credentials()
    service = build('calendar', 'v3', credentials=creds)
    
    # Calcular fim
    start_dt = datetime.fromisoformat(start)
    end_dt = start_dt + timedelta(minutes=duration_min)
    end = end_dt.isoformat()
    
    event = {
        'summary': summary,
        'start': {
            'dateTime': start,
            'timeZone': 'America/Sao_Paulo',
        },
        'end': {
            'dateTime': end,
            'timeZone': 'America/Sao_Paulo',
        },
        'conferenceData': {
            'createRequest': {
                'requestId': f"meet-{uuid4()}",
                'conferenceSolutionKey': {'type': 'hangoutsMeet'}
            }
        }
    }
    
    result = service.events().insert(
        calendarId='primary',
        body=event,
        conferenceDataVersion=1
    ).execute()
    
    meet_link = result.get('conferenceData', {}).get('entryPoints', [{}])[0].get('uri', '')
    
    return {
        'event_id': result['id'],
        'meet_link': meet_link
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(mcp.app, host="0.0.0.0", port=3000)
