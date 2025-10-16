import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  productName?: string;
  message?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function WhatsAppButton({ 
  productName, 
  message, 
  variant = "default",
  size = "default",
  className 
}: WhatsAppButtonProps) {
  const defaultMessage = "Olá! Tenho interesse nos colchões Slim Quality";
  const productMessage = productName 
    ? `Olá! Tenho interesse no produto: ${productName}` 
    : defaultMessage;
  
  const finalMessage = message || productMessage;
  const encodedMessage = encodeURIComponent(finalMessage);
  const whatsappUrl = `https://wa.me/5533998384177?text=${encodedMessage}`;

  return (
    <Button 
      asChild 
      variant={variant} 
      size={size}
      className={cn("gap-2", className)}
    >
      <a 
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <MessageCircle className="h-4 w-4" />
        <span>Fale com Especialista</span>
      </a>
    </Button>
  );
}
