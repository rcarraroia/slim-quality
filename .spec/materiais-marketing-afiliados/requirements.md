# Requisitos: Central de Materiais de Marketing

## 1. Visão Geral
Criar uma área dedicada no painel do afiliado que centraliza materiais de divulgação (banners, vídeos, textos/copies) disponibilizados pelo Admin.
O sistema deve permitir que o afiliado copie esses materiais já com seu **link de indicação (referral code ou slug) integrado automaticamente**.

## 2. Objetivos de Negócio
- Facilitar o trabalho do afiliado entregando "tudo pronto" para divulgar.
- Garantir padronização da comunicação da marca Slim Quality.
- Aumentar conversão eliminando erros na geração manual de links.

## 3. Escopo Funcional

### 3.1. Painel Admin (Gestão)
- **Menu Novo:** "Materiais de Marketing".
- **CRUD de Materiais:**
    - Título e Descrição.
    - Tipo: Imagem, Vídeo, Texto/Copy.
    - Upload de Arquivo (Imagens/Vídeos) ou Campo de Texto Rico (Copy).
    - Associação (Opcional): Vincular a um Produto específico ou deixar como "Geral".
    - Status: Ativo/Inativo.
- **Templates Inteligentes (Gerador):**
    - Permite criar textos com variáveis dinâmicas: `{{LINK}}` (Obrigatório), `{{NOME_CLIENTE}}` (Opcional).

### 3.2. Painel do Afiliado (Uso)
- **Menu Novo:** "Materiais de Divulgação".
- **Visualização:**
    - Abas/Filtros: "Geral" (Institucional) vs "Por Produto".
    - Cards visuais com preview da imagem/vídeo ou resumo do texto.
- **Ação de Copiar (A Mágica):**
    - **Materiais Simples:** Botão "Copiar Link" ou "Baixar Arquivo" sempre injeta `?ref=CODIGO`.
    - **Templates de Texto:**
        - Se houver variável `{{NOME_CLIENTE}}`, abre um modal/input perguntando o nome.
        - Gera o texto final substituindo `{{LINK}}` pelo link do afiliado e `{{NOME_CLIENTE}}` pelo input.
        - Botão "Copiar para Área de Transferência" e "Enviar no WhatsApp" (Link `wa.me`).

### 3.3. Integração e Segurança
- **Segurança do Link:** Garantir que o link gerado use o `slug` (se existir) ou `referral_code` válido do afiliado logado.
- **Performance:** O carregamento dos materiais não pode impactar a performance do dashboard.

## 4. Regras de Negócio e Casos de Bordo
- **RN01:** Todo material de texto DEVE conter a variável `{{LINK}}`. Se o Admin não colocar, o sistema deve alertar ou concatenar ao final automaticamente.
- **RN02:** Materiais vinculados a produtos inativos não devem aparecer.
- **RN03:** Se o afiliado mudar de slug, os links gerados a partir daquele momento devem usar o novo slug.

## 5. Critérios de Aceite
- [ ] Admin consegue cadastrar uma Copy com placeholder `{{LINK}}`.
- [ ] Admin consegue fazer upload de um banner promocional.
- [ ] Afiliado vê o material no seu painel.
- [ ] Ao clicar em copiar a Copy, o texto na área de transferência contém o link correto do afiliado (ex: `slimquality.com.br?ref=joao123`).
- [ ] Ao clicar em "Gerar para Cliente", consegue preencher o nome e o texto no Zap sai personalizado: "Olá Maria, veja esse colchão...".
