import { GetServerSidePropsContext } from 'next';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Skeleton } from '@mui/material';
import { translateSize } from '@/lib/models/item';
import { ApiGetItemResponse, ApiPutItemResponse } from '../api/items/[itemId]';
import EditIcon from '@mui/icons-material/Edit';
import EditItemDialog from '@/components/dialogs/editItem';
import InventoryChart from '@/components/utils/inventoryChart';

export default function ItemShowPage({ itemId }: { itemId: string }) {
  const [item, setItem] = useState<ApiGetItemResponse>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleUpdate = (newItem: ApiPutItemResponse) => {
    setItem((ogItem) => {
      if (!ogItem) return undefined;
      return { ...ogItem, ...newItem };
    });
    setDialogOpen(false);
  };

  useEffect(() => {
    axios(`/api/items/${itemId}`).then(({ data }) => {
      setItem(data);
    });
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/items"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          {item ? (
            <div className="w-full text-center">
              <h4 className="text-sm text-center text-gray-600">
                {item.brand.name}
              </h4>
              <h3 className="text-xl text-center text-sky-700">
                {item.name} ({translateSize(item.sizeInMl)})
              </h3>
            </div>
          ) : (
            <div className="w-full text-center">
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="text" sx={{ fontSize: '2rem' }} />
            </div>
          )}
          <button
            onClick={() => setDialogOpen(true)}
            className="text-sky-600 text-3xl mx-3"
          >
            <EditIcon fontSize="inherit" />
          </button>
        </div>
      </header>
      {item ? (
        <div className="px-3 flex flex-col gap-5 mt-8">
          <div className="w-full">
            <h4 className="text-base text-gray-600">Aktueller Bestand</h4>
            <h3 className="text-3xl text-sky-700">
              {item.amountInStock} Flaschen
            </h3>
          </div>
          <div className="w-full">
            <h4 className="text-base text-gray-600 text-center">
              Historische Bestandsveränderung
            </h4>
            <div className="mt-3 w-full">
              <InventoryChart
                data={item.countings.map((c) => ({
                  date: new Date(c.inventory.createdAt).toLocaleDateString(
                    'de'
                  ),
                  stock: c.amount,
                }))}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="px-3">
          <Skeleton variant="rounded" height={90} />
        </div>
      )}
      {item && (
        <EditItemDialog
          maxWidth="sm"
          item={item}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSuccess={handleUpdate}
        />
      )}
    </div>
  );
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { itemId } = context.query;
  return {
    props: {
      itemId,
    },
  };
}
