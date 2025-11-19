/**
 * Página de Conversas - Versão Simplificada
 * Temporária até corrigir RLS e services
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

export default function Conversas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Conversas</h1>
        <p className="text-muted-foreground">
          Sistema de mensagens e atendimento
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            O sistema de conversas está sendo implementado. Em breve você poderá:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-muted-foreground">
            <li>Gerenciar conversas com clientes</li>
            <li>Responder mensagens do WhatsApp</li>
            <li>Visualizar histórico de atendimentos</li>
            <li>Filtrar por status e canal</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
