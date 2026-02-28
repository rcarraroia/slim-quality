import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  Facebook,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { storeFrontendService, StoreProfile } from '@/services/frontend/store.service';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { SEOHead } from '@/components/seo/SEOHead';

export default function StoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadStore();
    }
  }, [slug]);

  const loadStore = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await storeFrontendService.getBySlug(slug!);
      setStore(data);
    } catch (err) {
      console.error('Erro ao carregar loja:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar loja');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isOpen = store ? storeFrontendService.isStoreOpen(store.business_hours) : false;
  const businessHours = store ? storeFrontendService.formatBusinessHours(store.business_hours) : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Carregando loja...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error || 'Loja não encontrada'}
              </AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate('/lojas')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista de lojas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Schema LocalBusiness data
  const localBusinessData = {
    name: store.store_name,
    logo: store.logo_url,
    address: store.address,
    city: store.city,
    state: store.state,
    zipCode: store.zip_code,
    url: `https://slimquality.com.br/lojas/${store.slug}`,
    phone: store.phone
  };

  return (
    <>
      <SEOHead 
        title={`${store.store_name} | Loja Parceira Slim Quality em ${store.city}`}
        description={`Visite ${store.store_name} em ${store.city} - ${store.state}. Loja parceira Slim Quality com colchões magnéticos terapêuticos. ${store.address}.`}
        keywords={`loja slim quality ${store.city.toLowerCase()}, colchão magnético ${store.city.toLowerCase()}, ${store.store_name.toLowerCase()}, loja ${store.state.toLowerCase()}`}
        canonical={`https://slimquality.com.br/lojas/${store.slug}`}
        type="website"
      />
      
      <SchemaOrg type="localbusiness" data={localBusinessData} />
      
      <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative">
        {/* Banner */}
        {store.banner_url ? (
          <div className="h-64 bg-muted overflow-hidden">
            <img
              src={store.banner_url}
              alt={store.store_name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-64 bg-gradient-to-br from-primary/20 via-secondary/20 to-primary/20" />
        )}

        {/* Store Info Overlay */}
        <div className="container">
          <div className="relative -mt-16 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Logo */}
                  <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                    <AvatarImage src={store.logo_url} alt={store.store_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                      {getInitials(store.store_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-2">
                      <div>
                        <h1 className="text-3xl font-bold mb-2">{store.store_name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {store.neighborhood && `${store.neighborhood}, `}
                            {store.city} - {store.state}
                          </span>
                        </div>
                      </div>

                      <Badge variant={isOpen ? 'default' : 'secondary'} className="text-sm">
                        {isOpen ? 'Aberto agora' : 'Fechado'}
                      </Badge>
                    </div>

                    {store.description && (
                      <p className="text-muted-foreground mt-4">{store.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container pb-12">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>
                  {store.street && `${store.street}, `}
                  {store.number}
                  {store.complement && ` - ${store.complement}`}
                </p>
                <p>
                  {store.neighborhood && `${store.neighborhood}, `}
                  {store.city} - {store.state}
                </p>
                {store.zip_code && <p>CEP: {store.zip_code}</p>}

                {/* Mapa (placeholder) */}
                {store.latitude && store.longitude && (
                  <div className="mt-4 aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-sm text-muted-foreground">
                      Mapa: {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Horário de Funcionamento */}
            {businessHours.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Horário de Funcionamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {businessHours.map((schedule, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{schedule.split(':')[0]}</span>
                        <span className="font-medium">{schedule.split(':').slice(1).join(':').trim()}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contato */}
            <Card>
              <CardHeader>
                <CardTitle>Contato</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {store.phone && (
                  <a
                    href={`tel:${store.phone}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>{store.phone}</span>
                  </a>
                )}

                {store.whatsapp && (
                  <a
                    href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>WhatsApp: {store.whatsapp}</span>
                  </a>
                )}

                {store.email && (
                  <a
                    href={`mailto:${store.email}`}
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    <span>{store.email}</span>
                  </a>
                )}

                {store.website && (
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </a>
                )}

                <Separator />

                {/* Redes Sociais */}
                <div className="space-y-3">
                  {store.instagram && (
                    <a
                      href={`https://instagram.com/${store.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Instagram className="h-4 w-4" />
                      <span>@{store.instagram.replace('@', '')}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  )}

                  {store.facebook && (
                    <a
                      href={`https://facebook.com/${store.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                    >
                      <Facebook className="h-4 w-4" />
                      <span>{store.facebook}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            {store.referral_code && (
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Compre com este logista e ganhe benefícios exclusivos
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => navigate(`/produtos?ref=${store.referral_code}`)}
                  >
                    Ver Produtos
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Voltar */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/lojas')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para lista
            </Button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
