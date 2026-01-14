# Relatório de Análise Técnica: Sistema de Agente e Integrações

Este documento detalha a investigação realizada no diretório `/agent` e no banco de dados para entender as inconsistências de informações prestadas pelo agente e os erros de status no painel administrativo.

## 1. Origem das Informações de Preço e Pagamento

Identificamos que o agente está fornecendo informações desatualizadas devido a dados **hardcoded** (fixos no código) que sobrepõem as definições do banco de dados e do painel.

### 1.1. Preço Desatualizado (R$ 3.490,00)
O valor de R$ 3.490,00 para o colchão Queen não está vindo da tabela de produtos atualizada. Ele tem origem em um mecanismo de **fallback** no sistema de precificação dinâmica:

- **Arquivo:** `agent/src/services/dynamic_pricing_service.py`
- **Causa:** O serviço possui um dicionário chamado `_fallback_prices` (linhas 32-37) que é utilizado caso a consulta ao banco de dados falhe ou o cache expire sem sucesso na renovação. Atualmente, o valor para "queen" está fixado em `349000` (centavos).

### 1.2. Condições de Pagamento (12x sem juros)
Esta informação não é consultada em nenhuma tabela de regras de negócio. Ela está escrita diretamente no prompt do agente de vendas:

- **Arquivo:** `agent/src/graph/nodes/sales.py`
- **Linha 117:** `3. Mencionar condições de pagamento: até 12x sem juros`
- **Impacto:** O agente sempre afirmará que o parcelamento é em 12x sem juros, independentemente do que for configurado no painel, pois esse "chip" de comportamento está soldado no código.

---

## 2. Uso do Prompt do Painel

O usuário questionou por que o agente não segue o prompt definido no painel administrativo.

- **Status:** O prompt do painel está corretamente salvo no banco de dados (tabela `agent_config`), mas **não está sendo utilizado** pelos nós de execução do LangGraph.
- **Evidência:** O arquivo `agent/src/graph/nodes/sales.py` reconstrói o `system_prompt` localmente usando strings fixas, ignorando completamente a configuração global que reside no banco de dados. 
- **Conclusão:** Há uma desconexão entre o módulo de gerenciamento (que salva o prompt) e o módulo de execução (que usa o prompt fixo no código).

---

## 3. Erros de Integração no Painel (Evolution e Redis)

As mensagens de erro e o status "Offline" no painel MCP são causados por falhas na implementação dos scripts de monitoramento (Health Checks), e não necessariamente por queda dos serviços.

### 3.1. Evolution API (Erro HTTP 401)
- **Causa:** No arquivo `agent/src/api/mcp.py` (linhas 39-64), a função que verifica o status da Evolution API realiza uma chamada HTTP GET, mas **esquece de enviar a `apikey`** necessária no cabeçalho da requisição.
- **Resultado:** O servidor da Evolution recusa a conexão por falta de autorização (Unauthorized), resultando no erro 401 exibido no painel.

### 3.2. Redis Cache (Status Offline / Not Configured)
- **Causa:** O mesmo arquivo `mcp.py` (linhas 147-148) possui uma lógica que marca o Redis como "Offline" se a URL detectada for `localhost`.
- **Resultado:** Como o Redis está rodando localmente, o sistema de monitoramento o ignora por design, reportando que ele não está configurado.

---

## 4. Recomendações Técnicas (Resumo)

Embora não tenhamos realizado alterações conforme solicitado, a correção desses pontos envolveria:
1. Atualizar os fallbacks em `dynamic_pricing_service.py`.
2. Alterar o nó `sales.py` para consumir o prompt da tabela `agent_config`.
3. Corrigir os cabeçalhos de autenticação nos scripts de health check em `mcp.py`.

**Implementado e validado (Análise de Código e Banco)** ✅
