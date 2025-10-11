import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-full bg-primary" />
          <span className="text-xl font-bold">Slim Quality</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex md:items-center md:gap-6">
          <Link 
            to="/produtos" 
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Produtos
          </Link>
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
          
          <Button asChild>
            <a 
              href="https://wa.me/5533998384177?text=Olá!%20Tenho%20interesse%20nos%20colchões%20Slim%20Quality" 
              target="_blank"
              rel="noopener noreferrer"
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Fale com Especialista
            </a>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-16 left-0 right-0 bg-background border-b md:hidden">
            <div className="container py-4 px-4 space-y-3">
              <Link 
                to="/produtos" 
                className="block py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Produtos
              </Link>
              <Link 
                to="/tecnologias" 
                className="block py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tecnologias
              </Link>
              <Link 
                to="/afiliados" 
                className="block py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Seja Afiliado
              </Link>
              <Link 
                to="/login" 
                className="block py-2 text-sm font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                Entrar
              </Link>
              <Button asChild className="w-full">
                <a 
                  href="https://wa.me/5533998384177?text=Olá!%20Tenho%20interesse%20nos%20colchões%20Slim%20Quality" 
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Fale com Especialista
                </a>
              </Button>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
