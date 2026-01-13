import hmac
import hashlib
import json
import requests
import time

def test_health():
    print("Testing Health Endpoint...")
    try:
        response = requests.get("http://localhost:8000/api/webhooks/asaas/health")
        print(f"Status: {response.status_code}")
        print(f"Body: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

def test_webhook_signature():
    print("\nTesting Webhook Signature...")
    url = "http://localhost:8000/api/webhooks/asaas"
    secret = "test_token"
    
    payload = {
        "event": "PAYMENT_CONFIRMED",
        "payment": {
            "id": "pay_123456789",
            "value": 100.0,
            "externalReference": "order_test_123"
        }
    }
    
    body = json.dumps(payload)
    signature = hmac.new(
        secret.encode('utf-8'),
        body.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        "x-asaas-signature": signature,
        "Content-Type": "application/json"
    }
    
    # Simular ambiente de produção para forçar validação
    import os
    os.environ["ASAAS_WEBHOOK_TOKEN"] = secret
    os.environ["ENVIRONMENT"] = "production"
    
    try:
        response = requests.post(url, data=body, headers=headers)
        print(f"Status: {response.status_code}")
        print(f"Body: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_health()
    # Note: test_webhook_signature requires the server to be running and env vars set
    # test_webhook_signature()
