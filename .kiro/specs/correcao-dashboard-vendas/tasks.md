# Implementation Plan: Correção Dashboard Vendas

## Overview

Este plano implementa as correções críticas identificadas na auditoria do dashboard de vendas. O foco é conectar o frontend ao banco Supabase real, corrigir métricas incorretas, implementar funcionalidades faltantes e separar completamente os conceitos de Pedidos e Vendas.

**⚠️ REGRAS OBRIGATÓRIAS - LEIA ANTES DE CADA TASK:**
- 📋 **Análise Preventiva Obrigatória** (analise-preventiva-obrigatoria.md)
- 🔍 **Verificação do Banco Real** (verificacao-banco-real.md)  
- 💯 **Compromisso de Honestidade** (compromisso-honestidade.md)

## Tasks

### FASE 1: ANÁLISE E PREPARAÇÃO

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente analise-preventiva-obrigatoria.md**

- [x] 1. Análise preventiva do banco de dados real
  - **OBRIGATÓRIO:** Conectar ao Supabase usando credenciais de supabase-credentials.md
  - **OBRIGATÓRIO:** Verificar estrutura real das tabelas orders, customers, products, payments
  - **OBRIGATÓRIO:** Contar registros existentes em cada tabela
  - **OBRIGATÓRIO:** Analisar dados reais (não migrations) conforme verificacao-banco-real.md
  - **OBRIGATÓRIO:** Documentar estado atual antes de qualquer alteração
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2. Auditoria do código frontend atual
  - **OBRIGATÓRIO:** Identificar todos os arquivos que usam dados mockados
  - **OBRIGATÓRIO:** Mapear componentes que precisam de correção
  - **OBRIGATÓRIO:** Verificar configuração atual do Supabase client
  - **OBRIGATÓRIO:** Listar APIs/queries que precisam ser implementadas
  - _Requirements: 1.1, 2.1, 3.1_

### FASE 2: IMPLEMENTAÇÃO DA CONEXÃO REAL

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente verificacao-banco-real.md e compromisso-honestidade.md**

- [x] 3. Implementar SupabaseService com conexão real
  - **OBRIGATÓRIO:** Usar apenas métodos nativos do Supabase (não exec_sql)
  - **OBRIGATÓRIO:** Implementar validação de conexão
  - **OBRIGATÓRIO:** Testar conexão real com banco de produção
  - **OBRIGATÓRIO:** Implementar retry automático para falhas de conexão
  - **OBRIGATÓRIO:** Registrar logs detalhados para auditoria
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Implementar MetricsCalculator
  - **OBRIGATÓRIO:** Calcular vendas usando apenas status 'paid'
  - **OBRIGATÓRIO:** Converter cents para reais corretamente
  - **OBRIGATÓRIO:** Implementar cálculo correto de taxa de conversão
  - **OBRIGATÓRIO:** Tratar divisão por zero em ticket médio
  - **OBRIGATÓRIO:** Validar dados antes de calcular
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 8.1, 8.2, 8.3_

### FASE 3: CORREÇÃO DOS CARDS DO DASHBOARD

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente analise-preventiva-obrigatoria.md**

- [x] 5. Corrigir card "Vendas do Mês"
  - **OBRIGATÓRIO:** Buscar dados reais do Supabase
  - **OBRIGATÓRIO:** Filtrar apenas pedidos com status 'paid'
  - **OBRIGATÓRIO:** Aplicar filtro de período (mês atual)
  - **OBRIGATÓRIO:** Testar com dados reais do banco
  - **OBRIGATÓRIO:** Verificar se valor não é mais R$ 3.190,00 fixo
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI dos cards existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 1.1, 1.2, 5.1, 5.4_

- [x] 6. Corrigir card "Pedidos Realizados"
  - **OBRIGATÓRIO:** Incluir todos os status (pending, paid, cancelled)
  - **OBRIGATÓRIO:** Separar claramente de "Vendas Confirmadas"
  - **OBRIGATÓRIO:** Usar nomenclatura correta conforme Requirement 4
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI dos cards existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 7. Implementar card "Taxa de Conversão"
  - **OBRIGATÓRIO:** Usar fórmula (pedidos_pagos / total_pedidos * 100)
  - **OBRIGATÓRIO:** Tratar caso de divisão por zero
  - **OBRIGATÓRIO:** Exibir percentual com 1 casa decimal
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI dos cards existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 1.4, 8.3_

- [x] 8. Implementar card "Ticket Médio"
  - **OBRIGATÓRIO:** Dividir valor total por pedidos pagos (não todos)
  - **OBRIGATÓRIO:** Formatar em reais (R$ X.XXX,XX)
  - **OBRIGATÓRIO:** Tratar caso sem pedidos pagos
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI dos cards existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 1.5, 8.2, 8.3_

- [x] 8.1. Implementar card "Pedidos Pendentes"
  - **OBRIGATÓRIO:** Filtrar apenas pedidos com status 'pending'
  - **OBRIGATÓRIO:** Exibir quantidade de pedidos pendentes
  - **OBRIGATÓRIO:** Exibir valor total dos pedidos pendentes
  - **OBRIGATÓRIO:** Usar cor/estilo diferente para indicar pendência
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI dos cards existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 4.1, 4.2, 4.5_

### FASE 4: CORREÇÃO DA LISTA "VENDAS RECENTES"

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente compromisso-honestidade.md**

- [x] 9. Implementar filtro correto de vendas recentes
  - **OBRIGATÓRIO:** Filtrar APENAS pedidos com status 'paid'
  - **OBRIGATÓRIO:** Excluir completamente pedidos 'pending' e 'cancelled'
  - **OBRIGATÓRIO:** Ordenar por data de criação decrescente
  - **OBRIGATÓRIO:** Limitar a 10 registros mais recentes
  - **OBRIGATÓRIO:** Testar que não aparecem pedidos pendentes
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 10. Implementar exibição de dados da venda
  - **OBRIGATÓRIO:** Mostrar nome do cliente (join com customers)
  - **OBRIGATÓRIO:** Mostrar nome do produto (join com products)
  - **OBRIGATÓRIO:** Mostrar valor em reais (converter de cents)
  - **OBRIGATÓRIO:** Mostrar data formatada (DD/MM/YYYY)
  - _Requirements: 2.3, 8.4_

- [x] 11. Implementar estados de UI para lista
  - **OBRIGATÓRIO:** Estado de loading com skeleton
  - **OBRIGATÓRIO:** Estado vazio quando não há vendas
  - **OBRIGATÓRIO:** Estado de erro com retry
  - **OBRIGATÓRIO:** Manter exatamente o mesmo padrão UX/UI das listas existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores e componentes do sistema
  - _Requirements: 2.4, 7.2, 7.4_

### FASE 5: IMPLEMENTAÇÃO DA PÁGINA /dashboard/vendas

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente verificacao-banco-real.md**

- [x] 12. Criar estrutura da página de vendas
  - **OBRIGATÓRIO:** Conectar ao banco Supabase real
  - **OBRIGATÓRIO:** Implementar roteamento correto (/dashboard/vendas)
  - **OBRIGATÓRIO:** Buscar dados reais (não mock)
  - **OBRIGATÓRIO:** Testar que página não fica mais vazia
  - **OBRIGATÓRIO:** Seguir exatamente o mesmo layout das páginas existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores, tipografia e componentes do sistema
  - **OBRIGATÓRIO:** Manter padrão de navegação e breadcrumbs existente
  - _Requirements: 3.1, 3.2, 5.1_

- [x] 13. Implementar listagem paginada de vendas
  - **OBRIGATÓRIO:** Mostrar apenas pedidos com status 'paid'
  - **OBRIGATÓRIO:** Implementar paginação (20 itens por página)
  - **OBRIGATÓRIO:** Incluir dados do cliente e produto
  - **OBRIGATÓRIO:** Formatar valores e datas corretamente
  - **OBRIGATÓRIO:** Usar exatamente os mesmos componentes de tabela existentes
  - **OBRIGATÓRIO:** Manter padrão de paginação e ordenação do sistema
  - **OBRIGATÓRIO:** Seguir paleta de cores e estilos das tabelas existentes
  - _Requirements: 3.3, 8.2, 8.4_

- [x] 14. Implementar filtros da página
  - **OBRIGATÓRIO:** Filtro por período (data início/fim)
  - **OBRIGATÓRIO:** Filtro por cliente (busca por nome)
  - **OBRIGATÓRIO:** Filtro por produto
  - **OBRIGATÓRIO:** Botão para resetar filtros
  - **OBRIGATÓRIO:** Atualizar métricas quando filtros mudam
  - **OBRIGATÓRIO:** Usar exatamente os mesmos componentes de filtro existentes
  - **OBRIGATÓRIO:** Manter padrão UX/UI dos filtros do sistema
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 14.1. Criar página /dashboard/pedidos (separação completa)
  - **OBRIGATÓRIO:** Criar rota /dashboard/pedidos separada de vendas
  - **OBRIGATÓRIO:** Listar TODOS os pedidos (pending, paid, cancelled)
  - **OBRIGATÓRIO:** Implementar filtros por status (pending, paid, cancelled)
  - **OBRIGATÓRIO:** Usar cores diferentes para cada status
  - **OBRIGATÓRIO:** Adicionar item "Pedidos" no menu/sidebar
  - **OBRIGATÓRIO:** Seguir exatamente o mesmo layout das páginas existentes
  - **OBRIGATÓRIO:** Usar mesma paleta de cores, tipografia e componentes do sistema
  - **OBRIGATÓRIO:** Manter padrão de navegação e breadcrumbs existente
  - _Requirements: 4.1, 4.4, 4.5_

### FASE 6: TRATAMENTO DE ERROS E VALIDAÇÕES

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente compromisso-honestidade.md**

- [x] 15. Implementar tratamento de erros de conexão
  - **OBRIGATÓRIO:** Detectar falhas de conexão com Supabase
  - **OBRIGATÓRIO:** Implementar retry automático (máximo 3 tentativas)
  - **OBRIGATÓRIO:** Exibir mensagem de erro específica
  - **OBRIGATÓRIO:** Oferecer botão de recarregar manual
  - _Requirements: 7.1, 7.3, 7.4_

- [x] 16. Implementar estados de loading
  - **OBRIGATÓRIO:** Skeleton components durante carregamento
  - **OBRIGATÓRIO:** Indicadores de loading em botões
  - **OBRIGATÓRIO:** Timeout de 10 segundos para queries
  - _Requirements: 7.2, 7.5_

- [x] 17. Implementar validações de dados
  - **OBRIGATÓRIO:** Validar que dados não são null/undefined
  - **OBRIGATÓRIO:** Validar conversão de cents para reais
  - **OBRIGATÓRIO:** Validar cálculos de percentuais
  - **OBRIGATÓRIO:** Registrar logs para auditoria
  - _Requirements: 8.1, 8.2, 8.3, 8.5_

### FASE 7: TESTES E VALIDAÇÃO FINAL

**⚠️ ANTES DE INICIAR: Ler obrigatoriamente todas as 3 regras obrigatórias**

- [x] 18. Checkpoint - Validação com banco real
  - **OBRIGATÓRIO:** Conectar ao Supabase de produção
  - **OBRIGATÓRIO:** Verificar que dados exibidos são reais (não mock)
  - **OBRIGATÓRIO:** Confirmar que métricas batem com auditoria
  - **OBRIGATÓRIO:** Testar todos os filtros e funcionalidades
  - **OBRIGATÓRIO:** Documentar problemas encontrados honestamente
  - Ensure all tests pass, ask the user if questions arise.

- [x] 19. Testes de integração end-to-end
  - **OBRIGATÓRIO:** Testar fluxo completo dashboard → dados → UI
  - **OBRIGATÓRIO:** Testar cenários de erro (desconectar internet)
  - **OBRIGATÓRIO:** Testar performance (< 2 segundos para carregar)
  - **OBRIGATÓRIO:** Testar responsividade em mobile
  - _Requirements: Todos_

- [x] 20. Validação final e entrega
  - **OBRIGATÓRIO:** Verificar checklist completo do design.md
  - **OBRIGATÓRIO:** Confirmar que problemas da auditoria foram corrigidos
  - **OBRIGATÓRIO:** Testar que página /dashboard/vendas não está mais vazia
  - **OBRIGATÓRIO:** Confirmar que lista vendas não mostra mais pedidos pending
  - **OBRIGATÓRIO:** Validar que cards mostram dados reais do banco
  - **OBRIGATÓRIO:** Reportar status real (não inventar sucessos)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **CRÍTICO:** Todas as tasks devem seguir as regras de analise-preventiva-obrigatoria.md
- **CRÍTICO:** Sempre verificar banco real conforme verificacao-banco-real.md
- **CRÍTICO:** Manter honestidade absoluta conforme compromisso-honestidade.md
- **CRÍTICO:** Usar apenas métodos nativos do Supabase (nunca exec_sql)
- **CRÍTICO:** Testar com dados reais do banco de produção
- **CRÍTICO:** Reportar problemas reais, não inventar sucessos
- Checkpoints garantem validação incremental com dados reais
- Cada task referencia requirements específicos para rastreabilidade
- Foco em correção de problemas reais identificados na auditoria