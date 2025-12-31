# SSL Configuration - Easypanel Deploy

## Overview

Este documento descreve a configuração de SSL automático via Traefik no Easypanel para o domínio api.slimquality.com.br.

## Arquitetura SSL

```
Internet (HTTPS) → Traefik (SSL Termination) → Internal Network (HTTP)
```

## Configuração Automática

### 1. Traefik Configuration

O Easypanel usa Traefik como reverse proxy com SSL automático via Let's Encrypt.

```yaml
Traefik Features:
  - SSL Termination automático
  - Let's Encrypt ACME challenge
  - HTTP → HTTPS redirect
  - Certificate renewal automático
  - SNI (Server Name Indication)
```

### 2. Domain Configuration

**No Service slim-agent**:

```yaml
Domain Settings:
  Domain: api.slimquality.com.br
  SSL: Automatic (Let's Encrypt)
  HTTPS Redirect: Enabled
  Certificate Provider: Let's Encrypt
  ACME Challenge: HTTP-01
```

### 3. DNS Requirements

**Pré-requisitos para SSL**:

```bash
# DNS deve apontar corretamente
nslookup api.slimquality.com.br
# Deve retornar: IP do VPS Easypanel

# Porta 80 deve estar acessível (ACME challenge)
curl -I http://api.slimquality.com.br/.well-known/acme-challenge/test
# Deve ser acessível (mesmo que retorne 404)
```

## Processo de Configuração

### Passo 1: Configurar Domain no Service

1. **Acessar Service**:
   - Easypanel > Services > slim-agent
   - Aba "Domains"

2. **Adicionar Domain**:
   ```
   Domain: api.slimquality.com.br
   Path: / (root)
   Port: 8000 (container port)
   ```

3. **Ativar SSL**:
   ```
   ☑ Enable SSL
   ☑ Force HTTPS Redirect
   Certificate: Automatic (Let's Encrypt)
   ```

### Passo 2: Aguardar Certificate Generation

```bash
# O processo automático demora 1-3 minutos
# Traefik fará:
1. HTTP-01 ACME Challenge
2. Verificação de domínio
3. Geração do certificado
4. Configuração do routing
```

### Passo 3: Verificar SSL Funcionando

```bash
# Teste HTTPS
curl -I https://api.slimquality.com.br/health
# Status: 200 OK

# Teste redirect HTTP → HTTPS
curl -I http://api.slimquality.com.br/health
# Status: 301 Moved Permanently
# Location: https://api.slimquality.com.br/health

# Verificar certificado
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br
# Verify return code: 0 (ok)
```

## Validação SSL

### 1. Certificate Details

```bash
# Verificar detalhes do certificado
echo | openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br 2>/dev/null | openssl x509 -noout -text

# Informações esperadas:
Issuer: Let's Encrypt Authority X3
Subject: CN=api.slimquality.com.br
Validity: 90 days
SAN: api.slimquality.com.br
```

### 2. SSL Labs Test

```bash
# Teste online (opcional)
# https://www.ssllabs.com/ssltest/analyze.html?d=api.slimquality.com.br

# Rating esperado: A ou A+
# Protocolo: TLS 1.2, TLS 1.3
# Cipher Suites: Secure
```

### 3. Browser Validation

```bash
# Teste em diferentes browsers
# Chrome: Certificado válido (cadeado verde)
# Firefox: Certificado válido
# Safari: Certificado válido
# Edge: Certificado válido
```

## Troubleshooting SSL

### Problema: Certificate não é gerado

**Sintomas**:
- HTTPS retorna erro de certificado
- Logs Traefik mostram ACME errors

**Soluções**:

1. **Verificar DNS**:
   ```bash
   # DNS deve apontar corretamente
   nslookup api.slimquality.com.br
   # Deve retornar IP do VPS
   ```

2. **Verificar porta 80 acessível**:
   ```bash
   # ACME challenge precisa de porta 80
   curl -I http://api.slimquality.com.br
   # Deve ser acessível
   ```

3. **Verificar rate limits**:
   ```bash
   # Let's Encrypt tem rate limits
   # Máximo 5 certificados por semana por domínio
   # Aguardar se limite atingido
   ```

### Problema: Mixed Content Warnings

**Sintomas**:
- Browser mostra warnings de conteúdo misto
- Alguns recursos carregam via HTTP

**Soluções**:

1. **Forçar HTTPS em todas as URLs**:
   ```javascript
   // No frontend, sempre usar HTTPS
   const API_URL = 'https://api.slimquality.com.br';
   ```

2. **Configurar HSTS Header**:
   ```python
   # No FastAPI
   @app.middleware("http")
   async def add_security_headers(request, call_next):
       response = await call_next(request)
       response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
       return response
   ```

### Problema: Certificate Renewal Fails

**Sintomas**:
- Certificado expira
- Renewal automático falha

**Soluções**:

1. **Verificar logs Traefik**:
   ```bash
   # Easypanel > System > Logs > Traefik
   # Procurar por ACME errors
   ```

2. **Manual renewal**:
   ```bash
   # Remover domain e adicionar novamente
   # Easypanel > Services > slim-agent > Domains
   # Remove domain → Save → Add domain → Save
   ```

## Security Best Practices

### 1. HTTPS Enforcement

```yaml
Configuration:
  Force HTTPS Redirect: ✅ Enabled
  HSTS Header: ✅ Recommended
  Secure Cookies: ✅ Use secure flag
  Mixed Content: ❌ Avoid HTTP resources
```

### 2. Certificate Monitoring

```bash
# Script para monitorar expiração
#!/bin/bash
DOMAIN="api.slimquality.com.br"
EXPIRY=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s)
NOW_EPOCH=$(date +%s)
DAYS_LEFT=$(( ($EXPIRY_EPOCH - $NOW_EPOCH) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
    echo "WARNING: Certificate expires in $DAYS_LEFT days"
fi
```

### 3. Security Headers

```python
# Implementar no FastAPI
SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value
    return response
```

## Performance Optimization

### 1. SSL Performance

```yaml
Optimizations:
  - HTTP/2 enabled (automatic with Traefik)
  - OCSP Stapling (automatic)
  - Session resumption (automatic)
  - Perfect Forward Secrecy (automatic)
```

### 2. Caching

```bash
# SSL handshake caching
# Traefik automaticamente otimiza:
- TLS session tickets
- OCSP stapling cache
- Certificate chain caching
```

## Monitoring SSL

### 1. Certificate Expiry Monitoring

```bash
# Verificar expiração regularmente
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br 2>/dev/null | openssl x509 -noout -enddate

# Automatizar verificação
# Cron job diário para verificar expiração
0 9 * * * /path/to/ssl-check.sh
```

### 2. SSL Health Checks

```bash
# Verificar SSL funcionando
curl -I https://api.slimquality.com.br/health
# Status: 200 OK

# Verificar redirect
curl -I http://api.slimquality.com.br/health
# Status: 301 → HTTPS
```

### 3. Performance Monitoring

```bash
# Medir SSL handshake time
curl -w "@curl-format.txt" -o /dev/null -s https://api.slimquality.com.br/health

# curl-format.txt:
time_namelookup:  %{time_namelookup}\n
time_connect:     %{time_connect}\n
time_appconnect:  %{time_appconnect}\n
time_pretransfer: %{time_pretransfer}\n
time_redirect:    %{time_redirect}\n
time_starttransfer: %{time_starttransfer}\n
time_total:       %{time_total}\n
```

## Backup e Recovery

### 1. Certificate Backup

```bash
# Traefik armazena certificados automaticamente
# Backup é feito pelo Easypanel
# Localização: /data/traefik/acme.json
```

### 2. Recovery Procedures

```bash
# Em caso de problemas:
1. Verificar DNS apontando corretamente
2. Remover e recriar domain no service
3. Aguardar nova geração de certificado
4. Verificar funcionamento
```

## Compliance

### 1. Security Standards

```yaml
Compliance:
  - TLS 1.2+ only
  - Strong cipher suites
  - Perfect Forward Secrecy
  - HSTS enabled
  - No mixed content
```

### 2. Audit Trail

```bash
# Logs de certificados
# Easypanel > System > Logs > Traefik
# Filtrar por: "acme", "certificate", "ssl"
```

---

## ✅ Checklist SSL

### Configuração
- [ ] Domain configurado no service
- [ ] SSL automático ativado
- [ ] HTTPS redirect ativado
- [ ] DNS apontando corretamente

### Validação
- [ ] HTTPS funcionando (200 OK)
- [ ] HTTP redirect para HTTPS
- [ ] Certificado válido (Let's Encrypt)
- [ ] Sem warnings no browser

### Monitoramento
- [ ] Certificate expiry monitoring
- [ ] SSL health checks
- [ ] Performance monitoring
- [ ] Security headers implementados

**SSL configurado com sucesso! 🔒**