// pages/events/[eventId]/employeeDrinks.tsx

import ItemImage from '@/components/items/image';
import { itemCompareFn, translateSize } from '@/lib/models/item';

import {
  ApiGetEventEmployeeDrinksResponse,
  ApiPostEventEmployeeDrinksResponse,
} from '@/pages/api/events/[eventId]/employeeDrinks';

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import LocalDrinkRoundedIcon from '@mui/icons-material/LocalDrinkRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Skeleton,
  TextField,
} from '@mui/material';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

import { ItemCategory } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import { GetServerSidePropsContext } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useMemo, useState } from 'react';

type EmployeeDrinksData = ApiGetEventEmployeeDrinksResponse;

const CATEGORY_ORDER: ItemCategory[] = [
  'WATER',
  'SOFTDRINK',
  'BEER',
  'WINE',
  'CHAMPAGNE',
  'LIQUOR',
  'SPECIALS',
];

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  WATER: 'Wasser',
  SOFTDRINK: 'Softdrinks',
  BEER: 'Bier',
  WINE: 'Wein',
  CHAMPAGNE: 'Champagner',
  LIQUOR: 'Spirituosen',
  SPECIALS: 'Sonstiges',
};

export default function EmployeeDrinksPage({ eventId }: { eventId: string }) {
  const router = useRouter();

  const [data, setData] = useState<EmployeeDrinksData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [search, setSearch] = useState('');
  const [savingItemIds, setSavingItemIds] = useState<string[]>([]);

  const [finalizeDialogOpen, setFinalizeDialogOpen] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    axios
      .get<EmployeeDrinksData>(`/api/events/${eventId}/employeeDrinks`)
      .then(({ data }) => setData(data))
      .catch((error) => {
        console.error(error);
        setError('Die Mitarbeitergetränke konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, [eventId]);

  const issueMap = useMemo(() => {
    return new Map(
      (data?.issues || []).map((issue) => [issue.itemId, issue.quantity]),
    );
  }, [data?.issues]);

  const totalQuantity = useMemo(() => {
    return (data?.issues || []).reduce((sum, issue) => sum + issue.quantity, 0);
  }, [data?.issues]);

  const groupedItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filteredItems = [...(data?.items || [])]
      .sort(itemCompareFn)
      .filter((item) => {
        if (!normalizedSearch) return true;

        const label = [
          item.brand.name,
          item.name,
          item.sizeInMl ? translateSize(item.sizeInMl) : '',
        ]
          .join(' ')
          .toLowerCase();

        return label.includes(normalizedSearch);
      });

    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filteredItems.filter((item) => item.category === category),
    })).filter((group) => group.items.length > 0);
  }, [data?.items, search]);

  const completed = Boolean(data?.completedAt);

  const updateQuantity = async (itemId: string, quantityDelta: number) => {
    if (completed || savingItemIds.includes(itemId)) return;

    setSavingItemIds((currentIds) => [...currentIds, itemId]);
    setError(undefined);

    try {
      const { data: issue } =
        await axios.post<ApiPostEventEmployeeDrinksResponse>(
          `/api/events/${eventId}/employeeDrinks`,
          {
            itemId,
            quantityDelta,
          },
        );

      setData((currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          issues: [
            ...currentData.issues.filter(
              (existingIssue) => existingIssue.itemId !== issue.itemId,
            ),
            issue,
          ],
        };
      });
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error));
    } finally {
      setSavingItemIds((currentIds) =>
        currentIds.filter((savingItemId) => savingItemId !== itemId),
      );
    }
  };

  const finalize = async () => {
    setFinalizing(true);
    setError(undefined);

    try {
      const { data } = await axios.put<{
        completedAt: string;
      }>(`/api/events/${eventId}/employeeDrinks`);

      setData((currentData) =>
        currentData
          ? {
              ...currentData,
              completedAt: data.completedAt,
            }
          : currentData,
      );

      setFinalizeDialogOpen(false);
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error(error);
      setFinalizeDialogOpen(false);
      setError(getApiErrorMessage(error));
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return <EmployeeDrinksSkeleton />;
  }

  if (!data) {
    return (
      <PageWrapper>
        <Alert severity="error">
          Die Mitarbeitergetränke konnten nicht geladen werden.
        </Alert>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <header className="sticky top-0 z-10 -mx-3 bg-white/90 px-3 pb-3 backdrop-blur">
        <div className="flex items-center gap-2 py-3">
          <Link
            href={`/events/${eventId}`}
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            <span>Zurück</span>
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-xl text-sky-700">
              Mitarbeitergetränke
            </h1>

            <p className="truncate text-xs text-gray-500">{data.event.name}</p>
          </div>

          <div className="flex min-w-[42px] items-center justify-end gap-1 text-sm font-semibold text-sky-700">
            <LocalDrinkRoundedIcon fontSize="small" />
            {totalQuantity}
          </div>
        </div>

        <TextField
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Getränk suchen"
          size="small"
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRoundedIcon />
              </InputAdornment>
            ),
          }}
        />
      </header>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(undefined)}
          className="mt-4"
        >
          {error}
        </Alert>
      )}

      {completed && (
        <Alert
          severity="success"
          icon={<CheckCircleRoundedIcon />}
          className="mt-4"
        >
          Die Mitarbeitergetränke wurden abgeschlossen. Die Werte werden
          schreibgeschützt angezeigt.
        </Alert>
      )}

      <section className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
            <GroupsRoundedIcon />
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Erfasste Mitarbeitergetränke
            </p>

            <p className="mt-1 text-2xl font-semibold text-sky-800">
              {totalQuantity}
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Jede Änderung wird automatisch protokolliert.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-5 flex flex-col gap-5">
        {groupedItems.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-gray-500">
            Keine passenden Getränke gefunden.
          </div>
        ) : (
          groupedItems.map((group) => (
            <DrinkCategory
              key={group.category}
              title={CATEGORY_LABELS[group.category]}
            >
              {group.items.map((item) => {
                const quantity = issueMap.get(item.id) || 0;

                return (
                  <EmployeeDrinkCard
                    key={item.id}
                    item={item}
                    quantity={quantity}
                    saving={savingItemIds.includes(item.id)}
                    disabled={completed}
                    onChange={(quantityDelta) =>
                      updateQuantity(item.id, quantityDelta)
                    }
                  />
                );
              })}
            </DrinkCategory>
          ))
        )}
      </section>

      <section className="sticky bottom-0 -mx-3 mt-5 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur">
        {completed ? (
          <Button
            component={Link}
            href={`/events/${eventId}`}
            variant="outlined"
            fullWidth
            size="large"
          >
            Zur Event-Übersicht
          </Button>
        ) : (
          <Button
            variant="contained"
            color="success"
            fullWidth
            size="large"
            onClick={() => setFinalizeDialogOpen(true)}
          >
            Mitarbeitergetränke abschließen
          </Button>
        )}
      </section>

      <FinalizeEmployeeDrinksDialog
        open={finalizeDialogOpen}
        totalQuantity={totalQuantity}
        finalizing={finalizing}
        onClose={() => setFinalizeDialogOpen(false)}
        onConfirm={finalize}
      />
    </PageWrapper>
  );
}

function DrinkCategory({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
        {title}
      </h2>

      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function EmployeeDrinkCard({
  item,
  quantity,
  saving,
  disabled,
  onChange,
}: {
  item: ApiGetEventEmployeeDrinksResponse['items'][number];
  quantity: number;
  saving: boolean;
  disabled: boolean;
  onChange: (quantityDelta: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
          <ItemImage image={item.image} category={item.category} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-gray-500">{item.brand.name}</p>

          <h3 className="truncate font-medium text-sky-800">
            {item.name}{' '}
            {item.sizeInMl ? `(${translateSize(item.sizeInMl)})` : ''}
          </h3>

          <p
            className={`mt-1 text-sm font-semibold ${
              quantity > 0 ? 'text-emerald-600' : 'text-gray-400'
            }`}
          >
            {quantity} {quantity === 1 ? 'Getränk' : 'Getränke'}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2 col-s">
        <Button
          variant="outlined"
          color="inherit"
          disabled={disabled || saving || quantity === 0}
          startIcon={<RemoveRoundedIcon />}
          onClick={() => onChange(-1)}
          sx={{ gridColumn: 'span 2 / span 2' }}
        >
          1
        </Button>

        <Button
          variant="contained"
          disabled={disabled || saving}
          startIcon={<AddRoundedIcon />}
          onClick={() => onChange(1)}
          sx={{ gridColumn: 'span 3 / span 3' }}
        >
          1
        </Button>
      </div>
    </div>
  );
}

function FinalizeEmployeeDrinksDialog({
  open,
  totalQuantity,
  finalizing,
  onClose,
  onConfirm,
}: {
  open: boolean;
  totalQuantity: number;
  finalizing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mitarbeitergetränke abschließen?</DialogTitle>

      <DialogContent>
        <p className="text-gray-600">
          Insgesamt wurden{' '}
          <span className="font-semibold">
            {totalQuantity} {totalQuantity === 1 ? 'Getränk' : 'Getränke'}
          </span>{' '}
          erfasst.
        </p>

        {totalQuantity === 0 && (
          <Alert severity="info" className="mt-3">
            Es wurden keine Mitarbeitergetränke gebucht. Das ist zulässig und
            kann ausdrücklich als abgeschlossen gespeichert werden.
          </Alert>
        )}

        <p className="mt-3 text-sm text-gray-500">
          Nach dem Abschluss können die Werte zunächst nicht mehr verändert
          werden.
        </p>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>

        <Button
          variant="contained"
          color="success"
          disabled={finalizing}
          onClick={onConfirm}
        >
          {finalizing ? 'Schließt ab ...' : 'Abschließen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EmployeeDrinksSkeleton() {
  return (
    <PageWrapper>
      <div className="flex flex-col gap-4">
        <Skeleton variant="rounded" height={82} />
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={145} />
        <Skeleton variant="rounded" height={145} />
        <Skeleton variant="rounded" height={145} />
      </div>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-6 mt-2 w-full max-w-2xl px-3">{children}</div>
  );
}

function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  const axiosError = error as AxiosError<string>;

  return (
    axiosError.response?.data || 'Der Vorgang konnte nicht gespeichert werden.'
  );
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { eventId } = context.query;

  if (typeof eventId !== 'string') {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      eventId,
    },
  };
}
