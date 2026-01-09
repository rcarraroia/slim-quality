/**
 * Customer Login Page - Autenticação de Clientes
 * Rota: /entrar
 */

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { customerAuthService } from "@/services/customer-auth.service";
import { Loader2, User, ArrowLeft } from "lucide-react";

type FormMode = 'login' | 'register' | 'forgot';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login, register, isAuthenticated, isLoading, isAffiliate } = useCustomerAuth();
  
  const [mode, setMode] = useState<FormMode>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      if (isAffiliate) {
        navigate("/afiliados/dashboard");
      } else {
        navigate("/minha-conta");
      }
    }
  }, [isAuthenticated, isLoading, isAffiliate, navigate]);

  // Verificar se veio de reset de senha
  useEffect(() => {
    if (searchParams.get('reset') === 'true') {
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi alterada. Faça login com a nova senha.",
      });
    }
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(formData.email, formData.password);
        if (!result.success) {
          toast({
            title: "Erro no login",
            description: result.error || "Email ou senha incorretos",
            variant: "destructive"
          });
        }
      } else if (mode === 'register') {
        if (formData.password !== formData.confirmPassword) {
          toast({
            title: "Erro",
            description: "As senhas não coincidem",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        if (formData.password.length < 6) {
          toast({
            title: "Erro",
            description: "A senha deve ter pelo menos 6 caracteres",
            variant: "destructive"
          });
          setIsSubmitting(false);
          return;
        }

        const result = await register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password
        });

        if (result.success) {
          toast({
            title: "Conta criada!",
            description: "Bem-vindo à Slim Quality!",
          });
          navigate("/minha-conta");
        } else {
          toast({
            title: "Erro no cadastro",
            description: result.error || "Não foi possível criar sua conta",
            variant: "destructive"
          });
        }
      } else if (mode === 'forgot') {
        const result = await customerAuthService.resetPassword(formData.email);
        if (result.success) {
          toast({
            title: "Email enviado",
            description: "Verifique sua caixa de entrada para redefinir a senha",
          });
          setMode('login');
        } else {
          toast({
            title: "Erro",
            description: result.error || "Não foi possível enviar o email",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Erro:', error);
      toast({
        title: "Erro",
        description: "Erro interno. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-purple-500/10 to-background -z-10" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-green-600 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' && 'Entrar'}
            {mode === 'register' && 'Criar Conta'}
            {mode === 'forgot' && 'Recuperar Senha'}
          </CardTitle>
          <CardDescription>
            {mode === 'login' && 'Acesse sua conta Slim Quality'}
            {mode === 'register' && 'Crie sua conta para acompanhar pedidos'}
            {mode === 'forgot' && 'Enviaremos um link para redefinir sua senha'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                disabled={isSubmitting}
                required
              />
            </div>

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            {mode === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aguarde...
                </>
              ) : (
                <>
                  {mode === 'login' && 'Entrar'}
                  {mode === 'register' && 'Criar Conta'}
                  {mode === 'forgot' && 'Enviar Email'}
                </>
              )}
            </Button>
          </form>
          
          <Separator className="my-4" />
          
          <div className="space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <p>
                  Não tem conta?{" "}
                  <button 
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-green-600 hover:underline font-medium"
                  >
                    Criar conta
                  </button>
                </p>
                <p>
                  <button 
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-muted-foreground hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </p>
              </>
            )}

            {mode === 'register' && (
              <p>
                Já tem conta?{" "}
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-green-600 hover:underline font-medium"
                >
                  Fazer login
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <button 
                type="button"
                onClick={() => setMode('login')}
                className="flex items-center justify-center gap-1 text-muted-foreground hover:underline mx-auto"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            )}
          </div>

          <Separator className="my-4" />
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/afiliados")}
          >
            Quero Ser Afiliado
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
