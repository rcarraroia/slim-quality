/**
 * Login Page - Autenticação JWT Real
 * Sistema de login para administradores
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { PasswordInput } from "@/components/ui/password-input";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Capturar returnUrl da query string ao montar componente
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl');
    if (returnUrl) {
      localStorage.setItem('login_return_url', returnUrl);
    }
  }, []);

  // Redirecionar se já autenticado
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      // Verificar se há returnUrl salva
      const returnUrl = localStorage.getItem('login_return_url');
      if (returnUrl) {
        localStorage.removeItem('login_return_url');
        navigate(returnUrl);
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast({
        title: "Erro de validação",
        description: "Email e senha são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(formData);

      if (success) {
        // Verificar se há returnUrl salva
        const returnUrl = localStorage.getItem('login_return_url');
        if (returnUrl) {
          localStorage.removeItem('login_return_url');
          navigate(returnUrl);
        } else {
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = (email: string, password: string) => {
    setFormData({ email, password });
    // Submeter automaticamente
    setTimeout(() => {
      const form = document.getElementById('login-form') as HTMLFormElement;
      form?.requestSubmit();
    }, 100);
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
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-background -z-10" />

      <div className="w-full max-w-md space-y-4">
        <Link
          to="/"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-2 w-fit"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Voltar à Home
        </Link>
        <Card className="w-full">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-primary" />
            </div>
            <CardTitle className="text-2xl">Painel Administrativo</CardTitle>
            <CardDescription>
              Faça login para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@slimquality.com.br"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <Separator className="my-4" />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Logins de teste:
              </p>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => handleQuickLogin('jbmkt01@gmail.com', 'jb250470')}
                disabled={isSubmitting}
              >
                João Bosco (Super Admin)
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => handleQuickLogin('rcarrarocoach@gmail.com', 'M&151173c@')}
                disabled={isSubmitting}
              >
                Renato Carraro (Super Admin)
              </Button>
            </div>

            <Separator className="my-4" />

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/afiliados")}
              disabled={isSubmitting}
            >
              Quero Ser Afiliado
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
