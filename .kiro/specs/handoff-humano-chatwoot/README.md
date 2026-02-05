# Spec: Sistema de Handoff Humano com Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Visão Geral

Esta spec documenta a implementação completa de um sistema de **handoff** (transferência de atendimento) entre IA e humano, utilizando **Chatwoot** como plataforma de gerenciamento e **MCP Server** para simplificar a integração.

### O que é Handoff?

**Handoff** é a transferência de atendimento entre diferentes agentes:
- **IA → Humano:** Cliente sendo atendido por IA é transferido para atendente humano
- **Humano → IA:** Cliente sendo atendido por humano é devolvido para IA

---

## 📁 Estrutura de Arquivos

```
.kiro/specs/handoff-humano-chatwoot/
├── README.md                           # Este arquivo
├── requirements.md                     # Requisitos funcionais e não-funcionais
├── design.md                           # Design técnico da solução
├── tasks.md                            # Lista de tarefas de implementação
├── mcp-config.md                       # Configuração do MCP Server Chatwoot
└── guia-implementacao-completo.md      # Guia reutilizável para outros projetos
```

---

## 📚 Documentos

### 1. requirements.md
**Requisitos Funcionais e Não-Funcionais**

Contém:
- 10 requisitos funcionais detalhados
- Acceptance criteria em formato EARS
- Requisitos não-funcionais (performance, segurança, etc.)
- Critérios de aceitação geral
- Estimativa de tempo: 7-11 horas

**Quando usar:** Para entender EXATAMENTE o que precisa ser implementado.

---

### 2. design.md
**Design Técnico da Solução**

Contém:
- Arquitetura de alto nível
- Modelo de dados (alterações no banco)
- Componentes da arquitetura (Chatwoot, MCP Server, Backend, Frontend)
- Fluxos de dados detalhados
- Estratégia de segurança
- Estratégia de sincronização
- Estratégia de testes
- Instruções de deploy

**Quando usar:** Para entender COMO a solução será implementada tecnicamente.

---

### 3. tasks.md
**Lista de Tarefas de Implementação**

Contém:
- 4 fases de implementação
- 27 tarefas detalhadas
- Estimativa de tempo por tarefa
- Checkpoints de validação
- Referências às regras obrigatórias do projeto
- Checklist de conclusão

**Quando usar:** Para EXECUTAR a implementação passo a passo.

**⚠️ IMPORTANTE:** Este arquivo faz referência às regras obrigatórias:
- `.kiro/steering/analise-preventiva-obrigatoria.md`
- `.kiro/steering/compromisso-honestidade.md`
- `.kiro/steering/funcionalidade-sobre-testes.md`
- `.kiro/steering/verificacao-banco-real.md`

---

### 4. mcp-config.md
**Configuração do MCP Server Chatwoot**

Contém:
- Instruções de instalação do MCP Server
- Configuração no Kiro (.kiro/settings/mcp.json)
- Documentação de todas as ferramentas disponíveis
- Exemplos de uso de cada ferramenta
- Troubleshooting comum
- Logs e debug

**Quando usar:** Para configurar o MCP Server Chatwoot no projeto.

---

### 5. guia-implementacao-completo.md
**Guia Reutilizável para Outros Projetos**

Contém:
- Guia passo a passo COMPLETO
- Instalação do Chatwoot via Docker
- Configuração do Chatwoot
- Instalação do MCP Server
- Implementação Backend (webhook)
- Implementação Frontend (dashboard)
- Testes completos
- Troubleshooting
- Checklist de implementação
- Boas práticas

**Quando usar:** Para implementar sistema de handoff em QUALQUER projeto novo.

**🎯 Este é o documento mais importante para reutilização!**

---

## 🚀 Como Usar Esta Spec

### Para Implementar no Projeto Atual (Slim Quality)

1. **Ler requirements.md** - Entender o que será implementado
2. **Ler design.md** - Entender como será implementado
3. **Seguir tasks.md** - Executar implementação passo a passo
4. **Consultar mcp-config.md** - Configurar MCP Server
5. **Validar** - Testar tudo conforme checklist

### Para Implementar em Outro Projeto

1. **Ler guia-implementacao-completo.md** - Seguir guia completo
2. **Adaptar** - Ajustar para tecnologias do projeto
3. **Implementar** - Seguir passo a passo
4. **Testar** - Validar funcionamento
5. **Documentar** - Registrar adaptações feitas

---

## ⏱️ Estimativa de Tempo

| Fase | Tempo Estimado |
|------|----------------|
| Setup Chatwoot + MCP | 2-3 horas |
| Integração Backend | 2-3 horas |
| Integração Frontend | 2-3 horas |
| Testes e Validação | 1-2 horas |
| **TOTAL** | **7-11 horas** |

---

## 🎯 Objetivos da Implementação

### Problema Atual
- ❌ Admin não pode assumir atendimento no lugar da IA
- ❌ IA continua respondendo mesmo quando admin está atendendo
- ❌ Não há controle de quem está atendendo (IA vs Humano)

### Solução Implementada
- ✅ Admin pode assumir atendimento (handoff IA → Humano)
- ✅ IA para de responder quando admin assume
- ✅ Admin pode devolver para IA (handoff Humano → IA)
- ✅ Cliente é notificado sobre transferências
- ✅ Interface exibe claramente quem está atendendo

---

## 🔧 Tecnologias Utilizadas

- **Chatwoot:** Plataforma de atendimento (open-source)
- **MCP Server:** Integração simplificada via Kiro Powers
- **Docker:** Deploy do Chatwoot
- **PostgreSQL:** Banco de dados do Chatwoot
- **Redis:** Cache e filas do Chatwoot
- **Python/FastAPI:** Backend (webhook)
- **TypeScript/React:** Frontend (dashboard)
- **Supabase:** Banco de dados principal

---

## 📊 Arquitetura

```
CLIENTE (WhatsApp/Site)
         ↓
    CHATWOOT
    (Gerencia status: bot/open)
         ↓
    ┌────┴────┐
    ↓         ↓
AGENTE IA   DASHBOARD
(Responde   (Admin assume/
quando      devolve
status=bot) atendimento)
```

---

## ✅ Checklist de Conclusão

Para considerar a implementação **100% COMPLETA**:

### Setup e Configuração
- [ ] Chatwoot instalado e acessível
- [ ] Inboxes criados
- [ ] AgentBot criado e conectado
- [ ] MCP Server configurado

### Backend
- [ ] Webhook implementado
- [ ] IA responde quando status = 'bot'
- [ ] IA ignora quando status != 'bot'

### Frontend
- [ ] Botão "Assumir Atendimento" funciona
- [ ] Botão "Devolver para BIA" funciona
- [ ] Badge de status exibido corretamente

### Testes
- [ ] Fluxo completo testado
- [ ] Múltiplos canais testados
- [ ] Notificações testadas

---

## 🐛 Troubleshooting

### Problemas Comuns

1. **IA não responde**
   - Verificar webhook
   - Verificar status da conversa
   - Verificar logs do backend

2. **Admin não consegue assumir**
   - Verificar MCP Server
   - Verificar credenciais
   - Verificar conversation ID

3. **Mensagens não chegam**
   - Verificar integração com canal
   - Verificar logs do Chatwoot
   - Testar envio manual

**Ver mais em:** `mcp-config.md` (seção Troubleshooting)

---

## 📚 Recursos Adicionais

### Documentação Oficial
- **Chatwoot Docs:** https://www.chatwoot.com/docs
- **Chatwoot API:** https://developers.chatwoot.com/api-reference/introduction
- **MCP Server GitHub:** https://github.com/StackLab-Digital/chatwoot_mcp

### Comunidade
- **Chatwoot Discord:** https://discord.gg/cJXdrwS
- **Chatwoot GitHub:** https://github.com/chatwoot/chatwoot

---

## 🎓 Próximos Passos

Após implementar o sistema básico:

1. **Sistema de Filas** - Distribuir conversas entre atendentes
2. **Métricas** - Tempo de atendimento, taxa de handoff
3. **Automações** - Handoff automático baseado em regras
4. **Integrações** - CRM, Helpdesk, Analytics

---

## 📝 Notas Importantes

### Para Desenvolvedores

- **SEMPRE** consultar regras obrigatórias antes de implementar
- **SEMPRE** fazer análise preventiva (5-10 min) antes de codificar
- **SEMPRE** testar TUDO antes de reportar como concluído
- **NUNCA** simplificar código apenas para passar em testes

### Para Gestores

- Tempo estimado: 7-11 horas
- Redução de 40% comparado à solução sem MCP
- Solução escalável e profissional
- Self-hosted (controle total dos dados)

---

## 🏆 Vantagens da Solução

1. ✅ Sistema de handoff nativo e robusto
2. ✅ Implementação rápida (7-11h vs 40-60h custom)
3. ✅ Interface profissional de atendimento
4. ✅ Suporte a múltiplos canais
5. ✅ Self-hosted (controle total)
6. ✅ Open-source (sem custos)
7. ✅ Comunidade ativa
8. ✅ Escalável

---

**Spec criada em:** 16/01/2026  
**Versão:** 1.0  
**Status:** ✅ COMPLETA E PRONTA PARA IMPLEMENTAÇÃO

**Criado por:** Kiro AI  
**Para:** Equipe Slim Quality

---

## 📞 Suporte

Para dúvidas ou problemas durante a implementação:

1. Consultar `guia-implementacao-completo.md` (seção Troubleshooting)
2. Consultar `mcp-config.md` (seção Troubleshooting)
3. Verificar logs do sistema
4. Consultar documentação oficial do Chatwoot
5. Perguntar na comunidade Chatwoot Discord

---

**Boa implementação! 🚀**
