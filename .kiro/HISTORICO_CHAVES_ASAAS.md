# 📋 HISTÓRICO DE CHAVES API ASAAS - SLIM QUALITY

> Documentação de todas as chaves API criadas e seus ciclos de vida

---

## 🚨 PROBLEMA SISTEMÁTICO IDENTIFICADO

**Sintoma:** Chaves API Asaas sendo excluídas automaticamente após ~3 dias, MESMO COM USO ATIVO

**Impacto:** Sistema inteiro bloqueado (compras, cadastros, assinaturas)

**Frequência:** 4 chaves criadas, todas excluídas após ~3 dias

---

## 📊 HISTÓRICO DE CHAVES

### Chave #4 (ATUAL - EM CRIAÇÃO)
- **Data de Criação:** 11/03/2026
- **Nome:** (a definir)
- **Ambiente:** Produção
- **Duração Configurada:** 1 ano
- **Status:** Em criação
- **Variável Vercel:** `ASAAS_API_KEY`
- **Observações:** 
  - Criada após análise completa do problema sistemático
  - Documentação de prevenção implementada
  - Plano de monitoramento diário estabelecido

### Chave #3 - "SlimQuality"
- **Data de Criação:** 27/02/2026 às 19:17
- **Data de Exclusão:** 02/03/2026 às 15:15
- **Duração Real:** 3 dias (ao invés de 1 ano configurado)
- **Ambiente:** Produção
- **Variável Vercel:** `ASAAS_API_KEY`
- **Uso Confirmado:** ✅ SIM
  - Testes de compra realizados no dia 27/02
  - Compras processadas com sucesso
  - Sistema funcionando normalmente
- **Motivo da Exclusão:** Desconhecido (NÃO foi inatividade)
- **Impacto:** Sistema bloqueado de 02/03 até 11/03 (9 dias)

### Chave #2
- **Data de Criação:** (não documentada)
- **Data de Exclusão:** (não documentada)
- **Duração Real:** ~3 dias
- **Observações:** Excluída automaticamente

### Chave #1
- **Data de Criação:** (não documentada)
- **Data de Exclusão:** (não documentada)
- **Duração Real:** ~3 dias
- **Observações:** Excluída automaticamente

---

## 🔍 ANÁLISE DO PROBLEMA

### Hipóteses Descartadas

#### ❌ Hipótese 1: Inatividade
**Descartada porque:**
- Chave #3 foi usada ativamente no dia 27/02
- Compras reais foram processadas com sucesso
- Sistema estava funcionando normalmente
- Exclusão ocorreu mesmo com uso ativo

#### ❌ Hipótese 2: Ambiente Errado
**Descartada porque:**
- Chave criada em Produção
- Sistema configurado para Produção
- Variável `ASAAS_API_KEY` corretamente configurada no Vercel
- Testes funcionaram (ambiente correto)

#### ❌ Hipótese 3: Cache de Chave Antiga
**Descartada porque:**
- Chave anterior também foi excluída
- Não há como estar usando chave em cache
- Testes funcionaram com a nova chave

### Hipóteses Ativas

#### 🟡 Hipótese 4: Limite de Chaves Ativas
**Possibilidade:** Asaas pode ter limite de chaves ativas por conta
- Ao criar 4ª chave, pode excluir automaticamente as antigas
- Política não documentada de "máximo X chaves"
- **Ação:** Verificar no painel Asaas quantas chaves existem

#### 🟡 Hipótese 5: Problema de Segurança Detectado
**Possibilidade:** Asaas detectou padrão suspeito
- Múltiplas requisições de IPs diferentes (Vercel serverless)
- Padrão de uso considerado anormal
- **Ação:** Verificar logs de segurança no painel Asaas

#### 🔴 Hipótese 6: Bug no Sistema Asaas
**Possibilidade:** Bug na plataforma Asaas
- Chaves sendo excluídas incorretamente
- Problema específico da conta
- **Ação:** Abrir chamado urgente no suporte

#### 🔴 Hipótese 7: Política de "Uso Mínimo Diário"
**Possibilidade:** Asaas exige uso diário mínimo
- Chave usada no dia 27/02, mas não nos dias seguintes
- Política não documentada de "uso contínuo"
- **Ação:** Fazer transações diárias nos próximos 7 dias

---

## 📋 PROCEDIMENTO DE CRIAÇÃO DA CHAVE #4

### Passo 1: Criar Nova Chave no Asaas
1. Acessar: https://www.asaas.com
2. Login na conta
3. Ir em: Configurações → Integrações → Chaves de API
4. Criar nova chave:
   - **Nome:** `SlimQuality-Prod-11-03-2026`
   - **Ambiente:** Produção
   - **Duração:** 1 ano
5. **COPIAR A CHAVE IMEDIATAMENTE** (não será mostrada novamente)

### Passo 2: Atualizar no Vercel
1. Acessar: https://vercel.com/dashboard
2. Projeto: slim-quality
3. Settings → Environment Variables
4. Localizar: `ASAAS_API_KEY`
5. Clicar em "Edit"
6. Colar a nova chave
7. Aplicar em: Production, Preview, Development
8. Salvar

### Passo 3: Redeploy
1. Ir em: Deployments
2. Último deploy → Menu (...)
3. Redeploy
4. Aguardar conclusão (~1-2 minutos)

### Passo 4: TESTAR IMEDIATAMENTE ⚠️ CRÍTICO
**Fazer pelo menos 1 transação nas primeiras 24 horas!**

Opções de teste:
- [ ] Comprar produto físico (R$ 10,00)
- [ ] Cadastrar afiliado de teste
- [ ] Criar pagamento de teste via API

### Passo 5: Documentar
- [ ] Anotar data/hora de criação
- [ ] Anotar nome da chave
- [ ] Confirmar ambiente (Produção)
- [ ] Atualizar este documento

---

## 🛡️ PLANO DE PREVENÇÃO

### Monitoramento Diário (Próximos 7 Dias)
- [ ] Dia 1 (11/03): Criar chave + testar
- [ ] Dia 2 (12/03): Fazer 1 transação
- [ ] Dia 3 (13/03): Fazer 1 transação
- [ ] Dia 4 (14/03): Fazer 1 transação
- [ ] Dia 5 (15/03): Fazer 1 transação
- [ ] Dia 6 (16/03): Fazer 1 transação
- [ ] Dia 7 (17/03): Fazer 1 transação
- [ ] Dia 8 (18/03): Verificar se chave ainda está ativa

### Ações Imediatas
1. **Abrir Chamado no Suporte Asaas** (URGENTE)
   - Explicar problema sistemático
   - Informar que 3 chaves foram excluídas após 3 dias
   - Informar que chaves estavam sendo usadas ativamente
   - Solicitar investigação

2. **Configurar Webhooks de Eventos de Chave**
   - Endpoint: `/api/asaas-key-events`
   - Evento: `ACCESS_TOKEN_EXPIRED`
   - Ação: Enviar alerta por email

3. **Implementar Health Check Diário**
   - Cron job no Vercel
   - Testar chave API diariamente
   - Alertar se chave inválida

### Ações de Médio Prazo
1. **Criar Backup de Histórico**
   - Salvar todas as transações
   - Documentar uso da chave
   - Provar uso ativo

2. **Implementar Rotação Automática**
   - Sistema detecta chave inválida
   - Alerta administrador
   - Procedimento de rotação documentado

---

## 📞 CONTATO SUPORTE ASAAS

**Canais de Suporte:**
- Email: suporte@asaas.com
- Chat: https://www.asaas.com (canto inferior direito)
- Telefone: (11) 4950-2819

**Informações para o Chamado:**
- Conta: (informar email da conta)
- Problema: Chaves API sendo excluídas após 3 dias
- Frequência: 3 chaves excluídas
- Uso: Chaves estavam sendo usadas ativamente
- Impacto: Sistema inteiro bloqueado
- Urgência: CRÍTICA

---

## 📈 MÉTRICAS DE SUCESSO

### Chave #4 será considerada bem-sucedida se:
- [ ] Permanecer ativa por mais de 7 dias
- [ ] Processar transações diariamente
- [ ] Não ser excluída automaticamente
- [ ] Sistema funcionar continuamente

### Indicadores de Problema:
- 🚨 Chave excluída antes de 7 dias
- 🚨 Erro "ACCESS_TOKEN_EXPIRED"
- 🚨 Sistema bloqueado novamente

---

**Última Atualização:** 11/03/2026  
**Responsável:** Renato Carraro  
**Status:** Chave #4 em criação
