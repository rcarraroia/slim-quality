# Diretrizes de Desenvolvimento - Slim Quality

Este documento resume a stack tecnológica e estabelece regras claras para o uso de bibliotecas, garantindo a consistência e manutenibilidade do código.

## 1. Stack Tecnológica

O projeto é construído com as seguintes tecnologias:

*   **Framework:** React com TypeScript.
*   **Build Tool:** Vite.
*   **Roteamento:** React Router DOM (rotas centralizadas em `src/App.tsx`).
*   **Estilização:** Tailwind CSS (abordagem utility-first).
*   **Componentes UI:** shadcn/ui (baseado em Radix UI).
*   **Ícones:** Lucide React.
*   **Gerenciamento de Estado/Dados:** React Query (`@tanstack/react-query`) para server state.
*   **Formulários:** React Hook Form e Zod para validação de schemas.
*   **Notificações:** Shadcn Toast (para notificações de sistema) e Sonner (para toasts simples).

## 2. Regras de Uso de Bibliotecas

| Funcionalidade | Biblioteca Recomendada | Regras de Uso |
| :--- | :--- | :--- |
| **Componentes UI** | shadcn/ui (e Radix UI) | **Prioridade máxima.** Use os componentes existentes em `src/components/ui/`. Se precisar de uma variação, crie um novo componente em `src/components/`. |
| **Estilização** | Tailwind CSS | **Obrigatório.** Use classes Tailwind para todo o layout e design. Evite CSS customizado, exceto para variáveis globais em `src/index.css`. |
| **Ícones** | `lucide-react` | Use exclusivamente para todos os ícones da aplicação. |
| **Roteamento** | `react-router-dom` | Todas as rotas devem ser definidas em `src/App.tsx`. |
| **Gerenciamento de Dados** | `@tanstack/react-query` | Use para gerenciar o estado do servidor (fetching, caching, mutações). |
| **Formulários** | `react-hook-form` + `zod` | Use `react-hook-form` para controle de formulários e `zod` para validação de schemas. |
| **Notificações** | `useToast` (shadcn) e `sonner` | Use `useToast` para feedback de ações críticas (ex: login, erro de formulário). Use `sonner` para mensagens simples e não-bloqueantes. |
| **Estrutura de Arquivos** | N/A | Componentes em `src/components/`, Páginas em `src/pages/`, Hooks em `src/hooks/`. Mantenha arquivos pequenos e focados. |