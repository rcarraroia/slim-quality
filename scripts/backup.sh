#!/bin/bash

# Script de backup automático para produção
# Faz backup de dados críticos do Redis e configurações

set -e

# Configurações
BACKUP_DIR="/app/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7
MAX_BACKUPS=30

echo "🔄 INICIANDO BACKUP AUTOMÁTICO"
echo "=============================="
echo "Timestamp: $TIMESTAMP"
echo "Diretório: $BACKUP_DIR"
echo ""

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR"

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Função para backup do Redis
backup_redis() {
    log "📦 Iniciando backup Redis..."
    
    local redis_backup_dir="$BACKUP_DIR/redis"
    mkdir -p "$redis_backup_dir"
    
    # Verificar se Redis está acessível
    if redis-cli -h redis -p 6379 ping > /dev/null 2>&1; then
        log "✅ Redis acessível, iniciando backup..."
        
        # Forçar save do Redis
        redis-cli -h redis -p 6379 BGSAVE
        
        # Aguardar save completar
        local save_status=""
        local attempts=0
        while [ "$save_status" != "OK" ] && [ $attempts -lt 30 ]; do
            sleep 2
            save_status=$(redis-cli -h redis -p 6379 LASTSAVE 2>/dev/null || echo "ERROR")
            ((attempts++))
        done
        
        if [ "$save_status" != "ERROR" ]; then
            # Exportar dados do Redis
            redis-cli -h redis -p 6379 --rdb "$redis_backup_dir/redis_backup_$TIMESTAMP.rdb"
            
            # Backup de chaves importantes (formato JSON)
            redis-cli -h redis -p 6379 --json KEYS "*" > "$redis_backup_dir/redis_keys_$TIMESTAMP.json"
            
            # Informações do Redis
            redis-cli -h redis -p 6379 INFO > "$redis_backup_dir/redis_info_$TIMESTAMP.txt"
            
            log "✅ Backup Redis concluído: redis_backup_$TIMESTAMP.rdb"
        else
            log "❌ Erro no backup Redis: Timeout no BGSAVE"
            return 1
        fi
    else
        log "❌ Redis não acessível, pulando backup"
        return 1
    fi
}

# Função para backup de configurações
backup_configs() {
    log "📋 Iniciando backup de configurações..."
    
    local config_backup_dir="$BACKUP_DIR/configs"
    mkdir -p "$config_backup_dir"
    
    # Backup de arquivos de configuração (se existirem)
    local config_files=(
        "/app/src/config.py"
        "/app/.env.example"
        "/app/requirements.txt"
        "/app/package.json"
    )
    
    for config_file in "${config_files[@]}"; do
        if [ -f "$config_file" ]; then
            cp "$config_file" "$config_backup_dir/$(basename $config_file)_$TIMESTAMP"
            log "✅ Backup config: $(basename $config_file)"
        fi
    done
    
    # Backup de estrutura de diretórios
    find /app -type d -name "src" -o -name "scripts" -o -name "docs" | head -20 > "$config_backup_dir/directory_structure_$TIMESTAMP.txt"
    
    log "✅ Backup configurações concluído"
}

# Função para backup de logs importantes
backup_logs() {
    log "📄 Iniciando backup de logs..."
    
    local logs_backup_dir="$BACKUP_DIR/logs"
    mkdir -p "$logs_backup_dir"
    
    # Backup de logs recentes (últimas 24h)
    if [ -d "/app/logs" ]; then
        find /app/logs -name "*.log" -mtime -1 -exec cp {} "$logs_backup_dir/" \;
        log "✅ Backup logs recentes concluído"
    fi
    
    # Backup de logs do sistema (se acessível)
    if command -v journalctl &> /dev/null; then
        journalctl --since "24 hours ago" --no-pager > "$logs_backup_dir/system_logs_$TIMESTAMP.log" 2>/dev/null || true
    fi
}

# Função para backup de métricas
backup_metrics() {
    log "📊 Iniciando backup de métricas..."
    
    local metrics_backup_dir="$BACKUP_DIR/metrics"
    mkdir -p "$metrics_backup_dir"
    
    # Backup de métricas via API (se disponível)
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        curl -s http://localhost:8000/health > "$metrics_backup_dir/health_$TIMESTAMP.json"
        curl -s http://localhost:8000/webhooks/metrics > "$metrics_backup_dir/webhook_metrics_$TIMESTAMP.json" 2>/dev/null || true
        log "✅ Backup métricas API concluído"
    fi
    
    # Métricas do sistema
    {
        echo "=== SYSTEM INFO ==="
        uname -a
        echo ""
        echo "=== MEMORY ==="
        free -h
        echo ""
        echo "=== DISK ==="
        df -h
        echo ""
        echo "=== PROCESSES ==="
        ps aux | head -20
    } > "$metrics_backup_dir/system_metrics_$TIMESTAMP.txt"
    
    log "✅ Backup métricas sistema concluído"
}

# Função para compactar backup
compress_backup() {
    log "🗜️  Compactando backup..."
    
    local backup_archive="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    # Compactar todos os backups do timestamp atual
    tar -czf "$backup_archive" -C "$BACKUP_DIR" \
        redis/redis_backup_$TIMESTAMP.rdb \
        redis/redis_keys_$TIMESTAMP.json \
        redis/redis_info_$TIMESTAMP.txt \
        configs/ \
        logs/ \
        metrics/ \
        2>/dev/null || true
    
    if [ -f "$backup_archive" ]; then
        local archive_size=$(du -h "$backup_archive" | cut -f1)
        log "✅ Backup compactado: backup_$TIMESTAMP.tar.gz ($archive_size)"
        
        # Remover arquivos individuais após compactação
        rm -rf "$BACKUP_DIR/redis/redis_backup_$TIMESTAMP.rdb" 2>/dev/null || true
        rm -rf "$BACKUP_DIR/redis/redis_keys_$TIMESTAMP.json" 2>/dev/null || true
        rm -rf "$BACKUP_DIR/redis/redis_info_$TIMESTAMP.txt" 2>/dev/null || true
    else
        log "❌ Erro na compactação do backup"
        return 1
    fi
}

# Função para limpeza de backups antigos
cleanup_old_backups() {
    log "🧹 Limpando backups antigos..."
    
    # Remover backups mais antigos que RETENTION_DAYS
    find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Manter apenas MAX_BACKUPS mais recentes
    local backup_count=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" | wc -l)
    if [ $backup_count -gt $MAX_BACKUPS ]; then
        local excess=$((backup_count - MAX_BACKUPS))
        find "$BACKUP_DIR" -name "backup_*.tar.gz" -printf '%T@ %p\n' | sort -n | head -$excess | cut -d' ' -f2- | xargs rm -f
        log "🗑️  Removidos $excess backups antigos"
    fi
    
    # Limpar diretórios temporários vazios
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    log "✅ Limpeza concluída"
}

# Função para verificar integridade do backup
verify_backup() {
    log "🔍 Verificando integridade do backup..."
    
    local backup_archive="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"
    
    if [ -f "$backup_archive" ]; then
        # Testar integridade do arquivo tar
        if tar -tzf "$backup_archive" > /dev/null 2>&1; then
            log "✅ Backup íntegro: backup_$TIMESTAMP.tar.gz"
            return 0
        else
            log "❌ Backup corrompido: backup_$TIMESTAMP.tar.gz"
            return 1
        fi
    else
        log "❌ Arquivo de backup não encontrado"
        return 1
    fi
}

# Função para enviar notificação (se configurado)
send_notification() {
    local status=$1
    local message=$2
    
    # Placeholder para notificações (Slack, email, etc.)
    if [ "$status" = "success" ]; then
        log "📧 Backup concluído com sucesso"
    else
        log "📧 Backup falhou: $message"
    fi
    
    # Exemplo de integração com webhook (descomente se necessário)
    # curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
    #      -H "Content-Type: application/json" \
    #      -d "{\"text\":\"Backup Status: $status - $message\"}" 2>/dev/null || true
}

# Função principal
main() {
    local start_time=$(date +%s)
    local success=true
    local error_message=""
    
    log "🚀 Iniciando processo de backup completo..."
    
    # Executar backups
    if ! backup_redis; then
        success=false
        error_message="Falha no backup Redis"
    fi
    
    backup_configs
    backup_logs
    backup_metrics
    
    if $success; then
        if compress_backup && verify_backup; then
            cleanup_old_backups
            
            local end_time=$(date +%s)
            local duration=$((end_time - start_time))
            
            log "✅ BACKUP CONCLUÍDO COM SUCESSO!"
            log "⏱️  Duração: ${duration}s"
            log "📁 Arquivo: backup_$TIMESTAMP.tar.gz"
            
            send_notification "success" "Backup concluído em ${duration}s"
        else
            success=false
            error_message="Falha na compactação ou verificação"
        fi
    fi
    
    if ! $success; then
        log "❌ BACKUP FALHOU: $error_message"
        send_notification "error" "$error_message"
        exit 1
    fi
}

# Verificar dependências
check_dependencies() {
    local missing_deps=()
    
    if ! command -v redis-cli &> /dev/null; then
        missing_deps+=("redis-cli")
    fi
    
    if ! command -v tar &> /dev/null; then
        missing_deps+=("tar")
    fi
    
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log "❌ Dependências faltando: ${missing_deps[*]}"
        log "💡 Instale as dependências antes de executar o backup"
        exit 1
    fi
}

# Mostrar ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  --help, -h          Mostra esta ajuda"
    echo "  --dry-run          Executa sem fazer alterações"
    echo "  --redis-only       Backup apenas do Redis"
    echo "  --no-compress      Não compacta o backup"
    echo "  --retention DAYS   Define retenção (padrão: 7 dias)"
    echo ""
    echo "Exemplos:"
    echo "  $0                 # Backup completo"
    echo "  $0 --redis-only    # Apenas Redis"
    echo "  $0 --retention 14  # Manter por 14 dias"
}

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            echo "🔍 Modo dry-run ativado (sem alterações)"
            DRY_RUN=true
            shift
            ;;
        --redis-only)
            REDIS_ONLY=true
            shift
            ;;
        --no-compress)
            NO_COMPRESS=true
            shift
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Executar
if [ "${DRY_RUN:-false}" = "true" ]; then
    log "🔍 Modo dry-run: Verificando dependências..."
    check_dependencies
    log "✅ Dependências OK. Backup seria executado normalmente."
else
    check_dependencies
    main
fi