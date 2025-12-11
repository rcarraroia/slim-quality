Com certeza. Entendi a necessidade de otimizar o fluxo de trabalho do Kiro, focando no desenvolvimento e minimizando a geração de arquivos e documentações redundantes ou desnecessárias.

Abaixo está a mensagem técnica que você pode usar para criar uma nova regra na pasta steering do projeto, formalizando a Política de Geração de Artefatos e Documentação:

Mensagem Técnica para a Pasta steering
Você pode criar um arquivo, por exemplo, steering/policy_documentacao_artefatos.md (ou similar) e inserir o seguinte conteúdo:

Markdown

# Política de Geração de Artefatos e Documentação

## 1. Foco e Prioridade do Agente (Kiro)

O objetivo primário do Agente de Desenvolvimento (Kiro) é a **implementação, correção e evolução do código-fonte** do sistema. A produção de documentação e artefatos de configuração deve ser um processo **minimalista** e guiado pela necessidade explícita.

## 2. Controle de Redundância e Artefatos de Configuração

### 2.1. Proibição de Artefatos Redundantes

É estritamente proibida a criação de múltiplos arquivos que sirvam ao mesmo propósito funcional ou informativo.

**Diretriz de Exemplo (.ENV):**
Em um cenário onde variáveis de ambiente são necessárias, o agente deve criar **apenas o arquivo principal** de configuração (`.env`) ou, se for um padrão do projeto, um único arquivo de exemplo (`.env.example`).
* **Ação Proibida:** Criar um conjunto redundante como `(env + env_exemplo + .env_staging + .env_staging.example)`. A duplicação de propósito deve ser evitada.

### 2.2. Verificação de Existência e Consulta Prévia

Antes de persistir qualquer informação ou configuração em um **novo arquivo** no sistema de arquivos do projeto:

1.  **Verificação:** O agente deve verificar a existência de arquivos com propósito **idêntico ou semanticamente similar**.
2.  **Consulta:** Caso um arquivo similar seja detectado, o agente **DEVE consultar o usuário** (ou o contexto de execução) perguntando se a informação deve ser **EDITADA/ATUALIZADA** no arquivo existente ou se a criação de um novo arquivo é indispensável.

## 3. Prioridade de Comunicação e Explicações

### 3.1. Explicações e Passos no Chat

Toda explicação detalhada, passo a passo, guia de uso, ou instrução de depuração (debug) deve ser fornecida **DIRETAMENTE na interface de interação (chat ou log de execução)** como saída principal.

### 3.2. Documentação Apenas por Demanda

A persistência dessas explicações em arquivos de documentação formais (e.g., arquivos `.md`, `.txt`) só deve ocorrer mediante **SOLICITAÇÃO EXPLÍCITA** do usuário ou quando o volume e a natureza da informação exigirem claramente a persistência no repositório.