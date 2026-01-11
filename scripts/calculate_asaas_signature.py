#!/usr/bin/env python3
"""
Script para calcular assinatura HMAC SHA256 do webhook Asaas
Uso: python calculate_asaas_signature.py
"""

import hmac
import hashlib
import json

# Token do webhook (produção)
WEBHOOK_TOKEN = "1013e1fa-12d3-4b89-bc23-704068796447"

# Payload de teste
payload = {
    "event": "PAYMENT_CONFIRMED",
    "payment": {
        "id": "pay_test_001",
        "customer": "cus_000005735957",
        "value": 3290.00,
        "externalReference": "5eea0bbb-2354-422d-b27f-b6b58a60f604",
        "status": "CONFIRMED",
        "paymentDate": "2026-01-11"
    }
}

# Converter para JSON string (sem espaços extras)
payload_str = json.dumps(payload, separators=(',', ':'))

# Calcular HMAC SHA256
signature = hmac.new(
    WEBHOOK_TOKEN.encode('utf-8'),
    payload_str.encode('utf-8'),
    hashlib.sha256
).hexdigest()

print(f"Payload: {payload_str}")
print(f"\nAssinatura HMAC SHA256: {signature}")
print(f"\nHeader para Postman:")
print(f"X-Asaas-Signature: {signature}")
