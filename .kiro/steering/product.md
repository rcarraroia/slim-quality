---
inclusion: manual
---

# PRODUTO: SLIM QUALITY - SISTEMA DE VENDAS E AFILIADOS
## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

## 🎯 VISÃO GERAL DO NEGÓCIO

**Nome:** Slim Quality  
**Segmento:** E-commerce de colchões magnéticos terapêuticos  
**Modelo:** B2C + Sistema de Afiliados Multinível  

### Proposta de Valor
Venda de colchões magnéticos terapêuticos com foco em resolver problemas de saúde (dores, sono, circulação) através de abordagem consultiva, não transacional.

---

## 🛏️ PRODUTOS

### Catálogo
| Modelo | Dimensões | Preço | Público-Alvo |
|--------|-----------|-------|--------------|
| Solteiro | 88x188x28cm | R$ 3.190,00 | Uso individual |
| Padrão | 138x188x28cm | R$ 3.290,00 | Casal (mais vendido) |
| Queen | 158x198x30cm | R$ 3.490,00 | Casal conforto |
| King | 193x203x30cm | R$ 4.890,00 | Casal premium |

### Tecnologias Incluídas (todos os modelos)
1. Sistema Magnético (240 ímãs de 800 Gauss)
2. Infravermelho Longo
3. Energia Bioquântica
4. Vibromassagem (8 motores)
5. Densidade Progressiva
6. Cromoterapia
7. Perfilado High-Tech
8. Tratamento Sanitário

### 🏪 SHOW ROOM (Produtos para Logistas)

**Objetivo:** Permitir que logistas comprem produtos com preços diferenciados para exposição em suas lojas físicas.

**Regras Especiais:**

1. **Acesso Exclusivo:**
   - Apenas afiliados do tipo "Logista" podem visualizar e comprar
   - Produtos não aparecem no catálogo público

2. **Limite de Compra:**
   - 1 unidade de CADA modelo por logista
   - Sem reposição (compra única)
   - Sistema bloqueia compras duplicadas automaticamente

3. **Preços Diferenciados:**
   - Preços especiais para logistas (menores que varejo)
   - Definidos individualmente por produto

4. **Frete Grátis:**
   - Frete grátis para TODOS os produtos Show Room
   - Aplicado automaticamente no checkout

5. **Comissionamento Diferenciado:**
   - 90% → Fábrica (ao invés de 70%)
   - 5% → Renum (gestor)
   - 5% → JB (gestor)
   - 0% → N1/N2/N3 (rede de afiliados NÃO recebe)
   - Total: 10% de comissões (ao invés de 30%)

6. **Controle de Estoque:**
   - Tabela `show_room_purchases` registra todas as compras
   - Constraint UNIQUE impede duplicação
   - Frontend mostra badge "Já adquirido" para produtos comprados

**Exemplo de Cálculo:**

Colchão King Size Show Room - R$ 2.500,00

| Participante | Percentual | Valor |
|--------------|------------|-------|
| Fábrica | 90% | R$ 2.250,00 |
| Renum | 5% | R$ 125,00 |
| JB | 5% | R$ 125,00 |
| **Total Comissões** | **10%** | **R$ 250,00** |

**Diferenças vs Produto Normal:**

| Aspecto | Produto Normal | Show Room |
|---------|----------------|-----------|
| Frete | Calculado | Grátis |
| Comissão Total | 30% | 10% |
| Fábrica | 70% | 90% |
| N1/N2/N3 | Recebem | Não recebem |
| Limite | Ilimitado | 1 por modelo |
| Reposição | Sim | Não |

---

## 💰 SISTEMA DE COMISSÕES

### Estrutura de Split (30% do valor da venda)

**Distribuição Fixa:**
- 70% → Fábrica (Slim Quality) - FIXO
- 30% → Sistema de Comissões - FIXO

**Dentro dos 30%:**
- 15% → Afiliado N1 (vendedor direto)
- 3% → Afiliado N2 (indicado do N1)
- 2% → Afiliado N3 (indicado do N2)
- 5% → Renum (gestor) - FIXO
- 5% → JB (gestor) - FIXO

### Regra de Redistribuição
**Quando não há rede completa, os percentuais não utilizados são redistribuídos para os gestores:**

**Cenário 1: Apenas N1 (sem N2 e N3)**
```
5% disponível (3% + 2%) é dividido:
├─ Renum: 5% (fixo) + 2,5% = 7,5%
└─ JB: 5% (fixo) + 2,5% = 7,5%
```

**Cenário 2: N1 + N2 (sem N3)**
```
2% disponível é dividido:
├─ Renum: 5% (fixo) + 1% = 6%
└─ JB: 5% (fixo) + 1% = 6%
```

**Cenário 3: Rede Completa (N1 + N2 + N3)**
```
Sem redistribuição:
├─ Renum: 5%
└─ JB: 5%
```

### Exemplos Práticos

**Venda de Colchão Padrão (R$ 3.290,00):**

| Cenário | N1 | N2 | N3 | Renum | JB | Total |
|---------|----|----|-------|-------|-----|-------|
| Apenas N1 | R$ 493,50 | - | - | R$ 246,75 | R$ 246,75 | R$ 987,00 |
| N1 + N2 | R$ 493,50 | R$ 98,70 | - | R$ 197,40 | R$ 197,40 | R$ 987,00 |
| Completo | R$ 493,50 | R$ 98,70 | R$ 65,80 | R$ 164,50 | R$ 164,50 | R$ 987,00 |

**Sempre = 30% do valor da venda** ✅

---

## 🎯 ESTRATÉGIA DE VENDAS

### Abordagem Consultiva (não transacional)
- Foco em educação sobre problemas de saúde
- BIA (assistente IA) conduz negociação via WhatsApp/N8N
- Site é educativo, não loja virtual tradicional
- Preço apresentado como "R$ X por dia" (ex: "menos que uma pizza")

### Fluxo de Venda
```
1. Cliente acessa site → Aprende sobre tecnologias
2. Cliente se interessa → Clica "Falar com BIA"
3. BIA qualifica leads → Identifica problemas de saúde
4. BIA recomenda modelo → Personalizado para necessidade
5. BIA negocia condições → PIX ou Cartão (Asaas)
6. Venda confirmada → Split automático de comissões
```

---

## 👥 PROGRAMA DE AFILIADOS

### Objetivo
Escalar vendas através de rede de afiliados multinível (3 níveis).

### Requisitos para Afiliado
- Ter conta no Asaas (gateway de pagamento)
- Fornecer Wallet ID do Asaas
- Cadastrar-se no sistema
- Divulgar link de indicação exclusivo

### Benefícios para Afiliado
- Comissões automáticas (split no Asaas)
- Recebimento imediato na carteira
- Sem necessidade de solicitação de saque
- Dashboard com métricas e rede
- Link de indicação rastreável

---

## 🔄 INTEGRAÇÃO ASAAS

### Gateway de Pagamento
**Asaas** é o gateway oficial para:
- Recebimento de pagamentos (PIX e Cartão)
- Split automático de comissões
- Gestão de Wallet IDs dos afiliados

### Wallet IDs
Cada participante tem uma Wallet ID no Asaas:
- Fábrica: `wal_XXXXX` (fixo)
- Renum: `wal_XXXXX` (fixo)
- JB: `wal_XXXXX` (fixo)
- Afiliados: Cada um tem sua Wallet ID única

### Split Automático
Ao confirmar pagamento, Asaas divide automaticamente:
```javascript
split = [
  { walletId: 'wal_fabrica', valor: venda * 0.70 },
  { walletId: afiliado_n1.walletId, valor: comissao_n1 },
  { walletId: afiliado_n2?.walletId, valor: comissao_n2 },
  { walletId: afiliado_n3?.walletId, valor: comissao_n3 },
  { walletId: 'wal_renum', valor: comissao_renum },
  { walletId: 'wal_jb', valor: comissao_jb }
]
```

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs Principais
- Taxa de conversão (visitantes → vendas)
- Ticket médio
- LTV (Lifetime Value) do cliente
- Taxa de ativação de afiliados
- Profundidade da rede (quantos níveis ativos)
- Comissões pagas vs receita total

### Metas
- 100 afiliados ativos no primeiro ano
- Taxa de conversão > 2%
- Ticket médio: R$ 3.500
- 30% das vendas via afiliados

---

## 🎨 IDENTIDADE VISUAL

### Cores Principais
- Verde Menta (primário)
- Roxo (secundário)
- Branco (backgrounds)
- Cinza claro (neutro)

### Tom de Comunicação
- Consultivo, não vendedor
- Educativo, científico
- Acessível, não técnico demais
- Focado em saúde e bem-estar

---

## 🚫 O QUE NÃO É

- ❌ Não é e-commerce tradicional (não tem "carrinho")
- ❌ Não é venda direta no site (BIA conduz)
- ❌ Não é MLM tradicional (é afiliação transparente)
- ❌ Não é automático (há qualificação humana/IA)

---

## ✅ REGRAS DE NEGÓCIO CRÍTICAS

### SEMPRE:
1. Validar Wallet ID do Asaas antes de cadastrar afiliado
2. Calcular comissões incluindo redistribuição
3. Garantir que split = 100% do valor
4. Manter histórico de comissões (auditoria)
5. Notificar afiliados sobre comissões recebidas
6. Rastrear origem da venda (link de afiliado)

### NUNCA:
1. Permitir cadastro sem Wallet ID válida
2. Processar split sem validar todas as Wallets
3. Permitir comissões manuais (sempre via Asaas)
4. Perder rastreio da árvore genealógica
5. Alterar percentuais sem aprovação
6. Exibir informações sensíveis de outros afiliados

---

## 🔗 INTEGRAÇÕES EXTERNAS

### Obrigatórias
- **Asaas** - Pagamentos e split
- **N8N** - Automação e BIA
- **WhatsApp Business** - Atendimento

### Planejadas
- RD Station - Marketing automation
- Google Analytics - Métricas
- Hotjar - Comportamento do usuário

---

## 📞 CONTATOS

**Gestores:**
- Renum: [a definir]
- JB: [a definir]

**Técnico:**
- Kiro AI + Equipe Backend

---

**Este documento é a FONTE DA VERDADE sobre o negócio Slim Quality.**
**Consulte sempre que houver dúvida sobre regras ou processos.**
