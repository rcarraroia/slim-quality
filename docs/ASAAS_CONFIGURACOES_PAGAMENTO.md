# CONFIGURAÇÕES DE PAGAMENTO - ASAAS API

## ⚠️ ATENÇÃO - RESPOSTAS SEMPRE EM PORTUGUES-BR

**Data:** 15/01/2026  
**Documentação:** API Asaas v3  
**Status:** Implementável  

---

## 🎯 FUNCIONALIDADES SOLICITADAS

### 1. ✅ DESCONTO PARA PAGAMENTO À VISTA (PIX)
### 2. ⚠️ REPASSE DE TAXAS DE PARCELAMENTO AO CLIENTE

---

## 💰 1. DESCONTO PARA PAGAMENTO À VISTA (PIX)

### **SOLUÇÃO: Campo `discount` na API**

O Asaas suporta nativamente descontos através do campo `discount` ao criar um pagamento.

### **ESTRUTURA DO CAMPO:**

```json
"discount": {
  "value": 5,              // Valor do desconto (número)
  "dueDateLimitDays": 0,   // Dias antes do vencimento
  "type": "PERCENTAGE"     // Tipo: "PERCENTAGE" ou "FIXED"
}
```

### **TIPOS DE DESCONTO:**

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| `PERCENTAGE` | Desconto percentual | `value: 5` = 5% de desconto |
| `FIXED` | Desconto fixo em reais | `value: 50` = R$ 50,00 de desconto |

### **PARÂMETRO `dueDateLimitDays`:**

| Valor | Significado |
|-------|-------------|
| `0` | Desconto válido até o vencimento |
| `1` | Desconto válido até 1 dia antes do vencimento |
| `2` | Desconto válido até 2 dias antes do vencimento |
| `n` | Desconto válido até n dias antes do vencimento |

---

### **EXEMPLO PRÁTICO: 5% de desconto no PIX**

#### **Cenário:**
- Produto: Colchão Padrão
- Valor: R$ 3.290,00
- Desconto PIX: 5%
- Valor final: R$ 3.125,50

#### **Request para API Asaas:**

```json
POST /v3/payments
{
  "customer": "cus_G7Dvo4iphUNk",
  "billingType": "PIX",
  "value": 3290.00,
  "dueDate": "2026-01-20",
  "description": "Colchão Padrão - Pagamento à vista com 5% de desconto",
  "discount": {
    "value": 5,
    "dueDateLimitDays": 0,
    "type": "PERCENTAGE"
  }
}
```

#### **Response:**

```json
{
  "id": "pay_080225913252",
  "value": 3290.00,
  "netValue": 3125.50,  // Valor com desconto aplicado
  "discount": {
    "value": 5,
    "dueDateLimitDays": 0,
    "type": "PERCENTAGE"
  },
  "status": "PENDING",
  "pixQrCodeId": "qr_xxxxx"
}
```

---

### **IMPLEMENTAÇÃO NO CÓDIGO:**

#### **Backend (Python):**

```python
# agent/src/services/asaas/payment_service.py

async def create_payment_with_discount(
    customer_id: str,
    value: float,
    billing_type: str,
    discount_percentage: float = 0
) -> dict:
    """
    Cria pagamento com desconto opcional
    
    Args:
        customer_id: ID do cliente no Asaas
        value: Valor do produto
        billing_type: Tipo de cobrança (PIX, CREDIT_CARD, BOLETO)
        discount_percentage: Percentual de desconto (0-100)
    
    Returns:
        Dados do pagamento criado
    """
    payload = {
        "customer": customer_id,
        "billingType": billing_type,
        "value": value,
        "dueDate": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "description": f"Colchão Slim Quality"
    }
    
    # Adicionar desconto se for PIX e houver desconto configurado
    if billing_type == "PIX" and discount_percentage > 0:
        payload["discount"] = {
            "value": discount_percentage,
            "dueDateLimitDays": 0,
            "type": "PERCENTAGE"
        }
        payload["description"] += f" - {discount_percentage}% de desconto no PIX"
    
    response = await asaas_client.post("/v3/payments", json=payload)
    return response.json()
```

#### **Frontend (TypeScript):**

```typescript
// src/services/payment.service.ts

interface PaymentDiscount {
  value: number;
  dueDateLimitDays: number;
  type: 'PERCENTAGE' | 'FIXED';
}

async function createPayment(
  customerId: string,
  value: number,
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO',
  discountPercentage?: number
) {
  const payload: any = {
    customer: customerId,
    billingType,
    value,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: 'Colchão Slim Quality'
  };
  
  // Adicionar desconto se for PIX
  if (billingType === 'PIX' && discountPercentage && discountPercentage > 0) {
    payload.discount = {
      value: discountPercentage,
      dueDateLimitDays: 0,
      type: 'PERCENTAGE'
    };
    payload.description += ` - ${discountPercentage}% de desconto no PIX`;
  }
  
  return apiService.post('/api/payments', payload);
}
```

---

## 💳 2. REPASSE DE TAXAS DE PARCELAMENTO AO CLIENTE

### **PROBLEMA IDENTIFICADO:**

O Asaas **NÃO possui um campo nativo** para repassar automaticamente as taxas de parcelamento ao cliente. As taxas são sempre descontadas do valor que você recebe.

### **TAXAS DO ASAAS (Referência):**

| Forma de Pagamento | Taxa |
|-------------------|------|
| PIX | R$ 0,99 por transação |
| Boleto | R$ 3,49 por boleto |
| Cartão à vista | 2,49% + R$ 0,49 |
| Cartão parcelado 2-6x | 3,99% + R$ 0,49 |
| Cartão parcelado 7-12x | 4,99% + R$ 0,49 |

---

### **SOLUÇÃO 1: SIMULAÇÃO DE PAGAMENTO** ⭐⭐ (RECOMENDADO)

Use o endpoint `/v3/payments/simulate` para calcular automaticamente as taxas e ajustar o valor.

#### **Como funciona:**

1. Cliente escolhe forma de pagamento e parcelas
2. Sistema chama `/v3/payments/simulate` com valor base
3. Asaas retorna valor líquido (o que você recebe)
4. Sistema calcula valor bruto necessário para receber o valor desejado
5. Cria cobrança com valor ajustado

#### **Endpoint de Simulação:**

```http
POST /v3/payments/simulate
{
  "value": 3290.00,
  "installmentCount": 12,
  "billingTypes": ["CREDIT_CARD", "PIX", "BOLETO"]
}
```

#### **Response:**

```json
{
  "value": 3290.00,
  "creditCard": {
    "netValue": 3125.89,        // O que você recebe
    "feePercentage": 4.99,      // Taxa percentual
    "operationFee": 0.49,       // Taxa fixa
    "installment": {
      "paymentNetValue": 260.49, // Valor líquido por parcela
      "paymentValue": 274.17     // Valor bruto por parcela
    }
  },
  "pix": {
    "netValue": 3289.01,        // O que você recebe
    "feeValue": 0.99            // Taxa fixa
  },
  "bankSlip": {
    "netValue": 3286.51,        // O que você recebe
    "feeValue": 3.49            // Taxa fixa
  }
}
```

---

### **IMPLEMENTAÇÃO: Cálculo Reverso de Taxas**

#### **Backend (Python):**

```python
# agent/src/services/asaas/fee_calculator.py

import structlog
from typing import Dict, Optional

logger = structlog.get_logger(__name__)


async def simulate_payment_fees(
    value: float,
    installment_count: int = 1
) -> Dict[str, any]:
    """
    Simula taxas do Asaas para diferentes formas de pagamento
    
    Args:
        value: Valor base do produto
        installment_count: Número de parcelas (1-12)
    
    Returns:
        Dicionário com simulação de taxas
    """
    payload = {
        "value": value,
        "installmentCount": installment_count,
        "billingTypes": ["CREDIT_CARD", "PIX", "BOLETO"]
    }
    
    response = await asaas_client.post("/v3/payments/simulate", json=payload)
    return response.json()


async def calculate_value_with_fees(
    desired_net_value: float,
    billing_type: str,
    installment_count: int = 1
) -> Dict[str, float]:
    """
    Calcula valor bruto necessário para receber valor líquido desejado
    
    Estratégia:
    1. Simula com valor desejado
    2. Calcula diferença entre bruto e líquido
    3. Ajusta valor bruto para compensar taxas
    
    Args:
        desired_net_value: Valor líquido que você quer receber
        billing_type: Tipo de cobrança (PIX, CREDIT_CARD, BOLETO)
        installment_count: Número de parcelas
    
    Returns:
        {
            "gross_value": valor bruto a cobrar,
            "net_value": valor líquido que você receberá,
            "fee_value": valor da taxa,
            "fee_percentage": percentual da taxa
        }
    """
    # Simular com valor desejado
    simulation = await simulate_payment_fees(desired_net_value, installment_count)
    
    # Extrair dados da simulação
    if billing_type == "PIX":
        net_value = simulation["pix"]["netValue"]
        fee_value = simulation["pix"]["feeValue"]
    elif billing_type == "BOLETO":
        net_value = simulation["bankSlip"]["netValue"]
        fee_value = simulation["bankSlip"]["feeValue"]
    else:  # CREDIT_CARD
        net_value = simulation["creditCard"]["netValue"]
        fee_percentage = simulation["creditCard"]["feePercentage"]
        operation_fee = simulation["creditCard"]["operationFee"]
        fee_value = (desired_net_value * fee_percentage / 100) + operation_fee
    
    # Calcular valor bruto necessário
    # Formula: gross_value = desired_net_value + fee_value
    # Mas como fee_value depende de gross_value, precisamos iterar
    
    gross_value = desired_net_value
    for _ in range(5):  # Máximo 5 iterações
        simulation = await simulate_payment_fees(gross_value, installment_count)
        
        if billing_type == "PIX":
            current_net = simulation["pix"]["netValue"]
        elif billing_type == "BOLETO":
            current_net = simulation["bankSlip"]["netValue"]
        else:
            current_net = simulation["creditCard"]["netValue"]
        
        # Se chegou no valor desejado (com margem de R$ 0,10)
        if abs(current_net - desired_net_value) < 0.10:
            break
        
        # Ajustar valor bruto
        difference = desired_net_value - current_net
        gross_value += difference
    
    logger.info(
        "Cálculo de taxas concluído",
        desired_net=desired_net_value,
        gross_value=gross_value,
        fee_value=gross_value - current_net
    )
    
    return {
        "gross_value": round(gross_value, 2),
        "net_value": round(current_net, 2),
        "fee_value": round(gross_value - current_net, 2),
        "fee_percentage": round((gross_value - current_net) / gross_value * 100, 2)
    }


async def create_payment_with_fee_passthrough(
    customer_id: str,
    desired_net_value: float,
    billing_type: str,
    installment_count: int = 1
) -> dict:
    """
    Cria pagamento repassando taxas ao cliente
    
    Args:
        customer_id: ID do cliente no Asaas
        desired_net_value: Valor líquido que você quer receber
        billing_type: Tipo de cobrança
        installment_count: Número de parcelas
    
    Returns:
        Dados do pagamento criado
    """
    # Calcular valor bruto com taxas
    calculation = await calculate_value_with_fees(
        desired_net_value,
        billing_type,
        installment_count
    )
    
    # Criar pagamento com valor ajustado
    payload = {
        "customer": customer_id,
        "billingType": billing_type,
        "value": calculation["gross_value"],
        "dueDate": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "description": f"Colchão Slim Quality - {installment_count}x (taxas incluídas)"
    }
    
    if installment_count > 1:
        payload["installmentCount"] = installment_count
    
    response = await asaas_client.post("/v3/payments", json=payload)
    
    logger.info(
        "Pagamento criado com repasse de taxas",
        payment_id=response.json()["id"],
        gross_value=calculation["gross_value"],
        net_value=calculation["net_value"],
        fee_value=calculation["fee_value"]
    )
    
    return response.json()
```

---

### **SOLUÇÃO 2: TABELA DE TAXAS HARDCODED** ⭐ (ALTERNATIVA)

Se preferir não fazer chamadas de simulação, pode usar uma tabela de taxas:

```python
# agent/src/services/asaas/fee_table.py

ASAAS_FEES = {
    "PIX": {
        "fixed": 0.99,
        "percentage": 0
    },
    "BOLETO": {
        "fixed": 3.49,
        "percentage": 0
    },
    "CREDIT_CARD": {
        1: {"fixed": 0.49, "percentage": 2.49},
        2: {"fixed": 0.49, "percentage": 3.99},
        3: {"fixed": 0.49, "percentage": 3.99},
        4: {"fixed": 0.49, "percentage": 3.99},
        5: {"fixed": 0.49, "percentage": 3.99},
        6: {"fixed": 0.49, "percentage": 3.99},
        7: {"fixed": 0.49, "percentage": 4.99},
        8: {"fixed": 0.49, "percentage": 4.99},
        9: {"fixed": 0.49, "percentage": 4.99},
        10: {"fixed": 0.49, "percentage": 4.99},
        11: {"fixed": 0.49, "percentage": 4.99},
        12: {"fixed": 0.49, "percentage": 4.99},
    }
}


def calculate_gross_value_from_table(
    net_value: float,
    billing_type: str,
    installments: int = 1
) -> float:
    """
    Calcula valor bruto usando tabela de taxas
    
    Formula:
    - PIX/Boleto: gross = net + taxa_fixa
    - Cartão: gross = (net + taxa_fixa) / (1 - taxa_percentual/100)
    """
    if billing_type == "PIX":
        return net_value + ASAAS_FEES["PIX"]["fixed"]
    
    elif billing_type == "BOLETO":
        return net_value + ASAAS_FEES["BOLETO"]["fixed"]
    
    else:  # CREDIT_CARD
        fees = ASAAS_FEES["CREDIT_CARD"][installments]
        gross = (net_value + fees["fixed"]) / (1 - fees["percentage"] / 100)
        return round(gross, 2)
```

**⚠️ ATENÇÃO:** Taxas podem mudar! Sempre consulte a documentação oficial do Asaas.

---

## 📊 COMPARAÇÃO DAS SOLUÇÕES

| Solução | Vantagens | Desvantagens | Recomendação |
|---------|-----------|--------------|--------------|
| **Simulação API** | ✅ Taxas sempre atualizadas<br>✅ Precisão 100%<br>✅ Sem manutenção | ❌ Chamada extra à API<br>❌ Latência adicional | ⭐⭐ MELHOR |
| **Tabela Hardcoded** | ✅ Rápido<br>✅ Sem chamadas extras<br>✅ Funciona offline | ❌ Precisa atualizar manualmente<br>❌ Pode ficar desatualizado | ⭐ ALTERNATIVA |

---

## 🎯 RECOMENDAÇÃO FINAL

### **PARA DESCONTO PIX:**
✅ Usar campo `discount` nativo do Asaas

### **PARA REPASSE DE TAXAS:**
✅ Usar endpoint `/v3/payments/simulate` + cálculo reverso

---

## 📝 PRÓXIMOS PASSOS

1. **Implementar serviço de cálculo de taxas** (`fee_calculator.py`)
2. **Criar endpoint no backend** (`POST /api/payments/calculate-fees`)
3. **Integrar no frontend** (mostrar valores com/sem taxas)
4. **Adicionar configuração no painel admin** (% desconto PIX, repassar taxas sim/não)
5. **Testar em sandbox do Asaas**
6. **Documentar para equipe**

---

**Documento criado:** 15/01/2026  
**Autor:** Kiro AI  
**Status:** Pronto para implementação
