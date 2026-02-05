/**
 * Document Management Admin Page
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Interface administrativa para gerenciamento de documentos CPF/CNPJ
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Download, 
  FileText, 
  Filter, 
  RefreshCw, 
  Search,
  Users,
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { reportService, ReportSummary, AffiliateWithoutDocumentReport, DuplicationAttemptReport, ValidationReport } from '@/services/report.service';
import { regularizationService } from '@/services/regularization.service';
import { toast } from '@/hooks/use-toast';

interface AdminFilters {
  startDate: string;
  endDate: string;
  documentType: 'all' | 'CPF' | 'CNPJ';
  status: 'all' | 'pending' | 'expired' | 'completed';
  search: string;
}

export default function DocumentManagement() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [affiliatesWithoutDoc, setAffiliatesWithoutDoc] = useState<AffiliateWithoutDocumentReport[]>([]);
  const [duplicationAttempts, setDuplicationAttempts] = useState<DuplicationAttemptReport[]>([]);
  const [validationReport, setValidationReport] = useState<ValidationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [filters, setFilters] = useState<AdminFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 dias atrás
    endDate: new Date().toISOString().split('T')[0],
    documentType: 'all',
    status: 'all',
    search: ''
  });

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Recarregar dados quando filtros mudarem
  useEffect(() => {
    if (!loading) {
      loadData();
    }
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const reportFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
        documentType: filters.documentType !== 'all' ? filters.documentType as 'CPF' | 'CNPJ' : undefined,
        limit: 100
      };

      const [
        summaryData,
        affiliatesData,
        duplicationsData,
        validationsData
      ] = await Promise.all([
        reportService.getSystemSummary(reportFilters),
        reportService.getAffiliatesWithoutDocument(reportFilters),
        reportService.getDuplicationAttempts(reportFilters),
        reportService.getValidationReport(reportFilters)
      ]);

      setSummary(summaryData);
      setAffiliatesWithoutDoc(affiliatesData);
      setDuplicationAttempts(duplicationsData);
      setValidationReport(validationsData);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do dashboard',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (reportType: 'affiliates_without_document' | 'duplication_attempts' | 'validations') => {
    try {
      let data: any[] = [];
      let filename = '';

      switch (reportType) {
        case 'affiliates_without_document':
          data = affiliatesWithoutDoc;
          filename = 'afiliados-sem-documento.csv';
          break;
        case 'duplication_attempts':
          data = duplicationAttempts;
          filename = 'tentativas-duplicacao.csv';
          break;
        case 'validations':
          data = validationReport;
          filename = 'relatorio-validacoes.csv';
          break;
      }

      const csvContent = reportService.exportToCSV(reportType, data);
      
      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao exportar relatório',
        variant: 'destructive'
      });
    }
  };

  const handleSendReminder = async (affiliateId: string) => {
    try {
      await regularizationService.sendRegularizationReminder(affiliateId);
      toast({
        title: 'Sucesso',
        description: 'Lembrete enviado com sucesso'
      });
      loadData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao enviar lembrete',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'expired':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Expirado</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Concluído</Badge>;
      default:
        return <Badge variant="secondary">Sem prazo</Badge>;
    }
  };

  const getValidationResultBadge = (result: string) => {
    switch (result) {
      case 'VALID':
        return <Badge variant="default" className="bg-green-600">Válido</Badge>;
      case 'INVALID':
        return <Badge variant="destructive">Inválido</Badge>;
      case 'DUPLICATE':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Duplicado</Badge>;
      default:
        return <Badge variant="secondary">{result}</Badge>;
    }
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando dados...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Documentos</h1>
          <p className="text-muted-foreground">Sistema de validação CPF/CNPJ para afiliados</p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Documento</label>
              <Select value={filters.documentType} onValueChange={(value) => setFilters(prev => ({ ...prev, documentType: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="CPF">CPF</SelectItem>
                  <SelectItem value="CNPJ">CNPJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo Executivo */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Afiliados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_affiliates}</div>
              <p className="text-xs text-muted-foreground">
                {summary.affiliates_with_document} com documento
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sem Documento</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.affiliates_without_document}</div>
              <p className="text-xs text-muted-foreground">
                {summary.pending_regularizations} pendentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Validações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_validations}</div>
              <p className="text-xs text-muted-foreground">
                {summary.valid_validations} válidas, {summary.duplicate_attempts} duplicadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regularizações</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.pending_regularizations}</div>
              <p className="text-xs text-muted-foreground">
                {summary.expired_regularizations} expiradas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Relatórios */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="without-document">Sem Documento</TabsTrigger>
          <TabsTrigger value="duplications">Duplicações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório de Validações</CardTitle>
              <CardDescription>Histórico de validações de documentos</CardDescription>
              <div className="flex justify-end">
                <Button onClick={() => handleExportCSV('validations')} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Erros</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationReport.slice(0, 10).map((validation) => (
                    <TableRow key={validation.id}>
                      <TableCell>
                        <Badge variant="outline">{validation.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{validation.affiliate_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{validation.affiliate_email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getValidationResultBadge(validation.validation_result)}</TableCell>
                      <TableCell>{new Date(validation.created_at).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>
                        {validation.errors.length > 0 ? (
                          <span className="text-sm text-red-600">{validation.errors.join(', ')}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nenhum</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="without-document" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Afiliados sem Documento</CardTitle>
              <CardDescription>Afiliados que precisam regularizar CPF/CNPJ</CardDescription>
              <div className="flex justify-end">
                <Button onClick={() => handleExportCSV('affiliates_without_document')} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afiliado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dias até Prazo</TableHead>
                    <TableHead>Lembretes</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliatesWithoutDoc.map((affiliate) => (
                    <TableRow key={affiliate.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{affiliate.name}</div>
                          <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                      <TableCell>
                        {affiliate.days_until_deadline !== undefined ? (
                          <span className={affiliate.days_until_deadline <= 7 ? 'text-red-600 font-medium' : ''}>
                            {affiliate.days_until_deadline} dias
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Sem prazo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div>{affiliate.reminder_count} enviados</div>
                          {affiliate.last_reminder_at && (
                            <div className="text-sm text-muted-foreground">
                              Último: {new Date(affiliate.last_reminder_at).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleSendReminder(affiliate.id)}
                          size="sm"
                          variant="outline"
                          disabled={affiliate.status === 'expired'}
                        >
                          Enviar Lembrete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tentativas de Duplicação</CardTitle>
              <CardDescription>Tentativas de cadastro com documentos já existentes</CardDescription>
              <div className="flex justify-end">
                <Button onClick={() => handleExportCSV('duplication_attempts')} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tentativa por</TableHead>
                    <TableHead>Documento Existente</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {duplicationAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <Badge variant="outline">{attempt.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attempt.attempted_by_name || 'N/A'}</div>
                          <div className="text-sm text-muted-foreground">{attempt.attempted_by_email || 'N/A'}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{attempt.existing_affiliate_name}</div>
                          <div className="text-sm text-muted-foreground">{attempt.existing_affiliate_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(attempt.attempt_date).toLocaleDateString('pt-BR')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}