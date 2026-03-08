# 🎨 STITCH MCP - REFERÊNCIA COMPLETA

**Data:** 03/03/2026  
**Versão:** 1.0

---

## 📚 ÍNDICE

1. [Funções MCP Disponíveis](#funções-mcp-disponíveis)
2. [Skills Disponíveis](#skills-disponíveis)
3. [Casos de Uso Práticos](#casos-de-uso-práticos)
4. [Integração com Slim Quality](#integração-com-slim-quality)

---

## 1. FUNÇÕES MCP DISPONÍVEIS

### 1.1. Gerenciamento de Projetos

#### `mcp_stitch_create_project`
**Descrição:** Cria um novo projeto Stitch (container para designs UI)

**Parâmetros:**
- `title` (opcional): Título do projeto

**Exemplo:**
```javascript
mcp_stitch_create_project({
  title: "Sistema de Login Slim Quality"
})
```

---

#### `mcp_stitch_get_project`
**Descrição:** Recupera detalhes de um projeto específico

**Parâmetros:**
- `name` (obrigatório): Nome do recurso do projeto
- Formato: `projects/{project_id}`

**Exemplo:**
```javascript
mcp_stitch_get_project({
  name: "projects/4044680601076201931"
})
```

---

#### `mcp_stitch_list_projects`
**Descrição:** Lista todos os projetos acessíveis

**Parâmetros:**
- `filter` (opcional): Filtro para aplicar
  - `view=owned`: Projetos do usuário (padrão)
  - `view=shared`: Projetos compartilhados

**Exemplo:**
```javascript
mcp_stitch_list_projects({
  filter: "view=owned"
})
```

---

### 1.2. Gerenciamento de Screens (Telas)

#### `mcp_stitch_list_screens`
**Descrição:** Lista todas as telas dentro de um projeto

**Parâmetros:**
- `projectId` (obrigatório): ID do projeto (sem prefixo `projects/`)

**Exemplo:**
```javascript
mcp_stitch_list_screens({
  projectId: "4044680601076201931"
})
```

---

#### `mcp_stitch_get_screen`
**Descrição:** Recupera detalhes de uma tela específica

**Parâmetros:**
- `name` (obrigatório): Nome completo do recurso
- `projectId` (obrigatório): ID do projeto
- `screenId` (obrigatório): ID da tela

**Formato do name:** `projects/{project}/screens/{screen}`

**Exemplo:**
```javascript
mcp_stitch_get_screen({
  name: "projects/4044680601076201931/screens/98b50e2ddc9943efb387052637738f61",
  projectId: "4044680601076201931",
  screenId: "98b50e2ddc9943efb387052637738f61"
})
```

**Retorna:**
- `screenshot.downloadUrl` - URL da imagem da tela
- `htmlCode.downloadUrl` - URL do código HTML/CSS
- `width`, `height` - Dimensões da tela
- `deviceType` - Tipo de dispositivo (MOBILE, DESKTOP, TABLET)

---

### 1.3. Geração de Screens com IA

#### `mcp_stitch_generate_screen_from_text`
**Descrição:** Gera uma nova tela a partir de um prompt de texto

**Parâmetros:**
- `projectId` (obrigatório): ID do projeto
- `prompt` (obrigatório): Texto descrevendo a tela desejada
- `deviceType` (opcional): Tipo de dispositivo
  - `MOBILE`, `DESKTOP`, `TABLET`, `AGNOSTIC`
- `modelId` (opcional): Modelo de IA
  - `GEMINI_3_PRO`, `GEMINI_3_FLASH`

**⚠️ IMPORTANTE:**
- Pode levar alguns minutos para completar
- NÃO RETENTAR se falhar
- Verificar depois com `get_screen`

**Exemplo:**
```javascript
mcp_stitch_generate_screen_from_text({
  projectId: "4044680601076201931",
  prompt: `Página de gerenciamento de assinaturas com:
  - Card de status (badge, benefícios, mensalidade)
  - Card de upgrade (só para individuais básicos)
  - Botões de ação (upgrade, cancelar)
  - Design moderno com gradiente roxo
  - Ícones lucide-react`,
  deviceType: "DESKTOP",
  modelId: "GEMINI_3_PRO"
})
```

**Output:**
- `output_components`: Se contiver texto, retornar ao usuário
- Se contiver sugestões, apresentar ao usuário
- Se usuário aceitar, chamar novamente com prompt = sugestão

---

#### `mcp_stitch_edit_screens`
**Descrição:** Edita telas existentes usando prompt de texto

**Parâmetros:**
- `projectId` (obrigatório): ID do projeto
- `selectedScreenIds` (obrigatório): Array de IDs das telas (sem prefixo `screens/`)
- `prompt` (obrigatório): Texto descrevendo as edições
- `deviceType` (opcional): Tipo de dispositivo
- `modelId` (opcional): Modelo de IA

**Exemplo:**
```javascript
mcp_stitch_edit_screens({
  projectId: "4044680601076201931",
  selectedScreenIds: ["98b50e2ddc9943efb387052637738f61"],
  prompt: "Adicionar botão 'Fazer Upgrade' com gradiente roxo e ícone Sparkles",
  deviceType: "DESKTOP"
})
```

---

#### `mcp_stitch_generate_variants`
**Descrição:** Gera variantes de telas existentes

**Parâmetros:**
- `projectId` (obrigatório): ID do projeto
- `selectedScreenIds` (obrigatório): Array de IDs das telas
- `prompt` (obrigatório): Texto para gerar variantes
- `variantOptions` (obrigatório): Opções de variação
  - `variantCount` (opcional): Número de variantes (1-5, padrão: 3)
  - `creativeRange` (opcional): Alcance criativo
    - `REFINE`: Refinamentos sutis
    - `EXPLORE`: Exploração balanceada (padrão)
    - `REIMAGINE`: Explorações radicais
  - `aspects` (opcional): Aspectos específicos a variar
    - `LAYOUT`, `COLOR_SCHEME`, `IMAGES`, `TEXT_FONT`, `TEXT_CONTENT`

**Exemplo:**
```javascript
mcp_stitch_generate_variants({
  projectId: "4044680601076201931",
  selectedScreenIds: ["98b50e2ddc9943efb387052637738f61"],
  prompt: "Criar variantes com diferentes esquemas de cores",
  variantOptions: {
    variantCount: 3,
    creativeRange: "EXPLORE",
    aspects: ["COLOR_SCHEME"]
  }
})
```

---

## 2. SKILLS DISPONÍVEIS

### 2.1. Stitch Loop (Build Loop Pattern)

**Skill:** `stitch-loop`

**Descrição:** Padrão de desenvolvimento autônomo e iterativo de websites usando sistema de "baton" (bastão).

**Como Funciona:**
1. Lê tarefa atual de `next-prompt.md`
2. Gera página usando Stitch MCP
3. Integra página na estrutura do site
4. Escreve próxima tarefa no `next-prompt.md`

**Arquivos Necessários:**
- `next-prompt.md` - Tarefa atual (baton)
- `DESIGN.md` - Sistema de design visual
- `SITE.md` - Visão do site, sitemap, roadmap
- `stitch.json` - ID do projeto Stitch

**Estrutura do Baton (`next-prompt.md`):**
```markdown
---
page: about
---
Uma página descrevendo como funciona o sistema.

**DESIGN SYSTEM (REQUIRED):**
[Copiar da Seção 6 do DESIGN.md]

**Page Structure:**
1. Header com navegação
2. Explicação da metodologia
3. Footer com links
```

**Fluxo de Execução:**
1. Ler baton → Extrair nome da página e prompt
2. Consultar DESIGN.md e SITE.md
3. Gerar tela com Stitch
4. Baixar HTML e screenshot
5. Integrar no site (`site/public/{page}.html`)
6. Atualizar SITE.md (sitemap)
7. Preparar próximo baton

**Casos de Uso:**
- Desenvolvimento contínuo de landing pages
- Criação de múltiplas páginas com design consistente
- Automação de geração de sites estáticos

---

### 2.2. Design MD (Design System Extraction)

**Skill:** `design-md`

**Descrição:** Analisa projetos Stitch e sintetiza um sistema de design semântico em arquivo `DESIGN.md`.

**Objetivo:** Criar "fonte da verdade" para prompts Stitch que geram telas alinhadas com linguagem de design existente.

**Processo:**
1. Recuperar metadados do projeto Stitch
2. Baixar HTML/CSS e screenshot
3. Extrair tokens de design (cores, tipografia, espaçamento)
4. Traduzir valores técnicos em linguagem descritiva
5. Gerar arquivo `DESIGN.md` estruturado

**Estrutura do DESIGN.md:**
```markdown
# Design System: [Project Title]
**Project ID:** [Insert Project ID]

## 1. Visual Theme & Atmosphere
(Descrição do mood, densidade, filosofia estética)

## 2. Color Palette & Roles
(Lista de cores: Nome Descritivo + Hex + Função)

## 3. Typography Rules
(Família de fonte, pesos, letter-spacing)

## 4. Component Stylings
* **Buttons:** (Forma, cores, comportamento)
* **Cards/Containers:** (Bordas, background, sombras)
* **Inputs/Forms:** (Estilo de borda, background)

## 5. Layout Principles
(Estratégia de whitespace, margens, grid)

## 6. Design System Notes for Stitch Generation
(Bloco para copiar em prompts Stitch)
```

**Exemplo de Uso:**
```
1. Analisar projeto "Furniture Collection"
2. Extrair design tokens da tela Home
3. Gerar DESIGN.md com linguagem descritiva
4. Usar Seção 6 em todos os prompts Stitch futuros
```

**Benefícios:**
- Consistência visual entre telas
- Prompts mais efetivos para Stitch
- Documentação de design centralizada
- Facilita onboarding de novos designers

---

### 2.3. Remotion (Walkthrough Videos)

**Skill:** `remotion`

**Descrição:** Cria vídeos walkthrough profissionais a partir de telas Stitch usando Remotion.

**Processo:**
1. Recuperar telas do projeto Stitch
2. Baixar screenshots de cada tela
3. Criar projeto Remotion
4. Gerar componentes de vídeo (ScreenSlide, Composition)
5. Adicionar transições e overlays de texto
6. Renderizar vídeo final

**Componentes Principais:**
- `ScreenSlide.tsx` - Componente de tela individual
- `WalkthroughComposition.tsx` - Composição principal
- `screens.json` - Manifesto de telas

**Efeitos de Transição:**
- **Fade**: Cross-fade suave entre telas
- **Slide**: Transições direcionais
- **Zoom**: Efeitos de zoom para ênfase

**Overlays de Texto:**
- Títulos de tela
- Callouts de features
- Descrições
- Indicador de progresso

**Exemplo de Manifesto (`screens.json`):**
```json
{
  "projectName": "Calculator App",
  "screens": [
    {
      "id": "1",
      "title": "Home Screen",
      "description": "Interface principal da calculadora",
      "imagePath": "assets/screens/home.png",
      "width": 1200,
      "height": 800,
      "duration": 4
    }
  ]
}
```

**Renderização:**
```bash
npx remotion render WalkthroughComposition output.mp4
```

**Casos de Uso:**
- Demos de produtos
- Tutoriais de UI
- Apresentações de design
- Marketing de apps

---

## 3. CASOS DE USO PRÁTICOS

### 3.1. Criar Página de Login Moderna

**Objetivo:** Gerar página de login com design moderno

**Passos:**
1. Criar projeto Stitch
2. Gerar tela com prompt detalhado
3. Baixar HTML e integrar no projeto

**Código:**
```javascript
// 1. Criar projeto
const project = await mcp_stitch_create_project({
  title: "Sistema de Login Slim Quality"
});

// 2. Gerar tela
const screen = await mcp_stitch_generate_screen_from_text({
  projectId: project.id,
  prompt: `Página de login moderna com:
  - Campo de email
  - Campo de senha
  - Botão "Entrar" com gradiente roxo
  - Link "Esqueci minha senha"
  - Opção de login com Google
  - Design minimalista com gradiente roxo
  - Ícones lucide-react
  - Responsivo para mobile e desktop`,
  deviceType: "DESKTOP",
  modelId: "GEMINI_3_PRO"
});

// 3. Baixar HTML
const html = await fetch(screen.htmlCode.downloadUrl);
```

---

### 3.2. Gerar Variantes de Cores

**Objetivo:** Criar 3 variantes de uma tela com diferentes esquemas de cores

**Código:**
```javascript
const variants = await mcp_stitch_generate_variants({
  projectId: "4044680601076201931",
  selectedScreenIds: ["98b50e2ddc9943efb387052637738f61"],
  prompt: "Criar variantes com diferentes esquemas de cores: azul, verde e laranja",
  variantOptions: {
    variantCount: 3,
    creativeRange: "EXPLORE",
    aspects: ["COLOR_SCHEME"]
  }
});
```

---

### 3.3. Editar Tela Existente

**Objetivo:** Adicionar botão de upgrade em tela existente

**Código:**
```javascript
const edited = await mcp_stitch_edit_screens({
  projectId: "4044680601076201931",
  selectedScreenIds: ["98b50e2ddc9943efb387052637738f61"],
  prompt: `Adicionar botão "Fazer Upgrade Agora" com:
  - Gradiente roxo (primary)
  - Ícone Sparkles à esquerda
  - Posicionado no card de upgrade
  - Tamanho large
  - Hover effect com transição suave`,
  deviceType: "DESKTOP"
});
```

---

## 4. INTEGRAÇÃO COM SLIM QUALITY

### 4.1. Casos de Uso Potenciais

#### **1. Página de Gerenciamento de Assinaturas**
- Gerar protótipo visual da página implementada
- Criar variantes de layout
- Testar diferentes esquemas de cores
- Gerar documentação visual

#### **2. Vitrine de Lojas**
- Prototipar página de detalhe da loja
- Gerar variantes de cards de produtos
- Testar layouts responsivos
- Criar mockups para apresentação

#### **3. Show Room**
- Prototipar interface de produtos Show Room
- Gerar variantes de badges e estados
- Testar diferentes organizações de grid
- Criar demos visuais

#### **4. Painel de Afiliados**
- Prototipar novas funcionalidades
- Gerar variantes de dashboards
- Testar diferentes visualizações de dados
- Criar mockups para validação com usuários

---

### 4.2. Workflow Recomendado

**Para Novas Funcionalidades:**

1. **Prototipagem Rápida:**
   ```
   1. Criar projeto Stitch para a funcionalidade
   2. Gerar tela inicial com prompt detalhado
   3. Gerar 3 variantes de layout
   4. Apresentar ao usuário para escolha
   ```

2. **Refinamento:**
   ```
   1. Editar tela escolhida com feedback
   2. Ajustar cores e espaçamentos
   3. Gerar versão mobile
   4. Validar responsividade
   ```

3. **Documentação:**
   ```
   1. Extrair DESIGN.md da tela final
   2. Criar vídeo walkthrough com Remotion
   3. Documentar componentes e padrões
   4. Compartilhar com equipe
   ```

4. **Implementação:**
   ```
   1. Baixar HTML/CSS da tela
   2. Adaptar para React/TypeScript
   3. Integrar com shadcn/ui
   4. Aplicar design system existente
   ```

---

### 4.3. Exemplo Prático: Página de Assinatura

**Prompt para Stitch:**
```markdown
Página de gerenciamento de assinaturas para sistema de afiliados com:

**Layout:**
- Header com título "Assinatura" e ícone Sparkles
- 3 cards principais em coluna

**Card 1 - Status da Assinatura:**
- Badge de status (verde "Em dia" ou vermelho "Vencido")
- Ícone CheckCircle ou XCircle
- Lista de benefícios com ícones Check:
  - Vitrine Pública
  - Agente IA (Bia)
  - Show Room (só para logistas)
- Valor da mensalidade: R$ 69,00
- Botão "Ver Histórico"

**Card 2 - Upgrade (só para individuais básicos):**
- Badge "Novo" (secondary)
- Título "Upgrade para Plano Premium"
- Descrição dos benefícios
- Ícones Store e Bot
- Valor: R$ 69,00/mês
- Botão "Fazer Upgrade Agora" (primary, large)

**Card 3 - Gerenciamento:**
- Próxima cobrança (data e valor)
- Botão "Ver Histórico de Pagamentos" (outline)
- Botão "Cancelar Assinatura" (destructive)
- Alert com aviso de cancelamento

**Design System:**
- Cores: Gradiente roxo (primary), verde (success), vermelho (destructive)
- Componentes: shadcn/ui (Card, Button, Badge, Alert)
- Ícones: lucide-react (Sparkles, CheckCircle, XCircle, Store, Bot)
- Espaçamento: p-6 para cards, gap-6 entre cards
- Bordas: rounded-lg
- Sombras: shadow-sm
- Responsivo: 1 coluna mobile, 1 coluna desktop
```

**Resultado Esperado:**
- Tela visual completa
- HTML/CSS pronto para adaptação
- Screenshot para documentação
- Base para implementação React

---

## 5. RESUMO EXECUTIVO

### 📊 Estatísticas

| Categoria | Quantidade |
|-----------|------------|
| Funções MCP | 8 |
| Skills | 3 |
| Tipos de Dispositivo | 4 |
| Modelos de IA | 2 |
| Aspectos de Variação | 5 |
| Ranges Criativos | 3 |

---

### 🎯 Principais Benefícios

1. **Prototipagem Rápida:** Gerar telas em minutos ao invés de horas
2. **Consistência Visual:** Design system garante alinhamento
3. **Iteração Ágil:** Gerar variantes e testar rapidamente
4. **Documentação Automática:** DESIGN.md e vídeos walkthrough
5. **Integração Fácil:** HTML/CSS pronto para adaptação

---

### ⚠️ Limitações e Considerações

1. **Tempo de Geração:** Pode levar minutos (não retentar)
2. **Adaptação Necessária:** HTML gerado precisa ser adaptado para React
3. **Design System:** Requer DESIGN.md bem estruturado para consistência
4. **Responsividade:** Testar em múltiplos dispositivos
5. **Acessibilidade:** Validar manualmente após geração

---

### 🚀 Próximos Passos

Para começar a usar Stitch no Slim Quality:

1. **Instalar Stitch MCP** (se ainda não instalado)
2. **Criar projeto Stitch** para Slim Quality
3. **Gerar DESIGN.md** a partir de tela existente
4. **Prototipar nova funcionalidade** usando Stitch
5. **Validar com usuário** antes de implementar
6. **Adaptar para React** e integrar no projeto

---

## 📚 Recursos Adicionais

- **Stitch Documentation:** https://stitch.withgoogle.com/docs/
- **Effective Prompting Guide:** https://stitch.withgoogle.com/docs/learn/prompting/
- **Remotion Documentation:** https://www.remotion.dev/docs/
- **Remotion MCP:** https://www.remotion.dev/docs/ai/mcp

---

**Documento criado em:** 03/03/2026  
**Última atualização:** 03/03/2026  
**Versão:** 1.0
