import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Image as ImageIcon,
    Video,
    FileText
} from "lucide-react";
import { adminMarketingService, CreateMaterialDTO } from "@/services/admin-marketing.service";
import { MarketingMaterial, MaterialType } from "@/types/database.types";
import { Badge } from "@/components/ui/badge";

export default function Materiais() {
    const { toast } = useToast();
    const [materials, setMaterials] = useState<MarketingMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<CreateMaterialDTO>>({
        title: "",
        description: "",
        type: "text",
        content_text: "",
        content_url: "",
        is_active: true,
        template_vars: []
    });

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            setLoading(true);
            const data = await adminMarketingService.listMaterials();
            setMaterials(data);
        } catch (error) {
            toast({
                title: "Erro ao carregar",
                description: "Não foi possível buscar os materiais.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (material?: MarketingMaterial) => {
        if (material) {
            setEditingId(material.id);
            setFormData({
                title: material.title,
                description: material.description,
                type: material.type,
                content_text: material.content_text,
                content_url: material.content_url,
                is_active: material.is_active,
                // fix: ensure template_vars is string[]
                template_vars: Array.isArray(material.template_vars) ? material.template_vars : []
            });
        } else {
            setEditingId(null);
            setFormData({
                title: "",
                description: "",
                type: "text",
                content_text: "",
                content_url: "",
                is_active: true,
                template_vars: []
            });
        }
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.type) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha o título e o tipo do material.",
                variant: "destructive"
            });
            return;
        }

        try {
            setSaving(true);

            // Se for copy, verificar placeholders
            if (formData.type === 'text' && !formData.content_text?.includes('{{LINK}}')) {
                // Auto-fix: Append {{LINK}} if missing
                setFormData(prev => ({
                    ...prev,
                    content_text: prev.content_text + '\n\nLink: {{LINK}}'
                }));
            }

            if (editingId) {
                await adminMarketingService.updateMaterial(editingId, formData);
                toast({ title: "Sucesso", description: "Material atualizado!" });
            } else {
                await adminMarketingService.createMaterial(formData as CreateMaterialDTO);
                toast({ title: "Sucesso", description: "Material criado!" });
            }

            setIsDialogOpen(false);
            loadMaterials();
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Falha ao salvar o material.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir?")) return;

        try {
            await adminMarketingService.deleteMaterial(id);
            toast({ title: "Excluído", description: "Material removido com sucesso." });
            loadMaterials();
        } catch (error) {
            toast({
                title: "Erro",
                description: "Não foi possível excluir.",
                variant: "destructive"
            });
        }
    };

    const getIcon = (type: MaterialType) => {
        switch (type) {
            case 'image': return <ImageIcon className="h-4 w-4 text-blue-500" />;
            case 'video': return <Video className="h-4 w-4 text-red-500" />;
            case 'text': return <FileText className="h-4 w-4 text-green-500" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Materiais de Marketing</h2>
                    <p className="text-muted-foreground">Gerencie templates, banners e copies para afiliados.</p>
                </div>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Material
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Material' : 'Novo Material'}</DialogTitle>
                        <DialogDescription>
                            Configure o conteúdo que será exibido aos afiliados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">Título</Label>
                            <Input
                                id="title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Tipo</Label>
                            <Select
                                value={formData.type}
                                onValueChange={(val) => setFormData({ ...formData, type: val as MaterialType })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Copy / Texto</SelectItem>
                                    <SelectItem value="image">Imagem</SelectItem>
                                    <SelectItem value="video">Vídeo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.type === 'text' ? (
                            <div className="grid grid-cols-4 items-start gap-4">
                                <Label htmlFor="content_text" className="text-right pt-2">Texto</Label>
                                <div className="col-span-3 space-y-2">
                                    <Textarea
                                        id="content_text"
                                        rows={6}
                                        value={formData.content_text}
                                        onChange={(e) => setFormData({ ...formData, content_text: e.target.value })}
                                        placeholder="Digite o modelo da mensagem..."
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Use <strong>{`{{LINK}}`}</strong> onde o link de afiliado deve aparecer.
                                        Outras variáveis: <strong>{`{{NOME_CLIENTE}}`}</strong>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="content_url" className="text-right">URL do Arquivo</Label>
                                <Input
                                    id="content_url"
                                    value={formData.content_url}
                                    onChange={(e) => setFormData({ ...formData, content_url: e.target.value })}
                                    className="col-span-3"
                                    placeholder="https://..."
                                />
                                {/* TODO: Implementar Upload Real na Fase de Refinamento */}
                            </div>
                        )}

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="is_active" className="text-right">Ativo</Label>
                            <div className="flex items-center space-x-2 title-col-span-3">
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : materials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    Nenhum material cadastrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            materials.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell className="flex items-center gap-2">
                                        {getIcon(material.type)}
                                        <span className="capitalize">{material.type}</span>
                                    </TableCell>
                                    <TableCell className="font-medium">{material.title}</TableCell>
                                    <TableCell>
                                        <Badge variant={material.is_active ? "default" : "secondary"}>
                                            {material.is_active ? "Ativo" : "Inativo"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(material)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(material.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
