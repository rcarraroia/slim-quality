import { useState, useEffect } from 'react';
import {
    Megaphone,
    Image as ImageIcon,
    Video,
    FileText,
    Search,
    Filter
} from 'lucide-react';
import { AffiliateFrontendService } from '@/services/frontend/affiliate.service';
import { MarketingMaterial, MaterialType } from '@/types/database.types';
import { MaterialCard } from '@/components/affiliates/MaterialCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

export default function AffiliateMaterials() {
    const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [affiliateData, setAffiliateData] = useState<{
        name: string;
        slug?: string;
        referralCode: string;
    } | null>(null);

    const affiliateService = new AffiliateFrontendService();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [status, data] = await Promise.all([
                affiliateService.checkAffiliateStatus(),
                affiliateService.getMarketingMaterials()
            ]);

            if (status.isAffiliate && status.affiliate) {
                setAffiliateData({
                    name: status.affiliate.name,
                    slug: status.affiliate.slug,
                    referralCode: status.affiliate.referralCode
                });
            }

            setMaterials(data);
        } catch (error) {
            console.error('Erro ao carregar materiais:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMaterials = materials.filter(material => {
        const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            material.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = activeTab === 'all' || material.type === activeTab;
        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-8 p-6 max-w-7xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <Megaphone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        Materiais de Marketing
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-2xl">
                        Acesse criativos de alta conversão, copies validadas e vídeos para impulsionar suas vendas.
                        Todos os links já vêm com seu código de rastreamento.
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-4 md:w-auto bg-slate-100 dark:bg-slate-800 p-1">
                        <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Filter className="w-4 h-4 mr-2" />
                            Todos
                        </TabsTrigger>
                        <TabsTrigger value="image" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Imagens
                        </TabsTrigger>
                        <TabsTrigger value="video" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <Video className="w-4 h-4 mr-2" />
                            Vídeos
                        </TabsTrigger>
                        <TabsTrigger value="text" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                            <FileText className="w-4 h-4 mr-2" />
                            Copies
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Buscar material..."
                        className="pl-9 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Grid de Materiais */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-3">
                            <Skeleton className="h-48 w-full rounded-xl" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMaterials.map((material) => (
                        <MaterialCard
                            key={material.id}
                            material={material}
                            affiliate={affiliateData!}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Nenhum material encontrado
                    </h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">
                        Tente mudar os filtros ou busque por outro termo.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => {
                            setActiveTab('all');
                            setSearchQuery('');
                        }}
                    >
                        Limpar Filtros
                    </Button>
                </div>
            )}
        </div>
    );
}
