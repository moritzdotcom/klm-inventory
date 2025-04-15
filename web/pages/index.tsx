import { Session } from '@/hooks/useSession';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import LiquorRoundedIcon from '@mui/icons-material/LiquorRounded';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import HistoryIcon from '@mui/icons-material/History';
import AddIcon from '@mui/icons-material/Add';
import PersonIcon from '@mui/icons-material/Person';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import { ApiGetOpenInventoriesResponse } from './api/inventories/open';
import axios from 'axios';
import AppFooter from '@/components/utils/appFooter';

export default function Home({ session }: { session: Session }) {
  const { status } = session;
  const router = useRouter();
  const [openInventories, setOpenInventories] =
    useState<ApiGetOpenInventoriesResponse>([]);

  useEffect(() => {
    if (!router.isReady) return;
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router.isReady]);

  useEffect(() => {
    axios('/api/inventories/open').then(({ data }) => setOpenInventories(data));
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 mt-10 mb-5 flex flex-col gap-7">
      <div>
        <h1 className="text-5xl text-center font-bold text-sky-900">KLM</h1>
        <h2 className="text-xl text-center font-light text-sky-900">
          Lagerbestandstool
        </h2>
      </div>
      <LinkItem
        href="/events"
        text="Veranstaltungen"
        Icon={CelebrationRoundedIcon}
      />
      <LinkItem href="/items" text="Artikel" Icon={LiquorRoundedIcon} />
      <LinkItem href="/warehouse" text="Lager" Icon={WarehouseIcon} />
      <LinkItem href="/inventories" text="Inventuren" Icon={HistoryIcon} />
      <LinkItem href="/inventories/new" text="Neue Inventur" Icon={AddIcon} />
      <LinkItem href="/users" text="Benutzerverwaltung" Icon={PersonIcon} />
      <OpenInventoriesLink inventories={openInventories} />
      <AppFooter />
    </div>
  );
}

function LinkItem({
  href,
  text,
  Icon,
}: {
  href: string;
  text: string;
  Icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="w-full bg-sky-50 rounded-md shadow flex gap-3 items-center px-4 py-5 text-xl text-sky-700"
    >
      <Icon fontSize="large" />
      <p>{text}</p>
    </Link>
  );
}

function OpenInventoriesLink({
  inventories,
}: {
  inventories: ApiGetOpenInventoriesResponse;
}) {
  if (inventories.length == 0) return null;

  if (inventories.length == 1) {
    const { id, creator, lastEvent } = inventories[0];
    return (
      <Link
        href={`/inventories/${id}/count`}
        className="w-full bg-amber-50 rounded-md shadow flex gap-3 items-center px-4 py-3 text-xl text-amber-700"
      >
        <NewReleasesIcon fontSize="large" />
        <div>
          <p className="text-xl text-amber-700">Letzte Inventur fortsetzen</p>
          <p className="text-base text-gray-500">
            {lastEvent.name} | von: {creator.name}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/inventories/open`}
      className="w-full bg-amber-50 rounded-md shadow flex gap-3 items-center px-4 py-3 text-xl text-amber-700"
    >
      <NewReleasesIcon fontSize="large" />
      <p>Noch {inventories.length} offene Inventuren</p>
    </Link>
  );
}
