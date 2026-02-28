import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, Tag, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/seo/SEOHead';
import { SchemaOrg } from '@/components/seo/SchemaOrg';
import { blogService } from '@/services/blog.service';
import { BlogPost as BlogPostType } from '@/types/blog.types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
  }, [slug]);

  const loadPost = async (postSlug: string) => {
    try {
      setLoading(true);
      const data = await blogService.getBySlug(postSlug);
      if (!data) {
        navigate('/blog');
        return;
      }
      setPost(data);
    } catch (error) {
      console.error('Erro ao carregar post:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o artigo.',
        variant: 'destructive'
      });
      navigate('/blog');
    } finally {
      setLoading(false);
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

  const shareOnSocial = (platform: 'facebook' | 'twitter' | 'linkedin') => {
    const url = window.location.href;
    const title = post?.title || '';
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link copiado!',
      description: 'O link do artigo foi copiado para a área de transferência.'
    });
  };

  if (loading) {
    return (
      <div className="container py-24">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando artigo...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  // Schema.org Article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.excerpt || post.meta_description,
    "image": post.featured_image,
    "datePublished": post.published_at,
    "dateModified": post.updated_at,
    "author": {
      "@type": "Organization",
      "name": "Slim Quality"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Slim Quality",
      "logo": {
        "@type": "ImageObject",
        "url": "https://slimquality.com.br/logo.png"
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://slimquality.com.br/blog/${post.slug}`
    }
  };

  // Breadcrumb Schema
  const breadcrumbSchema = [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://slimquality.com.br"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://slimquality.com.br/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": post.title,
      "item": `https://slimquality.com.br/blog/${post.slug}`
    }
  ];

  return (
    <>
      <SEOHead 
        title={post.meta_title || `${post.title} | Blog Slim Quality`}
        description={post.meta_description || post.excerpt || ''}
        keywords={post.meta_keywords || post.tags?.join(', ') || ''}
        canonical={`https://slimquality.com.br/blog/${post.slug}`}
        type="article"
        ogImage={post.featured_image}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleSchema, null, 2)
        }}
      />

      <SchemaOrg type="breadcrumb" data={breadcrumbSchema} />

      <div className="container py-24">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-primary transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-foreground">{post.title}</span>
        </nav>

        {/* Botão Voltar */}
        <Link to="/blog">
          <Button variant="ghost" className="mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para o blog
          </Button>
        </Link>

        {/* Artigo */}
        <article className="max-w-4xl mx-auto">
          {/* Header */}
          <header className="mb-12">
            {post.category && (
              <Badge variant="secondary" className="mb-4">
                {post.category}
              </Badge>
            )}
            <h1 className="text-5xl font-bold mb-6">{post.title}</h1>
            
            {post.excerpt && (
              <p className="text-xl text-muted-foreground mb-6">
                {post.excerpt}
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{post.published_at && formatDate(post.published_at)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{calculateReadTime(post.content)}</span>
              </div>
            </div>
          </header>

          {/* Imagem Destacada */}
          {post.featured_image && (
            <div className="aspect-video bg-muted overflow-hidden rounded-lg mb-12">
              <img
                src={post.featured_image}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Conteúdo */}
          <Card className="mb-12">
            <CardContent className="prose prose-lg max-w-none p-8">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </CardContent>
          </Card>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-12">
              <h3 className="text-lg font-semibold mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Compartilhar */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Compartilhar artigo</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => shareOnSocial('facebook')}
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnSocial('twitter')}
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  variant="outline"
                  onClick={() => shareOnSocial('linkedin')}
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  variant="outline"
                  onClick={copyLink}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Copiar link
                </Button>
              </div>
            </CardContent>
          </Card>
        </article>
      </div>
    </>
  );
}
