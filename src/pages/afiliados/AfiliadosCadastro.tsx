import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AfiliadosCadastro() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!acceptedTerms) {
      toast({
        title: "Atenção",
        description: "Você precisa aceitar os termos e condições para continuar.",
        variant: "destructive"
      });
      return;
    }

    // Simula cadastro
    setShowSuccess(true);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    navigate("/afiliados/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12">
      <div className="container mx-auto px-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/afiliados")}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Cadastro de Afiliado</h1>
          <p className="text-xl text-muted-foreground">
            Preencha seus dados e comece a ganhar comissões
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input id="nome" placeholder="Seu nome completo" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF *</Label>
                    <Input id="cpf" placeholder="000.000.000-00" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" placeholder="seu@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
                    <Input id="telefone" placeholder="(00) 00000-0000" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dataNascimento">Data de Nascimento *</Label>
                    <Input id="dataNascimento" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rg">RG</Label>
                    <Input id="rg" placeholder="00.000.000-0" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input id="cep" placeholder="00000-000" required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="endereco">Endereço *</Label>
                    <Input id="endereco" placeholder="Rua, Avenida..." required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número *</Label>
                    <Input id="numero" placeholder="123" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input id="complemento" placeholder="Apto, Bloco..." />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="bairro">Bairro *</Label>
                    <Input id="bairro" placeholder="Bairro" required />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input id="cidade" placeholder="Sua cidade" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Input id="estado" placeholder="UF" required maxLength={2} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Dados Bancários */}
            <Card>
              <CardHeader>
                <CardTitle>Dados Bancários para Recebimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="chavePix">Chave PIX (E-mail ou CPF) *</Label>
                    <Input id="chavePix" placeholder="seu@email.com ou CPF" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipoChave">Tipo de Chave PIX *</Label>
                    <select 
                      id="tipoChave" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="email">E-mail</option>
                      <option value="cpf">CPF</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Chave Aleatória</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> As comissões serão pagas via PIX na chave cadastrada. 
                    Certifique-se de que a chave está ativa e correta.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Senha */}
            <Card>
              <CardHeader>
                <CardTitle>Defina Sua Senha</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha *</Label>
                    <Input id="senha" type="password" placeholder="Mínimo 6 caracteres" required minLength={6} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha">Confirmar Senha *</Label>
                    <Input id="confirmarSenha" type="password" placeholder="Repita a senha" required minLength={6} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Termos */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="terms" 
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <label
                    htmlFor="terms"
                    className="text-sm leading-relaxed cursor-pointer"
                  >
                    Li e aceito os <a href="#" className="text-primary hover:underline">termos de uso</a> e a{" "}
                    <a href="#" className="text-primary hover:underline">política de privacidade</a>. 
                    Estou ciente de que as comissões seguem a estrutura de 10% (N1), 5% (N2) e 2% (N3) 
                    e que os pagamentos são realizados via PIX semanalmente.
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => navigate("/afiliados")}
              >
                Cancelar
              </Button>
              <Button type="submit" size="lg">
                Finalizar Cadastro
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Sucesso */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Bem-vindo ao Programa de Afiliados!
            </DialogTitle>
            <DialogDescription className="text-center space-y-4 pt-4">
              <p>
                Seu cadastro foi realizado com sucesso! 🎉
              </p>
              <p>
                Agora você já pode acessar seu dashboard, copiar seu link de indicação 
                e começar a ganhar comissões.
              </p>
              <div className="bg-primary/10 p-4 rounded-lg">
                <p className="text-sm font-medium text-foreground">
                  Seu link de afiliado:
                </p>
                <p className="text-xs text-primary font-mono break-all mt-1">
                  https://slimquality.com.br/?ref=CM001
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={handleSuccessClose} size="lg">
              Acessar Meu Dashboard
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a href="https://wa.me/553199999999">
                Falar com Suporte
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
