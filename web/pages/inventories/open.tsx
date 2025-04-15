import Link from 'next/link';
import { useEffect, useState } from 'react';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { ApiGetOpenInventoriesResponse } from '../api/inventories/open';
import axios from 'axios';

export default function OpenInventoriesPage() {
  const [openInventories, setOpenInventories] =
    useState<ApiGetOpenInventoriesResponse>([]);

  useEffect(() => {
    axios('/api/inventories/open').then(({ data }) => setOpenInventories(data));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          <h3 className="w-full text-3xl text-center text-sky-700">
            Offene Inventuren
          </h3>
          <p className="invisible">Zurück</p>
        </div>
      </header>
      <div className="px-3 pt-5 flex flex-col gap-7">
        {openInventories.map((i) => (
          <OpenInventoryLink inventory={i} key={i.id} />
        ))}
      </div>
    </div>
  );
}

function OpenInventoryLink({
  inventory,
}: {
  inventory: ApiGetOpenInventoriesResponse[number];
}) {
  const { id, creator, lastEvent } = inventory;
  return (
    <Link
      href={`/inventories/${id}/count`}
      className="w-full bg-amber-50 rounded-md shadow flex gap-3 items-center px-4 py-5 text-xl text-amber-700"
    >
      <AssignmentIcon fontSize="large" />
      <div>
        <p className="text-xl text-amber-700">
          Inventur vom {new Date(inventory.createdAt).toLocaleDateString('de')}{' '}
          fortsetzen
        </p>
        <p className="text-base text-gray-500">
          {lastEvent.name} | von: {creator.name}
        </p>
      </div>
    </Link>
  );
}
