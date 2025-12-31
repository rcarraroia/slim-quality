# Requisitos - Sprint 4: Deploy Easypanel

## Introdução

Este documento especifica os requisitos para fazer deploy completo do backend do agente Slim Quality em produção no Easypanel, incluindo containerização Docker, configuração de DNS/SSL e integração com webhooks.

## Glossário

- **Easypanel**: Plataforma de deploy e gerenciamento de containers
- **Agent_Backend**: Serviço FastAPI + LangGraph do agente
- **Evolution_API**: Serviço WhatsApp já em produção
- **Traefik**: Proxy reverso para SSL automático
- **Registry**: Repositório Docker para imagens
- **Health_Check**: Endpoint para verificar saúde do serviço
- **Webhook**: Endpoint para receber notificações HTTP

## Requisitos

### Requisito 1: Containerização Docker

**User Story:** Como DevOps, quero containerizar o backend do agente, para que possa fazer deploy consistente em produção.

#### Acceptance Criteria

1. QUANDO criar Dockerfile para agent backend ENTÃO o sistema SHALL usar Python 3.11 como base
2. QUANDO buildar imagem Docker ENTÃO o sistema SHALL instalar todas as dependências do requirements.txt
3. QUANDO executar container ENTÃO o sistema SHALL rodar FastAPI na porta 8000
4. QUANDO verificar saúde do container ENTÃO o sistema SHALL responder no endpoint /health
5. QUANDO criar .dockerignore ENTÃO o sistema SHALL excluir arquivos desnecessários do build
6. QUANDO criar docker-compose.yml ENTÃO o sistema SHALL permitir testes locais completos

### Requisito 2: Registry e Build

**User Story:** Como desenvolvedor, quero automatizar build e push das imagens, para que o deploy seja eficiente.

#### Acceptance Criteria

1. QUANDO executar build script ENTÃO o sistema SHALL criar imagem com tag latest
2. QUANDO fazer push para registry ENTÃO o sistema SHALL enviar imagem buildada
3. QUANDO taggar imagem ENTÃO o sistema SHALL usar versionamento semântico
4. QUANDO buildar localmente ENTÃO o sistema SHALL validar funcionamento antes do push
5. QUANDO falhar build ENTÃO o sistema SHALL reportar erro específico

### Requisito 3: Configuração Easypanel

**User Story:** Como DevOps, quero configurar services no Easypanel, para que o backend rode em produção.

#### Acceptance Criteria

1. QUANDO criar service slim-agent ENTÃO o sistema SHALL usar imagem do registry
2. QUANDO configurar service redis ENTÃO o sistema SHALL usar Redis 7 Alpine
3. QUANDO definir networking ENTÃO o sistema SHALL permitir comunicação interna
4. QUANDO configurar health checks ENTÃO o sistema SHALL verificar /health endpoint
5. QUANDO definir restart policy ENTÃO o sistema SHALL reiniciar automaticamente em falhas
6. QUANDO configurar resource limits ENTÃO o sistema SHALL limitar CPU e memória

### Requisito 4: Variáveis de Ambiente

**User Story:** Como sistema, preciso de todas as variáveis de ambiente configuradas, para que as integrações funcionem.

#### Acceptance Criteria

1. QUANDO configurar Anthropic ENTÃO o sistema SHALL ter CLAUDE_API_KEY válida
2. QUANDO configurar Supabase ENTÃO o sistema SHALL ter URL, SERVICE_KEY e ANON_KEY
3. QUANDO configurar Evolution ENTÃO o sistema SHALL ter URL e API_KEY corretos
4. QUANDO configurar Redis ENTÃO o sistema SHALL usar URL interna redis://redis:6379
5. QUANDO configurar ambiente ENTÃO o sistema SHALL usar ENVIRONMENT=production
6. QUANDO validar variáveis ENTÃO o sistema SHALL verificar todas estão presentes

### Requisito 5: DNS e SSL

**User Story:** Como usuário, quero acessar o backend via HTTPS, para que a comunicação seja segura.

#### Acceptance Criteria

1. QUANDO configurar DNS ENTÃO api.slimquality.com.br SHALL apontar para VPS
2. QUANDO acessar via HTTPS ENTÃO o sistema SHALL retornar certificado SSL válido
3. QUANDO acessar via HTTP ENTÃO o sistema SHALL redirecionar para HTTPS
4. QUANDO verificar certificado ENTÃO o sistema SHALL usar Let's Encrypt
5. QUANDO configurar Traefik ENTÃO o sistema SHALL fazer routing automático

### Requisito 6: Webhooks Evolution

**User Story:** Como sistema, preciso receber webhooks do Evolution API, para que possa processar mensagens WhatsApp.

#### Acceptance Criteria

1. QUANDO configurar webhook URL ENTÃO Evolution SHALL enviar para backend
2. QUANDO receber webhook ENTÃO o sistema SHALL validar assinatura
3. QUANDO processar mensagem ENTÃO o sistema SHALL responder em menos de 5s
4. QUANDO falhar processamento ENTÃO o sistema SHALL implementar retry logic
5. QUANDO logar webhook ENTÃO o sistema SHALL registrar sem dados sensíveis

### Requisito 7: Health Checks

**User Story:** Como sistema de monitoramento, preciso verificar saúde dos serviços, para que possa detectar problemas.

#### Acceptance Criteria

1. QUANDO acessar /health ENTÃO o sistema SHALL retornar status 200
2. QUANDO verificar Supabase ENTÃO o sistema SHALL confirmar conexão ativa
3. QUANDO verificar Redis ENTÃO o sistema SHALL confirmar cache funcionando
4. QUANDO verificar SICC ENTÃO o sistema SHALL confirmar memórias carregadas
5. QUANDO falhar dependência ENTÃO o sistema SHALL retornar status 503

### Requisito 8: Logs Estruturados

**User Story:** Como DevOps, quero logs estruturados em produção, para que possa monitorar e debugar.

#### Acceptance Criteria

1. QUANDO gerar log ENTÃO o sistema SHALL usar formato JSON estruturado
2. QUANDO definir log level ENTÃO o sistema SHALL usar INFO em produção
3. QUANDO logar erro ENTÃO o sistema SHALL incluir stack trace
4. QUANDO logar request ENTÃO o sistema SHALL incluir request_id único
5. QUANDO logar dados sensíveis ENTÃO o sistema SHALL sanitizar informações

### Requisito 9: Performance

**User Story:** Como usuário, quero respostas rápidas do backend, para que a experiência seja fluida.

#### Acceptance Criteria

1. QUANDO acessar /health ENTÃO o sistema SHALL responder em menos de 200ms
2. QUANDO processar webhook ENTÃO o sistema SHALL responder em menos de 5s
3. QUANDO carregar SICC ENTÃO o sistema SHALL inicializar em menos de 30s
4. QUANDO usar Redis ENTÃO o sistema SHALL ter cache hit rate > 80%
5. QUANDO monitorar recursos ENTÃO o sistema SHALL usar menos de 1GB RAM

### Requisito 10: Segurança

**User Story:** Como sistema, preciso manter segurança em produção, para que dados estejam protegidos.

#### Acceptance Criteria

1. QUANDO armazenar secrets ENTÃO o sistema SHALL usar ENV vars do Easypanel
2. QUANDO validar webhook ENTÃO o sistema SHALL verificar assinatura HMAC
3. QUANDO expor endpoints ENTÃO o sistema SHALL usar HTTPS obrigatório
4. QUANDO logar ENTÃO o sistema SHALL nunca expor API keys ou tokens
5. QUANDO configurar container ENTÃO o sistema SHALL usar usuário não-root

### Requisito 11: Backup e Recovery

**User Story:** Como DevOps, quero estratégia de backup, para que possa recuperar em caso de falhas.

#### Acceptance Criteria

1. QUANDO configurar Redis ENTÃO o sistema SHALL persistir dados importantes
2. QUANDO fazer deploy ENTÃO o sistema SHALL manter versão anterior disponível
3. QUANDO falhar deploy ENTÃO o sistema SHALL permitir rollback rápido
4. QUANDO perder dados ENTÃO o sistema SHALL recuperar do Supabase
5. QUANDO documentar recovery ENTÃO o sistema SHALL ter procedimentos claros

### Requisito 12: Monitoramento

**User Story:** Como DevOps, quero monitorar o sistema em produção, para que possa detectar problemas proativamente.

#### Acceptance Criteria

1. QUANDO monitorar CPU ENTÃO o sistema SHALL alertar se > 80% por 5min
2. QUANDO monitorar memória ENTÃO o sistema SHALL alertar se > 90%
3. QUANDO monitorar disk ENTÃO o sistema SHALL alertar se < 10% livre
4. QUANDO monitorar network ENTÃO o sistema SHALL detectar latência alta
5. QUANDO detectar problema ENTÃO o sistema SHALL enviar alerta imediato

### Requisito 13: Testes de Produção

**User Story:** Como QA, quero validar sistema em produção, para que tenha certeza que tudo funciona.

#### Acceptance Criteria

1. QUANDO executar smoke tests ENTÃO todos os endpoints SHALL responder 200
2. QUANDO testar webhook ENTÃO mensagem WhatsApp SHALL ser processada
3. QUANDO testar SICC ENTÃO memórias SHALL carregar corretamente
4. QUANDO testar automações ENTÃO ações SHALL executar sem erro
5. QUANDO validar SSL ENTÃO certificado SHALL ser válido e confiável

### Requisito 14: Documentação

**User Story:** Como desenvolvedor, quero documentação completa, para que possa manter e evoluir o sistema.

#### Acceptance Criteria

1. QUANDO documentar deploy ENTÃO o guia SHALL ter todos os passos
2. QUANDO documentar ENV vars ENTÃO SHALL listar todas as variáveis obrigatórias
3. QUANDO documentar troubleshooting ENTÃO SHALL ter soluções para problemas comuns
4. QUANDO documentar APIs ENTÃO SHALL ter Swagger UI acessível
5. QUANDO atualizar código ENTÃO documentação SHALL ser atualizada junto

### Requisito 15: Rollback e Versionamento

**User Story:** Como DevOps, quero controle de versões, para que possa fazer rollback seguro se necessário.

#### Acceptance Criteria

1. QUANDO fazer deploy ENTÃO o sistema SHALL taggar imagem com versão
2. QUANDO manter histórico ENTÃO o sistema SHALL guardar últimas 5 versões
3. QUANDO fazer rollback ENTÃO o sistema SHALL voltar versão anterior em < 2min
4. QUANDO validar rollback ENTÃO o sistema SHALL confirmar funcionamento
5. QUANDO documentar versão ENTÃO o sistema SHALL registrar changelog