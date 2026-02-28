export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image: string | null;
  author_id: string | null;
  category: string | null;
  tags: string[] | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BlogPostCreate {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  published_at?: string;
}

export interface BlogPostUpdate {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  featured_image?: string;
  category?: string;
  tags?: string[];
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string;
  published_at?: string;
}

export interface BlogPostFilters {
  category?: string;
  tag?: string;
  search?: string;
  author_id?: string;
}
