# PRD — BIA v2 (Product Requirements Document)

## Visão do Produto

O BIA v2 é o agente de atendimento WhatsApp incluído nos planos Premium e Lojista da Slim Quality. Cada afiliado elegível tem seu próprio agente isolado, conectado ao seu número WhatsApp pessoal/comercial, que atende clientes 24/7 com conhecimento completo dos produtos Slim Quality e memória adaptativa do negócio de cada afiliado.

---

## Personas Detalhadas

### Ana — Afiliada Individual Premium
- **Perfil:** 35 anos, vende colchões por indicação nas horas vagas
- **Contexto:** Trabalha em outro emprego durante o dia, gerencia vendas à noite e fins de semana
- **Dores:**
  - Perde clientes que mandam mensagem às 22h e não recebem resposta
  - Esquece de fazer follow-up com leads que demonstraram interesse
  - Não sabe responder dúvidas técnicas sobre os produtos
- **Jobs-to-be-done:**
  - Ter atendimento automático que converta leads enquanto ela não está disponível
  - Receber um alerta quando um cliente precisar de atenção pessoal
  - Ter o agente respondendo com o seu estilo pessoal

### Carlos — Lojista
- **Perfil:** 42 anos, tem showroom físico de colchões
- **Contexto:** Recebe clientes presencialmente e por WhatsApp, tem equipe pequena
- **Dores:**
  - Clientes chegam no showroom sem qualificação, perdendo tempo da equipe
  - Alto volume de mensagens repetitivas sobre preço e condições de pagamento
  - Dificuldade em escalar o atendimento sem contratar mais pessoas
- **Jobs-to-be-done:**
  - Pré-qualificar clientes pelo WhatsApp antes da visita
  - Automatizar respostas sobre preços, parcelas e modelos
  - Escalar atendimento sem aumentar equipe

### Renato — Admin Slim Quality
- **Perfil:** Gestor do sistema, responsável pela base de conhecimento
- **Contexto:** Precisa garantir que todos os agentes comuniquem os produtos corretamente
- **Jobs-to-be-done:**
  - Atualizar Skills globais e ter certeza que todos os tenants recebem imediatamente
  - Monitorar saúde de todos os agentes em um painel único
  - Ativar/suspender tenants conforme status de pagamento

---

## Casos de Uso

**Como Ana (afiliada), quero** conectar meu WhatsApp ao agente para que ele responda clientes automaticamente mesmo quando estou indisponível.

**Como Ana, quero** configurar o nome e o tom do meu agente para que os clientes percebam minha identidade pessoal no atendimento.

**Como Ana, quero** ver o histórico de conversas do agente para acompanhar o que foi dito aos meus clientes.

**Como Carlos (lojista), quero** que o agente responda perguntas sobre preços e modelos em áudio quando o cliente mandar áudio, para uma experiência natural.

**Como Carlos, quero** editar a memória (Napkin) do agente para corrigir informações específicas do meu negócio regional.

**Como Carlos, quero** desativar respostas em áudio e manter apenas texto, para controlar os custos.

**Como Renato (admin), quero** atualizar as Skills globais de produtos para que todos os agentes recebam a informação atualizada imediatamente.

**Como Renato, quero** visualizar todos os tenants e seus status (ativo, sem WhatsApp, suspenso) para monitorar a saúde do sistema.

**Como Renato, quero** suspender ou reativar um tenant manualmente em casos excepcionais.

---

## Funcionalidades por Prioridade

### MUST (MVP obrigatório)

**M1 — Recebimento e resposta de mensagens WhatsApp**
- Webhook Evolution API recebe mensagens por instância/tenant
- Agente processa e responde automaticamente
- Critério de aceite: mensagem recebida → resposta em < 5 segundos

**M2 — Transcrição de áudio (Whisper)**
- Áudios recebidos são transcritos antes de chegar ao agente
- Critério de aceite: áudio de até 2 minutos transcrito corretamente

**M3 — Resposta em áudio (TTS)**
- Quando cliente manda áudio, agente responde em áudio por padrão
- Critério de aceite: resposta TTS gerada e enviada como arquivo de áudio

**M4 — Sub-agents especializados**
- Classificador identifica intenção (vendas, suporte, informação)
- Sub-agent de vendas usa skill_vendas + skill_produtos
- Sub-agent de suporte usa skill_suporte + skill_produtos
- Critério de aceite: intenção classificada corretamente em > 80% dos casos

**M5 — Skills globais (base de conhecimento)**
- Arquivos .md com informações de produtos, preços, objeções, suporte
- Carregados no contexto do sub-agent relevante
- Critério de aceite: agente responde corretamente sobre produtos do catálogo

**M6 — Napkin por tenant (memória adaptativa)**
- Campo TEXT no banco, um por tenant
- Lido a cada interação e atualizado assincronamente após cada conversa
- Editável pelo afiliado no painel
- Critério de aceite: informações do Napkin influenciam respostas do agente

**M7 — Rules por tenant (configuração pessoal)**
- Nome do agente, tom de voz, personalidade, TTS ativo/inativo
- Aplicadas no system prompt de cada interação
- Critério de aceite: agente usa o nome configurado pelo afiliado

**M8 — Isolamento multi-tenant**
- Cada tenant acessa apenas seus dados
- RLS no Supabase
- Critério de aceite: tenant A não consegue ver dados do tenant B

**M9 — Provisionamento de instância Evolution**
- Afiliado clica "Conectar WhatsApp" no painel
- Sistema cria instância na Evolution API e exibe QR Code
- Critério de aceite: QR Code exibido em < 10 segundos após clique

**M10 — Painel do afiliado: menu "Meu Agente"**
- Visível apenas para `has_subscription = true`
- Sub-páginas: Overview, Conectar WhatsApp, Configurações, Napkin, Métricas
- Critério de aceite: afiliado consegue configurar e monitorar o agente sem suporte

**M11 — Painel admin: visão global de tenants**
- Lista todos os tenants com status
- Permite suspender/reativar manualmente
- Gerencia Skills globais
- Critério de aceite: admin visualiza e controla todos os tenants

**M12 — Integração com ciclo de vida do tenant**
- Tenant suspenso (inadimplência) → agente para de responder
- Tenant reativado (pagamento regularizado) → agente volta automaticamente
- Critério de aceite: mudança de status reflete em < 1 minuto

### SHOULD (recomendado para MVP)

**S1 — Histórico de conversas no painel do afiliado**
- Lista de conversas com filtro por data e status
- Visualização do chat completo

**S2 — Métricas básicas por tenant**
- Total de conversas, mensagens, tempo médio de resposta
- Exibidas no Overview do agente

**S3 — Notificação de nova conversa**
- Afiliado recebe notificação quando novo cliente inicia conversa
- Usa sistema de notificações já existente no dashboard

### COULD (nice-to-have, não bloqueia MVP)

**C1 — Chat de teste no painel**
- Afiliado testa o agente sem precisar do WhatsApp

**C2 — Export de histórico de conversas**
- CSV com histórico para análise externa

### WON'T (explicitamente fora do escopo MVP)

- CRM Kanban
- Handoff para humano via Chatwoot
- SICC / embeddings / aprendizado automático
- Multi-provider de LLM
- TTS configurável por cliente (apenas on/off)
- Upload de documentos pelo afiliado
- Agendamentos
- Automações complexas

---

## Requisitos Não-Funcionais

**Performance:**
- Resposta ao cliente < 5 segundos (p95)
- Webhook processing < 2 segundos
- QR Code gerado < 10 segundos

**Segurança:**
- RLS em todas as tabelas `bia_*`
- tenant_id validado em todo endpoint autenticado
- Webhook Evolution validado por API Key
- JWT Supabase validado em toda requisição do painel

**Escalabilidade:**
- Arquitetura stateless no FastAPI (horizontal scaling possível)
- Redis para sessões e cache de configuração
- Sem processamento de ML local (zero GPU necessária)

**Disponibilidade:**
- Uptime > 99%
- Restart automático via Docker
- Fallback: se OpenAI retornar erro, responder mensagem de indisponibilidade temporária

**Observabilidade:**
- Logs estruturados por tenant_id e conversation_id
- Registro de erros com contexto suficiente para debug
- Métricas de latência e tokens consumidos por tenant

---

## Critérios de Aceite Globais

1. Afiliado com `has_subscription = true` consegue conectar WhatsApp e ter agente respondendo em menos de 15 minutos após o primeiro acesso ao painel
2. Cliente que manda áudio recebe resposta em áudio (quando TTS ativo)
3. Agente responde corretamente sobre produtos do catálogo Slim Quality
4. Dados de um tenant nunca aparecem para outro tenant
5. Quando plano é suspenso por inadimplência, agente para de responder imediatamente
6. Afiliado consegue editar o Napkin e ver o impacto nas próximas respostas
