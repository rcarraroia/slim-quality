import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { blogService } from '@/services/blog.service';
import { BlogPost } from '@/types/blog.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlogIndex() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadPosts();
    loadCategories();
  }, [selectedCategory]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await blogService.listPublished({ category: selectedCategory });
      setPosts(data);
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await blogService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const calculateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min de leitura`;
  };

  return (
    <>
      <SEOHead 
        title="Blog Slim Quality | Dicas sobre Sono, Saúde e Bem-Estar"
        description="Artigos sobre magnetoterapia, qualidade do sono, alívio de dores e bem-estar. Aprenda como melhorar sua saúde com nossos especialistas."
        keywords="blog colchão magnético, magnetoterapia artigos, dicas sono saudável, alívio dores blog, bem-estar saúde"
        canonical="https://slimquality.com.br/blog"
        type="website"
      />

      <div className="container py-24">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Blog Slim Quality</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Dicas, informações e novidades sobre saúde, bem-estar e qualidade do sono
          </p>
        </div>

        {/* Filtros de Categoria */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-12">
            <Button
              variant={!selectedCategory ? "default" : "outline"}
              onClick={() => setSelectedCategory(undefined)}
            >
              Todos
            </Button>
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando artigos...</p>
          </div>
        )}

        {/* Posts Grid */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
          </div>
        )}

        {!loading && posts.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map(post => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card className="h-full transition-all hover:shadow-xl hover:scale-[1.02]">
                  {post.featured_image && (
                    <div className="aspect-video bg-muted overflow-hidden">
                      <img
                        src={post.featured_image}
                        alt={post.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="h-4 w-4" />
                      <span>{post.published_at && formatDate(post.published_at)}</span>
                      <span>•</span>
                      <Clock className="h-4 w-4" />
                      <span>{calculateReadTime(post.content)}</span>
                    </div>
                    <h2 className="text-2xl font-bold line-clamp-2 hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </CardHeader>
                  <CardContent>
                    {post.excerpt && (
                      <p className="text-muted-foreground line-clamp-3 mb-4">
                        {post.excerpt}
                      </p>
                    )}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center text-primary font-semibold">
                      Ler artigo
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
