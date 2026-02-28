import { supabase } from '@/config/supabase';
import { BlogPost, BlogPostCreate, BlogPostUpdate, BlogPostFilters } from '@/types/blog.types';

export const blogService = {
  /**
   * Listar posts publicados (público)
   */
  async listPublished(filters?: BlogPostFilters): Promise<BlogPost[]> {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .is('deleted_at', null)
      .order('published_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.tag) {
      query = query.contains('tags', [filters.tag]);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Buscar post por slug (público)
   */
  async getBySlug(slug: string): Promise<BlogPost | null> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .not('published_at', 'is', null)
      .lte('published_at', new Date().toISOString())
      .is('deleted_at', null)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return data;
  },

  /**
   * Listar todos os posts (admin)
   */
  async listAll(filters?: BlogPostFilters): Promise<BlogPost[]> {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.author_id) {
      query = query.eq('author_id', filters.author_id);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,excerpt.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },

  /**
   * Criar post (admin)
   */
  async create(post: BlogPostCreate): Promise<BlogPost> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('blog_posts')
      .insert({
        ...post,
        author_id: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Atualizar post (admin)
   */
  async update(id: string, updates: BlogPostUpdate): Promise<BlogPost> {
    const { data, error } = await supabase
      .from('blog_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Deletar post (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('blog_posts')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Publicar post
   */
  async publish(id: string): Promise<BlogPost> {
    return this.update(id, {
      published_at: new Date().toISOString()
    });
  },

  /**
   * Despublicar post
   */
  async unpublish(id: string): Promise<BlogPost> {
    return this.update(id, {
      published_at: null
    });
  },

  /**
   * Buscar categorias únicas
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('category')
      .not('category', 'is', null)
      .not('published_at', 'is', null)
      .is('deleted_at', null);

    if (error) throw error;

    const categories = [...new Set(data.map(p => p.category).filter(Boolean))];
    return categories as string[];
  },

  /**
   * Buscar tags únicas
   */
  async getTags(): Promise<string[]> {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('tags')
      .not('tags', 'is', null)
      .not('published_at', 'is', null)
      .is('deleted_at', null);

    if (error) throw error;

    const allTags = data.flatMap(p => p.tags || []);
    const uniqueTags = [...new Set(allTags)];
    return uniqueTags;
  }
};
