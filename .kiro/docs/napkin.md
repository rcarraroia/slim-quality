# 🧠 Napkin Runbook — Slim Quality

> Runbook curado continuamente. Lido no início de TODA sessão.
> Mantém apenas regras recorrentes de alto valor.
> Máximo 10 itens por categoria, priorizados por importância.

---

## 🔧 Regras de Curadoria

- Re-priorizar a cada leitura
- Manter apenas orientações recorrentes e de alto valor
- Máximo 10 itens por categoria
- Cada item inclui data + "Do instead"
- Remover itens obsoletos ou de baixo sinal

---

## 🎯 Execução & Validação (Prioridade Máxima)

1. **[2026-03-11] SEMPRE usar Supabase Power antes de modificar banco**
   Do instead: Executar `list_tables` e validar schema real antes de qualquer migration ou análise.

2. **[2026-03-10] NUNCA comentar código para fazer build passar**
   Do instead: Corrigir o problema real (criar arquivo faltante, instalar dependência, refatorar imports).

3. **[2026-03-10] Análise preventiva obrigatória antes de implementar**
   Do instead: Gastar 5-10 min lendo arquivos relacionados, identificando padrões, planejando estrutura.

4. **[2026-02-27] getDiagnostics SEMPRE antes de marcar task como concluída**
   Do instead: Executar `getDiagnostics` em todos os arquivos modificados e confirmar 0 erros.

5. **[2026-02-26] Funcionalidade > Testes**
   Do instead: Manter TODAS as funcionalidades projetadas. Nunca remover código para fazer teste passar.

6. **[2026-03-12] Apresentar análise antes de implementar**
   Do instead: Sempre apresentar relatório/análise no chat antes de implementar mudanças.

7. **[2026-03-12] Organizar documentação em pastas categorizadas**
   Do instead: Usar estrutura `docs/analises/`, `docs/auditorias/`, `docs/guias/`, `docs/planejamento/` ao invés de arquivos soltos na raiz.

---

## 🏗️ Arquitetura & Backend (Vercel Serverless)

1. **[2026-02-25] Backend são Vercel Serverless Functions em /api**
   Do instead: Criar novas rotas em `/api` como JavaScript/ESM, NUNCA em `src/api` com Express/TypeScript.

2. **[2026-02-26] Limite de 12 Serverless Functions (Plano Hobby)**
   Do instead: Antes de criar nova função, consolidar em existente ou consultar `.kiro/docs/serverless-functions.md`.

3. **[2026-02-25] CORS obrigatório em cada Serverless Function**
   Do instead: Adicionar headers CORS e tratar OPTIONS em toda função nova.

4. **[2026-03-10] bcryptjs (não bcrypt) em ambiente serverless**
   Do instead: Usar `bcryptjs` (100% JavaScript) ao invés de `bcrypt` (bindings nativos).

5. **[2026-02-26] Deploy automático no Vercel após git push**
   Do instead: Apenas fazer commit + push. Vercel faz deploy automaticamente (~2 min).

---

## 🎨 UI/UX & Design System

1. **[2026-02-28] SEMPRE consultar design-system.md antes de criar/modificar UI**
   Do instead: Ler `.context/docs/design-system.md` e usar variáveis CSS + componentes shadcn/ui.

2. **[2026-02-28] NUNCA usar cores hardcoded**
   Do instead: Usar variáveis CSS (`bg-primary`, `text-muted-foreground`) ao invés de `bg-indigo-600`.

3. **[2026-03-12] object-contain para imagens de produtos**
   Do instead: Usar `object-contain` ao invés de `object-cover` para evitar cortes nas bordas.

4. **[2026-02-28] Usar componentes shadcn/ui ao invés de criar customizados**
   Do instead: Verificar se existe componente em `src/components/ui/` antes de criar novo.

---

## 💳 Pagamentos & Asaas

1. **[2026-03-11] Chave API Asaas expira por inatividade (3 dias)**
   Do instead: Fazer pelo menos 1 requisição nas primeiras 24h após criar chave nova.

2. **[2026-03-10] Split Asaas: Slim recebe 10% automaticamente**
   Do instead: NÃO incluir Slim no array de splits. Asaas já deduz 10% automaticamente.

3. **[2026-02-27] externalReference com prefixo `affiliate_` para afiliados**
   Do instead: Usar `affiliate_${affiliate_id}` para diferenciar de pagamentos de produtos.

---

## 🗄️ Banco de Dados (Supabase)

1. **[2026-03-10] NUNCA usar select('*') em queries Supabase**
   Do instead: Listar colunas explicitamente para evitar erro 406.

2. **[2026-03-03] Campo has_subscription controla acesso à vitrine**
   Do instead: Verificar `has_subscription = true` (não apenas `affiliate_type`) para habilitar vitrine.

3. **[2026-02-28] Tabela product_images (não coluna image_url)**
   Do instead: Usar JOIN com `product_images` para buscar imagens de produtos.

4. **[2026-03-10] Validar estrutura real do banco antes de migrations**
   Do instead: Usar Supabase Power para consultar schema real, nunca confiar apenas em arquivos de migration.

---

## 🚀 Deploy & Ambiente

1. **[2026-02-26] Variáveis de ambiente no Vercel Dashboard**
   Do instead: Atualizar em Settings → Environment Variables e aplicar em Production/Preview/Development.

2. **[2026-02-25] Agente IA deployado no EasyPanel via Docker**
   Do instead: Consultar `.kiro/docs/procedimento-deploy.md` para procedimento completo.

---

## 👤 Diretrizes do Usuário (Renato)

1. **[2026-02-20] TODAS as respostas em Português-BR**
   Do instead: Responder sempre em PT-BR. Inglês apenas dentro de código.

2. **[2026-02-20] Não criar múltiplos arquivos sobre o mesmo assunto**
   Do instead: Atualizar arquivo existente ao invés de criar novo.

3. **[2026-03-12] Não implementar sem autorização**
   Do instead: Apresentar relatório/análise no chat antes de implementar mudanças.

4. **[2026-03-11] Badges: apenas Logista e Afiliado Premium**
   Do instead: Usar 🏪 Logista (roxo) e 👤 Afiliado Premium (dourado). Individuais simples não aparecem.

5. **[2026-03-12] Galeria de múltiplas imagens implementada**
   Do instead: Usar componente `ProductGallery.tsx` para exibir múltiplas imagens de produtos.
