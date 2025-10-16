import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AffiliateDashboardMeuLink() {
  const { toast } = useToast();
  const linkAfiliado = "https://slimquality.com.br/?ref=CM001";

  const handleCopy = () => {
    navigator.clipboard.writeText(linkAfiliado);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meu Link de Indicação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={linkAfiliado} readOnly className="font-mono" />
            <Button onClick={handleCopy} size="icon">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
