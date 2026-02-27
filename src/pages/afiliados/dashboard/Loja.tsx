import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2, AlertCircle, CheckCircle, Store, Image as ImageIcon, Clock, Eye, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { storeFrontendService, StoreProfile, BusinessHours } from '@/services/frontend/store.service';
import { affiliateFrontendService } from '@/services/frontend/affiliate.service';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/config/supabase';
import ImageUpload from '@/components/shared/ImageUpload';

const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '18:00', closed: false },
  saturday: { open: '09:00', close: '13:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true }
};

export default function Loja() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isLogista, setIsLogista] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  
  // Estados para modal de assinatura
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [subscriptionProduct, setSubscriptionProduct] = useState<any>(null);
  const [processingSubscription, setProcessingSubscription] = useState(false);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);

  const [formData, setFormData] = useState<Partial<StoreProfile>>({
    store_name: '',
    description: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    instagram: '',
    facebook: '',
    logo_url: '',
    banner_url: '',
    business_hours: DEFAULT_BUSINESS_HOURS,
    is_visible_in_showcase: false
  });

  useEffect(() => {
    checkAffiliateAndLoadProfile();
  }, []);

  const checkAffiliateAndLoadProfile = async () => {
    try {
      setLoading(true);

      // Verificar se é logista
      const { isAffiliate, affiliate } = await affiliateFrontendService.checkAffiliateStatus();

      if (!isAffiliate || affiliate?.affiliate_type !== 'logista') {
        setIsLogista(false);
        return;
      }

      setIsLogista(true);
      setAffiliateId(affiliate.id);

      // Carregar perfil existente
      const profile = await storeFrontendService.getProfile();

      if (profile) {
        setHasProfile(true);
        setFormData({
          ...profile,
          business_hours: profile.business_hours || DEFAULT_BUSINESS_HOURS
        });
      }

      // Verificar se há assinatura ativa
      await checkActiveSubscription(affiliate.id);

      // Buscar produto de mensalidade
      await loadSubscriptionProduct();
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados do perfil',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const checkActiveSubscription = async (affId: string) => {
    try {
      const { data } = await supabase
        .from('affiliate_payments')
        .select('id')
        .eq('affiliate_id', affId)
        .eq('payment_type', 'monthly_subscription')
        .in('status', ['paid'])
        .maybeSingle();

      setHasActiveSubscription(!!data);
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error);
    }
  };

  const loadSubscriptionProduct = async () => {
    try {
      const { data } = await supabase
        .from('products')
        .select(`
          *,
          product_images(image_url, is_primary)
        `)
        .eq('category', 'adesao_afiliado')
        .eq('eligible_affiliate_type', 'logista')
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        setSubscriptionProduct(data);
      }
    } catch (error) {
      console.error('Erro ao carregar produto:', error);
    }
  };

  const handleVisibilityToggle = async (checked: boolean) => {
    if (checked) {
      // Ativar vitrine - verificar assinatura
      if (!hasActiveSubscription) {
        // Exibir modal de confirmação
        setShowSubscriptionModal(true);
      } else {
        // Já tem assinatura, ativar e persistir no banco
        setFormData({ ...formData, is_visible_in_showcase: true });
        
        // Persistir no banco imediatamente
        try {
          await storeFrontendService.saveProfile({
            ...formData,
            is_visible_in_showcase: true
          });
          
          toast({
            title: 'Vitrine ativada!',
            description: 'Sua loja está agora visível na vitrine pública.',
          });
        } catch (error) {
          console.error('Erro ao ativar vitrine:', error);
          toast({
            title: 'Erro ao ativar vitrine',
            description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
            variant: 'destructive'
          });
          // Reverter estado local em caso de erro
          setFormData({ ...formData, is_visible_in_showcase: false });
        }
      }
    } else {
      // Desativar vitrine - exibir modal de cancelamento
      setShowCancelModal(true);
    }
  };

  const handleConfirmSubscription = async () => {
    if (!affiliateId || !subscriptionProduct) return;

    try {
      setProcessingSubscription(true);

      // Criar assinatura via API
      const response = await fetch('/api/subscriptions/create-payment?action=create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId,
          billing_type: 'CREDIT_CARD' // Padrão para mensalidade
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Assinatura criada!',
          description: 'Sua mensalidade foi ativada. A primeira cobrança será processada imediatamente.',
        });

        // Ativar vitrine
        setFormData({ ...formData, is_visible_in_showcase: true });
        setHasActiveSubscription(true);
        setShowSubscriptionModal(false);
      } else {
        throw new Error(result.error || 'Erro ao criar assinatura');
      }
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: 'Erro ao criar assinatura',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
    } finally {
      setProcessingSubscription(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!affiliateId) return;

    try {
      setProcessingSubscription(true);

      // Cancelar assinatura via API
      const response = await fetch('/api/subscriptions/create-payment?action=cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: affiliateId
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Assinatura cancelada',
          description: 'Sua vitrine foi desativada e a assinatura foi cancelada.',
        });

        // Desativar vitrine
        setFormData({ ...formData, is_visible_in_showcase: false });
        setHasActiveSubscription(false);
        setShowCancelModal(false);
      } else {
        throw new Error(result.error || 'Erro ao cancelar assinatura');
      }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
        variant: 'destructive'
      });
    } finally {
      setProcessingSubscription(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validações
      if (!formData.store_name || !formData.city || !formData.state) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha nome da loja, cidade e estado',
          variant: 'destructive'
        });
        return;
      }

      await storeFrontendService.saveProfile(formData);

      toast({
        title: 'Sucesso!',
        description: hasProfile ? 'Perfil atualizado com sucesso' : 'Perfil criado com sucesso'
      });

      setHasProfile(true);
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar perfil',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateBusinessHours = (day: keyof BusinessHours, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      business_hours: {
        ...prev.business_hours!,
        [day]: {
          ...prev.business_hours![day],
          [field]: value
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isLogista) {
    return (
      <div className="max-w-2xl mx-auto">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Apenas afiliados do tipo Logista podem gerenciar perfil de loja.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Minha Loja</h1>
        <p className="text-muted-foreground">
          Gerencie as informações da sua loja na vitrine pública
        </p>
      </div>

      {/* Status */}
      {hasProfile && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Seu perfil está {formData.is_visible_in_showcase ? 'visível' : 'oculto'} na vitrine pública.
            {formData.slug && formData.is_visible_in_showcase && (
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => window.open(`/lojas/${formData.slug}`, '_blank')}
              >
                Ver minha loja
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">
            <Store className="h-4 w-4 mr-2" />
            Informações
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="h-4 w-4 mr-2" />
            Imagens
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="h-4 w-4 mr-2" />
            Horários
          </TabsTrigger>
          <TabsTrigger value="visibility">
            <Eye className="h-4 w-4 mr-2" />
            Visibilidade
          </TabsTrigger>
        </TabsList>

        {/* Tab: Informações */}
        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Dados principais da sua loja
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store_name">Nome da Loja *</Label>
                <Input
                  id="store_name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  placeholder="Ex: Loja Slim Quality Centro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva sua loja..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="street">Rua</Label>
                  <Input
                    id="street"
                    value={formData.street || ''}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    value={formData.number || ''}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complement">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.complement || ''}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.neighborhood || ''}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">Estado *</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(value) => setFormData({ ...formData, state: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZILIAN_STATES.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code || ''}
                    onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 0000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram || ''}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@usuario"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook || ''}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="usuario"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Imagens */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imagens da Loja</CardTitle>
              <CardDescription>
                Faça upload do logo e banner para sua vitrine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ImageUpload
                label="Logo da Loja"
                currentImageUrl={formData.logo_url}
                onImageUploaded={(url) => setFormData({ ...formData, logo_url: url })}
                folder="stores/logos"
                maxSizeMB={2}
                recommendedSize="200x200px, formato quadrado"
                aspectRatio="1:1"
              />

              <ImageUpload
                label="Banner da Loja"
                currentImageUrl={formData.banner_url}
                onImageUploaded={(url) => setFormData({ ...formData, banner_url: url })}
                folder="stores/banners"
                maxSizeMB={3}
                recommendedSize="1200x400px, formato horizontal"
                aspectRatio="3:1"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Horários */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(formData.business_hours || DEFAULT_BUSINESS_HOURS).map(([day, schedule]) => {
                const dayLabels: Record<string, string> = {
                  monday: 'Segunda-feira',
                  tuesday: 'Terça-feira',
                  wednesday: 'Quarta-feira',
                  thursday: 'Quinta-feira',
                  friday: 'Sexta-feira',
                  saturday: 'Sábado',
                  sunday: 'Domingo'
                };

                return (
                  <div key={day} className="flex items-center gap-4">
                    <div className="w-32">
                      <Label>{dayLabels[day]}</Label>
                    </div>

                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={schedule.open}
                        onChange={(e) => updateBusinessHours(day as keyof BusinessHours, 'open', e.target.value)}
                        disabled={schedule.closed}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={schedule.close}
                        onChange={(e) => updateBusinessHours(day as keyof BusinessHours, 'close', e.target.value)}
                        disabled={schedule.closed}
                        className="w-32"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!schedule.closed}
                        onCheckedChange={(checked) => updateBusinessHours(day as keyof BusinessHours, 'closed', !checked)}
                      />
                      <Label className="text-sm text-muted-foreground">
                        {schedule.closed ? 'Fechado' : 'Aberto'}
                      </Label>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Visibilidade */}
        <TabsContent value="visibility" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visibilidade na Vitrine</CardTitle>
              <CardDescription>
                Controle se sua loja aparece na vitrine pública
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Exibir na vitrine pública</Label>
                  <p className="text-sm text-muted-foreground">
                    Quando ativado, sua loja será visível para todos os visitantes
                  </p>
                  {hasActiveSubscription && (
                    <p className="text-xs text-success mt-1">
                      ✓ Assinatura ativa
                    </p>
                  )}
                </div>
                <Switch
                  checked={formData.is_visible_in_showcase}
                  onCheckedChange={handleVisibilityToggle}
                />
              </div>

              {formData.is_visible_in_showcase && formData.slug && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sua loja está visível em: <strong>/lojas/{formData.slug}</strong>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => navigate('/afiliados/dashboard')}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </>
          )}
        </Button>
      </div>

      {/* Modal de Confirmação de Assinatura */}
      <Dialog open={showSubscriptionModal} onOpenChange={setShowSubscriptionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ativar Vitrine Pública</DialogTitle>
            <DialogDescription>
              Para exibir sua loja na vitrine pública, é necessário uma assinatura mensal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {subscriptionProduct ? (
              <>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mensalidade</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(subscriptionProduct.monthly_fee_cents)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cobrança mensal recorrente
                  </p>
                </div>

                <Alert>
                  <CreditCard className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Primeira cobrança imediata:</strong> A primeira mensalidade será cobrada hoje. As próximas cobranças ocorrerão mensalmente.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm">
                  <p className="font-medium">Benefícios inclusos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Loja visível na vitrine pública</li>
                    <li>Página personalizada com seu slug</li>
                    <li>Receba clientes diretamente na sua loja</li>
                    <li>Aumente suas vendas e comissões</li>
                  </ul>
                </div>
              </>
            ) : (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Produto de mensalidade não encontrado. Entre em contato com o suporte.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubscriptionModal(false)}
              disabled={processingSubscription}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSubscription}
              disabled={processingSubscription || !subscriptionProduct}
            >
              {processingSubscription ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar e Ativar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Cancelamento */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Vitrine Pública</DialogTitle>
            <DialogDescription>
              Ao desativar a vitrine, sua assinatura mensal será cancelada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Atenção:</strong> Sua loja não será mais visível na vitrine pública e a assinatura mensal será cancelada. Você pode reativar a qualquer momento.
              </AlertDescription>
            </Alert>

            <div className="space-y-2 text-sm">
              <p className="font-medium">O que acontecerá:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Sua loja será removida da vitrine pública</li>
                <li>A assinatura mensal será cancelada</li>
                <li>Você pode reativar a qualquer momento</li>
                <li>Seus dados serão preservados</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(false)}
              disabled={processingSubscription}
            >
              Manter Ativa
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={processingSubscription}
            >
              {processingSubscription ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar Cancelamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
