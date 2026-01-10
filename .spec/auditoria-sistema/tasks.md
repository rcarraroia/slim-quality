# Tarefas da Auditoria - Slim Quality

## Bloco 1: Preparação e Exploração Inicial
- [ ] Mapear estrutura de diretórios do projeto. [ ]
- [ ] Identificar versões de dependências (Python e Node). [ ]

## Bloco 2: Auditoria de Banco de Dados (Supabase)
- [ ] Validar existência e contagem de registros em todas as 50 tabelas. [ ]
- [ ] Analisar colunas e constraints das tabelas críticas (`affiliates`, `orders`, `commissions`, etc). [ ]
- [ ] Verificar integridade da rede de afiliados (Hierarquia N1, N2, N3). [ ]
- [ ] Auditar sistema de comissões (Pedidos vs Comissões vs Splits). [ ]
- [ ] Validar status das Wallets Asaas (verificadas e ativas). [ ]
- [ ] Verificar logs de erro (Commission Logs e Webhook Logs). [ ]

## Bloco 3: Auditoria de Código Fonte
- [ ] Analisar código do Agente (`agent/`) - LangChain/LangGraph. [ ]
- [ ] Analisar Backend (`src/`, `server/`, `api/`) - Lógica de Comissões. [ ]
- [ ] Verificar presença de segredos e configurações sensíveis. [ ]
- [ ] Localizar e revisar funções de cálculo de comissão (15%, 3%, 2%, 5%, 5%). [ ]

## Bloco 4: Auditoria de Integrações e Segurança
- [ ] Verificar configuração da integração Asaas. [ ]
- [ ] Verificar configuração BIA (WhatsApp/N8N). [ ]
- [ ] Auditar políticas RLS no Supabase. [ ]
- [ ] Analisar performance de queries críticas. [ ]

## Bloco 5: Consolidação
- [ ] Elaborar relatório final `RELATORIO_AUDITORIA_2026_01_10.md` em `/docs/relatorios/`. [ ]
- [ ] Criar lista de bugs críticos e recomendações. [ ]
