#!/bin/bash
# Script de Diagnóstico do Banco de Dados - Slim Quality
# Execute este script para diagnosticar o problema de criação de usuários

set -e

echo "🔍 DIAGNÓSTICO DO BANCO DE DADOS - SLIM QUALITY"
echo "============================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para printar com cor
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo "ℹ️  $1"
}

# 1. Verificar Supabase CLI
echo "1. Verificando Supabase CLI..."
if command -v supabase &> /dev/null; then
    VERSION=$(supabase --version)
    print_success "Supabase CLI instalado: $VERSION"
else
    print_error "Supabase CLI não instalado!"
    echo "Instale com: scoop install supabase"
    exit 1
fi
echo ""

# 2. Verificar link ao projeto
echo "2. Verificando link ao projeto..."
if supabase projects list | grep -q "vtynmmtuvxreiwcxxlma"; then
    print_success "Projeto linkado corretamente"
else
    print_warning "Projeto não linkado. Linkando agora..."
    supabase link --project-ref vtynmmtuvxreiwcxxlma
fi
echo ""

# 3. Listar Edge Functions deployadas
echo "3. Verificando Edge Functions deployadas..."
echo "Edge Functions encontradas:"
supabase functions list
echo ""

if supabase functions list | grep -q "admin-create-user"; then
    print_success "Edge Function 'admin-create-user' está deployada"
else
    print_error "Edge Function 'admin-create-user' NÃO está deployada!"
    echo "Execute: supabase functions deploy admin-create-user"
fi
echo ""

# 4. Verificar secrets
echo "4. Verificando secrets configurados..."
echo "Secrets configurados:"
supabase secrets list
echo ""

if supabase secrets list | grep -q "SUPABASE_URL"; then
    print_success "SUPABASE_URL configurado"
else
    print_error "SUPABASE_URL NÃO configurado!"
fi

if supabase secrets list | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    print_success "SUPABASE_SERVICE_ROLE_KEY configurado"
else
    print_error "SUPABASE_SERVICE_ROLE_KEY NÃO configurado!"
fi
echo ""

# 5. Verificar schema da tabela profiles
echo "5. Verificando schema da tabela profiles..."
supabase db execute "
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_name = 'profiles'
  ORDER BY ordinal_position;
" | tee /tmp/profiles_schema.txt

if grep -q "role" /tmp/profiles_schema.txt; then
    print_success "Campo 'role' existe na tabela profiles"
else
    print_error "Campo 'role' NÃO existe! Migration 20260103005225 não foi aplicada"
fi

if grep -q "status" /tmp/profiles_schema.txt; then
    print_success "Campo 'status' existe na tabela profiles"
else
    print_error "Campo 'status' NÃO existe! Migration 20260103005225 não foi aplicada"
fi
echo ""

# 6. Verificar políticas RLS
echo "6. Verificando políticas RLS..."
supabase db execute "
  SELECT policyname, cmd
  FROM pg_policies
  WHERE tablename = 'profiles'
  ORDER BY policyname;
" | tee /tmp/rls_policies.txt

POLICY_COUNT=$(grep -c "view own profile" /tmp/rls_policies.txt || true)
if [ "$POLICY_COUNT" -gt 1 ]; then
    print_warning "Políticas RLS duplicadas detectadas!"
    echo "Execute a migration fix_duplicate_rls_policies.sql"
else
    print_success "Políticas RLS parecem corretas"
fi
echo ""

# 7. Contar usuários
echo "7. Contando usuários no banco..."
USER_COUNT=$(supabase db execute "SELECT COUNT(*) as total FROM profiles;" | grep -o '[0-9]*' | head -1)
print_info "Total de usuários: $USER_COUNT"

SUPER_ADMIN_COUNT=$(supabase db execute "SELECT COUNT(*) FROM profiles WHERE role = 'super_admin';" | grep -o '[0-9]*' | head -1)
print_info "Super admins: $SUPER_ADMIN_COUNT"
echo ""

# 8. Ver logs da Edge Function
echo "8. Verificando logs da Edge Function (últimas 20 linhas)..."
supabase functions logs admin-create-user --limit 20 || print_warning "Não foi possível obter logs"
echo ""

# 9. Resumo
echo "============================================================"
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "============================================================"
echo ""

# Verificar se todos os problemas foram identificados
ISSUES=0

if ! supabase functions list | grep -q "admin-create-user"; then
    print_error "PROBLEMA 1: Edge Function não deployada"
    ((ISSUES++))
fi

if ! supabase secrets list | grep -q "SUPABASE_URL"; then
    print_error "PROBLEMA 2: Secret SUPABASE_URL não configurado"
    ((ISSUES++))
fi

if ! supabase secrets list | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
    print_error "PROBLEMA 3: Secret SUPABASE_SERVICE_ROLE_KEY não configurado"
    ((ISSUES++))
fi

if ! grep -q "role" /tmp/profiles_schema.txt; then
    print_error "PROBLEMA 4: Campo 'role' não existe na tabela profiles"
    ((ISSUES++))
fi

if [ "$POLICY_COUNT" -gt 1 ]; then
    print_error "PROBLEMA 5: Políticas RLS duplicadas"
    ((ISSUES++))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    print_success "Nenhum problema detectado na infraestrutura!"
    echo "O problema pode estar em outro lugar. Verifique os logs da Edge Function."
else
    print_warning "Detectados $ISSUES problemas que precisam ser corrigidos"
    echo ""
    echo "Consulte o arquivo DIAGNOSTICO_CRIAR_USUARIOS.md para instruções de correção"
fi

echo ""
echo "Diagnóstico concluído!"
echo "Logs salvos em: /tmp/profiles_schema.txt e /tmp/rls_policies.txt"
