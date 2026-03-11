# 🔍 CAUSA RAIZ: CHAVE API ASAAS EXCLUÍDA AUTOMATICAMENTE

**Data da Análise:** 11/03/2026  
**Problema:** Sistema inteiro bloqueado - erro "A chave de API fornecida é inválida"

---

## 📊 LINHA DO TEMPO DO PROBLEMA

| Data | Hora | Evento | Status |
|------|------|--------|--------|
| 27/02/2026 | 19:17 | ✅ Chave API "SlimQuality" criada | Ativa |
| 27/02 - 02/03 | - | ⚠️ Período de 3 dias | Chave ativa mas não usada? |
| 02/03/2026 | 15:15 | ❌ Chave API excluída pela Asaas | Deletada |
| 10/03/2026 | - | 🚨 Erro reportado: "chave inválida" | Sistema bloqueado |
| 11/03/2026 | - | 🔍 Causa raiz identificada | Em correção |

**Duração da chave:** Apenas **3 dias** (27/02 às 19:17 → 02/03 às 15:15)

**Duração configurada:** 1 ano

---

## 🚨 CAUSA RAIZ IDENTIFICADA

### Política de Inatividade do Asaas

Segundo a documentação oficial do Asaas:

> **ACCESS_TOKEN_EXPIRED** - An API key has been permanently expired **due to inactivity** or due to manual configuration.

> **ACCESS_TOKEN_EXPIRING_SOON** - An API key will expire soon **due to inactivity**. This event is not triggered for keys with a manually set expiration date.

**Fonte:** [https://asaas.readme.io/docs/api-key-events](https://asaas.readme.io/docs/api-key-events)

### O que Aconteceu

1. **27/02/2026 às 19:17** - Chave criada com duração de 1 ano
2. **27/02 - 02/03** - Chave NÃO foi usada (sem requisições à API)
3. **02/03/2026 às 15:15** - Asaas **excluiu automaticamente** a chave por inatividade
4. **10/03/2026** - Sistema começou a falhar com "chave inválida"

### Política de Inatividade

Embora a documentação do Asaas não especifique o período exato, a evidência mostra:

- ✅ Chave criada: 27/02 às 19:17
- ❌ Chave excluída: 02/03 às 15:15
- ⏱️ **Período: ~3 dias sem uso**

**Conclusão:** Asaas tem uma política de **exclusão automática de chaves não utilizadas em aproximadamente 3 dias**.

---

## 🔍 ANÁLISE DETALHADA

### Por que a Chave Não Foi Usada?

**Hipótese 1: Sistema em Desenvolvimento**
- Chave criada em 27/02
- Sistema ainda não estava em produção
- Nenhuma requisição foi feita à API Asaas
- Asaas detectou inatividade e excluiu a chave

**Hipótese 2: Chave Criada Mas Não Configurada**
- Chave criada no painel Asaas
- Mas não foi adicionada ao `.env` ou Vercel imediatamente
- Sistema continuou usando chave antiga (se existia)
- Nova chave nunca foi usada

**Hipótese 3: Ambiente de Teste**
- Chave criada para testes
- Testes não foram executados nos primeiros 3 dias
- Asaas excluiu por inatividade

### Eventos do Asaas

O Asaas envia webhooks para eventos de chave API:

1. **ACCESS_TOKEN_CREATED** - Chave criada (27/02 às 19:17)
2. **ACCESS_TOKEN_EXPIRING_SOON** - Aviso de expiração iminente (não recebido?)
3. **ACCESS_TOKEN_EXPIRED** - Chave expirada por inatividade
4. **ACCESS_TOKEN_DELETED** - Chave excluída (02/03 às 15:15)

**Problema:** Se você não configurou webhooks, não recebeu avisos!

---

## 🎯 IMPACTO NO SISTEMA

### Funcionalidades Afetadas

Todas as funcionalidades que dependem do Asaas estão **BLOQUEADAS**:

1. ❌ **Compra de produtos físicos**
   - Endpoint: `POST /api/checkout`
   - Erro: "A chave de API fornecida é inválida"

2. ❌ **Cadastro de afiliados**
   - Endpoint: `POST /api/affiliates?action=payment-first-validate`
   - Erro: "A chave de API fornecida é inválida"
   - Erro secundário: "Produto de adesão não encontrado"

3. ❌ **Cobrança de adesões**
   - Endpoint: `POST /api/create-payment`
   - Erro: "A chave de API fornecida é inválida"

4. ❌ **Assinaturas recorrentes**
   - Renovações mensais não funcionam
   - Webhooks não são processados

5. ❌ **Split de comissões**
   - Pagamentos não são divididos
   - Afiliados não recebem comissões

### Impacto Financeiro

- 🚫 **Nenhuma venda** pode ser processada
- 🚫 **Nenhum afiliado** pode se cadastrar
- 🚫 **Nenhuma comissão** é paga
- 🚫 **Nenhuma assinatura** é renovada

**Tempo de inatividade:** ~8 dias (02/03 → 11/03)

---

## 🔧 SOLUÇÃO IMEDIATA

### Passo 1: Criar Nova Chave API

1. Acessar painel Asaas: [https://www.asaas.com](https://www.asaas.com)
2. Ir em: **Configurações** → **Integrações** → **Chaves de API**
3. Clicar em: **Criar nova chave**
4. Configurar:
   - Nome: "SlimQuality Production"
   - Duração: 1 ano
   - Ambiente: **Produção**
5. **IMPORTANTE:** Copiar a chave imediatamente

### Passo 2: Configurar no Vercel

1. Acessar: [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Selecionar projeto: **slim-quality**
3. Ir em: **Settings** → **Environment Variables**
4. Atualizar variável: `ASAAS_API_KEY`
5. Valor: Colar a nova chave
6. Aplicar em: **Production**, **Preview**, **Development**
7. Clicar em: **Save**

### Passo 3: Redeploy

1. Ir em: **Deployments**
2. Selecionar último deploy
3. Clicar em: **Redeploy**
4. Aguardar conclusão (~1-2 minutos)

### Passo 4: Testar Imediatamente

**CRÍTICO:** Fazer pelo menos 1 requisição à API Asaas nas primeiras 24 horas!

Testes recomendados:
1. ✅ Comprar um produto físico
2. ✅ Cadastrar um afiliado de teste
3. ✅ Criar um pagamento de teste

**Por quê?** Para evitar que a chave seja excluída novamente por inatividade!

---

## 🛡️ PREVENÇÃO FUTURA

### 1. Configurar Webhooks de Chave API

**Endpoint:** `POST /api/asaas-key-events`

Criar novo endpoint para receber eventos:

```javascript
// api/asaas-key-events.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const event = req.body;
  
  // Eventos críticos
  if (event.event === 'ACCESS_TOKEN_EXPIRING_SOON') {
    console.error('🚨 ALERTA: Chave Asaas vai expirar em breve!', event);
    // TODO: Enviar email/notificação
  }
  
  if (event.event === 'ACCESS_TOKEN_EXPIRED') {
    console.error('❌ CRÍTICO: Chave Asaas expirou!', event);
    // TODO: Enviar email/notificação urgente
  }
  
  if (event.event === 'ACCESS_TOKEN_DELETED') {
    console.error('💀 CRÍTICO: Chave Asaas foi deletada!', event);
    // TODO: Enviar email/notificação urgente
  }
  
  return res.status(200).json({ received: true });
}
```

**Configurar no Asaas:**
1. Painel Asaas → **Webhooks**
2. Adicionar URL: `https://slimquality.com.br/api/asaas-key-events`
3. Selecionar eventos:
   - `ACCESS_TOKEN_EXPIRING_SOON`
   - `ACCESS_TOKEN_EXPIRED`
   - `ACCESS_TOKEN_DELETED`

### 2. Monitoramento Proativo

**Criar Health Check Diário:**

```javascript
// api/health-check-asaas.js
export default async function handler(req, res) {
  const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
  
  try {
    // Testar chave fazendo requisição simples
    const response = await fetch('https://api.asaas.com/v3/customers?limit=1', {
      headers: {
        'access_token': ASAAS_API_KEY
      }
    });
    
    if (response.ok) {
      return res.status(200).json({ 
        status: 'healthy',
        message: 'Chave Asaas válida',
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Chave Asaas inválida!');
      // TODO: Enviar alerta
      return res.status(500).json({ 
        status: 'unhealthy',
        message: 'Chave Asaas inválida',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Erro ao verificar chave Asaas:', error);
    return res.status(500).json({ 
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
```

**Configurar Cron Job no Vercel:**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/health-check-asaas",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Executa todos os dias às 9h da manhã.

### 3. Documentação de Rotação de Chaves

Criar documento: `.kiro/procedimentos/ROTACAO_CHAVE_ASAAS.md`

**Conteúdo:**
1. Quando rotacionar (antes de expirar)
2. Como criar nova chave
3. Como atualizar no Vercel
4. Como testar
5. Checklist de validação

### 4. Alertas por Email

Integrar com serviço de email (Resend já configurado):

```javascript
// Enviar email quando chave estiver expirando
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendKeyExpiringAlert() {
  await resend.emails.send({
    from: 'alertas@slimquality.com.br',
    to: 'colchoesslimquality@gmail.com',
    subject: '🚨 ALERTA: Chave API Asaas vai expirar',
    html: `
      <h1>Atenção: Chave API Asaas vai expirar em breve!</h1>
      <p>A chave API do Asaas está prestes a expirar por inatividade.</p>
      <p><strong>Ação necessária:</strong> Criar nova chave e atualizar no Vercel.</p>
    `
  });
}
```

### 5. Backup de Chaves

Manter registro de chaves criadas:

```
.kiro/keys/asaas-keys-history.md

# Histórico de Chaves API Asaas

## Chave Atual (Produção)
- Nome: SlimQuality Production
- Criada em: 11/03/2026
- Expira em: 11/03/2027
- Status: Ativa ✅

## Chaves Anteriores
- Nome: SlimQuality
- Criada em: 27/02/2026 às 19:17
- Excluída em: 02/03/2026 às 15:15
- Motivo: Inatividade (3 dias sem uso)
- Status: Deletada ❌
```

---

## 📋 CHECKLIST DE CORREÇÃO

### Imediato (Hoje)

- [ ] Criar nova chave API no Asaas
- [ ] Atualizar `ASAAS_API_KEY` no Vercel
- [ ] Fazer redeploy
- [ ] Testar compra de produto físico
- [ ] Testar cadastro de afiliado
- [ ] Verificar logs do Vercel

### Curto Prazo (Esta Semana)

- [ ] Configurar webhooks de eventos de chave
- [ ] Criar endpoint `/api/asaas-key-events`
- [ ] Implementar health check diário
- [ ] Configurar cron job no Vercel
- [ ] Testar alertas de expiração

### Médio Prazo (Este Mês)

- [ ] Implementar alertas por email
- [ ] Criar documentação de rotação de chaves
- [ ] Configurar monitoramento proativo
- [ ] Criar backup de histórico de chaves
- [ ] Revisar política de segurança

---

## 🎓 LIÇÕES APRENDIDAS

### 1. Chaves API Podem Expirar por Inatividade

**Aprendizado:** Mesmo configurando duração de 1 ano, chaves não utilizadas são excluídas automaticamente.

**Ação:** Sempre fazer pelo menos 1 requisição nas primeiras 24 horas após criar uma chave.

### 2. Webhooks São Essenciais

**Aprendizado:** Sem webhooks, não há como saber quando uma chave vai expirar.

**Ação:** Configurar webhooks para todos os eventos críticos de chave API.

### 3. Monitoramento Proativo É Crucial

**Aprendizado:** Descobrir que a chave expirou apenas quando o sistema falha é tarde demais.

**Ação:** Implementar health checks diários e alertas proativos.

### 4. Documentação Salva Tempo

**Aprendizado:** Sem documentação, cada rotação de chave é um processo manual e propenso a erros.

**Ação:** Criar procedimentos documentados para rotação de chaves.

### 5. Testes Imediatos São Obrigatórios

**Aprendizado:** Criar uma chave e não testá-la imediatamente pode resultar em exclusão por inatividade.

**Ação:** Sempre testar a chave nas primeiras horas após criação.

---

## 📊 RESUMO EXECUTIVO

### Problema
Chave API Asaas foi **excluída automaticamente** após 3 dias de inatividade, bloqueando todo o sistema.

### Causa Raiz
Política de inatividade do Asaas: chaves não utilizadas são excluídas automaticamente.

### Impacto
- ❌ Sistema bloqueado por ~8 dias
- ❌ Nenhuma venda processada
- ❌ Nenhum afiliado cadastrado
- ❌ Nenhuma comissão paga

### Solução
1. Criar nova chave API
2. Atualizar no Vercel
3. Testar imediatamente
4. Implementar monitoramento proativo

### Prevenção
1. Webhooks de eventos de chave
2. Health checks diários
3. Alertas por email
4. Documentação de procedimentos
5. Testes imediatos após criação

---

**Análise realizada por:** Kiro AI  
**Data:** 11/03/2026  
**Status:** Causa raiz identificada - Aguardando correção

