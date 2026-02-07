# Tarefas: Implementação da Alteração de Rodapé

## 1. Preparação [/]
- [x] Mapear arquivos contendo informações sensíveis
- [x] Criar estrutura de especificação (.spec/)

## 2. Desenvolvimento do Backend [ ]
- [ ] Criar `api/contact.js`
- [ ] Implementar lógica de envio de email (ou integração com Webhook)
- [ ] Configurar destinatários: `colchoesslimquality@gmail.com`, `jbassis@hotmail.com`

## 3. Desenvolvimento do Frontend [ ]
- [ ] Criar componente `src/components/shared/ContactForm.tsx`
- [ ] Atualizar `src/components/shared/Footer.tsx` para incluir o formulário
- [ ] Validar design e responsividade

## 4. Limpeza Global de Dados [ ]
- [ ] Remover WhatsApp de `src/pages/PagamentoSucesso.tsx`
- [ ] Remover WhatsApp de `src/pages/PagamentoErro.tsx`
- [ ] Remover telefone de `src/components/seo/SchemaOrg.tsx`
- [ ] Remover WhatsApp de `src/components/chat/ChatWidget.tsx`
- [ ] Remover WhatsApp de `api/chat-proxy.js`

## 5. Validação e Entrega [ ]
- [ ] Testar fluxo completo de envio
- [ ] Verificar integridade visual em mobile e desktop
- [ ] Capturar evidências (screenshot/logs)
