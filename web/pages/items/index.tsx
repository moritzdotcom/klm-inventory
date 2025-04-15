import { Fragment, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import AddIcon from '@mui/icons-material/Add';
import { Skeleton } from '@mui/material';
import { ApiGetItemsResponse, ApiPostItemResponse } from '../api/items';
import NewItemDialog from '@/components/dialogs/newItem';
import {
  itemCompareFn,
  translateCategory,
  translateSize,
} from '@/lib/models/item';
import ItemImage from '@/components/utils/itemImage';
import { ItemCategory } from '@prisma/client';

export default function ItemsPage() {
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [items, setItems] = useState<ApiGetItemsResponse>([]);
  const [loading, setLoading] = useState(true);

  const handleNewItem = (item: ApiPostItemResponse) => {
    setItems((is) => [item, ...is]);
    setNewDialogOpen(false);
  };

  const orderedItems = useMemo(() => {
    return [...items].sort(itemCompareFn);
  }, [items]);

  useEffect(() => {
    setLoading(true);
    axios('/api/items')
      .then(({ data }) => setItems(data))
      .catch(console.log)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          <h3 className="w-full text-3xl text-center text-sky-700">Artikel</h3>
          <p className="invisible">Zurück</p>
        </div>
        <button
          onClick={() => setNewDialogOpen(true)}
          className="btn-primary mt-5 w-full flex items-center justify-center gap-1"
        >
          <AddIcon />
          <p>Neuen Artikel anlegen</p>
        </button>
      </header>
      <div className="px-3">
        <div className="pt-5 flex flex-col gap-5">
          {renderItems(loading, orderedItems)}
        </div>
        <NewItemDialog
          maxWidth="sm"
          open={newDialogOpen}
          onClose={() => setNewDialogOpen(false)}
          onSuccess={handleNewItem}
        />
      </div>
    </div>
  );
}

function renderItems(loading: boolean, items: ApiGetItemsResponse) {
  if (loading)
    return (
      <>
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
      </>
    );

  if (items.length == 0) {
    return <h3 className="text-center">Noch Keine Artikel</h3>;
  }

  let lastCategory: ItemCategory | null = null;
  return items.map((item) => {
    const showHeader = item.category !== lastCategory;
    lastCategory = item.category;
    return (
      <Fragment key={item.id}>
        {showHeader && (
          <h3 className="text-xl font-semibold text-gray-800">
            {translateCategory(item.category)}
          </h3>
        )}
        <Link
          href={`/items/${item.id}`}
          className="w-full rounded-md shadow px-4 py-3 text-sky-700 flex items-center gap-3 text-2xl"
        >
          <ItemImage image={item.image} category={item.category} />
          <div className="flex-grow">
            <h6 className="text-base text-gray-600">{item.brand.name}</h6>
            <h5 className="text-lg sm:text-xl">
              {item.name} ({translateSize(item.sizeInMl)})
            </h5>
          </div>
          <div>
            <h6 className="text-base text-gray-600">Bestand</h6>
            <h5 className="text-lg sm:text-xl text-right">
              {item.amountInStock}
            </h5>
          </div>
        </Link>
      </Fragment>
    );
  });
}
