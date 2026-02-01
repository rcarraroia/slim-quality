import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { MarketingMaterial } from '@/types/database.types';
import { interpolateMaterial } from '@/utils/interpolation';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";

interface TemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    material: MarketingMaterial | null;
    affiliate: {
        name: string;
        slug?: string;
        referralCode: string;
    };
}

export function TemplateModal({ isOpen, onClose, material, affiliate }: TemplateModalProps) {
    const { toast } = useToast();
    const [copied, setCopied] = useState(false);

    if (!material) return null;

    const processedContent = material.type === 'text'
        ? interpolateMaterial(material.content_text || '', {
            affiliateName: affiliate.name,
            affiliateSlug: affiliate.slug,
            affiliateReferralCode: affiliate.referralCode,
            productUrl: material.product_id ? undefined : window.location.origin
        })
        : '';

    const handleCopy = async () => {
        const text = processedContent || material.content_url;
        if (text) {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast({ title: "Copiado!" });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{material.title}</DialogTitle>
                    <DialogDescription>
                        {material.description || "Use este material em suas campanhas."}
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4 space-y-4">
                    {/* Visualização do Conteúdo */}
                    <div className="rounded-lg overflow-hidden border bg-slate-50 dark:bg-slate-900">
                        {material.type === 'image' && material.content_url && (
                            <img
                                src={material.content_url}
                                alt={material.title}
                                className="w-full h-auto max-h-[400px] object-contain"
                            />
                        )}

                        {material.type === 'video' && material.content_url && (
                            <video
                                src={material.content_url}
                                controls
                                className="w-full h-auto max-h-[400px]"
                            />
                        )}

                        {material.type === 'text' && (
                            <div className="p-6 whitespace-pre-line font-mono text-sm leading-relaxed">
                                {processedContent}
                            </div>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Fechar
                        </Button>

                        <Button onClick={handleCopy} className="min-w-[120px]">
                            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                            {copied ? 'Copiado' : 'Copiar'}
                        </Button>

                        {material.type !== 'text' && material.content_url && (
                            <Button variant="secondary" asChild>
                                <a href={material.content_url} download target="_blank" rel="noreferrer">
                                    <Download className="w-4 h-4 mr-2" />
                                    Baixar
                                </a>
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
