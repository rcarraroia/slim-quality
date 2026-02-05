# Requirements Document - Sprint 5.5

## ⚠️ SISTEMA EM PRODUÇÃO - ATENÇÃO CRÍTICA

**🚨 O sistema Slim Quality está OPERACIONAL em produção**  
**🚨 Agente BIA atende clientes REAIS via WhatsApp**  
**🚨 Qualquer erro pode impactar vendas IMEDIATAMENTE**  
**🚨 TESTE TUDO antes de dar merge/deploy**  
**🚨 Use feature flags se possível**  
**🚨 Tenha rollback pronto**

## 📚 Documentos Steering Obrigatórios

**LEIA E SIGA RIGOROSAMENTE:**

- **`.kiro/steering/funcionalidade-sobre-testes.md`** - Metodologia de testes obrigatória (testes sempre no FINAL de cada bloco, NUNCA intercalar entre tasks)
- **`.kiro/steering/analise-preventiva-obrigatoria.md`** - SEMPRE analisar código/banco ANTES de modificar, verificar impactos em funcionalidades existentes, documentar estado atual vs estado desejado
- **`.kiro/steering/compromisso-honestidade.md`** - Reportar problemas imediatamente, não esconder dificuldades, comunicar riscos identificados

## Introdução

⚠️ **DESCOBERTA CRÍTICA:** Sistema já possui página de integrações MCP com Supabase configurada em `dashboard/agente/mcp`. Status atual:
- ✅ Evolution API: Online (120ms latência)
- ✅ Uazapi: Online (85ms latência)  
- ❌ **Supabase: Error (Connection timeout)**
- ⚠️ Redis: Warning (450ms latência alta)

**IMPACTO:** Análise preventiva DEVE investigar MCP Supabase antes de implementar Dynamic Pricing Service.

Esta sprint adiciona 5 funcionalidades críticas ao Agente BIA para melhorar a experiência do cliente e expandir capacidades de comunicação:

1. **Preços Dinâmicos** - Buscar preços do banco em tempo real
2. **Histórico Cliente** - Reconhecer e personalizar para clientes retornando  
3. **Imagens Híbridas** - Enviar imagem do produto + link para galeria completa
4. **Áudio → Transcrição** - Processar mensagens de áudio via Whisper OpenAI
5. **Áudio → Resposta Áudio** - Responder com TTS quando cliente manda áudio

**Estratégia de Resposta:** Espelhar formato do cliente (áudio→áudio, texto→texto)

## Glossary

- **BIA**: Bot de Inteligência Artificial da Slim Quality
- **SICC**: Sistema de Inteligência Corporativa Contínua
- **Evolution_API**: API para integração WhatsApp
- **Whisper**: Modelo OpenAI para transcrição de áudio
- **TTS**: Text-to-Speech (OpenAI)
- **Supabase_Storage**: Armazenamento de arquivos
- **Fallback**: Comportamento alternativo em caso de falha

## Requirements

### Requirement 1: Preços Dinâmicos

**User Story:** Como BIA, eu quero buscar preços atualizados do banco de dados, para que eu sempre informe valores corretos aos clientes.

**⚠️ CONSIDERAÇÃO MCP:** Sistema possui integração MCP Supabase com erro "Connection timeout". Análise deve determinar se usar MCP (após correção) ou client direto.

#### Acceptance Criteria

1. WHEN BIA precisa informar preço de produto, THE System SHALL buscar preço atual da tabela products (via MCP ou client direto)
2. WHEN MCP Supabase estiver offline, THE System SHALL usar client direto como fallback
3. WHEN banco de dados não responder em 2 segundos, THE System SHALL usar cache local como fallback
4. WHEN preço é atualizado no banco, THE System SHALL usar novo preço imediatamente na próxima consulta
5. THE System SHALL manter cache de preços por 5 minutos para performance

### Requirement 2: Histórico Cliente

**User Story:** Como BIA, eu quero reconhecer clientes que já compraram antes, para que eu possa personalizar o atendimento.

**⚠️ CONSIDERAÇÃO CRÍTICA:** Tabela `customers` pode não existir. Análise preventiva DEVE verificar antes de implementar.

#### Acceptance Criteria

1. WHEN cliente envia mensagem, THE System SHALL verificar se phone existe na tabela customers (se existir)
2. WHEN tabela customers não existir, THE System SHALL usar comportamento padrão sem quebrar
3. WHEN cliente é novo, THE System SHALL usar saudação padrão "Olá! Sou a BIA..."
4. WHEN cliente já existe, THE System SHALL usar saudação personalizada "Olá {nome}! Que bom ter você de volta!"
5. WHEN cliente tem compra anterior, THE System SHALL mencionar produto comprado "Como está seu colchão {modelo}?"

### Requirement 3: Imagens Híbridas

**User Story:** Como BIA, eu quero enviar imagem do produto junto com link para galeria, para que cliente veja produto e acesse mais detalhes.

#### Acceptance Criteria

1. WHEN cliente pede para ver produto, THE System SHALL buscar image_url da tabela products
2. WHEN imagem é encontrada, THE System SHALL enviar via Evolution API com caption descritiva
3. AFTER enviar imagem, THE System SHALL enviar mensagem separada com product_page_url
4. THE System SHALL funcionar para todos os 4 produtos (solteiro, padrão, queen, king)
5. WHEN image_url não existir, THE System SHALL enviar apenas descrição textual como fallback

### Requirement 4: Áudio → Transcrição

**User Story:** Como BIA, eu quero processar mensagens de áudio dos clientes, para que eu possa responder ao conteúdo falado.

#### Acceptance Criteria

1. WHEN webhook recebe messageType 'audioMessage', THE System SHALL detectar áudio automaticamente
2. WHEN áudio é detectado, THE System SHALL baixar arquivo (base64 ou URL)
3. WHEN áudio é baixado, THE System SHALL transcrever usando Whisper OpenAI com idioma PT-BR
4. WHEN transcrição é concluída, THE System SHALL processar texto com SICC normalmente
5. WHEN Whisper falhar, THE System SHALL responder "Desculpe, tive dificuldade com o áudio. Pode digitar sua mensagem?"

### Requirement 5: Áudio → Resposta Áudio

**User Story:** Como BIA, eu quero responder com áudio quando cliente manda áudio, para que a comunicação seja natural e espelhada.

#### Acceptance Criteria

1. WHEN cliente envia áudio, THE System SHALL gerar resposta em texto via SICC
2. WHEN resposta em texto está pronta, THE System SHALL converter para áudio usando TTS OpenAI
3. WHEN áudio é gerado, THE System SHALL enviar via Evolution API como push-to-talk
4. THE System SHALL usar voz feminina PT-BR (modelo "nova") com qualidade HD
5. WHEN TTS falhar, THE System SHALL enviar resposta em texto como fallback

### Requirement 6: Estratégia de Resposta Espelhada

**User Story:** Como sistema, eu quero espelhar o formato de comunicação do cliente, para que a experiência seja consistente e natural.

#### Acceptance Criteria

1. WHEN cliente envia mensagem de texto, THE System SHALL responder com texto
2. WHEN cliente envia mensagem de áudio, THE System SHALL responder com áudio
3. THE System SHALL manter funcionalidade de texto existente sem alterações
4. THE System SHALL processar ambos os formatos através do SICC
5. WHEN qualquer componente de áudio falhar, THE System SHALL usar fallback para texto

### Requirement 7: Integração Supabase Storage

**User Story:** Como sistema, eu quero armazenar imagens de produtos no Supabase Storage, para que elas sejam acessíveis via URL pública.

#### Acceptance Criteria

1. THE System SHALL criar bucket 'products_images' público no Supabase Storage
2. THE System SHALL organizar imagens por produto: products_images/{tipo}/main.jpg
3. THE System SHALL atualizar tabela products com image_url e product_page_url
4. THE System SHALL servir imagens via URL pública do Supabase
5. THE System SHALL manter URLs válidas e acessíveis 24/7

### Requirement 8: Rate Limiting OpenAI

**User Story:** Como sistema, eu quero controlar uso da API OpenAI, para que não haja sobrecarga ou custos excessivos.

#### Acceptance Criteria

1. THE System SHALL limitar máximo 5 transcrições Whisper simultâneas
2. THE System SHALL limitar máximo 3 gerações TTS simultâneas  
3. WHEN limite é atingido, THE System SHALL enfileirar requisições
4. THE System SHALL implementar timeout de 30 segundos para Whisper
5. THE System SHALL implementar timeout de 20 segundos para TTS

### Requirement 9: Monitoramento e Métricas

**User Story:** Como administrador, eu quero monitorar performance das novas funcionalidades, para que eu possa identificar problemas rapidamente.

#### Acceptance Criteria

1. THE System SHALL registrar métricas de tempo de transcrição Whisper
2. THE System SHALL registrar métricas de tempo de geração TTS
3. THE System SHALL registrar taxa de sucesso/falha para áudio
4. THE System SHALL registrar uso de cache vs consulta direta ao banco
5. THE System SHALL alertar quando taxa de falha > 5%

### Requirement 10: Fallbacks e Robustez

**User Story:** Como sistema, eu quero ter fallbacks para todas as novas funcionalidades, para que o atendimento nunca pare completamente.

#### Acceptance Criteria

1. WHEN Supabase não responder, THE System SHALL usar cache local de preços
2. WHEN Whisper falhar, THE System SHALL pedir mensagem de texto
3. WHEN TTS falhar, THE System SHALL enviar resposta em texto
4. WHEN Storage falhar, THE System SHALL enviar descrição textual do produto
5. THE System SHALL manter log de todos os fallbacks para análise