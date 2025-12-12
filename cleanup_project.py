#!/usr/bin/env python3
"""
Script para limpeza de arquivos desnecessários do projeto Slim Quality
"""

import os
import shutil
from datetime import datetime

def cleanup_project():
    """Remove arquivos temporários e desnecessários"""
    
    print("🧹 LIMPEZA DO PROJETO SLIM QUALITY")
    print("=" * 50)
    
    # Arquivos desnecessários na pasta docs
    docs_to_delete = [
        "docs/ANALISE_REDIRECIONAMENTO_LOGIN.md",
        "docs/ANALISE_SISTEMA_COMPLETA.md", 
        "docs/ANALISE_SPRINT_4.md",
        "docs/API_AUTH.md",
        "docs/API_TESTS.http",
        "docs/API.md",
        "docs/ASAAS_SETUP.md",
        "docs/CONFIGURAR_VARIAVEIS_VERCEL.md",
        "docs/CORRECAO_CONCLUIDA.md",
        "docs/CORRECAO_NOMENCLATURA.md",
        "docs/CORRECOES_APLICADAS.md",
        "docs/CREDENCIAIS_TESTE.md",
        "docs/CRM_SYSTEM_DOCUMENTATION.md",
        "docs/CRONOGRAMA_MACRO.md",
        "docs/DOCUMENTACAO_CRIADA.md",
        "docs/erros.md",
        "docs/FASE_4_INTEGRACAO_COMPLETA.md",
        "docs/GUIA_DEPLOY_PRODUCAO.md",
        "docs/INDICE_PLANEJAMENTO.md",
        "docs/INTEGRACAO_COMPLETA.md",
        "docs/INTEGRACAO_FRONTEND_SPRINT_4.md",
        "docs/PASSO_A_PASSO_DEPLOY.md",
        "docs/PLANO_CORRECAO_CRM.md",
        "docs/PROGRESSO_FRONTEND.md",
        "docs/REFATORACAO_SPRINT_4.md",
        "docs/regra.md",
        "docs/RELATORIO_ANALISE_COMPLETA.md",
        "docs/RELATORIO_FINAL_SISTEMA_SLIM_QUALITY.md",
        "docs/RELATORIO_TESTES_EXECUTADOS.md",
        "docs/RELATORIO_VERIFICACAO_SISTEMA_REAL.md",
        "docs/ROADMAP_TECNICO.md",
        "docs/SETUP_COMPLETO.md",
        "docs/SOLICITACAO_TESTES_AUTOMATIZADOS.md",
        "docs/SPECS_TEMPLATE.md",
        "docs/SPRINT_2_VALIDATION.md",
        "docs/SPRINT_5_CONCLUIDO.md",
        "docs/SPRINT_5_RESUMO_FINAL.md",
        "docs/SPRINT_5_STATUS.md",
        "docs/SPRINT_5_VALIDATION_REPORT.md",
        "docs/SPRINT4_PREPARATION.md",
        "docs/SUPABASE_ACCESS.md",
        "docs/VERIFICACAO_BANCO_REAL.md",
        "docs/webhooks asaas.docx"
    ]
    
    # Arquivos desnecessários na raiz
    root_to_delete = [
        "add_product_type_column.py",
        "AI_RULES.md",
        "ANALISE_AFILIADOS_ADMIN.md",
        "analyze_affiliates_module.py",
        "analyze_customers_orders_complete.py",
        "analyze_customers_orders_direct.py",
        "analyze_customers_orders_system.py",
        "analyze_users_orders_relationship.py",
        "apply_migration_direct.py",
        "audit_database_result.json",
        "audit_database.py",
        "check_affiliate_tables.py",
        "check_and_run_migrations.py",
        "check_orders_structure.py",
        "check_product_slugs.py",
        "check_products_table.py",
        "check_profiles_structure.py",
        "check_real_table_structure.py",
        "check_real_table_structures.py",
        "check_rls_and_structure.py",
        "check_table_structure.py",
        "check_tables.py",
        "compare_keys.py",
        "complete_sales_structure.json",
        "create_affiliates_tables_direct.sql",
        "create_product_images_table.py",
        "create_test_product.py",
        "create_webhook_logs_direct.py",
        "create_webhook_logs_only.sql",
        "create_webhook_table.py",
        "customers_orders_analysis_direct.json",
        "customers_orders_analysis.json",
        "debug_500_error.py",
        "debug_products_loading.py",
        "debug_specific_product.py",
        "diagnostic_complete_fixed.py",
        "diagnostic_complete.py",
        "disable_rls_direct.py",
        "disable_rls_manual.py",
        "discover_real_columns.py",
        "discover_real_structures.py",
        "discover_source_constraint.py",
        "discover_with_real_data.py",
        "discovered_structures.json",
        "execute_affiliates_sql.py",
        "execute_rls_fix_direct.py",
        "final_system_test.py",
        "fix_affiliates_and_wallet_validation.py",
        "fix_customers_rls.py",
        "fix_orders_fk.sql",
        "fix_orders_foreign_key.py",
        "fix_padrao_slug.py",
        "fix_products_only.sql",
        "fix_products_rls.py",
        "fix_profiles_references.py",
        "fix_rls_permanently.py",
        "fix_rls_policies.sql",
        "fix_rls_recursion.py",
        "fix_rls_recursion.sql",
        "fix_storage_rls.py",
        "fix_storage_rls.sql",
        "investigate_rls_complete.py",
        "investigate_rls_via_api.py",
        "LIMPEZA_AFILIADOS_COMPLETA.md",
        "LIMPEZA_DADOS_MOCKADOS_COMPLETA.md",
        "RELATORIO_VERIFICACAO_LIMPEZA.md",
        "RESUMO_FINAL_AFILIADOS.md",
        "RESUMO_FINAL_LIMPEZA.md",
        "setup_admin_user.py",
        "setup_rls_policies.py",
        "temp_produtos.txt",
        "test_admin_auth.py",
        "test_affiliate_registration.py",
        "test_api_key.py",
        "test_asaas_checkout.py",
        "test_asaas_debug.py",
        "test_asaas_simple.py",
        "test_checkout_integration.py",
        "test_complete_affiliate_system.py",
        "test_complete_checkout.py",
        "test_complete_infrastructure.py",
        "test_complete_integration.py",
        "test_complete_sales_flow.py",
        "test_final_integration.py",
        "test_foreign_key_fix.py",
        "test_frontend_connection.py",
        "test_integration_simple.py",
        "test_live_payment_options.py",
        "test_modal_and_refresh.py",
        "test_payment_methods.py",
        "test_product_detail_page.py",
        "test_product_insertion.py",
        "test_storage_upload.py",
        "test_vercel_connection.py",
        "test_with_real_user.py",
        "verificar_banco_real.py"
    ]
    
    # Deletar arquivos da pasta docs
    print("\n📁 Limpando pasta docs...")
    deleted_docs = 0
    for file_path in docs_to_delete:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"✅ Deletado: {file_path}")
                deleted_docs += 1
            except Exception as e:
                print(f"❌ Erro ao deletar {file_path}: {e}")
        else:
            print(f"⚠️ Não encontrado: {file_path}")
    
    # Deletar arquivos da raiz
    print("\n📁 Limpando raiz do projeto...")
    deleted_root = 0
    for file_path in root_to_delete:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"✅ Deletado: {file_path}")
                deleted_root += 1
            except Exception as e:
                print(f"❌ Erro ao deletar {file_path}: {e}")
        else:
            print(f"⚠️ Não encontrado: {file_path}")
    
    print("\n" + "=" * 50)
    print("🏁 LIMPEZA CONCLUÍDA")
    print(f"📊 Arquivos deletados:")
    print(f"   • Pasta docs: {deleted_docs} arquivos")
    print(f"   • Raiz: {deleted_root} arquivos")
    print(f"   • Total: {deleted_docs + deleted_root} arquivos")
    print(f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    print("\n📋 ARQUIVOS MANTIDOS (ESSENCIAIS):")
    print("📁 docs/:")
    print("   • PLANO_IMPLEMENTACAO_COMPLETO.md")
    print("   • SUPABASE_CREDENTIALS.md")
    print("   • README.md")
    print("   • asaas_documentacao_completa/ (pasta)")
    print("   • asaas_oficial/ (pasta)")
    
    print("\n📁 raiz/:")
    print("   • Arquivos de configuração (.env, package.json, etc.)")
    print("   • Pastas essenciais (src/, supabase/, etc.)")
    print("   • Arquivos de build (vite.config.ts, etc.)")

if __name__ == "__main__":
    cleanup_project()