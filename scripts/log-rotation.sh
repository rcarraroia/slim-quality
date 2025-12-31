#!/bin/bash

# Script de rotação e limpeza de logs
# Gerencia logs do sistema para evitar uso excessivo de disco

set -e

# Configurações
LOG_DIR="/app/logs"
MAX_LOG_SIZE="100M"
RETENTION_DAYS=30
MAX_FILES_PER_LOG=10
COMPRESS_AFTER_DAYS=7

echo "🔄 ROTAÇÃO E LIMPEZA DE LOGS"
echo "============================"
echo "Diretório: $LOG_DIR"
echo "Retenção: $RETENTION_DAYS dias"
echo "Tamanho máximo: $MAX_LOG_SIZE"
echo ""

# Função para log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# Função para rotacionar logs por tamanho
rotate_by_size() {
    local log_file=$1
    local max_size=$2
    
    if [ -f "$log_file" ]; then
        local current_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
        local max_bytes=$(echo "$max_size" | sed 's/M/*1024*1024/g;s/K/*1024/g;s/G/*1024*1024*1024/g' | bc)
        
        if [ "$current_size" -gt "$max_bytes" ]; then
            log "📦 Rotacionando $log_file ($(du -h "$log_file" | cut -f1))"
            
            # Rotacionar arquivos existentes
            for i in $(seq $((MAX_FILES_PER_LOG-1)) -1 1); do
                if [ -f "${log_file}.$i" ]; then
                    mv "${log_file}.$i" "${log_file}.$((i+1))"
                fi
            done
            
            # Mover log atual para .1
            mv "$log_file" "${log_file}.1"
            
            # Criar novo arquivo vazio
            touch "$log_file"
            chmod 644 "$log_file"
            
            log "✅ Rotação concluída: $log_file"
        fi
    fi
}

# Função para comprimir logs antigos
compress_old_logs() {
    log "🗜️  Comprimindo logs antigos..."
    
    # Comprimir logs mais antigos que COMPRESS_AFTER_DAYS
    find "$LOG_DIR" -name "*.log.*" -type f ! -name "*.gz" -mtime +$COMPRESS_AFTER_DAYS -exec gzip {} \;
    
    local compressed_count=$(find "$LOG_DIR" -name "*.log.*.gz" -mtime -1 | wc -l)
    if [ "$compressed_count" -gt 0 ]; then
        log "✅ Comprimidos $compressed_count arquivos de log"
    fi
}

# Função para remover logs muito antigos
cleanup_old_logs() {
    log "🧹 Removendo logs antigos..."
    
    # Remover logs mais antigos que RETENTION_DAYS
    local deleted_count=0
    
    # Logs comprimidos antigos
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$LOG_DIR" -name "*.log.*.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    # Logs não comprimidos muito antigos
    while IFS= read -r -d '' file; do
        rm -f "$file"
        ((deleted_count++))
    done < <(find "$LOG_DIR" -name "*.log.*" ! -name "*.gz" -mtime +$RETENTION_DAYS -print0 2>/dev/null)
    
    if [ "$deleted_count" -gt 0 ]; then
        log "🗑️  Removidos $deleted_count arquivos antigos"
    fi
}

# Função para limitar número de arquivos rotacionados
limit_rotated_files() {
    log "📊 Limitando arquivos rotacionados..."
    
    # Para cada log base, manter apenas MAX_FILES_PER_LOG rotações
    for base_log in $(find "$LOG_DIR" -name "*.log" -type f); do
        local base_name=$(basename "$base_log" .log)
        local log_dir=$(dirname "$base_log")
        
        # Contar arquivos rotacionados
        local rotated_files=$(find "$log_dir" -name "${base_name}.log.*" | wc -l)
        
        if [ "$rotated_files" -gt "$MAX_FILES_PER_LOG" ]; then
            local excess=$((rotated_files - MAX_FILES_PER_LOG))
            
            # Remover os mais antigos
            find "$log_dir" -name "${base_name}.log.*" -printf '%T@ %p\n' | sort -n | head -$excess | cut -d' ' -f2- | xargs rm -f
            
            log "🗑️  Removidos $excess arquivos rotacionados de $base_name"
        fi
    done
}

# Função para rotacionar logs específicos da aplicação
rotate_app_logs() {
    log "🔄 Rotacionando logs da aplicação..."
    
    # Lista de logs da aplicação para rotacionar
    local app_logs=(
        "$LOG_DIR/app.log"
        "$LOG_DIR/error.log"
        "$LOG_DIR/access.log"
        "$LOG_DIR/webhook.log"
        "$LOG_DIR/sicc.log"
        "$LOG_DIR/performance.log"
    )
    
    for log_file in "${app_logs[@]}"; do
        if [ -f "$log_file" ]; then
            rotate_by_size "$log_file" "$MAX_LOG_SIZE"
        fi
    done
}

# Função para rotacionar logs do sistema (se acessível)
rotate_system_logs() {
    log "🖥️  Verificando logs do sistema..."
    
    # Logs do sistema que podem precisar de rotação
    local system_logs=(
        "/var/log/syslog"
        "/var/log/messages"
        "/var/log/auth.log"
    )
    
    for log_file in "${system_logs[@]}"; do
        if [ -f "$log_file" ] && [ -w "$log_file" ]; then
            rotate_by_size "$log_file" "500M"
        fi
    done
}

# Função para gerar relatório de uso de disco
generate_disk_report() {
    log "📊 Gerando relatório de uso de disco..."
    
    local report_file="$LOG_DIR/disk_usage_$(date +%Y%m%d).txt"
    
    {
        echo "=== RELATÓRIO DE USO DE DISCO - $(date) ==="
        echo ""
        echo "=== DIRETÓRIO DE LOGS ==="
        du -sh "$LOG_DIR"
        echo ""
        echo "=== TOP 10 MAIORES ARQUIVOS DE LOG ==="
        find "$LOG_DIR" -type f -exec du -h {} + | sort -hr | head -10
        echo ""
        echo "=== CONTAGEM DE ARQUIVOS POR TIPO ==="
        echo "Logs ativos: $(find "$LOG_DIR" -name "*.log" -type f | wc -l)"
        echo "Logs rotacionados: $(find "$LOG_DIR" -name "*.log.*" ! -name "*.gz" -type f | wc -l)"
        echo "Logs comprimidos: $(find "$LOG_DIR" -name "*.log.*.gz" -type f | wc -l)"
        echo ""
        echo "=== USO TOTAL DO DISCO ==="
        df -h /
    } > "$report_file"
    
    log "📄 Relatório salvo: $report_file"
}

# Função para verificar saúde dos logs
check_log_health() {
    log "🏥 Verificando saúde dos logs..."
    
    local issues=0
    
    # Verificar se diretório de logs existe e é gravável
    if [ ! -d "$LOG_DIR" ]; then
        log "❌ Diretório de logs não existe: $LOG_DIR"
        ((issues++))
    elif [ ! -w "$LOG_DIR" ]; then
        log "❌ Diretório de logs não é gravável: $LOG_DIR"
        ((issues++))
    fi
    
    # Verificar uso de disco
    local disk_usage=$(df "$LOG_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log "⚠️  Uso de disco alto: ${disk_usage}%"
        ((issues++))
    fi
    
    # Verificar logs muito grandes
    while IFS= read -r -d '' file; do
        local size=$(du -m "$file" | cut -f1)
        if [ "$size" -gt 1000 ]; then  # > 1GB
            log "⚠️  Log muito grande: $file (${size}MB)"
            ((issues++))
        fi
    done < <(find "$LOG_DIR" -name "*.log" -type f -print0 2>/dev/null)
    
    if [ "$issues" -eq 0 ]; then
        log "✅ Logs saudáveis"
    else
        log "⚠️  $issues problemas encontrados nos logs"
    fi
    
    return $issues
}

# Função principal
main() {
    local start_time=$(date +%s)
    
    log "🚀 Iniciando rotação e limpeza de logs..."
    
    # Verificar saúde antes da limpeza
    check_log_health
    
    # Rotacionar logs da aplicação
    rotate_app_logs
    
    # Rotacionar logs do sistema (se possível)
    rotate_system_logs
    
    # Comprimir logs antigos
    compress_old_logs
    
    # Limitar arquivos rotacionados
    limit_rotated_files
    
    # Remover logs muito antigos
    cleanup_old_logs
    
    # Gerar relatório
    generate_disk_report
    
    # Verificar saúde após limpeza
    log "🏥 Verificação final..."
    check_log_health
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    log "✅ ROTAÇÃO DE LOGS CONCLUÍDA!"
    log "⏱️  Duração: ${duration}s"
    log "💾 Espaço liberado: $(du -sh "$LOG_DIR" | cut -f1)"
}

# Mostrar ajuda
show_help() {
    echo "Uso: $0 [opções]"
    echo ""
    echo "Opções:"
    echo "  --help, -h              Mostra esta ajuda"
    echo "  --dry-run              Executa sem fazer alterações"
    echo "  --retention DAYS       Define retenção (padrão: 30 dias)"
    echo "  --max-size SIZE        Tamanho máximo por log (padrão: 100M)"
    echo "  --compress-after DAYS  Comprimir após N dias (padrão: 7)"
    echo "  --report-only          Apenas gera relatório"
    echo ""
    echo "Exemplos:"
    echo "  $0                     # Rotação completa"
    echo "  $0 --retention 14      # Manter por 14 dias"
    echo "  $0 --max-size 50M      # Logs máximo 50MB"
    echo "  $0 --report-only       # Apenas relatório"
}

# Processar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --dry-run)
            echo "🔍 Modo dry-run ativado"
            DRY_RUN=true
            shift
            ;;
        --retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        --max-size)
            MAX_LOG_SIZE="$2"
            shift 2
            ;;
        --compress-after)
            COMPRESS_AFTER_DAYS="$2"
            shift 2
            ;;
        --report-only)
            REPORT_ONLY=true
            shift
            ;;
        *)
            echo "Opção desconhecida: $1"
            show_help
            exit 1
            ;;
    esac
done

# Executar
if [ "${REPORT_ONLY:-false}" = "true" ]; then
    log "📊 Gerando apenas relatório..."
    generate_disk_report
    check_log_health
elif [ "${DRY_RUN:-false}" = "true" ]; then
    log "🔍 Modo dry-run: Verificando configuração..."
    check_log_health
    log "✅ Rotação seria executada normalmente."
else
    main
fi