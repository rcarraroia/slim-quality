import { Suspense, lazy, ComponentType } from 'react';
import { LoadingSpinner } from './loading-spinner';

interface LazyLoadProps {
  fallback?: React.ReactNode;
}

export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return (props: React.ComponentProps<T>) => (
    <Suspense
      fallback={
        fallback || (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-2">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          </div>
        )
      }
    >
      <LazyComponent {...props} />
    </Suspense>
  );
}
