import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Edit, Calendar, MessageSquare, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { TimelineView } from '@/components/crm/TimelineView';
import { customerFrontendService, type Customer, type TimelineEvent } from '@/services/frontend/customer-frontend.service';
import { ReminderSystem } from '@/components/crm/ReminderSystem';

export default function ClienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Customer>>({});

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
      setEditData(data);
    } catch (error) {
      console.error('Erro ao carregar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await customerFrontendService.updateCustomer(id!, editData);
      setEditMode(false);
      loadCustomer();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
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
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
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

            {editMode ? (
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Nome</label>
                    <Input
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Telefone</label>
                    <Input
                      value={editData.phone || ''}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">CPF/CNPJ</label>
                    <Input
                      value={editData.document || ''}
                      onChange={(e) => setEditData({ ...editData, document: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
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
            )}

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
          <TabsTrigger value="reminders">Lembretes</TabsTrigger>
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Histórico de Pedidos</h3>
                <div className="text-sm text-muted-foreground">
                  Total: R$ {customer.total_spent?.toFixed(2) || '0,00'}
                </div>
              </div>
              {customer.orders && customer.orders.length > 0 ? (
                <div className="space-y-3">
                  {customer.orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Pedido #{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">R$ {order.total.toFixed(2)}</p>
                        <Badge>{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido realizado</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Conversas</h3>
              {customer.conversations && customer.conversations.length > 0 ? (
                <div className="space-y-3">
                  {customer.conversations.map((conv: any) => (
                    <div key={conv.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-accent"
                         onClick={() => navigate(`/dashboard/conversas?id=${conv.id}`)}>
                      <div>
                        <p className="font-medium">{conv.subject || 'Sem assunto'}</p>
                        <p className="text-sm text-muted-foreground">
                          {conv.channel} • {new Date(conv.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Badge>{conv.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Nenhuma conversa registrada</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reminders">
          <ReminderSystem customerId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
