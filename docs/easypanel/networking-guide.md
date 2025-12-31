# Networking Guide - Easypanel Deploy

## Overview

Este documento descreve a configuração de networking para comunicação entre services no Easypanel.

## Arquitetura de Network

```
Internet
    ↓
Traefik (SSL Termination)
    ↓
Internal Network (easypanel-network)
    ├── slim-agent:8000
    ├── redis:6379
    └── evolution-api:8080
```

## Network Configuration

### 1. Internal Network

**Nome**: `easypanel-network` (padrão)
**Tipo**: Bridge
**Subnet**: Automático (172.20.0.0/16)

```yaml
Network Properties:
  Name: easypanel-network
  Driver: bridge
  Scope: local
  Internal: false
  Attachable: true
  DNS: Automatic service discovery
```

### 2. Service Discovery

**DNS Interno**: Automático
**Resolução**: Nome do service → IP interno

```bash
# Exemplos de resolução DNS interna:
redis → 172.20.0.2:6379
slim-agent → 172.20.0.3:8000
evolution-api → 172.20.0.4:8080
```

### 3. Port Mapping

```yaml
Services:
  slim-agent:
    Internal Port: 8000
    External Access: Via Traefik (443/80)
    Internal URL: http://slim-agent:8000
    
  redis:
    Internal Port: 6379
    External Access: None (Internal only)
    Internal URL: redis://redis:6379
    
  evolution-api:
    Internal Port: 8080
    External Access: Via Traefik (443/80)
    Internal URL: http://evolution-api:8080
```

## Configuração por Service

### 1. Service: slim-agent

```yaml
# Network Configuration
Network: easypanel-network
Internal Communication: Enabled
External Access: Via Domain

# Port Configuration
Container Port: 8000
Protocol: HTTP
Health Check Port: 8000

# Domain Configuration
Domain: api.slimquality.com.br
SSL: Automatic (Let's Encrypt)
HTTPS Redirect: Enabled

# Internal Connections
Outbound:
  - redis:6379 (Cache/Queue)
  - supabase.co:443 (Database)
  - api.anthropic.com:443 (AI)
  
Inbound:
  - Traefik (External traffic)
  - evolution-api:8080 (Webhooks)
```

### 2. Service: redis

```yaml
# Network Configuration
Network: easypanel-network
Internal Communication: Enabled
External Access: Disabled

# Port Configuration
Container Port: 6379
Protocol: Redis
External Port: None

# Security
Bind: 0.0.0.0 (Internal network only)
Protected Mode: Yes
Password: None (Network isolation)

# Internal Connections
Inbound:
  - slim-agent:* (All connections from backend)
  
Outbound:
  - None (Redis doesn't initiate connections)
```

## Connectivity Testing

### 1. Internal DNS Resolution

```bash
# Teste do container slim-agent

# Resolver Redis
nslookup redis
# Esperado: 172.20.0.x

# Resolver Evolution API
nslookup evolution-api
# Esperado: 172.20.0.x

# Teste de conectividade
ping redis
ping evolution-api
```

### 2. Port Connectivity

```bash
# Do container slim-agent

# Teste Redis
telnet redis 6379
# Esperado: Connected

# Teste Redis via Python
python -c "import redis; r=redis.Redis(host='redis', port=6379); print(r.ping())"
# Esperado: True

# Teste Evolution API
curl -I http://evolution-api:8080/
# Esperado: HTTP/1.1 200 OK
```

### 3. External Connectivity

```bash
# Do container slim-agent

# Teste Supabase
curl -I https://vtynmmtuvxreiwcxxlma.supabase.co
# Esperado: HTTP/2 200

# Teste Anthropic
curl -I https://api.anthropic.com
# Esperado: HTTP/2 200
```

## Firewall e Security

### 1. Internal Network Security

```yaml
Security Rules:
  - Only containers in easypanel-network can communicate
  - Redis not exposed externally
  - All external traffic via Traefik
  - SSL termination at proxy level
```

### 2. Port Security

```bash
# Portas expostas externamente
80/tcp   -> Traefik (HTTP redirect)
443/tcp  -> Traefik (HTTPS)

# Portas internas (não expostas)
6379/tcp -> Redis (internal only)
8000/tcp -> slim-agent (via Traefik)
8080/tcp -> evolution-api (via Traefik)
```

## Troubleshooting

### 1. DNS Resolution Issues

```bash
# Verificar DNS interno
nslookup redis
nslookup slim-agent

# Se falhar:
# 1. Verificar se services estão running
# 2. Verificar se estão na mesma network
# 3. Restart services se necessário
```

### 2. Connection Refused

```bash
# Verificar se service está listening
netstat -tlnp | grep :6379  # Redis
netstat -tlnp | grep :8000  # slim-agent

# Verificar logs do service
docker logs <container_id>
```

### 3. External Access Issues

```bash
# Verificar Traefik routing
curl -H "Host: api.slimquality.com.br" http://localhost/health

# Verificar SSL certificate
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br
```

## Performance Optimization

### 1. Network Performance

```yaml
Optimizations:
  - Use internal network for service communication
  - Avoid external calls when possible
  - Implement connection pooling
  - Use Redis for caching
```

### 2. Monitoring

```bash
# Network latency between services
ping -c 10 redis
ping -c 10 evolution-api

# Connection count
netstat -an | grep :6379 | wc -l  # Redis connections
netstat -an | grep :8000 | wc -l  # Backend connections
```

## Backup Network Configuration

### 1. Export Configuration

```bash
# Backup network settings
docker network inspect easypanel-network > network-config.json

# Backup service network settings
docker inspect slim-agent | jq '.[0].NetworkSettings' > slim-agent-network.json
docker inspect redis | jq '.[0].NetworkSettings' > redis-network.json
```

### 2. Recovery

```bash
# Recreate network if needed
docker network create easypanel-network --driver bridge

# Reconnect services
docker network connect easypanel-network slim-agent
docker network connect easypanel-network redis
```