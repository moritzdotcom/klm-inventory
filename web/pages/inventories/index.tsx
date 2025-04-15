import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Skeleton } from '@mui/material';
import { ApiGetInventoriesResponse } from '../api/inventories';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import CheckIcon from '@mui/icons-material/Check';

export default function InventoriesPage() {
  const [inventories, setInventories] = useState<ApiGetInventoriesResponse>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    axios('/api/inventories')
      .then(({ data }) => setInventories(data))
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
          <h3 className="w-full text-3xl text-center text-sky-700">
            Alle Inventuren
          </h3>
          <p className="invisible">Zurück</p>
        </div>
      </header>
      <div className="px-3 pt-5 flex flex-col gap-5">
        {renderInventories(loading, inventories)}
      </div>
    </div>
  );
}

function renderInventories(
  loading: boolean,
  inventories: ApiGetInventoriesResponse
) {
  if (loading)
    return (
      <>
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
      </>
    );

  if (inventories.length == 0) {
    return <h3 className="text-center">Noch Keine Bestandsaufnahmen</h3>;
  }

  return inventories.map((inventory) => (
    <Link
      key={inventory.id}
      href={`/inventories/${inventory.id}`}
      className="w-full rounded-md shadow p-3 flex items-center gap-3"
      style={{
        color: inventory.done
          ? 'var(--color-sky-700)'
          : 'var(--color-amber-700)',
      }}
    >
      {inventory.done ? (
        <CheckIcon fontSize="large" />
      ) : (
        <NewReleasesIcon fontSize="large" />
      )}
      <div>
        <p className="text-sm">Inventur nach</p>
        <h5 className="text-lg sm:text-xl font-semibold">
          {inventory.lastEvent.name}
        </h5>
        <h6 className="text-base text-gray-600">
          {new Date(inventory.createdAt).toLocaleDateString('de')} | von:{' '}
          {inventory.creator.name}
        </h6>
      </div>
    </Link>
  ));
}
