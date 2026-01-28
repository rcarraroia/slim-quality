
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { apiService } from "@/services/api.service";

const formSchema = z.object({
    name: z.string().min(2, {
        message: "Nome deve ter pelo menos 2 caracteres.",
    }),
    email: z.string().email({
        message: "Email inválido.",
    }),
    subject: z.string().optional(),
    message: z.string().min(10, {
        message: "A mensagem deve ter pelo menos 10 caracteres.",
    }),
});

export function ContactForm() {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            email: "",
            subject: "",
            message: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsSubmitting(true);
        try {
            // Usando o endpoint criado em api/contact.js
            // O endpoint está em /api/contact tanto no Vercel quanto no Express local.
            // E o apiService usa VITE_API_URL como base.
            // Portanto, devemos especificar o caminho correto: /api/contact.

            const response = await apiService.post("/api/contact", values);

            if (response.success) {
                toast.success("Mensagem enviada com sucesso!", {
                    description: "Entraremos em contato em breve.",
                });
                form.reset();
            } else {
                throw new Error(response.error || "Erro ao enviar mensagem");
            }
        } catch (error) {
            console.error("Erro no envio:", error);
            toast.error("Erro ao enviar mensagem", {
                description: "Por favor, tente novamente mais tarde ou verifique sua conexão.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="w-full max-w-md">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        placeholder="Seu nome"
                                        className="bg-background/10 border-white/20 text-background placeholder:text-background/60 focus:border-white focus:ring-white/20"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Input
                                        placeholder="Seu email"
                                        className="bg-background/10 border-white/20 text-background placeholder:text-background/60 focus:border-white focus:ring-white/20"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <Textarea
                                        placeholder="Como podemos ajudar?"
                                        className="min-h-[100px] resize-none bg-background/10 border-white/20 text-background placeholder:text-background/60 focus:border-white focus:ring-white/20"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-red-300" />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="w-full bg-white text-primary hover:bg-white/90 font-semibold"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                Enviar Mensagem
                                <Send className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
