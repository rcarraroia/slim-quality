/**
 * Login Page - Versão MOCK Simplificada
 * Redireciona automaticamente para o dashboard
 * TODO: Reimplementar autenticação real após finalizar sistema
 */

import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Mock login - redireciona automaticamente após 1 segundo
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🔐 Mock login - redirecionando para dashboard...');
      toast({
        title: "Login automático realizado!",
        description: "Entrando no sistema...",
      });
      navigate("/dashboard");
    }, 1000);

    return () => clearTimeout(timer);
  }, [navigate, toast]);

  const handleManualLogin = () => {
    console.log('🔐 Login manual - redirecionando imediatamente...');
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-background -z-10" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary" />
          </div>
          <CardTitle className="text-2xl">Entrar na Plataforma</CardTitle>
          <CardDescription>
            Acesso automático ativo (modo desenvolvimento)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (mock)</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@slimquality.com"
                value="admin@slimquality.com"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha (mock)</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value="123456"
                disabled
              />
            </div>
            
            <Button 
              type="button" 
              className="w-full" 
              onClick={handleManualLogin}
            >
              Entrar Agora
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Redirecionamento automático em 1 segundo...
            </div>
            
            <Separator />
            
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/afiliados")}
            >
              Quero Ser Afiliado
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
