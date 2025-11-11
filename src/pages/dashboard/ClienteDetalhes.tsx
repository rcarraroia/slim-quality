import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Edit, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TimelineView } from '@/components/crm/TimelineView';
import { customerFrontendService, type Customer, type TimelineEvent } from '@/services/frontend/customer-frontend.service';

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCustomer();
      loadTimeline();
    }
  }, [id]);

  const loadCustomer = async () => {
    try {
      const data = await customerFrontendService.getCustomerById(id!);
      setCustomer(data);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeline = async () => {
    try {
      const events = await customerFrontendService.getCustomerTimeline(id!);
      setTimeline(events);
    } catch (error) {
      console.error('Erro ao carregar timeline:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <p>Cliente não encontrado</p>
      </div>
    );
  }

  const initials = customer.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/clientes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Detalhes do Cliente</h1>
      </div>

      {/* Informações Principais */}
      <Card className="p-6">
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{customer.name}</h2>
                <p className="text-muted-foreground">
                  Cliente desde {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar
                </Button>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Conversar
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {customer.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.phone}</span>
                </div>
              )}
              {customer.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {customer.address.city}, {customer.address.state}
                  </span>
                </div>
              )}
            </div>

            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customer.tags.map(tag => (
                  <Badge
                    key={tag.id}
                    style={{ borderColor: tag.color, color: tag.color }}
                    variant="outline"
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="orders">Pedidos</TabsTrigger>
          <TabsTrigger value="conversations">Conversas</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          <TimelineView events={timeline} />
        </TabsContent>

        <TabsContent value="info">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Informações Detalhadas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{customer.status}</p>
              </div>
              {customer.source && (
                <div>
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <p className="font-medium">{customer.source}</p>
                </div>
              )}
              {customer.document && (
                <div>
                  <p className="text-sm text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{customer.document}</p>
                </div>
              )}
              {customer.birth_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                  <p className="font-medium">
                    {new Date(customer.birth_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </div>
            {customer.notes && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="mt-1">{customer.notes}</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card className="p-6">
            <p className="text-muted-foreground">Pedidos do cliente aparecerão aqui</p>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card className="p-6">
            <p className="text-muted-foreground">Conversas do cliente aparecerão aqui</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
