-- Desabilitar RLS temporariamente para corrigir problemas de autenticação
-- Isso permite que o sistema funcione com mock login até implementarmos JWT completo

-- Desabilitar RLS nas tabelas principais
ALTER TABLE public.affiliates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Manter RLS nas tabelas de admin (mais críticas)
-- ALTER TABLE public.admins DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.admin_sessions DISABLE ROW LEVEL SECURITY;

-- Comentário: RLS será reabilitado quando JWT estiver funcionando corretamente;
