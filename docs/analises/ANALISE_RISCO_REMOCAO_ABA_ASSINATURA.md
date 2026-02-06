# Análise de Risco: Remoção da Aba Assinatura (Admin)

**Data:** 06/02/2026  
**Analista:** Antigravity (IA)  
**Status:** Relatório de Segurança  

Este documento detalha os riscos técnicos, o impacto no sistema de pagamentos e a estratégia de mitigação para remover a aba "Assinatura" do componente `AgenteConfiguracao.tsx`.

---

## 1. Mapeamento de Riscos Técnicos

### Risco A: Bloqueio Acidental do Painel Técnico (Lock-out)
*   **Descrição:** O componente `AgenteConfiguracao` utiliza o estado `subscription.status` para envolver toda a interface técnica (Prompts, Modelos, Sub-agentes) em uma "trava" de acesso.
*   **Impacto:** Se a aba for removida mas a lógica de verificação de status (`subscription?.status !== 'active'`) permanecer no código, o Admin poderá perder acesso à configuração da BIA (o robô do site).
*   **Severidade:** Alta (Impede a operação técnica).

### Risco B: Perda de Gateway de Venda Interno
*   **Descrição:** A aba contém o botão que redireciona para o checkout do Asaas (`/checkout/agente-ia-assinatura`).
*   **Impacto:** Ao remover a aba, o Admin do site perde o ponto de entrada rápido para ativar o serviço de IA caso ele expire.
*   **Severidade:** Baixa (Existem outras formas de acessar o checkout, mas esta é a mais direta no Admin).

### Risco C: Resquícios de Estado de "Bypass"
*   **Descrição:** Atualmente existe um `setSubscription({ status: 'active', ... })` forçado via `useEffect`.
*   **Impacto:** Deixar esse rastro no código após remover a interface visual polui a manutenção futura e pode mascarar erros de permissão em outros componentes.
*   **Severidade:** Baixa (Dívida técnica).

---

## 2. Impacto no Sistema de Pagamentos (Asaas)

**O risco de comprometer o sistema de pagamentos é ZERO**, desde que a limpeza seja restrita à interface do usuário.

**Justificativa Técnica:**
- O processamento de pagamentos ocorre no diretório `/api/` (Vercel Functions) e em `src/services/subscriptions/`.
- O webhook (`api/webhook-assinaturas.js`) opera diretamente nas tabelas `multi_agent_subscriptions` e `multi_agent_tenants`.
- A aba no `AgenteConfiguracao.tsx` é apenas uma **consumidora** Visual desses dados. Ela não "manda" no pagamento; ela apenas o exibe.

---

## 3. Plano de Limpeza Segura (Passo-a-Passo)

Para realizar a limpeza sem riscos, o procedimento autorizado deve seguir esta ordem:

1.  **Remoção de Imports Desnecessários:** Eliminar `CreditCard`, `Lock` e interfaces de `subscription` do cabeçalho do arquivo `AgenteConfiguracao.tsx`.
2.  **Neutralização da Lógica de Bloqueio:** Remover os wrappers condicionais que verificam o status da assinatura, garantindo que as abas "Geral" e "Sub-agentes" sejam renderizadas incondicionalmente.
3.  **Remoção dos Triggers de UI:** Deletar o `TabsTrigger` e o `TabsContent` referentes à Assinatura.
4.  **Descomissionamento do Bypass:** Remover o `useEffect` que força o status `active` e os estados `subscription` e `isLoadingSubscription`.

---

## 4. Estratégia de Mitigação

| Risco | Estratégia de Mitigação |
| :--- | :--- |
| **Bloqueio Inesperado** | Manter o componente de configuração "Agnóstico". Ele deve funcionar ignorando o status de assinatura, pois é uma ferramenta de gestão direta do Admin do site. |
| **Ponto de Venda Perdido** | Garantir que a página `FerramentasIA.tsx` (Portal do Afiliado) continue sendo o ponto central de gestão de assinaturas, unificando a experiência de checkout lá. |
| **Quebra de API** | Realizar testes de regressão no backend (`api/agent/*`) para garantir que os endpoints de configuração não exijam o cabeçalho de assinatura para o usuário Admin. |

---

**NOTA FINAL:** 
Esta limpeza é recomendada para purificar o escopo do Admin. A lógica financeira está protegida em camadas de serviço isoladas e não será afetada pela remoção desta interface redundante.

**Aguardando autorização para prosseguir com a limpeza baseada neste plano.**
