# Configuração DNS - api.slimquality.com.br

## Overview

Este documento descreve como configurar o DNS para apontar o subdomínio `api.slimquality.com.br` para o VPS Easypanel.

## Pré-requisitos

- ✅ Acesso ao painel DNS do domínio (ex: Cloudflare, Registro.br)
- ✅ IP público do VPS Easypanel
- ✅ Easypanel configurado com Traefik

## Configuração DNS

### 1. Obter IP do VPS Easypanel

```bash
# Verificar IP público do VPS
curl -4 ifconfig.me
# Exemplo: 203.0.113.10

# Ou verificar no painel Easypanel
# Dashboard > System > Network > Public IP
```

### 2. Configurar Record DNS

#### Cloudflare (Recomendado)

1. **Acessar Cloudflare Dashboard**:
   - Login em https://dash.cloudflare.com
   - Selecionar domínio `slimquality.com.br`

2. **Criar Record A**:
   ```
   Type: A
   Name: api
   IPv4 address: [IP_DO_VPS]
   Proxy status: DNS only (cinza) ⚠️ IMPORTANTE
   TTL: Auto
   ```

3. **⚠️ ATENÇÃO - Proxy Status**:
   - **DEVE estar em "DNS only" (cinza)**
   - **NÃO usar "Proxied" (laranja)**
   - Traefik precisa gerenciar SSL diretamente

#### Registro.br

1. **Acessar Painel Registro.br**:
   - Login em https://registro.br
   - Gerenciar DNS do domínio

2. **Criar Record A**:
   ```
   Tipo: A
   Nome: api.slimquality.com.br
   Valor: [IP_DO_VPS]
   TTL: 3600 (1 hora)
   ```

#### Outros Provedores DNS

```
# Configuração genérica
Type: A
Host/Name: api
Value/Target: [IP_DO_VPS]
TTL: 3600 ou Auto
```

### 3. Verificar Propagação DNS

```bash
# Verificar resolução DNS
nslookup api.slimquality.com.br
# Deve retornar o IP do VPS

# Verificar de diferentes servidores DNS
nslookup api.slimquality.com.br 8.8.8.8
nslookup api.slimquality.com.br 1.1.1.1

# Verificar propagação global
dig api.slimquality.com.br +short
# Deve retornar: [IP_DO_VPS]
```

### 4. Testar Conectividade

```bash
# Teste básico de conectividade
ping api.slimquality.com.br
# Deve responder do IP correto

# Teste HTTP (antes do SSL)
curl -I http://api.slimquality.com.br
# Pode retornar 404 ou redirect, mas deve conectar
```

## Configuração Traefik

### 1. Verificar Routing Traefik

O Easypanel configura automaticamente o Traefik, mas é importante verificar:

```yaml
# Configuração automática do Easypanel
# Services > slim-agent > Domains
Domain: api.slimquality.com.br
SSL: Automatic (Let's Encrypt)
HTTPS Redirect: Enabled
```

### 2. Labels Docker (Automático)

O Easypanel adiciona automaticamente as labels:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.slim-agent.rule=Host(`api.slimquality.com.br`)"
  - "traefik.http.routers.slim-agent.tls=true"
  - "traefik.http.routers.slim-agent.tls.certresolver=letsencrypt"
  - "traefik.http.services.slim-agent.loadbalancer.server.port=8000"
```

## SSL/TLS Configuration

### 1. Let's Encrypt Automático

```yaml
# Configuração automática via Easypanel
Certificate Provider: Let's Encrypt
Certificate Type: Wildcard ou Single Domain
Auto Renewal: Enabled
HTTPS Redirect: Enabled
```

### 2. Verificar Certificado

```bash
# Verificar certificado SSL
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br

# Verificar detalhes do certificado
curl -vI https://api.slimquality.com.br 2>&1 | grep -A 10 "Server certificate"

# Verificar validade
echo | openssl s_client -connect api.slimquality.com.br:443 2>/dev/null | openssl x509 -noout -dates
```

## Troubleshooting

### 1. DNS não resolve

**Sintomas**:
```bash
nslookup api.slimquality.com.br
# NXDOMAIN ou timeout
```

**Soluções**:
1. Verificar se record foi criado corretamente
2. Aguardar propagação (até 24h)
3. Verificar TTL do record anterior
4. Testar com diferentes DNS servers

### 2. DNS resolve mas não conecta

**Sintomas**:
```bash
ping api.slimquality.com.br
# Timeout ou unreachable
```

**Soluções**:
1. Verificar se IP do VPS está correto
2. Verificar firewall do VPS
3. Verificar se Easypanel está rodando
4. Verificar se portas 80/443 estão abertas

### 3. HTTP conecta mas HTTPS falha

**Sintomas**:
```bash
curl http://api.slimquality.com.br  # OK
curl https://api.slimquality.com.br # Falha
```

**Soluções**:
1. Aguardar geração do certificado (até 10 min)
2. Verificar logs do Traefik
3. Verificar se domínio não está proxied (Cloudflare)
4. Verificar rate limits Let's Encrypt

### 4. Certificado inválido

**Sintomas**:
- Browser mostra "Not Secure"
- Certificado self-signed ou expirado

**Soluções**:
1. Verificar configuração Let's Encrypt
2. Forçar renovação do certificado
3. Verificar logs de erro do Traefik
4. Verificar se domínio é acessível externamente

## Validação Final

### Checklist DNS

- [ ] Record A criado: api.slimquality.com.br → [IP_VPS]
- [ ] DNS resolve corretamente: `nslookup api.slimquality.com.br`
- [ ] Propagação completa: Teste de múltiplos DNS servers
- [ ] Conectividade: `ping api.slimquality.com.br` responde

### Checklist SSL

- [ ] HTTPS funciona: `curl -I https://api.slimquality.com.br`
- [ ] Certificado válido: Sem warnings no browser
- [ ] Redirect HTTP→HTTPS: `curl -I http://api.slimquality.com.br`
- [ ] Certificado Let's Encrypt: Verificar issuer

### Checklist Traefik

- [ ] Service configurado no Easypanel
- [ ] Domain adicionado ao service
- [ ] SSL automático ativado
- [ ] Logs Traefik sem erros

## Comandos Úteis

### Verificação DNS

```bash
# Resolução básica
nslookup api.slimquality.com.br

# Resolução detalhada
dig api.slimquality.com.br A +short

# Verificar TTL
dig api.slimquality.com.br A

# Verificar de DNS específico
nslookup api.slimquality.com.br 8.8.8.8
```

### Verificação SSL

```bash
# Certificado básico
curl -I https://api.slimquality.com.br

# Detalhes do certificado
openssl s_client -connect api.slimquality.com.br:443 -servername api.slimquality.com.br

# Verificar chain completo
curl --insecure -vvI https://api.slimquality.com.br 2>&1 | grep -A 5 -B 5 certificate

# Testar diferentes TLS versions
openssl s_client -connect api.slimquality.com.br:443 -tls1_2
```

### Verificação Conectividade

```bash
# Ping básico
ping -c 4 api.slimquality.com.br

# Teste de porta
telnet api.slimquality.com.br 80
telnet api.slimquality.com.br 443

# Trace route
traceroute api.slimquality.com.br

# Teste HTTP/HTTPS
curl -w "@curl-format.txt" -o /dev/null -s https://api.slimquality.com.br/health
```

## Monitoramento

### Alertas DNS

- Monitor DNS resolution a cada 5 minutos
- Alerta se resolução falhar por > 2 minutos
- Verificar mudanças não autorizadas no DNS

### Alertas SSL

- Monitor certificado expirando em < 30 dias
- Alerta se certificado inválido
- Monitor renovação automática funcionando

### Logs Importantes

```bash
# Logs Traefik (no VPS)
docker logs traefik

# Logs específicos de SSL
docker logs traefik 2>&1 | grep -i "certificate\|ssl\|tls"

# Logs de routing
docker logs traefik 2>&1 | grep -i "api.slimquality.com.br"
```

## Backup e Recovery

### Backup Configuração DNS

```bash
# Exportar records DNS (Cloudflare)
# Via API ou painel administrativo

# Documentar configuração
echo "api.slimquality.com.br A [IP_VPS]" > dns-backup.txt
```

### Recovery

```bash
# Em caso de problemas:
# 1. Verificar se IP VPS mudou
# 2. Recriar record DNS se necessário
# 3. Aguardar propagação
# 4. Verificar Traefik funcionando
```

---

## ✅ Resultado Esperado

Após configuração completa:

```bash
# DNS resolve
$ nslookup api.slimquality.com.br
Server:    8.8.8.8
Address:   8.8.8.8#53
Name:      api.slimquality.com.br
Address:   [IP_VPS]

# HTTPS funciona
$ curl -I https://api.slimquality.com.br/health
HTTP/2 200
server: nginx/1.21.6
content-type: application/json
ssl-certificate: Let's Encrypt

# Redirect HTTP→HTTPS
$ curl -I http://api.slimquality.com.br
HTTP/1.1 301 Moved Permanently
Location: https://api.slimquality.com.br/
```

**DNS configurado com sucesso! 🌐**