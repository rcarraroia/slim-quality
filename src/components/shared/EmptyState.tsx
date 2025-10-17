import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  buttonText?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, buttonText, onAction }: EmptyStateProps) {
  return (
    <Card className="border-dashed border-2 bg-muted/20 p-12 text-center">
      <CardContent className="p-0 space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <Icon className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-foreground">{title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto">{description}</p>
        {buttonText && onAction && (
          <Button onClick={onAction} className="mt-4">
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}