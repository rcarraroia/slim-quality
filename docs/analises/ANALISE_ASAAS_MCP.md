# Análise Técnica: Configuração do MCP Asaas

Este documento descreve as descobertas sobre o Servidor MCP (Model Context Protocol) do Asaas e o arquivo `llms.txt`, conforme solicitado para análise.

## 1. Servidor MCP Asaas

O Asaas disponibiliza um servidor MCP público que atua como uma ponte entre modelos de linguagem (LLMs) e sua API. Ele converte a especificação OpenAPI em recursos estruturados.

- **URL do Servidor:** `https://docs.asaas.com/mcp`
- **Objetivo:** Permitir que assistentes de IA entendam a API, consultem schemas, gerem snippets de código e executem chamadas de API diretamente.

### Funcionalidades Principais
- **Descoberta de Endpoints:** Listagem de todos os endpoints disponíveis.
- **Schemas Detalhados:** Definições completas de requisição e resposta.
- **Geração de Snippets:** Criação automática de exemplos de código.
- **Execução de Chamadas:** Permite testar a API (requer autenticação), criar registros (clientes, cobranças) e validar fluxos.
- **Pesquisa de Documentação:** Busca contextual dentro da documentação técnica.

## 2. Capacidade de Criação e Correção de Sistemas

Sim, o uso do MCP permite que um assistente de IA (como eu) crie ou corrija sistemas de checkout e split com precisão muito maior.

### Como a IA utiliza o MCP para isso:
- **Verificação em Tempo Real:** Se eu estiver corrigindo um erro no seu sistema de split, posso usar o MCP para perguntar ao Asaas: *"Por que a regra de split X retornaria um erro 400?"*. O MCP consultará a especificação exata e me dará a resposta técnica.
- **Testes de Integração:** Durante o desenvolvimento, posso pedir ao MCP para realizar uma chamada de teste (em sandbox) para validar se o código que acabei de escrever funciona antes mesmo de você rodar o sistema.
- **Eliminação de Alucinação:** Em vez de "adivinhar" nomes de campos, a IA lê os nomes diretamente da ferramenta MCP conectada ao servidor do Asaas.

## 3. Integração com Kiro Dev

O **Kiro Dev** (kiro.dev) é um IDE que oferece suporte nativo para MCP.

### Configuração no Kiro:
1. **Ativação:** No Kiro, abra as configurações (`Ctrl + ,`), pesquise por "MCP" e ative o suporte.
2. **Adição do Servidor:** Na aba "MCP Servers" do painel lateral do Kiro, é possível adicionar novos servidores apontando para a URL do Asaas: `https://docs.asaas.com/mcp`.
3. **Uso de Ferramentas:** Uma vez conectado, o Kiro expõe os "tools" do Asaas diretamente no chat do assistente.

### Criação de Novos Servidores:
O Kiro permite que desenvolvedores criem seus próprios servidores MCP personalizados (usando o SDK oficial do MCP em Python ou Node.js). Isso é útil se você quiser estender as capacidades da IA para ferramentas internas da sua empresa que não possuem um MCP público como o do Asaas.

## 4. Como eu (Antigravity) uso o MCP?

Eu não "rodo" o servidor MCP, eu sou um **consumidor** dele.
- Quando você configura um servidor MCP no seu ambiente (seja no Cursor, Kiro ou Claude), esse servidor "instala" novas ferramentas no meu painel de controle.
- Se o MCP do Asaas estiver ativo, eu passo a ter ferramentas como `asaas.consultar_pagamento` ou `asaas.criar_assinatura`.
- Eu utilizo essas ferramentas da mesma forma que utilizo as minhas ferramentas atuais (como ler arquivos ou rodar comandos no terminal), tornando-me um "especialista" em Asaas durante a nossa sessão.

---

## 6. Diagnóstico de Erro: mcp_config.json

O erro na configuração fornecida pelo Kiro ocorre porque ele está tentando usar um servidor MCP genérico (`mcp-server-fetch`) como se fosse um driver especializado do Asaas.

### Problemas Encontrados:
1. **Servidor Genérico vs. Especializado:** O `mcp-server-fetch` é apenas uma ferramenta de transporte HTTP. Ele não conhece os endpoints do Asaas nem injeta automaticamente a chave de API nos cabeçalhos (`headers`).
2. **Ignoração de Variáveis:** As variáveis `ASAAS_API_KEY` e `ASAAS_API_URL` não são reconhecidas pelo `mcp-server-fetch`. Elas ficam "mortas" na configuração.
3. **Complexidade Desnecessária:** A IA precisaria "adivinhar" as URLs de cada endpoint, em vez de recebê-las prontas.

### Correção Sugerida para o Kiro:

Para que a IA realmente "enxergue" o Asaas, você deve usar o servidor oficial. No Kiro, a configuração ideal deve ser:

```json
{
  "mcpServers": {
    "asaas": {
      "url": "https://docs.asaas.com/mcp"
    }
  }
}
```

Se o seu ambiente exigir uma configuração via comando (executável localmente), a forma correta é usar o bridge de OpenAPI:

```json
{
  "mcpServers": {
    "asaas": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-openapi", "https://docs.asaas.com/mcp"],
      "env": {
        "access_token": "SUA_CHAVE_AQUI"
      }
    }
  }
}
```

> [!CAUTION]
> **Segurança:** Nunca compartilhe sua Chave de API (Access Token) em chats públicos ou documentos não protegidos. No exemplo acima, a chave deve ser injetada como a variável `access_token` para que o servidor MCP a utilize nas chamadas.
... (conteúdo mantido)

O arquivo `llms.txt` localizado na raiz da documentação (`https://docs.asaas.com/llms.txt`) serve como um índice otimizado para IAs.

- **Estrutura:** Segue o padrão emergente de fornecer um resumo em texto simples de toda a documentação disponível.
- **Conteúdo:** Mapeia todos os guias (Checkout, Pix, Assinaturas, Split, Webhooks) e a referência completa da API.
- **Utilidade:** Permite que LLMs identifiquem rapidamente qual URL contém a informação necessária sem precisar "raspar" (crawl) todo o site da documentação, economizando tokens e tempo.

---

## 3. Conclusão da Análise

A configuração do MCP do Asaas é extremamente simples, baseada em uma URL única que expõe toda a inteligência da API para a IA. Para o projeto **Slim Quality**, integrar este MCP ao ambiente de desenvolvimento permitirá que a IA gere código de integração com o Asaas com precisão muito superior à de modelos treinados apenas com dados públicos desatualizados.

> [!IMPORTANT]
> Esta análise foi realizada de forma puramente teórica e não foram realizadas alterações no código ou configurações do sistema.
