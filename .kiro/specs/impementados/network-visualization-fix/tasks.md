# Implementation Plan: Correção de Visualização de Rede

## Overview

Implementação de correções de bugs nas queries de rede e melhorias de UX/UI para visualização hierárquica de afiliados nos painéis Admin e Afiliado.

**Progresso:** 0 de 4 fases concluídas

---

## FASE 1: Correção de Queries ⏳ PENDENTE

**Objetivo:** Corrigir queries que usam `root_id` incorretamente para usar `path`

**Tempo Estimado:** 2 horas

### Tasks

- [ ] 1.1 Corrigir método `getNetwork()` em `affiliate.service.ts`
  - Substituir filtro `eq('root_id', affiliateId)` por `contains('path', [affiliateId])`
  - Adicionar filtro de profundidade (máximo 2 níveis)
  - Atualizar método `buildTreeFromHierarchy()` para usar `path` corretamente
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 1.2 Testar query corrigida com dados reais
  - Testar com Beatriz: deve retornar Giuseppe (N1) e Maria (N2)
  - Testar com Giuseppe: deve retornar apenas Maria (N1)
  - Testar com Maria: deve retornar array vazio
  - Validar que `path` está sendo usado corretamente
  - _Requirements: 1.2, 1.3_

- [ ] 1.3 Atualizar método `buildTreeFromHierarchy()`
  - Implementar lógica de filtro por profundidade
  - Usar `path.indexOf()` para determinar nível relativo
  - Limitar a 2 níveis de profundidade
  - Organizar hierarquia corretamente
  - _Requirements: 1.1, 4.2, 4.3_

- [ ] 1.4 Validar performance das queries
  - Executar query com 10 afiliados
  - Executar query com 50 afiliados
  - Validar tempo < 500ms
  - Verificar uso de índices (EXPLAIN ANALYZE)
  - _Requirements: 6.1, 6.2, 6.3_

### ✅ Checkpoint 1: Queries Corrigidas
- [ ] Beatriz vê Giuseppe e Maria
- [ ] Giuseppe vê apenas Maria
- [ ] Maria vê rede vazia
- [ ] Performance < 500ms
- [ ] Código compila sem erros
- **Status:** Aguardando execução

---

## FASE 2: Admin - Remover Coluna "Nível" ⏳ PENDENTE

**Objetivo:** Remover coluna "Nível" da lista de afiliados do admin

**Tempo Estimado:** 30 minutos

### Tasks

- [ ] 2.1 Modificar `ListaAfiliados.tsx`
  - Remover `<TableHead>Nível</TableHead>` da linha 258
  - Remover `<TableCell>` correspondente da linha 330
  - Ajustar colspan se necessário
  - Remover campo `level` da interface `Affiliate`
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 2.2 Atualizar serviço `admin-affiliates.service.ts`
  - Remover mapeamento de `level` no método `getAll()`
  - Manter todos os outros campos
  - Validar que query continua funcionando
  - _Requirements: 2.2_

- [ ] 2.3 Testar lista de afiliados
  - Verificar que tabela renderiza corretamente
  - Validar que busca/filtros funcionam
  - Testar responsividade mobile/desktop
  - Verificar que exportação CSV funciona
  - _Requirements: 2.4, 5.5_

### ✅ Checkpoint 2: Coluna Removida
- [ ] Coluna "Nível" não aparece mais
- [ ] Tabela renderiza corretamente
- [ ] Busca e filtros funcionam
- [ ] Responsividade ok
- **Status:** Aguardando execução

---

## FASE 3: Admin - Criar Página "Minha Rede" ⏳ PENDENTE

**Objetivo:** Criar nova página de visualização hierárquica para admin

**Tempo Estimado:** 4 horas

### Tasks

- [ ] 3.1 Criar arquivo `src/pages/dashboard/afiliados/MinhaRede.tsx`
  - Copiar estrutura de `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Adaptar para visão admin (empresa como raiz)
  - Manter componentes UI existentes (Card, Button, etc)
  - Manter paleta de cores do design system
  - _Requirements: 3.1, 3.2, 5.1, 5.2, 5.3_

- [ ] 3.2 Implementar query para rede completa
  - Buscar todos os afiliados da view `affiliate_hierarchy`
  - Filtrar raízes (`level = 0`)
  - Organizar em árvore hierárquica
  - Sem limite de profundidade
  - _Requirements: 3.2, 3.3_

- [ ] 3.3 Implementar cards de resumo
  - Total de Afiliados
  - Afiliados Ativos
  - Comissões Pagas
  - Vendas Geradas
  - _Requirements: 3.5_

- [ ] 3.4 Implementar organograma hierárquico
  - Empresa como raiz (ícone de prédio)
  - Afiliados raiz como filhos diretos
  - Expandir/recolher nós
  - Busca por nome
  - _Requirements: 3.4, 3.6, 3.7_

- [ ] 3.5 Adicionar rota no menu admin
  - Adicionar item "Minha Rede" no submenu "Afiliados"
  - Ícone: `<Network />` ou `<Users />`
  - Rota: `/dashboard/afiliados/minha-rede`
  - Proteção de rota (apenas admin)
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ] 3.6 Testar página completa
  - Verificar que empresa aparece como raiz
  - Validar que Beatriz, Giuseppe e Maria aparecem
  - Testar expandir/recolher
  - Testar busca
  - Validar cards de resumo
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

### ✅ Checkpoint 3: Página Admin Criada
- [ ] Página renderiza corretamente
- [ ] Empresa aparece como raiz
- [ ] Todos os afiliados aparecem
- [ ] Expandir/recolher funciona
- [ ] Busca funciona
- [ ] Cards de resumo corretos
- [ ] Menu atualizado
- **Status:** Aguardando execução

---

## FASE 4: Afiliado - Limitar Profundidade ⏳ PENDENTE

**Objetivo:** Limitar visualização de rede do afiliado a 2 níveis

**Tempo Estimado:** 2 horas

### Tasks

- [ ] 4.1 Modificar `src/pages/afiliados/dashboard/MinhaRede.tsx`
  - Atualizar query para usar `path` (já corrigido na Fase 1)
  - Adicionar filtro de profundidade máxima (2 níveis)
  - Atualizar método `convertApiDataToNetworkNodes()`
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.2 Atualizar cards de resumo
  - Nível 1 (Diretos): Contar apenas N1
  - Nível 2: Contar apenas N2
  - Total Gerado: Somar comissões de N1 e N2
  - Remover card de Nível 3
  - _Requirements: 4.5, 4.6_

- [ ] 4.3 Atualizar método `calculateTotals()`
  - Contar apenas N1 e N2
  - Ignorar N3 se existir
  - Calcular comissões apenas de N1 e N2
  - _Requirements: 4.5_

- [ ] 4.4 Testar com cada afiliado
  - Beatriz: Deve ver Giuseppe (N1) e Maria (N2)
  - Giuseppe: Deve ver apenas Maria (N1)
  - Maria: Deve ver rede vazia
  - Validar cards de resumo para cada um
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4.5 Validar estados vazios
  - Rede vazia: Exibir mensagem apropriada
  - Busca sem resultados: Exibir sugestão
  - Loading: Exibir skeleton
  - _Requirements: 7.2, 7.3_

### ✅ Checkpoint 4: Profundidade Limitada
- [ ] Beatriz vê 2 níveis (Giuseppe + Maria)
- [ ] Giuseppe vê 1 nível (Maria)
- [ ] Maria vê rede vazia
- [ ] Cards de resumo corretos
- [ ] Estados vazios funcionam
- **Status:** Aguardando execução

---

## FASE 5: Validação Final ⏳ PENDENTE

**Objetivo:** Validar todas as implementações e preparar para deploy

**Tempo Estimado:** 1 hora

### Tasks

- [ ] 5.1 Executar testes manuais completos
  - Admin - Lista de Afiliados (sem coluna "Nível")
  - Admin - Minha Rede (organograma completo)
  - Beatriz - Minha Rede (2 níveis)
  - Giuseppe - Minha Rede (1 nível)
  - Maria - Minha Rede (vazia)
  - _Requirements: Todos_

- [ ] 5.2 Validar performance
  - Medir tempo de resposta das queries
  - Validar que está < 500ms
  - Verificar uso de índices
  - Testar com rede maior (se possível)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 5.3 Validar UX/UI
  - Verificar consistência visual
  - Testar responsividade mobile/desktop
  - Validar cores e ícones
  - Verificar acessibilidade básica
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 5.4 Executar checklist de deploy
  - `npm run build` - Compilar sem erros
  - `npm run lint` - Lint ok (0 errors)
  - Remover console.logs desnecessários
  - Verificar variáveis de ambiente
  - Validar RLS policies (já existentes)
  - _Requirements: 8.4_

- [ ] 5.5 Criar commit e push
  - Commit com mensagem descritiva
  - Push para repositório
  - Validar que CI/CD passa (se houver)
  - _Requirements: 8.4_

- [ ] 5.6 Documentar mudanças
  - Atualizar CHANGELOG (se houver)
  - Documentar breaking changes (se houver)
  - Atualizar README (se necessário)
  - _Requirements: 8.4_

### ✅ Checkpoint 5: Validação Final
- [ ] Todos os testes manuais passaram
- [ ] Performance < 500ms
- [ ] UX/UI consistente
- [ ] Build compila sem erros
- [ ] Lint ok (0 errors)
- [ ] Commit e push realizados
- **Status:** Aguardando execução

---

## 📊 Resumo de Fases

| Fase | Descrição | Tempo | Tasks | Status |
|------|-----------|-------|-------|--------|
| 1 | Correção de Queries | 2h | 4 tasks | ⏳ Pendente |
| 2 | Admin - Remover Coluna | 30min | 3 tasks | ⏳ Pendente |
| 3 | Admin - Criar Página | 4h | 6 tasks | ⏳ Pendente |
| 4 | Afiliado - Limitar Profundidade | 2h | 5 tasks | ⏳ Pendente |
| 5 | Validação Final | 1h | 6 tasks | ⏳ Pendente |
| **TOTAL** | | **9.5h** | **24 tasks** | **0/5 fases** |

---

## 🎯 Critérios de Sucesso

### Funcionalidade:
- ✅ Beatriz vê Giuseppe (N1) e Maria (N2)
- ✅ Giuseppe vê apenas Maria (N1)
- ✅ Maria vê rede vazia
- ✅ Admin vê organograma completo
- ✅ Coluna "Nível" removida da lista

### Performance:
- ✅ Queries < 500ms
- ✅ Uso correto de índices
- ✅ View materializada otimizada

### UX/UI:
- ✅ Design consistente
- ✅ Responsividade ok
- ✅ Estados vazios apropriados
- ✅ Mensagens de erro claras

### Qualidade:
- ✅ Build sem erros
- ✅ Lint ok (0 errors)
- ✅ Código limpo (sem console.logs)
- ✅ Testes manuais passando

---

## 🔄 Estratégia de Rollback

### Por Fase:
- **Fase 1**: Reverter mudanças em `affiliate.service.ts`
- **Fase 2**: Restaurar coluna "Nível" em `ListaAfiliados.tsx`
- **Fase 3**: Remover arquivo `MinhaRede.tsx` do admin, remover rota do menu
- **Fase 4**: Reverter mudanças em `MinhaRede.tsx` do afiliado
- **Fase 5**: Reverter commit completo

### Comando de Rollback:
```bash
# Reverter último commit
git revert HEAD

# Ou reverter commit específico
git revert <commit-hash>

# Push do revert
git push origin main
```

---

## 📝 Notes

- Todas as queries usam view materializada `affiliate_hierarchy` (já otimizada)
- View é atualizada automaticamente via triggers
- Não há mudanças no banco de dados (apenas queries)
- Manter padrão visual existente (componentes, cores, ícones)
- Testes manuais são essenciais (dados reais: Beatriz, Giuseppe, Maria)
- Performance já validada na spec anterior (0.105ms)
- RLS policies já existentes e funcionando
