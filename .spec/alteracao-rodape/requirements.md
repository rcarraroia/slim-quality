# Requisitos: Remoção de Contato e Novo Formulário "Fale Conosco"

## 🎯 Objetivo
Remover todas as referências diretas de contato (telefone, email, endereço) do site para proteger a rede de afiliados, substituindo a coluna de contato no rodapé por um formulário de "Fale Conosco".

## 📋 Regras de Negócio
1. **Privacidade de Contato**: Nenhum número de telefone ou endereço físico deve ser exibido publicamente no site.
2. **Destinatários do Formulário**: As mensagens do formulário devem ser enviadas para:
   - `colchoesslimquality@gmail.com`
   - `jbassis@hotmail.com`
3. **Campos do Formulário**:
   - Nome (Obrigatório)
   - Email (Obrigatório, com validação)
   - Assunto (Opcional)
   - Mensagem (Obrigatório)
4. **Feedback ao Usuário**: Exibir mensagem de sucesso/erro após o envio.

## ✅ Critérios de Aceite
- Coluna "Contato" no rodapé removida.
- Título "Fale Conosco" adicionado no rodapé.
- Formulário funcional inserido no rodapé.
- Telefone e email removidos das páginas de Sucesso/Erro de pagamento.
- Telefone removido das tags de SEO (Schema.org).
- Telefone removido das respostas de fallback do Chat/BIA.
- Envio de formulário integrado com backend (Vercel Function).
