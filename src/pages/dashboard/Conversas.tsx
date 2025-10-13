import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { mockConversas } from '@/data/mockData';
import { Search, Plus } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Conversas() {
  const [statusFilter, setStatusFilter] = useState('todas');
  const [periodoFilter, setPeriodoFilter] = useState('7dias');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversas = mockConversas.filter(conversa => {
    if (statusFilter !== 'todas' && conversa.status !== statusFilter) return false;
    if (searchQuery && !conversa.nome.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativa">Ativas</SelectItem>
                <SelectItem value="aguardando">Aguardando Resposta</SelectItem>
                <SelectItem value="negociando">Em Negociação</SelectItem>
                <SelectItem value="finalizada">Finalizadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoje">Hoje</SelectItem>
                <SelectItem value="7dias">Últimos 7 dias</SelectItem>
                <SelectItem value="30dias">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou mensagem..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Conversa
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Conversas */}
      <div className="space-y-4">
        {filteredConversas.map((conversa) => (
          <Card key={conversa.id} className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {conversa.nome.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{conversa.nome}</h3>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={conversa.status} />
                      <span className="text-sm text-muted-foreground">{conversa.hora}</span>
                    </div>
                  </div>

                  <p className="text-muted-foreground">
                    {conversa.ultimaMensagem}
                  </p>

                  <div className="flex items-center gap-2">
                    {conversa.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="default">Ver Conversa</Button>
                    <Button variant="outline">Marcar como Prioridade</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
