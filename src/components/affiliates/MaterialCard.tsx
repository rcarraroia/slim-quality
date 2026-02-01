import { useState } from 'react';
import {
    Download,
    Copy,
    Check,
    ExternalLink,
    Image as ImageIcon,
    FileText,
    Link as LinkIcon,
    Play
} from 'lucide-react';
import { MarketingMaterial, MaterialType } from '@/types/database.types';
import { interpolateMaterial } from '@/utils/interpolation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MaterialCardProps {
    material: MarketingMaterial;
    affiliate: {
        name: string;
        slug?: string;
        referralCode: string;
    };
}

export function MaterialCard({ material, affiliate }: MaterialCardProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Interpolar variáveis (como {{LINK}})
    const processedContent = material.type === 'text'
        ? interpolateMaterial(material.content_text || '', {
            affiliateName: affiliate.name,
            affiliateSlug: affiliate.slug,
            affiliateReferralCode: affiliate.referralCode,
            productUrl: material.product_id ? undefined : window.location.origin
        })
        : '';

    const handleCopy = async () => {
        try {
            const textToCopy = processedContent || material.content_url;
            if (!textToCopy) return;

            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            toast({
                title: "Copiado!",
                description: "Conteúdo copiado para a área de transferência.",
                variant: "default",
            });

            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast({
                title: "Erro ao copiar",
                description: "Não foi possível copiar o conteúdo.",
                variant: "destructive",
            });
        }
    };

    const handleDownload = async () => {
        if (!material.content_url) return;

        try {
            setIsLoading(true);
            const response = await fetch(material.content_url);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${material.title.toLowerCase().replace(/\s+/g, '-')}.${material.type === 'image' ? 'png' : 'mp4'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            toast({
                title: "Erro ao baixar",
                description: "Não foi possível iniciar o download.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const getIcon = (type: MaterialType) => {
        switch (type) {
            case 'image': return <ImageIcon className="w-5 h-5 text-blue-500" />;
            case 'video': return <Play className="w-5 h-5 text-purple-500" />;
            case 'text': return <FileText className="w-5 h-5 text-green-500" />;
            default: return <LinkIcon className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all duration-300 group bg-white dark:bg-slate-900">

            {/* Header com Ícone e Tipo */}
            <CardHeader className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700">
                        {getIcon(material.type)}
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 line-clamp-1">
                            {material.title}
                        </h3>
                        <span className="text-xs text-slate-500 capitalize">{material.type}</span>
                    </div>
                </div>
                {material.product ? (
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                        Produto Específico
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="text-xs">
                        Geral
                    </Badge>
                )}
            </CardHeader>

            {/* Conteúdo Principal */}
            <CardContent className="p-0">
                {material.type === 'image' && material.content_url && (
                    <div className="aspect-video relative overflow-hidden bg-slate-100 group">
                        <img
                            src={material.content_url}
                            alt={material.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                )}

                {material.type === 'video' && material.content_url && (
                    <div className="aspect-video relative bg-slate-900 flex items-center justify-center">
                        <video
                            src={material.content_url}
                            className="w-full h-full object-cover"
                            controls={false}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                            <Play className="w-12 h-12 text-white opacity-80" />
                        </div>
                    </div>
                )}

                {material.type === 'text' && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 min-h-[160px] max-h-[160px] overflow-y-auto custom-scrollbar">
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line font-mono leading-relaxed">
                            {processedContent}
                        </p>
                    </div>
                )}
            </CardContent>

            {/* Footer com Ações */}
            <CardFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                {material.type === 'text' ? (
                    <Button
                        variant="default"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        {copied ? 'Copiado!' : 'Copiar Texto'}
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            className="flex-1 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                            onClick={handleCopy}
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="default"
                            className="flex-[3] bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={handleDownload}
                            disabled={isLoading}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {isLoading ? 'Baixando...' : 'Baixar Arquivo'}
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
