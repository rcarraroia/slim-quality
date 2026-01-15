# SIMULAÇÃO DE TAXAS ASAAS - PARCELAMENTO COM ANTECIPAÇÃO

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

**Data:** 15/01/2026  
**Empresa:** Slim Quality  
**Gateway:** Asaas  
**Status:** Simulação Real  

---

## 🎯 CENÁRIO DA SIMULAÇÃO

### **DADOS DA VENDA:**
- **Produto:** Colchão King Size
- **Valor da venda:** R$ 5.899,00
- **Forma de pagamento:** Cartão de crédito
- **Parcelas:** 12x
- **Prazo de recebimento:** 2 dias (com antecipação)

### **TAXAS ASAAS APLICÁVEIS:**

#### **1. Taxa de Parcelamento (7-12 parcelas):**
- **Percentual:** 2,99%
- **Taxa fixa:** R$ 0,49 por transação

#### **2. Taxa de Antecipação:**
- **Esporádica:** 1,7% ao mês
- **Automática:** 1,6% ao mês

---

## 🧮 CÁLCULO DETALHADO

### **CENÁRIO 1: ANTECIPAÇÃO ESPORÁDICA (1,7% ao mês)**

#### **Etapa 1: Aplicar Taxa de Parcelamento**

```
Valor bruto da venda:           R$ 5.899,00

Taxa percentual (2,99%):        R$   176,38
Taxa fixa:                      R$     0,49
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total taxa de parcelamento:     R$   176,87

Valor após taxa de parcelamento: R$ 5.722,13
```

#### **Etapa 2: Calcular Prazo Médio de Recebimento**

Sem antecipação, as parcelas seriam recebidas em:

| Parcela | Dias para recebimento |
|---------|----------------------|
| 1ª | 30 dias |
| 2ª | 60 dias |
| 3ª | 90 dias |
| 4ª | 120 dias |
| 5ª | 150 dias |
| 6ª | 180 dias |
| 7ª | 210 dias |
| 8ª | 240 dias |
| 9ª | 270 dias |
| 10ª | 300 dias |
| 11ª | 330 dias |
| 12ª | 360 dias |

```
Soma total: 2.340 dias
Prazo médio: 2.340 ÷ 12 = 195 dias
Prazo médio em meses: 195 ÷ 30 = 6,5 meses
```

#### **Etapa 3: Aplicar Taxa de Antecipação**

```
Valor a antecipar:              R$ 5.722,13

Taxa de antecipação:
1,7% ao mês × 6,5 meses = 11,05%

Valor da taxa:                  R$   632,29
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Valor líquido após antecipação: R$ 5.089,84
```

#### **📊 RESUMO FINAL - CENÁRIO 1:**

```
┌─────────────────────────────────────────────────┐
│  ANTECIPAÇÃO ESPORÁDICA (1,7% ao mês)          │
├─────────────────────────────────────────────────┤
│  Valor da venda:              R$ 5.899,00      │
│  (-) Taxa parcelamento:       R$   176,87      │
│  (-) Taxa antecipação:        R$   632,29      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  VALOR LÍQUIDO RECEBIDO:      R$ 5.089,84      │
│                                                 │
│  TOTAL DE TAXAS:              R$   809,16      │
│  PERCENTUAL DE TAXAS:         13,72%           │
└─────────────────────────────────────────────────┘
```

**Cliente paga:** 12x de R$ 491,58  
**Você recebe em 2 dias:** R$ 5.089,84  
**Perda com taxas:** R$ 809,16 (13,72%)

---

### **CENÁRIO 2: ANTECIPAÇÃO AUTOMÁTICA (1,6% ao mês)**

#### **Etapa 1: Aplicar Taxa de Parcelamento**

```
Valor bruto da venda:           R$ 5.899,00

Taxa percentual (2,99%):        R$   176,38
Taxa fixa:                      R$     0,49
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total taxa de parcelamento:     R$   176,87

Valor após taxa de parcelamento: R$ 5.722,13
```

#### **Etapa 2: Prazo Médio de Recebimento**

```
Prazo médio: 6,5 meses (mesmo cálculo do Cenário 1)
```

#### **Etapa 3: Aplicar Taxa de Antecipação**

```
Valor a antecipar:              R$ 5.722,13

Taxa de antecipação:
1,6% ao mês × 6,5 meses = 10,4%

Valor da taxa:                  R$   595,10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Valor líquido após antecipação: R$ 5.127,03
```

#### **📊 RESUMO FINAL - CENÁRIO 2:**

```
┌─────────────────────────────────────────────────┐
│  ANTECIPAÇÃO AUTOMÁTICA (1,6% ao mês)          │
├─────────────────────────────────────────────────┤
│  Valor da venda:              R$ 5.899,00      │
│  (-) Taxa parcelamento:       R$   176,87      │
│  (-) Taxa antecipação:        R$   595,10      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  VALOR LÍQUIDO RECEBIDO:      R$ 5.127,03      │
│                                                 │
│  TOTAL DE TAXAS:              R$   771,97      │
│  PERCENTUAL DE TAXAS:         13,09%           │
└─────────────────────────────────────────────────┘
```

**Cliente paga:** 12x de R$ 491,58  
**Você recebe em 2 dias:** R$ 5.127,03  
**Perda com taxas:** R$ 771,97 (13,09%)

---

## 📊 COMPARAÇÃO LADO A LADO

| Item | Esporádica (1,7%) | Automática (1,6%) | Diferença |
|------|-------------------|-------------------|-----------|
| **Valor da venda** | R$ 5.899,00 | R$ 5.899,00 | - |
| **Taxa parcelamento** | R$ 176,87 | R$ 176,87 | - |
| **Taxa antecipação** | R$ 632,29 | R$ 595,10 | ✅ **R$ 37,19** |
| **Total de taxas** | R$ 809,16 | R$ 771,97 | ✅ **R$ 37,19** |
| **Valor líquido** | R$ 5.089,84 | R$ 5.127,03 | ✅ **R$ 37,19** |
| **% de taxas** | 13,72% | 13,09% | ✅ **0,63%** |

---

## 💰 ECONOMIA COM ANTECIPAÇÃO AUTOMÁTICA

### **Por Venda:**
```
Economia: R$ 37,19
Percentual: 0,63% a mais no bolso
```

### **Projeção Mensal (50 vendas):**
```
Economia mensal: R$ 1.859,50
Economia anual: R$ 22.314,00
```

### **Projeção Mensal (100 vendas):**
```
Economia mensal: R$ 3.719,00
Economia anual: R$ 44.628,00
```

---

## 🎯 REPASSE DE TAXAS AO CLIENTE

Se você quiser **repassar as taxas ao cliente** e receber os **R$ 5.899,00 líquidos**:

### **CENÁRIO 1: Antecipação Esporádica (1,7%)**

```
Valor a cobrar do cliente:      R$ 6.844,83
Cliente paga 12x de:            R$   570,40

Você recebe líquido:            R$ 5.899,00
Total de taxas (pago pelo cliente): R$ 945,83
```

**Cálculo:**
```
Valor desejado líquido: R$ 5.899,00
Taxa total: 13,72%

Valor bruto = 5.899,00 ÷ (1 - 0,1372)
Valor bruto = 5.899,00 ÷ 0,8628
Valor bruto = R$ 6.844,83
```

---

### **CENÁRIO 2: Antecipação Automática (1,6%)**

```
Valor a cobrar do cliente:      R$ 6.800,95
Cliente paga 12x de:            R$   566,75

Você recebe líquido:            R$ 5.899,00
Total de taxas (pago pelo cliente): R$ 901,95
```

**Cálculo:**
```
Valor desejado líquido: R$ 5.899,00
Taxa total: 13,09%

Valor bruto = 5.899,00 ÷ (1 - 0,1309)
Valor bruto = 5.899,00 ÷ 0,8691
Valor bruto = R$ 6.800,95
```

---

### **COMPARAÇÃO COM REPASSE:**

| Item | Esporádica | Automática | Diferença |
|------|------------|------------|-----------|
| **Valor cobrado** | R$ 6.844,83 | R$ 6.800,95 | R$ 43,88 |
| **Parcela (12x)** | R$ 570,40 | R$ 566,75 | R$ 3,66 |
| **Você recebe** | R$ 5.899,00 | R$ 5.899,00 | - |
| **Taxa paga pelo cliente** | R$ 945,83 | R$ 901,95 | R$ 43,88 |

**Diferença para o cliente:** R$ 43,88 no total (R$ 3,66 por parcela)

---

## 📈 ANÁLISE DE IMPACTO

### **SEM REPASSE DE TAXAS:**

| Cenário | Você recebe | Margem perdida |
|---------|-------------|----------------|
| Esporádica | R$ 5.089,84 | 13,72% |
| Automática | R$ 5.127,03 | 13,09% |

**Impacto:** Você perde entre 13% e 14% do valor da venda em taxas.

---

### **COM REPASSE DE TAXAS:**

| Cenário | Cliente paga | Você recebe | Margem preservada |
|---------|--------------|-------------|-------------------|
| Esporádica | R$ 6.844,83 | R$ 5.899,00 | 100% |
| Automática | R$ 6.800,95 | R$ 5.899,00 | 100% |

**Impacto:** Você preserva 100% da margem, cliente paga as taxas.

---

## 💡 RECOMENDAÇÕES ESTRATÉGICAS

### **1. ATIVAR ANTECIPAÇÃO AUTOMÁTICA** ✅

**Motivos:**
- ✅ Economia de R$ 37,19 por venda
- ✅ Sem esforço adicional (automático)
- ✅ Fluxo de caixa previsível
- ✅ Redução de 0,63% nas taxas

**Economia anual estimada (100 vendas/mês):**
```
R$ 37,19 × 100 vendas × 12 meses = R$ 44.628,00
```

---

### **2. CONSIDERAR REPASSE DE TAXAS** ⚠️

**Vantagens:**
- ✅ Preserva 100% da margem
- ✅ Você recebe o valor cheio do produto
- ✅ Transparência com o cliente

**Desvantagens:**
- ❌ Preço final mais alto
- ❌ Pode impactar conversão
- ❌ Concorrência pode não repassar

**Estratégia sugerida:**
- Oferecer desconto no PIX (5%) para compensar
- Ser transparente: "Parcelamento em até 12x com taxas incluídas"
- Destacar que PIX tem desconto

---

### **3. ESTRATÉGIA DE PRECIFICAÇÃO**

#### **OPÇÃO A: Absorver Taxas (Preço Único)**
```
Preço: R$ 5.899,00 (12x de R$ 491,58)
Você recebe: R$ 5.127,03 (com antecipação automática)
Margem: Reduzida em 13,09%
```

**Quando usar:**
- Mercado muito competitivo
- Preço é fator decisivo
- Margem do produto permite

---

#### **OPÇÃO B: Repassar Taxas (Preço Variável)**
```
À vista (PIX com 5% desconto): R$ 5.604,05
Parcelado (12x): R$ 6.800,95 (12x de R$ 566,75)
Você recebe: R$ 5.899,00 (sempre)
Margem: Preservada em 100%
```

**Quando usar:**
- Produto premium/diferenciado
- Cliente valoriza parcelamento
- Margem apertada

---

#### **OPÇÃO C: Híbrida (Recomendada)** ⭐
```
À vista (PIX com 5% desconto): R$ 5.604,05
Parcelado até 6x: R$ 5.899,00 (sem juros, você absorve)
Parcelado 7-12x: R$ 6.800,95 (com juros, cliente paga)
```

**Vantagens:**
- ✅ Incentiva PIX (melhor para você)
- ✅ Oferece parcelamento sem juros (atrativo)
- ✅ Repassa taxas apenas em parcelamentos longos
- ✅ Equilibra conversão e margem

---

## 📋 FÓRMULAS PARA IMPLEMENTAÇÃO

### **1. Calcular Taxa de Parcelamento:**
```python
def calcular_taxa_parcelamento(valor: float) -> float:
    taxa_percentual = valor * 0.0299  # 2,99%
    taxa_fixa = 0.49
    return taxa_percentual + taxa_fixa
```

### **2. Calcular Prazo Médio:**
```python
def calcular_prazo_medio(num_parcelas: int) -> float:
    soma_dias = sum(30 * i for i in range(1, num_parcelas + 1))
    prazo_medio_dias = soma_dias / num_parcelas
    prazo_medio_meses = prazo_medio_dias / 30
    return prazo_medio_meses
```

### **3. Calcular Taxa de Antecipação:**
```python
def calcular_taxa_antecipacao(
    valor: float,
    num_parcelas: int,
    taxa_mensal: float  # 0.017 ou 0.016
) -> float:
    prazo_medio = calcular_prazo_medio(num_parcelas)
    taxa_total = taxa_mensal * prazo_medio
    return valor * taxa_total
```

### **4. Calcular Valor Líquido:**
```python
def calcular_valor_liquido(
    valor_venda: float,
    num_parcelas: int,
    taxa_antecipacao_mensal: float
) -> dict:
    # Taxa de parcelamento
    taxa_parcelamento = calcular_taxa_parcelamento(valor_venda)
    valor_apos_parcelamento = valor_venda - taxa_parcelamento
    
    # Taxa de antecipação
    taxa_antecipacao = calcular_taxa_antecipacao(
        valor_apos_parcelamento,
        num_parcelas,
        taxa_antecipacao_mensal
    )
    
    # Valor líquido
    valor_liquido = valor_apos_parcelamento - taxa_antecipacao
    
    return {
        "valor_venda": valor_venda,
        "taxa_parcelamento": taxa_parcelamento,
        "taxa_antecipacao": taxa_antecipacao,
        "total_taxas": taxa_parcelamento + taxa_antecipacao,
        "valor_liquido": valor_liquido,
        "percentual_taxas": ((taxa_parcelamento + taxa_antecipacao) / valor_venda) * 100
    }
```

### **5. Calcular Valor com Repasse:**
```python
def calcular_valor_com_repasse(
    valor_liquido_desejado: float,
    num_parcelas: int,
    taxa_antecipacao_mensal: float
) -> float:
    # Calcular percentual total de taxas
    taxa_parcelamento_percentual = 0.0299
    taxa_fixa = 0.49
    
    prazo_medio = calcular_prazo_medio(num_parcelas)
    taxa_antecipacao_percentual = taxa_antecipacao_mensal * prazo_medio
    
    # Cálculo iterativo (3 iterações são suficientes)
    valor_bruto = valor_liquido_desejado
    for _ in range(3):
        taxa_parcel = (valor_bruto * taxa_parcelamento_percentual) + taxa_fixa
        valor_apos_parcel = valor_bruto - taxa_parcel
        taxa_antec = valor_apos_parcel * taxa_antecipacao_percentual
        valor_liquido = valor_apos_parcel - taxa_antec
        
        diferenca = valor_liquido_desejado - valor_liquido
        valor_bruto += diferenca
    
    return round(valor_bruto, 2)
```

---

## 🎯 CONCLUSÃO E DECISÃO

### **RESUMO EXECUTIVO:**

| Métrica | Sem Repasse (Automática) | Com Repasse (Automática) |
|---------|--------------------------|--------------------------|
| **Cliente paga** | R$ 5.899,00 | R$ 6.800,95 |
| **Você recebe** | R$ 5.127,03 | R$ 5.899,00 |
| **Margem preservada** | 86,91% | 100% |
| **Diferença no preço** | - | +15,29% |

### **DECISÃO RECOMENDADA:**

✅ **Ativar antecipação automática** (economia garantida)  
✅ **Implementar estratégia híbrida de precificação**  
✅ **Oferecer desconto de 5% no PIX** (incentivo ao melhor método)  
✅ **Ser transparente sobre taxas de parcelamento**  

---

## 📞 PRÓXIMOS PASSOS

1. ✅ Ativar antecipação automática no painel Asaas
2. ✅ Definir estratégia de precificação (A, B ou C)
3. ✅ Implementar calculadora de taxas no sistema
4. ✅ Atualizar tabela de preços no site
5. ✅ Treinar equipe sobre nova política
6. ✅ Comunicar mudanças aos clientes

---

**Documento criado:** 15/01/2026  
**Autor:** Kiro AI  
**Revisão:** Renato Carraroia  
**Status:** Aprovado para implementação
