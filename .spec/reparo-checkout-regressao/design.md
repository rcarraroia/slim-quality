# Design Técnico: Reparo do Checkout e Afiliados

## 🏗 Arquitetura de Correção

### 1. Saneamento do `api/checkout.js`
- **Ação**: Remover o bloco residual de código de assinatura entre as linhas 310 e 315.
- **Correção de Chaves**: Ajustar o balanceamento de chaves do bloco `if (billingType === 'CREDIT_CARD' ...)`.
- **Validação**: Executar `node --check api/checkout.js` para garantir integridade.

### 2. Fluxo de Afiliados em `src/services/checkout.service.ts`
- **Ação**: Implementar a busca do `affiliate_id` a partir do `referral_code` antes de realizar o insert.
- **Lógica**: 
  - Consultar a tabela `affiliates` usando o `referral_code`.
  - Se o afiliado for encontrado e estiver ativo, utilizar seu `id` no insert de `referral_conversions`.
  - Caso contrário, registrar log de aviso mas não travar o checkout.

### 3. Validação de RLS (Supabase)
- **Ação**: Revisar a política de segurança da tabela `admins` para garantir que a chave anônima (anon key) tenha permissão de leitura para filtros específicos utilizados pelo frontend.

## 🧪 Plano de Verificação (INEGOCIÁVEL)
1. **Verificação de Sintaxe**: `node --check api/checkout.js`.
2. **Teste de Simulação de Checkout**: Enviar um payload via `curl` para `api/checkout` e validar a resposta 200 OK com dados de pagamento.
3. **Teste de Conversão**: Realizar uma venda de teste e verificar se o `affiliate_id` foi gravado corretamente na tabela `referral_conversions`.
