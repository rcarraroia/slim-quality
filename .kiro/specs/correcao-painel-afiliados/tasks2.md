# TASKS - REFATORAÇÃO PÁGINA MINHA REDE

## 📋 VISÃO GERAL

**Objetivo:** Corrigir exibição de nomes dos afiliados e implementar layout organograma hierárquico interativo escalável.

**Problema Atual:**
- ❌ Nomes dos afiliados não aparecem (mostra apenas "Afiliado")
- ❌ Layout vertical não escalável (cards ocupam 100% da largura)
- ❌ Sem navegação hierárquica (não dá pra "entrar" na rede de um N1)
- ❌ Performance ruim com muitos afiliados

**Resultado Esperado:**
- ✅ Nomes reais dos afiliados exibidos
- ✅ Layout grid compacto e responsivo
- ✅ Navegação hierárquica (drill-down por nível)
- ✅ Escalável para 100+ afiliados
- ✅ Performance otimizada com lazy loading

---

## 🎯 FASE 1: CORRIGIR EXIBIÇÃO DE NOMES (15 min)

### Objetivo
Corrigir o método `getNetwork()` para buscar e exibir os nomes reais dos afiliados.

### Tarefas

- [ ] **1.1 Atualizar query N1 no método getNetwork()**
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Linha: ~700
  - Adicionar campos na query:
    - `name` (nome do afiliado)
    - `email` (email do afiliado)
    - `status` (status do afiliado)
    - `total_commissions_cents` (comissões totais)
    - `total_conversions` (conversões totais)
  - Query atual: `.select('id, user_id, referral_code, referred_by')`
  - Query corrigida: `.select('id, name, email, user_id, referral_code, referred_by, status, total_commissions_cents, total_conversions')`

- [ ] **1.2 Atualizar query N2 no método getNetwork()**
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Linha: ~710 (dentro do loop de N1)
  - Adicionar os mesmos campos da query N1
  - Garantir consistência entre queries N1 e N2

- [ ] **1.3 Atualizar método buildTreeFromHierarchy()**
  - Arquivo: `src/services/frontend/affiliate.service.ts`
  - Linha: ~750
  - Mapear corretamente os novos campos:
    ```typescript
    name: d.name || 'Afiliado',  // Agora terá o nome real
    email: d.email || '',
    status: d.status || 'active',
    totalCommissions: (d.total_commissions_cents || 0) / 100,
    salesCount: d.total_conversions || 0
    ```

- [ ] **1.4 Testar exibição de nomes**
  - Acessar página Minha Rede
  - Verificar se nomes reais aparecem nos cards
  - Verificar se não há erros no console
  - Validar que fallback "Afiliado" só aparece se nome realmente não existir

---

## 🎯 FASE 2: IMPLEMENTAR LAYOUT ORGANOGRAMA (45 min)

### Objetivo
Refatorar layout para modelo grid hierárquico com navegação drill-down.

### Tarefas

- [ ] **2.1 Criar estados de navegação**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Adicionar novos estados:
    ```typescript
    const [currentView, setCurrentView] = useState<'root' | string>('root');
    const [breadcrumb, setBreadcrumb] = useState<Array<{id: string, name: string}>>([
      { id: 'root', name: 'Você' }
    ]);
    const [currentLevelData, setCurrentLevelData] = useState<NetworkNode[]>([]);
    ```

- [ ] **2.2 Criar componente AffiliateCardCompact**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx` (inline component)
  - Props:
    - `affiliate: NetworkNode`
    - `onViewNetwork: (id: string) => void`
  - Layout:
    - Avatar com iniciais (circular)
    - Nome do afiliado
    - Badge de nível (N1, N2)
    - Estatísticas resumidas (vendas, comissões)
    - Botão "Ver Rede" (se tiver indicados)
  - Estilo: Card compacto, altura fixa, hover effect

- [ ] **2.3 Implementar função renderGridView()**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Substituir `renderNode()` por `renderGridView()`
  - Layout:
    - Grid responsivo: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
    - Gap entre cards: `gap-4`
    - Mostra apenas 1 nível por vez
  - Lógica:
    - Se `currentView === 'root'` → Mostra N1 (diretos)
    - Se `currentView === affiliateId` → Mostra N2 daquele afiliado

- [ ] **2.4 Implementar navegação drill-down**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Criar função `handleViewNetwork(affiliateId: string, affiliateName: string)`:
    ```typescript
    const handleViewNetwork = (affiliateId: string, affiliateName: string) => {
      setCurrentView(affiliateId);
      setBreadcrumb([...breadcrumb, { id: affiliateId, name: affiliateName }]);
      // Filtrar dados para mostrar apenas filhos deste afiliado
      const children = network.find(n => n.id === affiliateId)?.indicados || [];
      setCurrentLevelData(children);
    };
    ```

- [ ] **2.5 Implementar breadcrumb de navegação**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Adicionar componente Breadcrumb acima do grid
  - Formato: `Você > João Silva > Maria Santos`
  - Cada item clicável para voltar ao nível
  - Função `handleBreadcrumbClick(index: number)`:
    ```typescript
    const handleBreadcrumbClick = (index: number) => {
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      const targetId = newBreadcrumb[newBreadcrumb.length - 1].id;
      setCurrentView(targetId);
      // Atualizar currentLevelData
    };
    ```

- [ ] **2.6 Atualizar card "Você" (raiz)**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Manter card destacado do afiliado atual
  - Adicionar informação: "X pessoas na sua rede"
  - Posicionar acima do grid (não dentro)

- [ ] **2.7 Remover código antigo**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Remover função `renderNode()` (não será mais usada)
  - Remover função `toggleNode()` (não será mais usada)
  - Remover função `handleToggle()` (não será mais usada)
  - Remover botões "Expandir Todos" e "Recolher Todos" (não fazem sentido no novo layout)

---

## 🎯 FASE 3: MELHORIAS DE UX E PERFORMANCE (30 min)

### Objetivo
Adicionar animações, loading states, empty states e otimizações de performance.

### Tarefas

- [ ] **3.1 Adicionar animações de transição**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Usar Framer Motion ou CSS transitions
  - Animações:
    - Fade in ao carregar grid
    - Slide in ao navegar para novo nível
    - Hover effect nos cards
  - Exemplo:
    ```tsx
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Grid */}
    </motion.div>
    ```

- [ ] **3.2 Implementar loading states**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Loading ao carregar dados iniciais (já existe)
  - Loading ao navegar entre níveis (novo):
    ```tsx
    const [navigating, setNavigating] = useState(false);
    ```
  - Skeleton cards durante navegação

- [ ] **3.3 Implementar empty states**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Empty state quando afiliado não tem indicados:
    ```tsx
    {currentLevelData.length === 0 && (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3>Este afiliado ainda não tem indicados</h3>
        <p>Quando houver indicações, elas aparecerão aqui</p>
      </div>
    )}
    ```

- [ ] **3.4 Otimizar responsividade mobile**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Ajustar grid para mobile: `grid-cols-1`
  - Ajustar tamanho dos cards para mobile
  - Ajustar breadcrumb para mobile (scroll horizontal se necessário)
  - Testar em diferentes tamanhos de tela

- [ ] **3.5 Implementar lazy loading (opcional)**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Carregar dados sob demanda ao navegar
  - Cache de dados já visitados:
    ```typescript
    const [networkCache, setNetworkCache] = useState<Map<string, NetworkNode[]>>(new Map());
    ```
  - Evitar recarregar dados já buscados

- [ ] **3.6 Adicionar indicador de quantidade de indicados**
  - Arquivo: `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - No card, mostrar badge: "5 indicados"
  - Só mostrar botão "Ver Rede" se tiver indicados
  - Desabilitar botão se não tiver indicados

---

## 🧪 FASE 4: TESTES E VALIDAÇÃO (15 min)

### Objetivo
Testar todas as funcionalidades e validar que tudo funciona corretamente.

### Tarefas

- [ ] **4.1 Testar exibição de nomes**
  - Verificar que nomes reais aparecem
  - Verificar que não há "Afiliado" genérico (exceto se nome não existir)
  - Verificar estatísticas (vendas, comissões)

- [ ] **4.2 Testar navegação hierárquica**
  - Clicar em N1 → Deve mostrar N2 daquele N1
  - Clicar em N2 → Deve mostrar N3 daquele N2 (se houver)
  - Breadcrumb deve atualizar corretamente
  - Voltar pelo breadcrumb deve funcionar

- [ ] **4.3 Testar responsividade**
  - Desktop (1920px): 4 cards por linha
  - Laptop (1366px): 3 cards por linha
  - Tablet (768px): 2 cards por linha
  - Mobile (375px): 1 card por linha

- [ ] **4.4 Testar empty states**
  - Afiliado sem rede → Mensagem apropriada
  - Busca sem resultados → Mensagem apropriada
  - Nível sem indicados → Mensagem apropriada

- [ ] **4.5 Testar performance**
  - Carregar rede com 50+ afiliados
  - Verificar que não há lag ao navegar
  - Verificar que animações são suaves
  - Verificar que não há memory leaks

- [ ] **4.6 Validar build**
  - Executar `npm run build`
  - Verificar que não há erros de compilação
  - Verificar que não há warnings críticos
  - Verificar que bundle size não aumentou muito

---

## 📊 CHECKLIST FINAL

### Antes de Commit/Push

- [ ] Código compila sem erros (`npm run build`)
- [ ] Não há console.logs esquecidos
- [ ] Não há código comentado desnecessário
- [ ] Imports estão organizados
- [ ] Tipos TypeScript estão corretos
- [ ] Componentes estão bem estruturados
- [ ] Performance está adequada
- [ ] Responsividade funciona em todos os breakpoints

### Funcionalidades

- [ ] ✅ Nomes dos afiliados aparecem corretamente
- [ ] ✅ Layout grid responsivo implementado
- [ ] ✅ Navegação hierárquica funciona
- [ ] ✅ Breadcrumb funciona
- [ ] ✅ Empty states implementados
- [ ] ✅ Loading states implementados
- [ ] ✅ Animações suaves
- [ ] ✅ Performance otimizada

---

## 📝 NOTAS TÉCNICAS

### Arquivos Modificados
1. `src/services/frontend/affiliate.service.ts` - Método getNetwork() e buildTreeFromHierarchy()
2. `src/pages/afiliados/dashboard/MinhaRede.tsx` - Refatoração completa do layout

### Dependências Necessárias
- Nenhuma nova dependência necessária
- Usar componentes UI existentes (Card, Button, Badge)
- Usar ícones existentes (lucide-react)

### Compatibilidade
- Manter compatibilidade com dados existentes
- Não quebrar funcionalidades existentes (busca, exportar CSV)
- Manter cards de resumo (N1, N2)

### Performance
- Renderizar apenas 1 nível por vez (não toda a árvore)
- Usar useMemo para cálculos pesados
- Usar useCallback para funções de navegação
- Considerar virtualização se houver 100+ cards

---

## ⏱️ ESTIMATIVA DE TEMPO

| Fase | Tempo Estimado | Descrição |
|------|----------------|-----------|
| Fase 1 | 15 minutos | Corrigir nomes |
| Fase 2 | 45 minutos | Novo layout |
| Fase 3 | 30 minutos | Melhorias UX |
| Fase 4 | 15 minutos | Testes |
| **TOTAL** | **1h 45min** | Tempo total estimado |

---

## 🎯 CRITÉRIOS DE SUCESSO

### Funcional
- ✅ Nomes dos afiliados aparecem corretamente
- ✅ Navegação hierárquica funciona perfeitamente
- ✅ Layout escalável para 100+ afiliados
- ✅ Performance adequada (sem lag)

### UX
- ✅ Interface intuitiva e fácil de usar
- ✅ Animações suaves e agradáveis
- ✅ Responsivo em todos os dispositivos
- ✅ Feedback visual adequado (loading, empty states)

### Técnico
- ✅ Código limpo e bem estruturado
- ✅ TypeScript sem erros
- ✅ Build sem warnings
- ✅ Sem regressões em outras funcionalidades

---

**Data de Criação:** 15/01/2025  
**Status:** Pronto para execução  
**Prioridade:** Alta
