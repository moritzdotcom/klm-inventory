import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  TextField,
} from '@mui/material';
import { ItemCategory } from '@prisma/client';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import ItemImage from '@/components/utils/itemImage';
import {
  CATEGORIES,
  isValidCategory,
  SIZESINML,
  translateCategory,
  translateSize,
} from '@/lib/models/item';
import type { ApiGetWaiterTrackingResponse } from '@/pages/api/events/[eventId]/waiter';
import AutocompleteInput from '@/components/utils/autocompleteInput';
import { getRealtimeSocket } from '@/lib/realtime/socket';

type PageMode = 'TRACK' | 'EDIT';
type WaiterItem = ApiGetWaiterTrackingResponse['items'][number];

type CreateItemPayload = {
  name: string;
  brandName: string;
  category: ItemCategory;
  sizeInMl: number;
  priceCents: number;
};

type CreateItemResponse = {
  item: WaiterItem;
};

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  });
}

function parseEuroInput(value: string) {
  const normalized = value.replace(',', '.').trim();

  if (!normalized) return null;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return null;

  return Math.round(parsed * 100);
}

function parseOptionalEuroInput(value: string) {
  const normalized = value.trim();

  if (!normalized) return 0;

  return parseEuroInput(normalized);
}

function formatEuroInput(cents: number) {
  if (cents === 0) return '';

  return String((cents / 100).toFixed(2)).replace('.', ',');
}

function recalculateWaiterData(
  current: ApiGetWaiterTrackingResponse,
  items: ApiGetWaiterTrackingResponse['items'],
): ApiGetWaiterTrackingResponse {
  const issuedTotalCents = items.reduce(
    (sum, item) => sum + item.totalCents,
    0,
  );

  return {
    ...current,
    items,
    settlement: {
      ...current.settlement,
      issuedTotalCents,
      differenceCents:
        issuedTotalCents - current.settlement.prepaidMinimumSpendCents,
    },
  };
}

export default function WaiterTrackingPage() {
  const router = useRouter();

  const eventId =
    typeof router.query.eventId === 'string' ? router.query.eventId : null;

  const [data, setData] = useState<ApiGetWaiterTrackingResponse | null>(null);

  const [mode, setMode] = useState<PageMode>('TRACK');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [waiterName, setWaiterName] = useState('');
  const [minimumSpend, setMinimumSpend] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editedItem, setEditedItem] = useState<WaiterItem | null>(null);

  const loadData = useCallback(
    async ({
      showLoadingState = true,
    }: {
      showLoadingState?: boolean;
    } = {}) => {
      if (!eventId) return;

      if (showLoadingState) {
        setLoading(true);
      }

      setError(null);

      try {
        const response = await axios.get<ApiGetWaiterTrackingResponse>(
          `/api/events/${eventId}/waiter`,
        );

        setData(response.data);
        setWaiterName(response.data.settlement.waiterName ?? '');

        setMinimumSpend(
          formatEuroInput(response.data.settlement.prepaidMinimumSpendCents),
        );
      } catch {
        setError('Die Abrechnung konnte nicht aktualisiert werden.');
      } finally {
        if (showLoadingState) {
          setLoading(false);
        }
      }
    },
    [eventId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateItemOptimistically = useCallback(
    (itemId: string, delta: number) => {
      setData((current) => {
        if (!current) return current;

        const items = current.items.map((item) => {
          if (item.id !== itemId) return item;

          const quantity = Math.max(0, item.quantity + delta);

          return {
            ...item,
            quantity,
            totalCents: quantity * item.unitPriceCents,
          };
        });

        const issuedTotalCents = items.reduce(
          (sum, item) => sum + item.totalCents,
          0,
        );

        return {
          ...current,
          items,
          settlement: {
            ...current.settlement,
            issuedTotalCents,
            differenceCents:
              issuedTotalCents - current.settlement.prepaidMinimumSpendCents,
          },
        };
      });
    },
    [],
  );

  const handleTrack = useCallback(
    async (itemId: string, delta: number) => {
      if (!eventId || !data || mode !== 'TRACK') return;

      const item = data.items.find((item) => item.id === itemId);

      if (!item || item.hidden || !item.priceConfigured) return;
      if (item.quantity + delta < 0) return;

      setError(null);
      updateItemOptimistically(itemId, delta);

      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }

      try {
        const response = await axios.post<ApiGetWaiterTrackingResponse>(
          `/api/events/${eventId}/waiter`,
          {
            itemId,
            delta,
          },
        );

        setData(response.data);
      } catch (error) {
        updateItemOptimistically(itemId, -delta);

        setError(
          axios.isAxiosError(error)
            ? (error.response?.data?.error ??
                'Die Änderung konnte nicht gespeichert werden.')
            : 'Die Änderung konnte nicht gespeichert werden.',
        );
      }
    },
    [data, eventId, mode, updateItemOptimistically],
  );

  const handleCreateItem = useCallback(
    async (payload: CreateItemPayload) => {
      if (!eventId || !data) return;

      const brand = data.brands.find(
        (brand) => brand.name === payload.brandName,
      ) ?? { id: '', name: payload.brandName };

      const temporaryId = `optimistic-${crypto.randomUUID()}`;

      const optimisticItem: WaiterItem = {
        id: temporaryId,
        name: payload.name,
        brandId: brand.id,
        brand,
        category: payload.category,
        sizeInMl: payload.sizeInMl,
        image: '',
        quantity: 0,
        unitPriceCents: payload.priceCents,
        totalCents: 0,
        hidden: false,
        priceConfigured: payload.priceCents > 0,
      };

      setItemDialogOpen(false);
      setError(null);

      setData((current) => {
        if (!current) return current;

        return recalculateWaiterData(current, [
          ...current.items,
          optimisticItem,
        ]);
      });

      try {
        const response = await axios.post<CreateItemResponse>(
          `/api/events/${eventId}/waiter/items`,
          payload,
        );

        setData((current) => {
          if (!current) return current;

          const items = current.items.map((item) =>
            item.id === temporaryId ? response.data.item : item,
          );

          return recalculateWaiterData(current, items);
        });
      } catch (error) {
        setData((current) => {
          if (!current) return current;

          const items = current.items.filter((item) => item.id !== temporaryId);

          return recalculateWaiterData(current, items);
        });

        setError(
          axios.isAxiosError(error)
            ? (error.response?.data?.error ??
                'Der Artikel konnte nicht gespeichert werden.')
            : 'Der Artikel konnte nicht gespeichert werden.',
        );
      }
    },
    [data, eventId],
  );

  const handleEditItemPrice = useCallback(
    async (item: WaiterItem, priceCents: number) => {
      if (!eventId) return;

      const previousPriceCents = item.unitPriceCents;

      setItemDialogOpen(false);
      setError(null);

      setData((current) => {
        if (!current) return current;

        const items = current.items.map((row) => {
          if (row.id !== item.id) return row;

          return {
            ...row,
            unitPriceCents: priceCents,
            totalCents: row.quantity * priceCents,
            priceConfigured: priceCents > 0,
          };
        });

        return recalculateWaiterData(current, items);
      });

      try {
        await axios.patch(`/api/events/${eventId}/waiter/items/${item.id}`, {
          action: 'editPrice',
          priceCents,
        });
      } catch (error) {
        setData((current) => {
          if (!current) return current;

          const items = current.items.map((row) => {
            if (row.id !== item.id) return row;

            return {
              ...row,
              unitPriceCents: previousPriceCents,
              totalCents: row.quantity * previousPriceCents,
              priceConfigured: previousPriceCents > 0,
            };
          });

          return recalculateWaiterData(current, items);
        });

        setError(
          axios.isAxiosError(error)
            ? (error.response?.data?.error ??
                'Der Preis konnte nicht gespeichert werden.')
            : 'Der Preis konnte nicht gespeichert werden.',
        );
      }
    },
    [eventId],
  );

  const handleSaveSettings = async () => {
    if (!eventId) return;

    const prepaidMinimumSpendCents = parseOptionalEuroInput(minimumSpend);

    if (prepaidMinimumSpendCents === null || prepaidMinimumSpendCents < 0) {
      setError('Bitte gib einen gültigen Mindestverzehr ein.');
      return;
    }

    setSavingSettings(true);
    setError(null);

    try {
      const response = await axios.patch<ApiGetWaiterTrackingResponse>(
        `/api/events/${eventId}/waiter`,
        {
          waiterName,
          prepaidMinimumSpendCents,
        },
      );

      setData(response.data);
    } catch {
      setError('Die Einstellungen konnten nicht gespeichert werden.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleClosed = async () => {
    if (!eventId || !data) return;

    const nextClosed = !data.settlement.closedAt;

    setError(null);

    // Optimistic Update
    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        settlement: {
          ...current.settlement,
          closedAt: nextClosed ? new Date() : null,
        },
      };
    });

    try {
      const response = await axios.patch<ApiGetWaiterTrackingResponse>(
        `/api/events/${eventId}/waiter`,
        {
          closed: nextClosed,
        },
      );

      setData(response.data);
    } catch {
      setData((current) => {
        if (!current) return current;

        return {
          ...current,
          settlement: {
            ...current.settlement,
            closedAt: data.settlement.closedAt,
          },
        };
      });

      setError('Der Status der Abrechnung konnte nicht gespeichert werden.');
    }
  };

  const handleVisibility = async (item: WaiterItem, hidden: boolean) => {
    if (!eventId || mode !== 'EDIT') return;

    setError(null);

    setData((current) => {
      if (!current) return current;

      return {
        ...current,
        items: current.items.map((row) =>
          row.id === item.id ? { ...row, hidden } : row,
        ),
      };
    });

    try {
      await axios.patch(`/api/events/${eventId}/waiter/items/${item.id}`, {
        action: 'visibility',
        hidden,
      });
    } catch {
      setData((current) => {
        if (!current) return current;

        return {
          ...current,
          items: current.items.map((row) =>
            row.id === item.id ? { ...row, hidden: !hidden } : row,
          ),
        };
      });

      setError('Die Sichtbarkeit konnte nicht gespeichert werden.');
    }
  };

  const visibleItems = useMemo(() => {
    if (!data) return [];

    const normalizedQuery = query.trim().toLocaleLowerCase('de-DE');

    return data.items.filter((item) => {
      if (mode === 'TRACK' && item.hidden) return false;

      if (!normalizedQuery) return true;

      const haystack = [
        item.name,
        item.brand.name,
        translateCategory(item.category),
        translateSize(item.sizeInMl),
      ]
        .join(' ')
        .toLocaleLowerCase('de-DE');

      return haystack.includes(normalizedQuery);
    });
  }, [data, mode, query]);

  const groupedItems = useMemo(() => {
    const groups = new Map<ItemCategory, typeof visibleItems>();

    for (const item of visibleItems) {
      const rows = groups.get(item.category) ?? [];
      rows.push(item);
      groups.set(item.category, rows);
    }

    return Array.from(groups.entries());
  }, [visibleItems]);

  useEffect(() => {
    if (!eventId) return;

    const socket = getRealtimeSocket();

    if (!socket) return;

    const joinRoom = () => {
      socket.emit('waiter:join', {
        eventId,
      });
    };

    const handleRemoteChange = (payload: {
      eventId: string;
      changedAt: string;
    }) => {
      if (payload.eventId !== eventId) return;

      /**
       * Der eigene Klick wurde bereits optimistisch angezeigt.
       * Das erneute Laden gleicht den lokalen Stand mit dem
       * tatsächlichen Datenbankstand ab und zeigt gleichzeitig
       * Änderungen anderer Geräte an.
       */
      loadData({
        showLoadingState: false,
      });
    };

    socket.on('connect', joinRoom);
    socket.on('waiter:changed', handleRemoteChange);

    if (socket.connected) {
      joinRoom();
    }

    return () => {
      socket.emit('waiter:leave', {
        eventId,
      });

      socket.off('connect', joinRoom);
      socket.off('waiter:changed', handleRemoteChange);
    };
  }, [eventId, loadData]);

  if (loading || !data) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Skeleton variant="rounded" height={112} />
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton variant="rounded" height={124} />
          <Skeleton variant="rounded" height={124} />
          <Skeleton variant="rounded" height={124} />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-40">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center text-sm text-sky-600">
            <ArrowBackIosIcon fontSize="inherit" />
            Zurück
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Tischkellner
          </h1>

          <IconButton
            size="small"
            onClick={() =>
              setMode((current) => (current === 'TRACK' ? 'EDIT' : 'TRACK'))
            }
            aria-label={
              mode === 'TRACK'
                ? 'Bearbeitungsmodus aktivieren'
                : 'Bearbeitungsmodus beenden'
            }
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2.5,
              bgcolor: mode === 'EDIT' ? 'success.50' : 'grey.100',
              color: mode === 'EDIT' ? 'success.main' : 'primary.main',
            }}
          >
            {mode === 'TRACK' ? (
              <EditRoundedIcon fontSize="small" />
            ) : (
              <CheckRoundedIcon fontSize="small" />
            )}
          </IconButton>
        </div>

        <div className="relative mt-3">
          <SearchRoundedIcon
            fontSize="small"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Artikel suchen..."
            className="w-full rounded-xl bg-gray-100 py-3 pl-10 pr-3 text-base outline-none ring-sky-500 transition focus:ring-2"
          />
        </div>
      </header>

      <section className="px-3 pt-4">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {data.event.name}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {mode === 'TRACK'
              ? 'Getränke schnell erfassen'
              : 'Abrechnung und Artikelauswahl bearbeiten'}
          </p>
        </div>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        {mode === 'EDIT' && (
          <section className="mb-5 rounded-2xl bg-white p-3 shadow-sm">
            <h3 className="font-semibold text-gray-900">Abrechnung</h3>

            <div className="mt-4 flex flex-col gap-3">
              <TextField
                fullWidth
                label="Tischkellner"
                value={waiterName}
                onChange={(event) => setWaiterName(event.target.value)}
              />

              <TextField
                fullWidth
                label="Bezahlter Mindestverzehr"
                value={minimumSpend}
                onChange={(event) => setMinimumSpend(event.target.value)}
                inputProps={{
                  inputMode: 'decimal',
                }}
                InputProps={{
                  endAdornment: '€',
                }}
              />

              <Button
                variant="contained"
                startIcon={<SaveOutlinedIcon />}
                disabled={savingSettings}
                onClick={handleSaveSettings}
                sx={{
                  minHeight: 46,
                  borderRadius: 3,
                  textTransform: 'none',
                }}
              >
                Einstellungen speichern
              </Button>
              <Button
                fullWidth
                variant={data.settlement.closedAt ? 'outlined' : 'contained'}
                color={data.settlement.closedAt ? 'warning' : 'success'}
                onClick={handleToggleClosed}
                sx={{
                  minHeight: 46,
                  borderRadius: 3,
                  textTransform: 'none',
                }}
              >
                {data.settlement.closedAt
                  ? 'Abrechnung wieder öffnen'
                  : 'Event abschließen'}
              </Button>
            </div>
          </section>
        )}

        {mode === 'EDIT' && (
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddCircleOutlineRoundedIcon />}
            onClick={() => {
              setEditedItem(null);
              setItemDialogOpen(true);
            }}
            sx={{
              mb: 3,
              minHeight: 50,
              borderRadius: 3,
              textTransform: 'none',
            }}
          >
            Artikel schnell anlegen
          </Button>
        )}

        {groupedItems.length === 0 ? (
          <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-sm">
            <p className="text-gray-500">Keine passenden Artikel gefunden.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groupedItems.map(([category, items]) => (
              <Fragment key={category}>
                <section>
                  <h3 className="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {translateCategory(category)}
                  </h3>

                  <div className="flex flex-col gap-3">
                    {items.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        mode={mode}
                        onTrack={handleTrack}
                        onEdit={() => {
                          setEditedItem(item);
                          setItemDialogOpen(true);
                        }}
                        onToggleVisibility={() =>
                          handleVisibility(item, !item.hidden)
                        }
                      />
                    ))}
                  </div>
                </section>
              </Fragment>
            ))}
          </div>
        )}
      </section>

      <SettlementFooter data={data} />

      <QuickItemDialog
        open={itemDialogOpen}
        item={editedItem}
        brands={data.brands}
        onClose={() => setItemDialogOpen(false)}
        onCreate={handleCreateItem}
        onEditPrice={handleEditItemPrice}
      />
    </main>
  );
}

function ItemCard({
  item,
  mode,
  onTrack,
  onEdit,
  onToggleVisibility,
}: {
  item: WaiterItem;
  mode: PageMode;
  onTrack: (itemId: string, delta: number) => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
}) {
  return (
    <article
      className={`overflow-hidden rounded-2xl bg-white shadow-sm transition ${
        item.hidden ? 'opacity-55' : ''
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <ItemImage image={item.image} category={item.category} />

        <div className="min-w-0 flex-grow">
          <p className="text-xs text-gray-500">{item.brand.name}</p>

          <h4 className="truncate text-base font-semibold text-gray-900">
            {item.name} ({translateSize(item.sizeInMl)})
          </h4>

          <p
            className={`mt-0.5 text-sm ${
              item.priceConfigured
                ? 'text-gray-500'
                : 'font-medium text-red-600'
            }`}
          >
            {item.priceConfigured
              ? `${formatCurrency(item.unitPriceCents)} je Flasche`
              : 'Preis fehlt'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums text-sky-800">
            {item.quantity}
          </p>

          <p className="text-xs text-gray-500">
            {formatCurrency(item.totalCents)}
          </p>
        </div>
      </div>

      {mode === 'TRACK' ? (
        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2">
          <button
            type="button"
            disabled={item.quantity === 0}
            onClick={() => onTrack(item.id, -1)}
            className="flex min-h-16 items-center justify-center rounded-xl bg-white text-gray-600 shadow-sm transition active:scale-[0.98] disabled:text-gray-300 disabled:shadow-none"
            aria-label={`${item.name}: eine Flasche entfernen`}
          >
            <RemoveIcon />
          </button>

          <button
            type="button"
            disabled={!item.priceConfigured}
            onClick={() => onTrack(item.id, 1)}
            className="flex min-h-16 items-center justify-center gap-1 rounded-xl bg-sky-700 text-lg font-semibold text-white shadow-sm transition active:scale-[0.98] active:bg-sky-800 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none"
          >
            <AddIcon />1 Flasche
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-2">
          <button
            type="button"
            onClick={onToggleVisibility}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-gray-600 shadow-sm transition active:scale-[0.98]"
          >
            {item.hidden ? (
              <>
                <VisibilityOutlinedIcon fontSize="small" />
                Einblenden
              </>
            ) : (
              <>
                <VisibilityOffOutlinedIcon fontSize="small" />
                Ausblenden
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-3 text-sm font-semibold text-sky-700 shadow-sm transition active:scale-[0.98]"
          >
            <EditOutlinedIcon fontSize="small" />
            Preis ändern
          </button>
        </div>
      )}
    </article>
  );
}

function SettlementFooter({ data }: { data: ApiGetWaiterTrackingResponse }) {
  const difference = data.settlement.differenceCents;

  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-3 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.08)] backdrop-blur">
      <div className="mx-auto w-full max-w-2xl">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Mindestverzehr</p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(data.settlement.prepaidMinimumSpendCents)}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-gray-500">Herausgegeben</p>
            <p className="font-semibold text-gray-800">
              {formatCurrency(data.settlement.issuedTotalCents)}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between rounded-xl bg-gray-100 px-3 py-2">
          <div>
            <p className="text-xs text-gray-500">
              {difference > 0
                ? 'Noch vom Kellner zu zahlen'
                : difference < 0
                  ? 'Verbleibender Mindestverzehr'
                  : 'Abrechnung ausgeglichen'}
            </p>

            <p
              className={`text-2xl font-bold ${
                difference > 0
                  ? 'text-red-700'
                  : difference < 0
                    ? 'text-emerald-700'
                    : 'text-gray-800'
              }`}
            >
              {formatCurrency(Math.abs(difference))}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function QuickItemDialog({
  open,
  item,
  brands,
  onClose,
  onCreate,
  onEditPrice,
}: {
  open: boolean;
  item: WaiterItem | null;
  brands: ApiGetWaiterTrackingResponse['brands'];
  onClose: () => void;
  onCreate: (payload: CreateItemPayload) => Promise<void>;
  onEditPrice: (item: WaiterItem, priceCents: number) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('');
  const [sizeInMl, setSizeInMl] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(item);

  useEffect(() => {
    if (!open) return;

    setName('');
    setBrandName('');
    setCategory('');
    setSizeInMl('');

    /**
     * Bei Preis 0 bleibt das Input bewusst leer.
     * Dadurch muss auf dem Event keine vorbefüllte 0 gelöscht werden.
     */
    setPrice(item ? formatEuroInput(item.unitPriceCents) : '');

    setError(null);
  }, [brands, item, open]);

  const handleSubmit = async () => {
    const priceCents = parseEuroInput(price);

    if (priceCents === null || priceCents <= 0) {
      setError('Bitte gib einen gültigen Verkaufspreis ein.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (item) {
        await onEditPrice(item, priceCents);
        return;
      }

      const parsedCategory = isValidCategory(category) ? category : null;
      const parsedSize = SIZESINML.includes(Number(sizeInMl))
        ? Number(sizeInMl)
        : null;

      if (!name.trim() || !brandName || !parsedSize || !parsedCategory) {
        setError('Bitte fülle alle Felder korrekt aus.');
        return;
      }

      await onCreate({
        name: name.trim(),
        brandName,
        category: parsedCategory,
        sizeInMl: parsedSize,
        priceCents,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: 4,
        },
      }}
    >
      <DialogTitle>
        {isEditing
          ? `${item?.name}: Preis anpassen`
          : 'Artikel schnell anlegen'}
      </DialogTitle>

      <DialogContent>
        <div className="flex flex-col gap-4 pt-2">
          {error && <Alert severity="error">{error}</Alert>}

          {!isEditing && (
            <>
              <FormControl fullWidth>
                <InputLabel>Kategorie</InputLabel>
                <Select
                  value={category}
                  label="Kategorie"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem value={c} key={c}>
                      {translateCategory(c)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <AutocompleteInput
                label="Marke"
                value={brandName}
                handleChange={(v) => setBrandName(v)}
                options={brands.map(({ name }) => name)}
              />
              <FormControl fullWidth>
                <InputLabel>Gebindegröße</InputLabel>
                <Select
                  value={sizeInMl}
                  label="Gebindegröße"
                  onChange={(e) => setSizeInMl(e.target.value)}
                >
                  {SIZESINML.map((s) => (
                    <MenuItem value={s} key={s}>
                      {translateSize(s)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Artikelname"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </>
          )}

          <TextField
            autoFocus={isEditing}
            fullWidth
            label="Verkaufspreis"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputProps={{
              inputMode: 'decimal',
            }}
            InputProps={{
              endAdornment: '€',
            }}
          />
        </div>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Abbrechen
        </Button>

        <Button
          variant="contained"
          disabled={saving}
          onClick={handleSubmit}
          sx={{
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
