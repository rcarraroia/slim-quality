# 📚 ÍNDICE DE PLANEJAMENTO - SLIM QUALITY

## 🎯 Visão Geral

Este documento serve como índice central para toda a documentação de planejamento do projeto Slim Quality.

---

## 📋 Documentos de Planejamento

### 1. 📅 CRONOGRAMA_MACRO.md
**O que é:** Timeline completa dos 10 sprints com dependências e validações

**Quando consultar:**
- Antes de iniciar qualquer sprint
- Para entender dependências entre sprints
- Para validar marcos de entrega
- Para identificar caminho crítico

**Contém:**
- Detalhamento de cada sprint
- Duração e complexidade
- Dependências mapeadas
- Validações de saída
- Riscos e mitigações
- Marcos de validação

**Link:** `docs/CRONOGRAMA_MACRO.md`

---

### 2. 🗄️ ROADMAP_TECNICO.md
**O que é:** Evolução técnica do banco de dados e arquitetura

**Quando consultar:**
- Antes de criar qualquer migration
- Para entender estrutura evolutiva
- Para verificar preparações críticas
- Para evitar retrabalho

**Contém:**
- Estrutura de banco por sprint
- Migrations planejadas
- Campos preparatórios
- Relacionamentos críticos
- Funções auxiliares
- Checklist de preparações

**Link:** `docs/ROADMAP_TECNICO.md`

---

### 3. 📝 SPECS_TEMPLATE.md
**O que é:** Template padrão para criar specs detalhadas de cada sprint

**Quando consultar:**
- Antes de iniciar cada sprint
- Para criar spec detalhada
- Para garantir completude da documentação

**Contém:**
- Estrutura completa de spec
- Seções obrigatórias
- Checklist de preparação
- Critérios de aceite
- Validações de saída

**Link:** `docs/SPECS_TEMPLATE.md`

---

## 🗂️ Documentos de Contexto

### 4. 📖 Steering Files

#### product.md
**O que é:** Regras de negócio e contexto do produto

**Contém:**
- Sistema de comissões (30% split)
- Produtos e preços
- Fluxos de venda
- Programa de afiliados
- Regras críticas

**Link:** `.kiro/steering/product.md`

#### structure.md
**O que é:** Arquitetura técnica do sistema

**Contém:**
- Stack técnica
- Estrutura de pastas
- Arquitetura do banco (37 tabelas)
- Fluxos críticos
- Edge Functions
- Políticas RLS

**Link:** `.kiro/steering/structure.md`

#### tech.md
**O que é:** Padrões técnicos e boas práticas

**Contém:**
- Configurações (TypeScript, ESLint, Prettier)
- Padrões de nomenclatura
- Templates de migrations
- Logging
- Testes
- Performance

**Link:** `.kiro/steering/tech.md`

---

## 🔐 Documentos de Configuração

### 5. 🔑 SUPABASE_CREDENTIALS.md
**O que é:** Credenciais reais do projeto (CONFIDENCIAL)

**⚠️ NUNCA COMMITAR NO GIT**

**Contém:**
- Project ID e URLs
- API Keys
- Access Token
- Links do Dashboard
- Comandos úteis

**Link:** `docs/SUPABASE_CREDENTIALS.md`

### 6. 📖 SUPABASE_ACCESS.md
**O que é:** Guia de configuração do Supabase

**Contém:**
- Instalação do CLI
- Processo de autenticação
- Métodos de acesso
- Protocolo de análise prévia
- Troubleshooting

**Link:** `docs/SUPABASE_ACCESS.md`

---

## 📊 Documentos de Status

### 7. ✅ CONFIGURACAO_CONCLUIDA.md
**O que é:** Resumo da configuração inicial

**Contém:**
- Status da configuração
- Análise do banco
- Próximos passos
- Checklist de validação

**Link:** `docs/CONFIGURACAO_CONCLUIDA.md`

### 8. 📋 SETUP_COMPLETO.md
**O que é:** Resumo de toda estrutura criada

**Contém:**
- Arquivos criados
- Steering files
- Documentação
- Próximos passos

**Link:** `docs/SETUP_COMPLETO.md`

---

## 🔄 Fluxo de Trabalho

### Antes de Iniciar um Sprint

1. **Consultar:** `CRONOGRAMA_MACRO.md`
   - Verificar dependências
   - Entender objetivo do sprint
   - Revisar riscos

2. **Consultar:** `ROADMAP_TECNICO.md`
   - Ver tabelas a criar
   - Verificar preparações necessárias
   - Entender relacionamentos

3. **Criar Spec:** Usar `SPECS_TEMPLATE.md`
   - Copiar template
   - Preencher todas as seções
   - Revisar e aprovar

4. **Consultar Steering Files:**
   - `product.md` - Regras de negócio
   - `structure.md` - Arquitetura
   - `tech.md` - Padrões

5. **Executar Sprint**

---

### Durante o Sprint

1. **Seguir spec criada**
2. **Consultar steering files quando necessário**
3. **Validar preparações críticas**
4. **Registrar decisões técnicas**

---

### Ao Final do Sprint

1. **Validar critérios de aceite**
2. **Testar preparações para próximo sprint**
3. **Atualizar documentação (se necessário)**
4. **Fazer demo**
5. **Coletar feedback**

---

## 🎯 Sprints e Documentação

### Sprint 0: Setup
**Docs principais:**
- CRONOGRAMA_MACRO.md (Sprint 0)
- ROADMAP_TECNICO.md (Sprint 0)
- SUPABASE_ACCESS.md

**Criar spec:** `SPEC_SPRINT_0_SETUP.md`

---

### Sprint 1: Autenticação
**Docs principais:**
- CRONOGRAMA_MACRO.md (Sprint 1)
- ROADMAP_TECNICO.md (Sprint 1)
- product.md (regras de usuários)

**⚠️ ATENÇÃO:** Preparar para Sprint 4 (afiliados)

**Criar spec:** `SPEC_SPRINT_1_AUTH.md`

---

### Sprint 2: Produtos
**Docs principais:**
- CRONOGRAMA_MACRO.md (Sprint 2)
- ROADMAP_TECNICO.md (Sprint 2)
- product.md (catálogo de produtos)

**Criar spec:** `SPEC_SPRINT_2_PRODUTOS.md`

---

### Sprint 3: Vendas + Asaas
**Docs principais:**
- CRONOGRAMA_MACRO.md (Sprint 3)
- ROADMAP_TECNICO.md (Sprint 3)
- product.md (fluxo de vendas)

**⚠️ ATENÇÃO:** Preparar webhook para Sprint 4 (comissões)

**Criar spec:** `SPEC_SPRINT_3_VENDAS.md`

---

### Sprint 4: Afiliados ⭐ CRÍTICO
**Docs principais:**
- CRONOGRAMA_MACRO.md (Sprint 4)
- ROADMAP_TECNICO.md (Sprint 4)
- product.md (sistema de comissões)
- structure.md (árvore genealógica)

**⚠️ SPRINT MAIS COMPLEXO**

**Criar spec:** `SPEC_SPRINT_4_AFILIADOS.md`

---

### Sprint 5-10
**Seguir mesmo padrão:**
1. Consultar CRONOGRAMA_MACRO.md
2. Consultar ROADMAP_TECNICO.md
3. Criar spec usando template
4. Executar

---

## 📞 Referências Rápidas

### Comandos Úteis

```bash
# Analisar banco
python scripts/analyze_database.py

# Criar migration
supabase migration new nome_da_migration

# Aplicar migrations
supabase db push

# Ver estrutura
supabase db dump --schema public
```

### Estrutura de Comissões

| Cenário | N1 | N2 | N3 | Renum | JB | Total |
|---------|----|----|-------|-------|-----|-------|
| Apenas N1 | 15% | - | - | 7,5% | 7,5% | 30% |
| N1 + N2 | 15% | 3% | - | 6% | 6% | 30% |
| Completo | 15% | 3% | 2% | 5% | 5% | 30% |

### Produtos

| Modelo | Preço |
|--------|-------|
| Solteiro | R$ 3.190,00 |
| Padrão | R$ 3.290,00 |
| Queen | R$ 3.490,00 |
| King | R$ 4.890,00 |

---

## ✅ Checklist Geral

### Antes de Cada Sprint
- [ ] Cronograma consultado
- [ ] Roadmap técnico consultado
- [ ] Spec criada e aprovada
- [ ] Steering files revisados
- [ ] Dependências validadas

### Durante o Sprint
- [ ] Seguindo spec
- [ ] Preparações críticas implementadas
- [ ] Testes sendo escritos
- [ ] Documentação sendo atualizada

### Ao Final do Sprint
- [ ] Critérios de aceite validados
- [ ] Testes passando
- [ ] Preparações para próximo sprint testadas
- [ ] Demo realizada
- [ ] Feedback coletado

---

## 🚀 Próximos Passos

1. **Revisar todos os documentos criados**
2. **Aprovar cronograma e roadmap**
3. **Criar spec do Sprint 0**
4. **Iniciar execução**

---

**Última atualização:** 23/10/2025  
**Status:** ✅ Documentação completa  
**Responsável:** Kiro AI
