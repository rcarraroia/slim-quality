/**
 * Export Helpers
 * Sprint 4: Sistema de Afiliados Multinível
 * Utilitários para exportação de dados
 */

import * as XLSX from 'xlsx';

export interface ExportData {
  [key: string]: any;
}

/**
 * Exportar dados para CSV
 */
export const exportToCSV = (data: ExportData[], filename: string) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Converter dados para CSV
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','), // Cabeçalhos
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escapar valores que contêm vírgulas ou aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Criar e baixar arquivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

/**
 * Exportar dados para Excel (XLSX)
 */
export const exportToExcel = (data: ExportData[], filename: string, sheetName: string = 'Dados') => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Criar workbook e worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Salvar arquivo
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Formatar dados de afiliados para exportação
 */
export const formatAffiliatesForExport = (affiliates: any[]) => {
  return affiliates.map(affiliate => ({
    'ID': affiliate.id,
    'Nome': affiliate.nome || affiliate.name,
    'Email': affiliate.email,
    'Telefone': affiliate.telefone || affiliate.phone,
    'Cidade': affiliate.cidade || affiliate.city,
    'Data de Cadastro': affiliate.dataCadastro || affiliate.created_at,
    'Status': affiliate.status,
    'Nível': affiliate.nivel || affiliate.level,
    'Total Indicados': affiliate.totalIndicados || affiliate.total_referrals,
    'Vendas Geradas': affiliate.vendasGeradas || affiliate.total_sales,
    'Comissões Totais': `R$ ${(affiliate.comissoesTotais || affiliate.total_commissions || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    'Saldo Disponível': `R$ ${(affiliate.saldoDisponivel || affiliate.available_balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    'Taxa de Conversão': `${(affiliate.taxaConversao || affiliate.conversion_rate || 0).toFixed(1)}%`,
    'Wallet ID': affiliate.walletId || affiliate.wallet_id,
    'Última Atividade': affiliate.ultimaAtividade || affiliate.last_activity
  }));
};

/**
 * Formatar dados de comissões para exportação
 */
export const formatCommissionsForExport = (commissions: any[]) => {
  return commissions.map(commission => ({
    'ID': commission.id,
    'Afiliado': commission.afiliadoNome || commission.affiliate_name,
    'ID do Afiliado': commission.afiliadoId || commission.affiliate_id,
    'Venda': commission.vendaId || commission.order_id,
    'Cliente': commission.cliente || commission.customer_name,
    'Produto': commission.produto || commission.product_name,
    'Nível': commission.nivel || commission.level,
    'Percentual': `${commission.percentual || commission.percentage}%`,
    'Valor da Venda': `R$ ${(commission.valorVenda || commission.sale_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    'Valor da Comissão': `R$ ${(commission.valorComissao || commission.commission_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    'Status': commission.status,
    'Data de Criação': commission.dataCriacao || commission.created_at,
    'Data de Pagamento': commission.dataPagamento || commission.paid_at || 'N/A'
  }));
};

/**
 * Gerar nome de arquivo com timestamp
 */
export const generateFilename = (prefix: string) => {
  const now = new Date();
  const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}_${timestamp}`;
};