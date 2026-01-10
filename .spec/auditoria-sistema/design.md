# Design da Auditoria - Slim Quality

## Arquitetura da Auditoria
A auditoria será dividida em 5 blocos principais de análise, utilizando ferramentas frias (SQL, Shell, Inspeção de Código) para evitar efeitos colaterais.

### 1. Auditoria de Banco de Dados (Data Integrity & Schema)
- **Ferramenta**: `supabase-mcp-server`.
- **Foco**: Schema, Constraints, RLS e consistência de dados de comissões.
- **Validação de Fluxo de Dados**: Verificar se pedidos pagos geram comissões e se comissões geram splits.

### 2. Auditoria de Código (Static Analysis)
- **Ferramenta**: Comandos shell (`grep`, `find`, `tree`) e `view_file`.
- **Foco**: Dependências, segredos expostos, arquitetura da pasta `agent/` (Python/LangGraph) e lógica de cálculo de comissão no backend.

### 3. Integrações (Connectivity & Config)
- **Foco**: Asaas (API Keys, Webhooks), N8N (Workflows), WhatsApp (BIA).
- **Método**: Verificação de logs de transação e arquivos de configuração.

### 4. Segurança e Performance
- **Foco**: Políticas RLS no Supabase, Variáveis de ambiente e Índices de DB.

## Outputs Gerados
- Relatório Markdown estruturado.
- Arquivos de texto com outputs brutos para referência.
- Screenshots de logs relevantes (capturados via logs de integração se possível).
