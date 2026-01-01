import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatWidget } from "@/components/chat/ChatWidget";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showChatWidget, setShowChatWidget] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-shadow duration-300">
        <nav className="container flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-primary transition-colors" />
            <span className="text-xl font-bold">Slim Quality</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:gap-6">
            <a 
              href="/#products" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Produtos
            </a>
            <Link 
              to="/tecnologias" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Tecnologias
            </Link>
            <Link 
              to="/afiliados" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Seja Afiliado
            </Link>
            <Link 
              to="/login" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Entrar
            </Link>
            
            <Button 
              onClick={() => setShowChatWidget(true)}
              className="transition-all duration-300 hover:scale-[1.02] gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Fale com Especialista
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>

          {/* Mobile Menu Overlay */}
          {mobileMenuOpen && (
            <div 
              className={cn(
                "fixed inset-0 top-16 bg-background/95 backdrop-blur-sm md:hidden transition-opacity duration-300",
                mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="container py-6 px-4 space-y-4" onClick={(e) => e.stopPropagation()}>
                <a 
                  href="/#products" 
                  className="block py-3 text-lg font-medium border-b hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Produtos
                </a>
                <Link 
                  to="/tecnologias" 
                  className="block py-3 text-lg font-medium border-b hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Tecnologias
                </Link>
                <Link 
                  to="/afiliados" 
                  className="block py-3 text-lg font-medium border-b hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Seja Afiliado
                </Link>
                <Link 
                  to="/login" 
                  className="block py-3 text-lg font-medium border-b hover:text-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Entrar
                </Link>
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowChatWidget(true);
                  }}
                  className="w-full mt-6 transition-all duration-300"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Fale com Especialista
                </Button>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Chat Widget */}
      {showChatWidget && (
        <ChatWidget onClose={() => setShowChatWidget(false)} />
      )}
    </>
  );
}