import { useState, useEffect } from 'react';
import { supabase } from '@/config/supabase';

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price_cents: number;
  width_cm: number;
  length_cm: number;
  height_cm: number;
  weight_kg: number | null;
  product_type: string;
  category: 'colchao' | 'ferramenta_ia';
  is_active: boolean;
  is_featured: boolean;
  display_order: number;
  product_images?: { image_url: string }[];
}

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('products')
        .select(`
          *,
          product_images(image_url)
        `)
        .eq('is_active', true)
        .eq('category', 'colchao')
        .is('deleted_at', null)
        .order('display_order', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      console.log('🔍 DEBUG - Dados retornados do Supabase:', data);
      console.log('🔍 DEBUG - Primeiro produto:', data?.[0]);
      console.log('🔍 DEBUG - product_images do primeiro produto:', data?.[0]?.product_images);

      setProducts(data || []);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [refreshTrigger]);

  // Escutar eventos de atualização de produtos
  useEffect(() => {
    const handleProductsUpdated = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('productsUpdated', handleProductsUpdated);

    return () => {
      window.removeEventListener('productsUpdated', handleProductsUpdated);
    };
  }, []);

  // Função para formatar produto para exibição na home
  const formatProductForHome = (product: Product) => {
    const priceInReais = product.price_cents / 100;

    console.log('🔍 DEBUG - Formatando produto:', product.name);
    console.log('🔍 DEBUG - product_images:', product.product_images);
    console.log('🔍 DEBUG - image_url extraída:', product.product_images?.[0]?.image_url);

    return {
      id: product.id,
      name: product.name,
      dimensions: `${product.width_cm}x${product.length_cm}x${product.height_cm}cm`,
      price: priceInReais,
      ideal: getIdealText(product.name),
      badge: getBadgeText(product),
      slug: product.slug || product.name.toLowerCase().replace(/\s/g, '-'),
      image: product.product_images?.[0]?.image_url
    };
  };

  const getIdealText = (name: string) => {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('solteiro')) return "Ideal para 1 pessoa, quartos compactos";
    if (nameLower.includes('padrão') || nameLower.includes('padrao')) return "Casais em quartos padrão, máximo custo-benefício";
    if (nameLower.includes('queen')) return "Casais que valorizam mais espaço";
    if (nameLower.includes('king')) return "Máximo luxo, conforto e espaço";
    return "Conforto e qualidade garantidos";
  };

  const getBadgeText = (product: Product) => {
    if (product.is_featured) return "Mais Vendido";
    if (product.name.toLowerCase().includes('king')) return "Máximo Conforto";
    return null;
  };

  const formattedProducts = products.map(formatProductForHome);

  const refetch = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    products: formattedProducts,
    rawProducts: products,
    loading,
    error,
    refetch
  };
};