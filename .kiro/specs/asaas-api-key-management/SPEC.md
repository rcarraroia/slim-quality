# SPEC: Gerenciamento de Chave de API Asaas

**Status:** 🟡 Pendente  
**Prioridade:** Alta  
**Data de Criação:** 25/02/2026  
**Responsável:** Kiro AI  

---

## 📋 CONTEXTO

### Problema Identificado

O Asaas desativa automaticamente chaves de API após período de inatividade (~10-14 dias), causando interrupção total do sistema de pagamentos e afiliados.

### Histórico de Incidentes

| Data Criação | Data Remoção | Duração | Último Uso |
|--------------|--------------|---------|------------|
| 16/11/2025 | 24/11/2025 | 8 dias | Desconhecido |
| 06/01/2026 | 16/01/2026 | 10 dias | Desconhecido |
| 02/02/2026 | 18/02/2026 | 16 dias | 07/02/2026 (11 dias inativo) |

### Impacto

- 🔴 Sistema de checkout completamente parado
- 🔴 Impossibilidade de processar pagamentos (PIX/Boleto/Cartão)
- 🔴 Sistema de afiliados inoperante
- 🔴 Validação de Wallet ID falhando
- 🔴 100% das vendas bloqueadas

---

## 🎯 OBJETIVO

Implementar sistema de gerenciamento de chave de API do Asaas que:
1. Previna expiração automática por inatividade
2. Monitore saúde da chave
3. Alerte antes de expiração
4. Mantenha sistema sempre operacional

---

## 📊 ANÁLISE TÉCNICA

### Política de Expiração do Asaas

Segundo documentação oficial:
- Campo `projectedExpirationDateByLackOfUse` indica data de expiração por inatividade
- Evento `ACCESS_TOKEN_EXPIRING_SOON` dispara antes da expiração
- Evento `ACCESS_TOKEN_EXPIRED` indica chave expirada
- Período de inatividade: **~10-14 dias** (não documentado oficialmente)
- Chaves com `expirationDate` manual **NÃO expiram por inatividade**

### Limites da API Asaas

- **Requisições concorrentes:** 50 GET simultâneos
- **Quota 12h:** 25.000 requisições por conta
- **Rate limit:** Varia por endpoint (verificar headers `RateLimit-*`)
- **Erro:** HTTP 429 Too Many Requests quando excedido

---

## 🎯 SOLUÇÕES PROPOSTAS

### Fase 1: Correção Imediata ⚡ (Hoje)

**Objetivo:** Restaurar operação do sistema

**Tarefas:**
- [ ] Gerar nova chave no painel Asaas
- [ ] Atualizar `ASAAS_API_KEY` na Vercel
- [ ] Fazer redeploy do projeto
- [ ] Testar com compra real
- [ ] Confirmar sistema operacional

**Tempo estimado:** 15 minutos  
**Responsável:** Renato

---

### Fase 2: Keep-Alive Semanal 🔄 (Médio Prazo)

**Objetivo:** Prevenir expiração por inatividade

#### Task 2.1: Criar Endpoint de Keep-Alive

**Arquivo:** `api/cron/asaas-keep-alive.js`

```javascript
/**
 * Vercel Serverless Function - Asaas Keep-Alive
 * Mantém chave de API ativa fazendo requisição semanal
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

    if (!ASAAS_API_KEY) {
      console.error('[Keep-Alive] ❌ ASAAS_API_KEY não configurada');
      return res.status(500).json({
        success: false,
        error: 'ASAAS_API_KEY não configurada'
      });
    }

    const trimmedKey = ASAAS_API_KEY.trim();
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    console.log('[Keep-Alive] 🔄 Executando ping no Asaas...', {
      environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
      timestamp: new Date().toISOString()
    });

    // Fazer requisição simples para manter chave ativa
    const response = await fetch(`${asaasBaseUrl}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': trimmedKey
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[Keep-Alive] ✅ Ping bem-sucedido', {
        status: response.status,
        customersFound: data.totalCount || 0,
        timestamp: new Date().toISOString()
      });

      return res.status(200).json({
        success: true,
        message: 'Asaas API key mantida ativa',
        environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
        status: response.status,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('[Keep-Alive] ❌ Falha no ping', {
        status: response.status,
        error: data
      });

      return res.status(500).json({
        success: false,
        error: 'Falha ao pingar Asaas API',
        details: data,
        status: response.status
      });
    }
  } catch (error) {
    console.error('[Keep-Alive] ❌ Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno',
      type: error.name || 'Error'
    });
  }
}
```

**Critérios de Aceitação:**
- [ ] Endpoint responde com status 200 quando bem-sucedido
- [ ] Endpoint loga timestamp de cada execução
- [ ] Endpoint detecta ambiente (production/sandbox) automaticamente
- [ ] Endpoint retorna erro claro se chave não configurada
- [ ] Endpoint trata erros de conexão gracefully

---

#### Task 2.2: Configurar Vercel Cron

**Arquivo:** `vercel.json` (adicionar/atualizar)

```json
{
  "crons": [
    {
      "path": "/api/cron/asaas-keep-alive",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

**Configuração:**
- **Schedule:** `0 0 * * 0` = Todo domingo à meia-noite (UTC)
- **Frequência:** Semanal (suficiente para período de 10-14 dias)
- **Timezone:** UTC (Vercel padrão)

**Critérios de Aceitação:**
- [ ] Cron configurado no vercel.json
- [ ] Cron executando semanalmente
- [ ] Logs de execução visíveis no Vercel Dashboard
- [ ] Execução bem-sucedida confirmada por 4 semanas consecutivas

---

#### Task 2.3: Monitoramento e Alertas

**Arquivo:** `api/cron/check-asaas-key-health.js`

```javascript
/**
 * Vercel Serverless Function - Asaas Key Health Check
 * Verifica saúde da chave e alerta se próxima de expirar
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const ALERT_EMAIL = 'rcarrarocoach@gmail.com';

    if (!ASAAS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'ASAAS_API_KEY não configurada'
      });
    }

    const trimmedKey = ASAAS_API_KEY.trim();
    const isProduction = trimmedKey.includes('_prod_');
    const asaasBaseUrl = isProduction
      ? 'https://api.asaas.com/v3'
      : 'https://api-sandbox.asaas.com/v3';

    // Testar autenticação
    const testResponse = await fetch(`${asaasBaseUrl}/customers?limit=1`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'access_token': trimmedKey
      }
    });

    const testData = await testResponse.json();

    if (!testResponse.ok) {
      // ALERTA CRÍTICO: Chave inválida
      console.error('[Health Check] 🚨 CHAVE INVÁLIDA!', {
        status: testResponse.status,
        error: testData
      });

      // Enviar email de alerta
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Slim Quality <noreply@slimquality.com.br>',
            to: [ALERT_EMAIL],
            subject: '🚨 ALERTA CRÍTICO - Chave Asaas Inválida',
            html: `
              <h1>🚨 ALERTA SLIM QUALITY - ASAAS FORA DO AR!</h1>
              <p><strong>Data/Hora:</strong> ${new Date().toLocaleString('pt-BR')}</p>
              <p><strong>Status:</strong> FALHA NA AUTENTICAÇÃO</p>
              <p><strong>Erro:</strong> ${testData.errors?.[0]?.description || 'Chave inválida'}</p>
              <p><strong>Ambiente:</strong> ${isProduction ? 'PRODUÇÃO' : 'SANDBOX'}</p>
              <hr>
              <h2>AÇÃO NECESSÁRIA:</h2>
              <ol>
                <li>Acesse o painel do Asaas</li>
                <li>Verifique se a chave de API está ativa</li>
                <li>Se necessário, gere uma nova chave</li>
                <li>Atualize a variável ASAAS_API_KEY na Vercel</li>
              </ol>
              <p><strong>Painel Asaas:</strong> <a href="https://www.asaas.com/minhaConta/apiKey">https://www.asaas.com/minhaConta/apiKey</a></p>
              <p><strong>Vercel:</strong> <a href="https://vercel.com/rcarraroia/slim-quality/settings/environment-variables">https://vercel.com/rcarraroia/slim-quality/settings/environment-variables</a></p>
            `
          })
        });
      }

      return res.status(500).json({
        success: false,
        status: 'CRITICAL',
        message: 'Chave Asaas inválida - Sistema fora do ar',
        error: testData,
        alertSent: !!RESEND_API_KEY
      });
    }

    // Chave válida
    console.log('[Health Check] ✅ Chave válida e funcionando');

    return res.status(200).json({
      success: true,
      status: 'HEALTHY',
      message: 'Chave Asaas válida e operacional',
      environment: isProduction ? 'PRODUCTION' : 'SANDBOX',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Health Check] ❌ Erro crítico:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno'
    });
  }
}
```

**Configurar Cron para Health Check:**

Adicionar ao `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/asaas-keep-alive",
      "schedule": "0 0 * * 0"
    },
    {
      "path": "/api/cron/check-asaas-key-health",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Schedule:** `0 */6 * * *` = A cada 6 horas

**Critérios de Aceitação:**
- [ ] Health check executando a cada 6 horas
- [ ] Email de alerta enviado quando chave inválida
- [ ] Logs detalhados de cada verificação
- [ ] Alertas recebidos e testados

---

### Fase 3: Expiração Manual (Longo Prazo - Opcional)

**Objetivo:** Desativar completamente expiração por inatividade

#### Task 3.1: Criar Chave com Expiração Manual

**Método:** Via API do Asaas

```javascript
// Script para criar chave com expiração manual
// Executar manualmente quando necessário

const accountId = 'SEU_ACCOUNT_ID';
const masterKey = 'SUA_MASTER_KEY';

const response = await fetch(`https://api.asaas.com/v3/accounts/${accountId}/accessTokens`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'access_token': masterKey
  },
  body: JSON.stringify({
    name: 'SlimQuality Production - Manual Expiration',
    expirationDate: '2027-12-31 23:59:59' // 1 ano no futuro
  })
});

const data = await response.json();
console.log('Nova chave criada:', data.apiKey);
```

**Benefício:** Segundo documentação Asaas:
> "This event is not triggered for keys with a manually set expiration date"

Chaves com `expirationDate` manual **NÃO expiram por inatividade**.

**Critérios de Aceitação:**
- [ ] Script de criação de chave documentado
- [ ] Chave criada com expiração de 1 ano
- [ ] Lembrete no calendário para renovar em 11 meses
- [ ] Processo de renovação documentado

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs

- **Uptime do sistema de pagamentos:** > 99.9%
- **Tempo de detecção de falha:** < 6 horas
- **Tempo de resposta a alertas:** < 1 hora
- **Incidentes de chave expirada:** 0 por mês

### Monitoramento

- [ ] Dashboard com status da chave
- [ ] Logs de keep-alive semanais
- [ ] Logs de health check (6/6h)
- [ ] Histórico de alertas enviados

---

## 🗓️ CRONOGRAMA

### Fase 1: Imediata
- **Prazo:** Hoje (25/02/2026)
- **Duração:** 15 minutos
- **Responsável:** Renato

### Fase 2: Médio Prazo
- **Prazo:** Após conclusão da spec atual
- **Duração:** 4 horas
- **Responsável:** Kiro AI
- **Tasks:**
  - Task 2.1: Criar endpoint keep-alive (1h)
  - Task 2.2: Configurar Vercel Cron (30min)
  - Task 2.3: Implementar health check (2h)
  - Testes e validação (30min)

### Fase 3: Longo Prazo (Opcional)
- **Prazo:** A definir
- **Duração:** 1 hora
- **Responsável:** Kiro AI

---

## 🔧 TESTES

### Testes Unitários

```typescript
// tests/unit/asaas-keep-alive.test.ts
describe('Asaas Keep-Alive', () => {
  it('deve fazer ping com sucesso', async () => {
    const response = await fetch('/api/cron/asaas-keep-alive');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
  
  it('deve retornar erro se chave não configurada', async () => {
    // Mock sem ASAAS_API_KEY
    const response = await fetch('/api/cron/asaas-keep-alive');
    const data = await response.json();
    
    expect(response.status).toBe(500);
    expect(data.error).toContain('não configurada');
  });
});
```

### Testes de Integração

```typescript
// tests/integration/asaas-keep-alive.test.ts
describe('Asaas Keep-Alive Integration', () => {
  it('deve manter chave ativa após 7 dias', async () => {
    // Simular 7 dias de inatividade
    // Executar keep-alive
    // Verificar que chave ainda está válida
  });
  
  it('deve enviar alerta se chave inválida', async () => {
    // Mock de chave inválida
    // Executar health check
    // Verificar que email foi enviado
  });
});
```

---

## 📚 DOCUMENTAÇÃO

### Arquivos a Criar/Atualizar

- [ ] `docs/ASAAS_API_KEY_MANAGEMENT.md` - Guia completo
- [ ] `docs/TROUBLESHOOTING.md` - Adicionar seção sobre chave expirada
- [ ] `.env.example` - Documentar variáveis necessárias
- [ ] `README.md` - Adicionar seção sobre crons

### Conteúdo da Documentação

```markdown
# Gerenciamento de Chave de API Asaas

## Visão Geral
Sistema automatizado para prevenir expiração da chave de API do Asaas.

## Como Funciona
1. Keep-alive semanal mantém chave ativa
2. Health check a cada 6 horas verifica validade
3. Alertas automáticos em caso de falha

## Endpoints
- GET /api/cron/asaas-keep-alive - Ping semanal
- GET /api/cron/check-asaas-key-health - Verificação de saúde

## Crons Configurados
- Keep-alive: Todo domingo à meia-noite (UTC)
- Health check: A cada 6 horas

## Troubleshooting
### Chave Expirada
1. Gerar nova chave no painel Asaas
2. Atualizar ASAAS_API_KEY na Vercel
3. Fazer redeploy
4. Verificar logs de keep-alive

### Alertas Não Recebidos
1. Verificar RESEND_API_KEY configurada
2. Verificar email de destino
3. Verificar logs do health check
```

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Cron Falhar
**Probabilidade:** Baixa  
**Impacto:** Alto  
**Mitigação:** 
- Health check a cada 6h detecta falha rapidamente
- Alertas automáticos por email
- Monitoramento de logs no Vercel

### Risco 2: Limite de Requisições
**Probabilidade:** Muito Baixa  
**Impacto:** Médio  
**Mitigação:**
- Keep-alive usa apenas 1 requisição/semana
- Health check usa 4 requisições/dia
- Total: ~32 requisições/semana (muito abaixo do limite)

### Risco 3: Mudança na Política do Asaas
**Probabilidade:** Baixa  
**Impacto:** Alto  
**Mitigação:**
- Monitorar documentação do Asaas
- Manter contato com suporte
- Sistema de alertas detecta mudanças

---

## 📝 NOTAS ADICIONAIS

### Referências
- Documentação Asaas: https://docs.asaas.com
- API Limits: https://docs.asaas.com/docs/api-limits-1
- Authentication: https://docs.asaas.com/docs/authentication
- API Key Events: https://docs.asaas.com/update/docs/api-key-events

### Lições Aprendidas
- Asaas não documenta período exato de inatividade
- Período estimado: 10-14 dias baseado em histórico
- Chaves com expiração manual não expiram por inatividade
- Keep-alive semanal é suficiente para prevenir expiração

### Contato Suporte Asaas
- Email: suporte@asaas.com.br
- Telefone: (47) 3025-2727
- Chat: Disponível no painel web

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Imediata
- [ ] Gerar nova chave no Asaas
- [ ] Atualizar ASAAS_API_KEY na Vercel
- [ ] Fazer redeploy
- [ ] Testar sistema

### Fase 2: Keep-Alive
- [ ] Criar api/cron/asaas-keep-alive.js
- [ ] Criar api/cron/check-asaas-key-health.js
- [ ] Atualizar vercel.json com crons
- [ ] Fazer deploy
- [ ] Testar endpoints manualmente
- [ ] Aguardar primeira execução automática
- [ ] Validar logs no Vercel
- [ ] Confirmar alertas funcionando

### Fase 3: Documentação
- [ ] Criar docs/ASAAS_API_KEY_MANAGEMENT.md
- [ ] Atualizar docs/TROUBLESHOOTING.md
- [ ] Atualizar .env.example
- [ ] Atualizar README.md

### Fase 4: Monitoramento
- [ ] Monitorar por 4 semanas
- [ ] Validar keep-alive executando semanalmente
- [ ] Validar health check executando a cada 6h
- [ ] Confirmar zero incidentes de chave expirada

---

**Spec criada em:** 25/02/2026  
**Última atualização:** 25/02/2026  
**Status:** 🟡 Aguardando implementação após spec atual
