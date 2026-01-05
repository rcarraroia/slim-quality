import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2 } from "lucide-react";
import { affiliateFrontendService } from "@/services/frontend/affiliate.service";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form data - REMOVIDOS: walletId, referralCode
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    birthDate: "",
    email: "",
    phone: "",
    city: "",
    state: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      toast({
        title: "Atenção",
        description: "Você precisa aceitar os termos para continuar",
        variant: "destructive"
      });
      return;
    }

    // Validar campos obrigatórios
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // REMOVIDO: walletId e referralCode do payload
      const affiliateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        document: formData.cpf
      };

      const result = await affiliateFrontendService.registerAffiliate(affiliateData);
      
      // Se chegou até aqui, o cadastro foi bem-sucedido
      setShowSuccess(true);
    } catch (error) {
      console.error('Erro ao cadastrar afiliado:', error);
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/afiliados/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2 pb-8">
            <div className="mx-auto h-12 w-12 rounded-lg bg-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Cadastro de Afiliado</CardTitle>
            <p className="text-muted-foreground">Preencha os dados e comece a ganhar hoje</p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Seção 1: Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações Pessoais</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="nome">
                    Nome Completo <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="nome" 
                    placeholder="Ex: Carlos Mendes" 
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cpf">
                      CPF <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="cpf" 
                      placeholder="000.000.000-00" 
                      value={formData.cpf}
                      onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                      required 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nascimento">
                      Data de Nascimento <span className="text-destructive">*</span>
                    </Label>
                    <Input 
                      id="nascimento" 
                      type="date" 
                      value={formData.birthDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                      required 
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Contato */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações de Contato</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">
                    Telefone/WhatsApp <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="telefone" 
                    placeholder="(00) 00000-0000" 
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input 
                      id="cidade" 
                      placeholder="Belo Horizonte" 
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.state} onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}>
                      <SelectTrigger id="estado">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {estados.map(estado => (
                          <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Seção 3: Termos */}
              <div className="space-y-4">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="font-normal cursor-pointer leading-tight">
                    Li e aceito os{" "}
                    <a 
                      href="/termos-afiliados" 
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      termos do programa de afiliados
                    </a>
                  </Label>
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-between pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => navigate("/afiliados")}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="lg" className="px-8" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando Conta...
                    </>
                  ) : (
                    "Criar Minha Conta"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-4">
            <div className="mx-auto">
              <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
            </div>
            <DialogTitle className="text-2xl">Bem-vindo ao Programa de Afiliados!</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-center">
                <p>Sua conta foi criada com sucesso. Configure sua Wallet ID nas configurações para começar a receber comissões.</p>
                
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">Conta de afiliado criada</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    <span className="text-sm">Configure sua Wallet ID para receber comissões</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />
                    <span className="text-sm">Comece a indicar e ganhar</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <Button onClick={handleSuccessClose} size="lg" className="w-full">
                    Acessar Meu Dashboard
                  </Button>
                  <Button variant="outline" className="w-full">
                    Falar com Suporte
                  </Button>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
