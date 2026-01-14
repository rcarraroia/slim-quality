/**
 * Serverless Function: Exportação de Relatórios
 * Endpoint: POST /api/affiliates/export
 * 
 * Gera arquivos CSV para download com dados do afiliado
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  // Apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Método não permitido' 
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: req.headers.authorization || ''
        }
      }
    });

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Não autenticado' 
      });
    }

    // Buscar afiliado
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .select('id, name, email')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (affiliateError || !affiliate) {
      return res.status(404).json({ 
        success: false, 
        error: 'Afiliado não encontrado' 
      });
    }

    // Parâmetros da requisição
    const { type, startDate, endDate } = req.body;

    if (!type || !['commissions', 'withdrawals', 'network'].includes(type)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Tipo de relatório inválido. Use: commissions, withdrawals ou network' 
      });
    }

    let csvData = '';
    let filename = '';

    // Gerar CSV baseado no tipo
    switch (type) {
      case 'commissions':
        const commissionsResult = await generateCommissionsCSV(supabase, affiliate.id, startDate, endDate);
        csvData = commissionsResult.csv;
        filename = `comissoes_${affiliate.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'withdrawals':
        const withdrawalsResult = await generateWithdrawalsCSV(supabase, affiliate.id, startDate, endDate);
        csvData = withdrawalsResult.csv;
        filename = `saques_${affiliate.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        break;

      case 'network':
        const networkResult = await generateNetworkCSV(supabase, affiliate.id);
        csvData = networkResult.csv;
        filename = `rede_${affiliate.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        break;
    }

    // Retornar CSV
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send('\uFEFF' + csvData); // BOM para UTF-8

  } catch (error) {
    console.error('Erro ao gerar exportação:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno ao gerar relatório' 
    });
  }
}

/**
 * Gera CSV de comissões
 */
async function generateCommissionsCSV(supabase, affiliateId, startDate, endDate) {
  let query = supabase
    .from('commissions')
    .select(`
      id,
      commission_value_cents,
      level,
      status,
      created_at,
      paid_at,
      order_id,
      orders (
        id,
        total_cents,
        status,
        customers (name)
      )
    `)
    .eq('affiliate_id', affiliateId)
    .order('created_at', { ascending: false });

  // Filtros de data
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: commissions, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar comissões: ${error.message}`);
  }

  // Cabeçalho CSV
  const header = 'ID,Data,Cliente,Pedido,Valor Pedido,Comissão,Nível,Status,Data Pagamento\n';

  // Linhas CSV
  const rows = (commissions || []).map(c => {
    const date = new Date(c.created_at).toLocaleDateString('pt-BR');
    const customerName = c.orders?.customers?.name || 'N/A';
    const orderId = c.orders?.id || c.order_id || 'N/A';
    const orderValue = c.orders?.total_cents ? (c.orders.total_cents / 100).toFixed(2) : '0.00';
    const commission = (c.commission_value_cents / 100).toFixed(2);
    const level = `N${c.level}`;
    const status = c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : 'Cancelado';
    const paidDate = c.paid_at ? new Date(c.paid_at).toLocaleDateString('pt-BR') : '-';

    return `${c.id},"${date}","${customerName}","${orderId}","R$ ${orderValue}","R$ ${commission}","${level}","${status}","${paidDate}"`;
  }).join('\n');

  return {
    csv: header + rows
  };
}

/**
 * Gera CSV de saques
 */
async function generateWithdrawalsCSV(supabase, affiliateId, startDate, endDate) {
  let query = supabase
    .from('affiliate_withdrawals')
    .select('*')
    .eq('affiliate_id', affiliateId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  // Filtros de data
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data: withdrawals, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar saques: ${error.message}`);
  }

  // Cabeçalho CSV
  const header = 'ID,Data Solicitação,Valor,Chave PIX,Status,Data Processamento,Observações\n';

  // Linhas CSV
  const rows = (withdrawals || []).map(w => {
    const date = new Date(w.created_at).toLocaleDateString('pt-BR');
    const amount = (w.amount_cents / 100).toFixed(2);
    const pixKey = w.pix_key || 'N/A';
    const status = w.status === 'completed' ? 'Concluído' : 
                   w.status === 'processing' ? 'Processando' : 
                   w.status === 'rejected' ? 'Rejeitado' : 'Pendente';
    const processedDate = w.processed_at ? new Date(w.processed_at).toLocaleDateString('pt-BR') : '-';
    const notes = w.notes || '-';

    return `${w.id},"${date}","R$ ${amount}","${pixKey}","${status}","${processedDate}","${notes}"`;
  }).join('\n');

  return {
    csv: header + rows
  };
}

/**
 * Gera CSV da rede
 */
async function generateNetworkCSV(supabase, affiliateId) {
  // Buscar N1 (diretos)
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, name, email, referral_code, status, total_commissions_cents, created_at')
    .eq('referred_by', affiliateId)
    .is('deleted_at', null);

  const network = [];

  // Adicionar N1
  if (n1List && n1List.length > 0) {
    for (const n1 of n1List) {
      network.push({
        ...n1,
        level: 'N1',
        parent: 'Você'
      });

      // Buscar N2 (indiretos)
      const { data: n2List } = await supabase
        .from('affiliates')
        .select('id, name, email, referral_code, status, total_commissions_cents, created_at')
        .eq('referred_by', n1.id)
        .is('deleted_at', null);

      if (n2List && n2List.length > 0) {
        for (const n2 of n2List) {
          network.push({
            ...n2,
            level: 'N2',
            parent: n1.name
          });
        }
      }
    }
  }

  // Cabeçalho CSV
  const header = 'Nome,Email,Código,Nível,Indicado Por,Status,Total Comissões,Data Cadastro\n';

  // Linhas CSV
  const rows = network.map(n => {
    const name = n.name || 'N/A';
    const email = n.email || 'N/A';
    const code = n.referral_code || 'N/A';
    const level = n.level;
    const parent = n.parent;
    const status = n.status === 'active' ? 'Ativo' : 
                   n.status === 'pending' ? 'Pendente' : 
                   n.status === 'inactive' ? 'Inativo' : 'Suspenso';
    const totalCommissions = (n.total_commissions_cents / 100).toFixed(2);
    const date = new Date(n.created_at).toLocaleDateString('pt-BR');

    return `"${name}","${email}","${code}","${level}","${parent}","${status}","R$ ${totalCommissions}","${date}"`;
  }).join('\n');

  return {
    csv: header + rows
  };
}
