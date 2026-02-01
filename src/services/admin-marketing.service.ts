import { supabase } from '@/config/supabase';
import { MarketingMaterial, MaterialType } from '@/types/database.types';

export interface CreateMaterialDTO {
    title: string;
    description?: string;
    type: MaterialType;
    content_url?: string;
    content_text?: string;
    product_id?: string;
    template_vars?: string[];
    is_active?: boolean;
}

export interface UpdateMaterialDTO extends Partial<CreateMaterialDTO> { }

export class AdminMarketingService {

    /**
     * Listar todos os materiais (para Admin)
     */
    async listMaterials(filters?: { type?: MaterialType; productId?: string }) {
        let query = supabase
            .from('marketing_materials')
            .select(`
                *,
                product:products(id, name)
            `)
            .order('created_at', { ascending: false });

        if (filters?.type) {
            query = query.eq('type', filters.type);
        }

        if (filters?.productId) {
            query = query.eq('product_id', filters.productId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching materials:', error);
            throw new Error('Erro ao buscar materiais de marketing');
        }

        return data as MarketingMaterial[];
    }

    /**
     * Obter material por ID
     */
    async getMaterial(id: string) {
        const { data, error } = await supabase
            .from('marketing_materials')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as MarketingMaterial;
    }

    /**
     * Criar novo material
     */
    async createMaterial(data: CreateMaterialDTO) {
        // Garantir que template_vars seja um array JSON válido
        const payload = {
            ...data,
            template_vars: data.template_vars || []
        };

        const { data: newMaterial, error } = await supabase
            .from('marketing_materials')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('Error creating material:', error);
            throw error;
        }

        return newMaterial as MarketingMaterial;
    }

    /**
     * Atualizar material
     */
    async updateMaterial(id: string, data: UpdateMaterialDTO) {
        const { data: updatedMaterial, error } = await supabase
            .from('marketing_materials')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating material:', error);
            throw error;
        }

        return updatedMaterial as MarketingMaterial;
    }

    /**
     * Excluir material
     */
    async deleteMaterial(id: string) {
        const { error } = await supabase
            .from('marketing_materials')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    /**
     * Upload de arquivo para Storage
     */
    async uploadFile(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('marketing-materials')
            .upload(filePath, file);

        if (uploadError) {
            throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('marketing-materials')
            .getPublicUrl(filePath);

        return publicUrl;
    }
}

export const adminMarketingService = new AdminMarketingService();
