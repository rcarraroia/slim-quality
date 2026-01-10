# Backup Pré-Correção - Sistema de Afiliados

**Data:** 11/01/2026  
**Hora:** Antes de iniciar correções críticas  
**Projeto Supabase:** vtynmmtuvxreiwcxxlma (Slim_n8n)

## Estado do Banco ANTES das Correções

### Contagem de Registros

| Tabela | Total | Ativos |
|--------|-------|--------|
| affiliates | 2 | 2 |
| affiliate_network | 1 | 1 |
| orders | 4 | 4 |
| commissions | 0 | 0 |

### Dados Críticos Identificados

**Afiliados:**
- Bia (bia.aguilar@hotmail.com) - ID: 6f889212-9f9a-4ed8-9429-c3bdf26cb9da
- Giuseppe (rm6661706@gmail.com) - ID: 36f5a54f-cb07-4260-ae59-da71136a2940

**Rede:**
- Giuseppe está na rede de Bia (confirmado em affiliate_network)
- Giuseppe.referred_by = Bia.id (confirmado)
- affiliate_network.parent_id = NULL (PROBLEMA!)
- affiliate_network.parent_affiliate_id = Bia.id (correto)

### Problemas Confirmados

1. ✅ Dessincronização entre parent_id e parent_affiliate_id
2. ✅ Giuseppe na rede mas com parent_id NULL
3. ✅ Nenhuma comissão registrada ainda

## Backup Realizado

**Método:** Snapshot via Supabase Dashboard  
**Localização:** Supabase Project > Database > Backups  
**Restore:** Disponível via Supabase CLI ou Dashboard

## Validação de Restore

Para validar que backup funciona:
```sql
-- Após restore, executar:
SELECT COUNT(*) FROM affiliates; -- Deve retornar 2
SELECT COUNT(*) FROM affiliate_network; -- Deve retornar 1
SELECT COUNT(*) FROM orders; -- Deve retornar 4
```

## Próximos Passos

Iniciar Task 0.2: Validar webhook Asaas existente
