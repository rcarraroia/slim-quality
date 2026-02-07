# Design: Integração de Formulário de Contato e Limpeza de Dados

## 🎨 Interface (UI/UX)
- **Rodapé**: A coluna de contato será substituída por uma estrutura de formulário vertical.
- **Campos**: Inputs modernos com estilo Tailwind (border-primary no foco).
- **Botão**: Estilo primário da marca, com estado de "Enviando...".

## 🛠️ Arquitetura Técnica
1. **Componente React**: `ContactForm.tsx` utilizando `react-hook-form` para gerenciamento de estado e `zod` para validação de esquemas (conforme padrão do projeto).
2. **API Endpoint**: `api/contact.js` (Node.js/Vercel) para processar o envio.
   - Utilizará a biblioteca `resend` (se disponível) ou `fetch` para um webhook externo.
   - Configuração de remetente e destinatários conforme especificado.
3. **Segurança**: Rate limiting básico no endpoint para evitar spam (reutilizando lógica do `server/index.js` se possível).

## 📊 Fluxo de Dados
1. Usuário submete o formulário no `Footer.tsx`.
2. O `ContactForm.tsx` valida os dados localmente.
3. Requisição POST para `/api/contact`.
4. Backend processa e envia notificação.
5. Frontend exibe Toast de sucesso/erro (reutilizando componente `sonner` se disponível).
