import BaseDialog, { BaseDialogProps } from './base';
import axios, { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { Close } from '@mui/icons-material';
import { ApiGetInventoryCountingResponse } from '@/pages/api/inventories/[inventoryId]/countings';
import { translateSize } from '@/lib/models/item';
import { ApiPutInventoryResponse } from '@/pages/api/inventories/[inventoryId]';

interface FinalizeCountingDialogProps extends BaseDialogProps {
  inventoryId: string;
  items: ApiGetInventoryCountingResponse['items'];
  countings: ApiGetInventoryCountingResponse['countings'];
  onSuccess?: (event: ApiPutInventoryResponse) => void;
}

export default function FinalizeCountingDialog({
  inventoryId,
  items,
  countings,
  open,
  onSuccess,
  ...other
}: FinalizeCountingDialogProps) {
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const { data: inventory } = await axios({
        url: `/api/inventories/${inventoryId}`,
        method: 'PUT',
        data: {
          done: true,
        },
      });
      onSuccess?.(inventory);
    } catch (e) {
      if (isAxiosError(e)) {
        console.log(e.response?.data);
      }
    }

    setLoading(false);
  };

  const itemsWithoutCounting = useMemo(() => {
    const countingItemsIds = countings.map(({ itemId }) => itemId);
    return items.filter(({ id }) => !countingItemsIds.includes(id));
  }, [countings]);

  const onClose = (event: {}) => {
    setLoading(false);
    other?.onClose?.(event, 'backdropClick');
  };

  return (
    <BaseDialog open={open} onClose={onClose} {...other}>
      <div className="w-full flex flex-col gap-4 p-5">
        <div className="flex justify-between items-end">
          <p className="text-gray-700 text-2xl">Inventur beenden</p>
          <button type="button" className="mb-3 text-3xl" onClick={onClose}>
            <Close fontSize="inherit" className="text-gray-500" />
          </button>
        </div>
        <h3 className="text-xl font-bold text-sky-700 text-center my-10">
          Inventur wirklich abschließen?
        </h3>
        {itemsWithoutCounting.length > 0 && (
          <div>
            <p>Die folgenden Artikel wurden noch nicht gezählt:</p>
            {itemsWithoutCounting.map((item) => (
              <div
                key={item.id}
                className="border-b last:border-0 py-3 border-gray-200"
              >
                <h6 className="text-sm text-gray-600">{item.brand.name}</h6>
                <h5 className="text-base">
                  {item.name} ({translateSize(item.sizeInMl)})
                </h5>
              </div>
            ))}
          </div>
        )}
        <button disabled={loading} onClick={onSubmit} className="btn-primary">
          Inventur Abschließen
        </button>
        <button disabled={loading} onClick={onClose} className="btn-secondary">
          Inventur Fortsetzen
        </button>
      </div>
    </BaseDialog>
  );
}
