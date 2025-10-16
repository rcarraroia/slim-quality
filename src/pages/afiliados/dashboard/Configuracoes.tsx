import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Shield, Bell, User, CheckCircle2, AlertCircle, Info, ExternalLink } from "lucide-react";

const estados = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function AffiliateDashboardConfiguracoes() {
  const { toast } = useToast();
  const [walletId, setWalletId] = useState("wal_000005162549");
  const [showWalletHelp, setShowWalletHelp] = useState(false);
  const [testingWallet, setTestingWallet] = useState(false);

  const handleSavePersonal = () => {
    toast({ title: "Dados salvos com sucesso!" });
  };

  const handleTestWallet = () => {
    setTestingWallet(true);
    setTimeout(() => {
      setTestingWallet(false);
      toast({ 
        title: "✅ Wallet ID válida!",
        description: "Conexão com Asaas confirmada"
      });
    }, 1500);
  };

  const handleUpdateWallet = () => {
    if (!walletId.startsWith("wal_")) {
      toast({
        title: "Wallet ID inválida",
        description: "A Wallet ID deve começar com 'wal_'",
        variant: "destructive"
      });
      return;
    }
    toast({ 
      title: "Wallet ID atualizada!",
      description: "Suas próximas comissões serão depositadas na nova conta"
    });
  };

  const handleSaveNotifications = () => {
    toast({ title: "Preferências de notificações salvas!" });
  };

  return (
    <div className="space-y-6">
      {/* Seção 1: Dados Pessoais */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados Pessoais</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" defaultValue="Carlos Mendes" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="carlos.mendes@email.com" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" defaultValue="(31) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" defaultValue="123.456.789-00" disabled />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" defaultValue="Belo Horizonte" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select defaultValue="MG">
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {estados.map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cep">CEP</Label>
              <Input id="cep" defaultValue="30000-000" />
            </div>
          </div>

          <Button onClick={handleSavePersonal}>Salvar Alterações</Button>
        </CardContent>
      </Card>

      {/* Seção 2: Conta Asaas */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>Configuração de Recebimento</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Atual */}
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <span className="font-semibold">Wallet ID Ativa</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Wallet ID atual: <span className="font-mono">wal_000005162549</span>
                </p>
                <p className="text-xs text-success mt-1">
                  Último teste: 12/Out/25 14:23 - ✅ Sucesso
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleTestWallet} disabled={testingWallet}>
                {testingWallet ? "Testando..." : "Testar Conexão"}
              </Button>
            </div>
          </div>

          {/* Alterar Wallet ID */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="walletId">Nova Wallet ID</Label>
              <div className="flex gap-2">
                <Input 
                  id="walletId" 
                  placeholder="wal_XXXXXXXXXXXX" 
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                />
                <Button onClick={handleUpdateWallet}>Atualizar</Button>
              </div>
              <button
                type="button"
                onClick={() => setShowWalletHelp(true)}
                className="text-sm text-primary hover:underline"
              >
                Como encontrar minha Wallet ID?
              </button>
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-orange-900 dark:text-orange-200">Atenção:</p>
                <p className="text-muted-foreground mt-1">
                  Ao alterar a Wallet ID, as próximas comissões serão depositadas na nova conta. 
                  Certifique-se de que a Wallet ID está correta.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção 3: Notificações */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notificações</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-comissao" className="cursor-pointer">Novas comissões</Label>
              <p className="text-sm text-muted-foreground">Receber email quando houver nova comissão</p>
            </div>
            <Checkbox id="notif-comissao" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-mensal" className="cursor-pointer">Resumo mensal</Label>
              <p className="text-sm text-muted-foreground">Receber email no resumo mensal</p>
            </div>
            <Checkbox id="notif-mensal" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-afiliados" className="cursor-pointer">Novos afiliados</Label>
              <p className="text-sm text-muted-foreground">Notificar sobre novos afiliados na rede</p>
            </div>
            <Checkbox id="notif-afiliados" defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notif-bonus" className="cursor-pointer">Promoções e bônus</Label>
              <p className="text-sm text-muted-foreground">Avisos de promoções e bônus</p>
            </div>
            <Checkbox id="notif-bonus" />
          </div>

          <Button onClick={handleSaveNotifications}>Salvar Preferências</Button>
        </CardContent>
      </Card>

      {/* Seção 4: Segurança */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Segurança</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Senha</Label>
            <Button variant="outline">Alterar Senha</Button>
          </div>

          <div className="space-y-2">
            <Label>Autenticação em 2 Fatores</Label>
            <Button variant="outline" disabled>Ativar 2FA (Em breve)</Button>
            <p className="text-xs text-muted-foreground">
              Adicione uma camada extra de segurança à sua conta
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Ajuda - Wallet ID */}
      <Dialog open={showWalletHelp} onOpenChange={setShowWalletHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Como Encontrar Sua Wallet ID</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="space-y-4">
              <ol className="space-y-3 list-decimal list-inside">
                <li>Acesse sua conta no Asaas (asaas.com)</li>
                <li>Vá em "Configurações" → "Integrações" → "API"</li>
                <li>Sua Wallet ID estará visível no formato: wal_XXXXXXXXXXXX</li>
                <li>Copie e cole aqui</li>
              </ol>
              <a 
                href="https://www.youtube.com/watch?v=example" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                📹 Ver vídeo tutorial
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button onClick={() => setShowWalletHelp(false)} className="w-full">
                Entendi
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </div>
  );
}
