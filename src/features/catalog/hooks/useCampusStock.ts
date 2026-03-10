/**
 * useCampusStock — carga el stock activo por producto y sede desde Supabase.
 *
 * Utilizado en el catálogo para filtrar productos disponibles por campus.
 */
import { useEffect, useState } from 'react';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import type { Campus } from '@/shared/types/campus';

type CampusStockByProduct = Record<string, Record<Campus, number>>;

export function useCampusStock() {
  const [campusStock, setCampusStock] = useState<CampusStockByProduct>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await inventoryService.getActiveStockByCampus();
        setCampusStock(data);
      } catch (err) {
        console.error(err);
        setCampusStock({});
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return { campusStock, loading };
}
