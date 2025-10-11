import { Link } from "react-router-dom";
import { MessageCircle, Mail, MapPin, Facebook, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Logo + Descrição */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-primary" />
              <span className="text-xl font-bold">Slim Quality</span>
            </div>
            <p className="text-sm text-muted">
              Colchões magnéticos terapêuticos para transformar suas noites e renovar sua vida.
            </p>
          </div>

          {/* Col 2: Links Rápidos */}
          <div>
            <h3 className="font-semibold mb-4">Links Rápidos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/produtos" className="hover:text-primary transition-colors">
                  Produtos
                </Link>
              </li>
              <li>
                <Link to="/tecnologias" className="hover:text-primary transition-colors">
                  Tecnologias
                </Link>
              </li>
              <li>
                <Link to="/afiliados" className="hover:text-primary transition-colors">
                  Programa de Afiliados
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-primary transition-colors">
                  Área do Cliente
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contato */}
          <div>
            <h3 className="font-semibold mb-4">Contato</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-primary" />
                <span>(33) 99838-4177</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>contato@slimquality.com</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span>Timóteo, MG - Brasil</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Redes Sociais */}
          <div>
            <h3 className="font-semibold mb-4">Siga-nos</h3>
            <div className="flex gap-4">
              <a 
                href="https://facebook.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-muted/20 mt-8 pt-8 text-center text-sm text-muted">
          <p>&copy; {new Date().getFullYear()} Slim Quality. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
