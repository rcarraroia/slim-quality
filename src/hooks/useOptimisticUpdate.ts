import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  rollbackDelay?: number;
}

export function useOptimisticUpdate<T>(
  initialData: T[],
  options: OptimisticUpdateOptions<T> = {}
) {
  const [data, setData] = useState<T[]>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);

  const optimisticUpdate = useCallback(async (
    updateFn: (data: T[]) => T[],
    asyncAction: () => Promise<any>
  ) => {
    const previousData = [...data];
    
    try {
      // Apply optimistic update immediately
      setData(updateFn(data));
      setIsUpdating(true);
      
      // Execute async action
      const result = await asyncAction();
      
      // Success
      setIsUpdating(false);
      options.onSuccess?.(result);
      
      return result;
    } catch (error) {
      // Rollback on error
      setData(previousData);
      setIsUpdating(false);
      
      toast.error('Erro ao atualizar. Alterações revertidas.');
      options.onError?.(error);
      
      throw error;
    }
  }, [data, options]);

  const optimisticAdd = useCallback(async (
    item: T,
    asyncAction: () => Promise<T>
  ) => {
    return optimisticUpdate(
      (current) => [...current, item],
      asyncAction
    );
  }, [optimisticUpdate]);

  const optimisticRemove = useCallback(async (
    predicate: (item: T) => boolean,
    asyncAction: () => Promise<void>
  ) => {
    return optimisticUpdate(
      (current) => current.filter(item => !predicate(item)),
      asyncAction
    );
  }, [optimisticUpdate]);

  const optimisticModify = useCallback(async (
    predicate: (item: T) => boolean,
    modifier: (item: T) => T,
    asyncAction: () => Promise<T>
  ) => {
    return optimisticUpdate(
      (current) => current.map(item => predicate(item) ? modifier(item) : item),
      asyncAction
    );
  }, [optimisticUpdate]);

  return {
    data,
    setData,
    isUpdating,
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
    optimisticModify
  };
}
