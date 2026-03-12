import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProductImage {
  image_url: string;
  alt_text?: string;
  is_primary?: boolean;
}

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Se não houver imagens, mostrar placeholder
  if (!images || images.length === 0) {
    return (
      <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-6xl mb-2">🛏️</div>
          <p className="text-sm">Sem imagem disponível</p>
        </div>
      </div>
    );
  }

  // Se houver apenas uma imagem, mostrar sem controles
  if (images.length === 1) {
    return (
      <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
        <img
          src={images[0].image_url}
          alt={images[0].alt_text || productName}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Imagem Principal com Navegação */}
      <div className="relative aspect-[4/3] bg-muted rounded-lg overflow-hidden group">
        <img
          src={images[currentIndex].image_url}
          alt={images[currentIndex].alt_text || `${productName} - Imagem ${currentIndex + 1}`}
          className="w-full h-full object-contain transition-opacity duration-300"
        />

        {/* Botões de Navegação (aparecem no hover) */}
        <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/80 hover:bg-background"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-background/80 hover:bg-background"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </div>

        {/* Indicador de Posição */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      <div className="grid grid-cols-4 gap-2">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={cn(
              "aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
              index === currentIndex
                ? "border-primary ring-2 ring-primary/20"
                : "border-transparent hover:border-muted-foreground/20"
            )}
          >
            <img
              src={image.image_url}
              alt={image.alt_text || `${productName} - Miniatura ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
