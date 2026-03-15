# SUMÁRIO EXECUTIVO — BIA v2

## Proposta de Valor

**Problema:** Afiliados Premium e Lojistas da Slim Quality perdem vendas fora do horário comercial. Atendimento manual é lento, inconsistente e depende da disponibilidade pessoal de cada afiliado. Clientes mandam mensagens (texto e áudio) no WhatsApp e não recebem resposta imediata.

**Solução:** Cada afiliado Premium e Lojista recebe um agente de IA personalizado conectado ao seu próprio número WhatsApp. O agente conhece todos os produtos Slim Quality, responde 24/7, transcreve áudios, responde em áudio quando necessário, e aprende os padrões de cada negócio ao longo do tempo.

**Diferencial:** O agente não é um produto separado — é um benefício já incluso no plano que o afiliado já paga (R$97/mês). Zero fricção para adotar. A infraestrutura de tenant já existe no banco, criada automaticamente quando o afiliado ativou o plano.

---

## Personas Principais

**Ana — Afiliada Individual Premium**
- Dor: perde clientes que mandam mensagem à noite e não recebem resposta
- Job-to-be-done: ter atendimento automático que converta leads enquanto ela dorme
- Critério de sucesso: conseguir vender sem precisar estar disponível 24h

**Carlos — Lojista**
- Dor: clientes chegam no showroom sem qualificação prévia, perdendo tempo
- Job-to-be-done: pré-qualificar clientes pelo WhatsApp antes da visita presencial
- Critério de sucesso: agendar visitas apenas com clientes prontos para comprar

**Renato — Admin Slim Quality**
- Dor: base de conhecimento dos produtos não chega padronizada a todos os afiliados
- Job-to-be-done: garantir que todos os agentes falem dos produtos corretamente
- Critério de sucesso: controle central das Skills globais com visibilidade de todos os tenants

---

## Modelo de Negócio

O BIA v2 não gera receita direta — ele aumenta o valor percebido dos planos Premium e Lojista, reduzindo churn e aumentando conversão de upgrades (Individual Básico → Premium).

**Estrutura de custo por tenant/mês:**

| Item | Custo USD | Custo BRL |
|------|-----------|-----------|
| gpt-4o-mini (texto) | ~$0.10 | ~R$0,55 |
| Whisper (transcrição áudio) | ~$1.80 | ~R$10,00 |
| TTS (síntese de voz) | ~$2.00 | ~R$11,00 |
| **Total** | **~$3.90** | **~R$21,50** |

**Receita por tenant:** R$97/mês (já existente)
**Margem bruta de LLM:** ~R$75,50/tenant/mês após custos de IA

---

## Métricas de Sucesso

| Métrica | Meta MVP | Forma de Medir |
|---------|----------|----------------|
| Taxa de adoção | > 60% dos tenants com WhatsApp conectado | `whatsapp_status = 'active'` / total tenants |
| Taxa de resolução autônoma | > 70% das conversas sem intervenção | conversas fechadas sem handoff / total |
| Tempo de resposta | < 5 segundos | latência média no endpoint de webhook |
| Uptime | > 99% | monitoramento Docker/EasyPanel |
| Custo LLM por tenant | ≤ R$25/mês | tokens consumidos × tarifa OpenAI |
| Churn de planos Premium/Lojista | < 5%/mês | cancelamentos / total ativos |

---

## Estimativa de Custos de Infraestrutura

**Já existente (sem custo adicional):**
- VPS EasyPanel com Docker
- Evolution API instalada
- Supabase (projeto existente)
- Redis (instância existente)

**Custo incremental:**
- OpenAI API: ~R$21,50/tenant/mês (varia com volume de mensagens)
- Armazenamento Supabase: desprezível (texto puro)
- CPU/RAM VPS: marginal (FastAPI é leve sem ML local)

**Break-even:** O custo de IA representa ~22% da mensalidade do plano. Com 10 tenants ativos, custo mensal de LLM ~R$215. Com 100 tenants, ~R$2.150. A escala não degrada a margem.

---

## Hipótese de Crescimento

- Mês 1-2: Piloto com 3-5 afiliados early adopters (tenants já existem no banco)
- Mês 3: Rollout para todos os 27 afiliados Premium/Lojista atuais
- Mês 4+: O agente se torna argumento de venda para upgrades de Individual Básico → Premium
- Longo prazo: Redução de churn por sticky effect — quanto mais o Napkin acumula memória, mais valioso o agente se torna para o afiliado
