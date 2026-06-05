// components/events/EventStockCountingPage.tsx

import ItemImage from '@/components/items/image';
import NavigationAccordion from '@/components/countPage/navigationAccordion';
import CircularProgressWithLabel from '@/components/utils/circularProgressWithLabel';
import CrateIcon from '@/components/icons/crateIcon';
import BottleIcon from '@/components/icons/bottleIcon';

import { itemCompareFn, translateSize } from '@/lib/models/item';

import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Skeleton,
  TextField,
} from '@mui/material';

import { ItemCategory } from '@prisma/client';
import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useMemo, useState } from 'react';

export type EventStockCountingMode = 'OPENING' | 'CLOSING';

type StockItem = {
  id: string;
  name: string;
  category: ItemCategory;
  image: string;
  sizeInMl: number | null;
  amountPerCrate: number;
  brand: {
    id: string;
    name: string;
  };
};

type StockCounting = {
  itemId: string;
  amount: number;
};

type EventStockCountingData = {
  event: {
    id: string;
    name: string;
    date: string;
  };

  /**
   * Abschlusszeitpunkt des aktuellen Workflows.
   *
   * OPENING -> openingCompletedAt
   * CLOSING -> closingCompletedAt
   */
  completedAt: string | null;

  /**
   * Wird nur vom closingStock-Endpoint benötigt.
   * Der Endbestand darf erst nach dem Anfangsbestand bearbeitet werden.
   */
  openingCompletedAt?: string | null;

  items: StockItem[];
  countings: StockCounting[];
};

type SavedStockCounting = {
  itemId: string;
  amount: number;
};

type ModeConfig = {
  endpoint: string;
  title: string;
  contextLabel: string;
  inputLabel: string;
  crateInputLabel: string;
  finalizeButtonLabel: string;
  finalizeDialogTitle: string;
  finalizeDescription: string;
  completedDescription: string;
};

export default function EventStockCountingPage({
  eventId,
  mode,
}: {
  eventId: string;
  mode: EventStockCountingMode;
}) {
  const router = useRouter();
  const config = getModeConfig(mode, eventId);

  const [data, setData] = useState<EventStockCountingData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string>();

  const [dialogOpen, setDialogOpen] = useState(false);

  const [index, setIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'bottle' | 'crate'>('bottle');

  const [amount, setAmount] = useState('');
  const [crateAmount, setCrateAmount] = useState('');
  const [residualAmount, setResidualAmount] = useState('');

  const orderedItems = useMemo(() => {
    return [...(data?.items || [])].sort(itemCompareFn);
  }, [data?.items]);

  const countings = data?.countings || [];
  const currentItem = orderedItems[index];

  const countingMap = useMemo(() => {
    return new Map(
      countings.map((counting) => [counting.itemId, counting.amount]),
    );
  }, [countings]);

  const currentAmount = currentItem
    ? countingMap.get(currentItem.id)
    : undefined;

  const completed = Boolean(data?.completedAt);

  const prerequisiteMissing = mode === 'CLOSING' && !data?.openingCompletedAt;

  const locked = completed || prerequisiteMissing;

  const progress =
    orderedItems.length > 0
      ? (countings.length / orderedItems.length) * 100
      : 0;

  const missingCount = Math.max(orderedItems.length - countings.length, 0);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    axios
      .get<EventStockCountingData>(config.endpoint)
      .then(({ data }) => setData(data))
      .catch((error) => {
        console.error(error);
        setError(`${config.title} konnte nicht geladen werden.`);
      })
      .finally(() => setLoading(false));
  }, [config.endpoint, config.title]);

  useEffect(() => {
    if (!currentItem) {
      setAmount('');
      setCrateAmount('');
      setResidualAmount('');
      return;
    }

    if (currentAmount === undefined) {
      setAmount('');
      setCrateAmount('');
      setResidualAmount('');
      return;
    }

    const crates = Math.floor(currentAmount / currentItem.amountPerCrate);

    setAmount(`${currentAmount}`);
    setCrateAmount(`${crates}`);
    setResidualAmount(`${currentAmount - crates * currentItem.amountPerCrate}`);
  }, [currentItem, currentAmount]);

  useEffect(() => {
    if (!currentItem || inputMode !== 'crate') return;

    const calculatedAmount =
      Number(crateAmount || 0) * currentItem.amountPerCrate +
      Number(residualAmount || 0);

    const fieldsAreEmpty = crateAmount === '' && residualAmount === '';

    setAmount(fieldsAreEmpty ? '' : `${calculatedAmount}`);
  }, [crateAmount, residualAmount, inputMode, currentItem]);

  const saveCounting = async () => {
    if (!currentItem || locked) return;

    const parsedAmount = Number(amount);

    if (amount === '' || !Number.isInteger(parsedAmount) || parsedAmount < 0) {
      setError('Bitte gib einen gültigen Bestand als ganze Zahl ein.');
      return;
    }

    setSaving(true);
    setError(undefined);

    try {
      const { data: counting } = await axios.post<SavedStockCounting>(
        config.endpoint,
        {
          itemId: currentItem.id,
          amount: parsedAmount,
        },
      );

      setData((currentData) => {
        if (!currentData) return currentData;

        return {
          ...currentData,
          countings: [
            ...currentData.countings.filter(
              (existingCounting) => existingCounting.itemId !== counting.itemId,
            ),
            counting,
          ],
        };
      });

      setIndex((currentIndex) =>
        Math.min(currentIndex + 1, orderedItems.length - 1),
      );
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const finalizeCounting = async () => {
    setFinalizing(true);
    setError(undefined);

    try {
      const { data } = await axios.put<{
        completedAt: string;
      }>(config.endpoint);

      setData((currentData) =>
        currentData
          ? {
              ...currentData,
              completedAt: data.completedAt,
            }
          : currentData,
      );

      setDialogOpen(false);
      router.push(`/events/${eventId}`);
    } catch (error) {
      console.error(error);
      setDialogOpen(false);
      setError(getApiErrorMessage(error));
    } finally {
      setFinalizing(false);
    }
  };

  const toggleInputMode = () => {
    if (!currentItem || currentItem.amountPerCrate <= 1 || locked) {
      return;
    }

    setInputMode((currentMode) =>
      currentMode === 'bottle' ? 'crate' : 'bottle',
    );
  };

  const navigateToCategory = (category: ItemCategory) => {
    const itemIndex = orderedItems.findIndex(
      (item) => item.category === category,
    );

    if (itemIndex >= 0) {
      setIndex(itemIndex);
    }
  };

  if (loading) {
    return <EventStockCountingSkeleton />;
  }

  if (!data) {
    return (
      <PageWrapper>
        <Alert severity="error">
          {config.title} konnte nicht geladen werden.
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
            <h1 className="truncate text-xl text-sky-700">{config.title}</h1>

            <p className="truncate text-xs text-gray-500">{data.event.name}</p>
          </div>

          <CircularProgressWithLabel value={progress} />
        </div>

        <LinearProgress
          variant="determinate"
          value={progress}
          className="rounded-full"
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

      {prerequisiteMissing && (
        <Alert severity="warning" className="mt-4">
          Der Anfangsbestand wurde noch nicht abgeschlossen. Erfasse und
          bestätige zuerst den Anfangsbestand, bevor du den Endbestand zählst.
        </Alert>
      )}

      {completed && (
        <Alert
          severity="success"
          icon={<CheckCircleRoundedIcon />}
          className="mt-4"
        >
          {config.completedDescription}
        </Alert>
      )}

      <section className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">{config.contextLabel}</p>

            <h2 className="text-lg font-medium text-sky-800">
              Position {orderedItems.length > 0 ? index + 1 : 0} von{' '}
              {orderedItems.length}
            </h2>
          </div>

          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span>
              {countings.length} / {orderedItems.length}
            </span>
          </div>
        </div>

        <NavigationAccordion
          items={orderedItems}
          countings={countings}
          onClickCategory={navigateToCategory}
        />
      </section>

      {orderedItems.length === 0 && (
        <Alert severity="info" className="mt-4">
          Es wurden noch keine Artikel für die Inventur freigeschaltet.
        </Alert>
      )}

      {currentItem && (
        <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center gap-6 text-4xl">
            <div className="flex w-full flex-col items-center text-sky-700">
              <ItemImage
                image={currentItem.image}
                category={currentItem.category}
              />

              <p className="text-sm text-gray-500">{currentItem.brand.name}</p>

              <h2 className="text-center text-2xl text-sky-800">
                {currentItem.name}{' '}
                {currentItem.sizeInMl
                  ? `(${translateSize(currentItem.sizeInMl)})`
                  : ''}
              </h2>

              {currentAmount !== undefined && (
                <p className="mt-1 text-sm text-emerald-600">
                  Bereits erfasst: {currentAmount} Flaschen
                </p>
              )}
            </div>

            {inputMode === 'bottle' ? (
              <TextField
                label={config.inputLabel}
                fullWidth
                type="number"
                value={amount}
                disabled={locked}
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                onChange={(event) => setAmount(event.currentTarget.value)}
              />
            ) : (
              <div className="flex w-full flex-col items-center">
                <TextField
                  label={config.crateInputLabel}
                  fullWidth
                  type="number"
                  value={crateAmount}
                  disabled={locked}
                  inputProps={{
                    min: 0,
                    step: 1,
                  }}
                  onChange={(event) =>
                    setCrateAmount(event.currentTarget.value)
                  }
                />

                <p className="py-2 text-4xl font-bold text-sky-700">+</p>

                <TextField
                  label="Restliche Flaschen"
                  fullWidth
                  type="number"
                  value={residualAmount}
                  disabled={locked}
                  inputProps={{
                    min: 0,
                    step: 1,
                  }}
                  onChange={(event) =>
                    setResidualAmount(event.currentTarget.value)
                  }
                />

                <p className="py-2 text-4xl font-bold text-sky-700">=</p>

                <div className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-3 py-3 text-base">
                  <span className="text-gray-500">Flaschen im Kühlwagen</span>

                  <span className="font-bold text-sky-800">{amount || 0}</span>
                </div>
              </div>
            )}

            {!locked && (
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={saving || amount === ''}
                onClick={saveCounting}
              >
                {saving ? 'Speichert ...' : 'Speichern und weiter'}
              </Button>
            )}

            <div className="flex w-full items-center justify-between">
              <button
                type="button"
                disabled={index === 0}
                onClick={() =>
                  setIndex((currentIndex) => Math.max(currentIndex - 1, 0))
                }
                className="flex h-12 w-16 items-center justify-start text-sky-700 disabled:text-gray-300"
              >
                <ArrowBackIosIcon />
              </button>

              {currentItem.amountPerCrate > 1 && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={toggleInputMode}
                  className="flex h-12 w-12 items-center justify-center text-sky-700 disabled:text-gray-300"
                  aria-label={
                    inputMode === 'crate'
                      ? 'Einzelne Flaschen eingeben'
                      : 'Kästen eingeben'
                  }
                >
                  {inputMode === 'crate' ? <BottleIcon /> : <CrateIcon />}
                </button>
              )}

              <button
                type="button"
                disabled={index === orderedItems.length - 1}
                onClick={() =>
                  setIndex((currentIndex) =>
                    Math.min(currentIndex + 1, orderedItems.length - 1),
                  )
                }
                className="flex h-12 w-16 items-center justify-end text-sky-700 disabled:text-gray-300"
              >
                <ArrowForwardIosIcon />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mt-5">
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
            disabled={prerequisiteMissing || countings.length === 0}
            onClick={() => setDialogOpen(true)}
          >
            {config.finalizeButtonLabel}
          </Button>
        )}
      </section>

      <FinalizeStockCountingDialog
        open={dialogOpen}
        finalizing={finalizing}
        missingCount={missingCount}
        title={config.finalizeDialogTitle}
        description={config.finalizeDescription}
        onClose={() => setDialogOpen(false)}
        onConfirm={finalizeCounting}
      />
    </PageWrapper>
  );
}

function FinalizeStockCountingDialog({
  open,
  finalizing,
  missingCount,
  title,
  description,
  onClose,
  onConfirm,
}: {
  open: boolean;
  finalizing: boolean;
  missingCount: number;
  title: string;
  description: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const complete = missingCount === 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>

      <DialogContent>
        {complete ? (
          <p className="text-gray-600">{description}</p>
        ) : (
          <Alert severity="warning">
            Es fehlen noch {missingCount}{' '}
            {missingCount === 1 ? 'Artikel' : 'Artikel'}. Nicht eingetragene
            Artikel werden mit 0 gewertet.
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Abbrechen</Button>

        <Button
          variant="contained"
          color={complete ? 'success' : 'warning'}
          disabled={finalizing}
          onClick={onConfirm}
        >
          {finalizing ? 'Schließt ab ...' : 'Abschließen'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function EventStockCountingSkeleton() {
  return (
    <PageWrapper>
      <div className="flex flex-col gap-4">
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={70} />
        <Skeleton variant="rounded" height={520} />
        <Skeleton variant="rounded" height={48} />
      </div>
    </PageWrapper>
  );
}

function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mb-6 mt-2 w-full max-w-2xl px-3">{children}</div>
  );
}

function getModeConfig(
  mode: EventStockCountingMode,
  eventId: string,
): ModeConfig {
  if (mode === 'OPENING') {
    return {
      endpoint: `/api/events/${eventId}/openingStock`,
      title: 'Anfangsbestand',
      contextLabel: 'Kühlwagen vor Veranstaltungsbeginn',
      inputLabel: 'Flaschen im Kühlwagen',
      crateInputLabel: 'Volle Kästen im Kühlwagen',
      finalizeButtonLabel: 'Anfangsbestand abschließen',
      finalizeDialogTitle: 'Anfangsbestand abschließen?',
      finalizeDescription:
        'Alle Artikel wurden gezählt. Nach dem Abschluss kann der Anfangsbestand zunächst nicht mehr verändert werden.',
      completedDescription:
        'Der Anfangsbestand wurde abgeschlossen. Die Werte werden schreibgeschützt angezeigt.',
    };
  }

  return {
    endpoint: `/api/events/${eventId}/closingStock`,
    title: 'Endbestand',
    contextLabel: 'Kühlwagen nach Veranstaltungsende',
    inputLabel: 'Verbleibende Flaschen im Kühlwagen',
    crateInputLabel: 'Verbleibende volle Kästen',
    finalizeButtonLabel: 'Endbestand abschließen',
    finalizeDialogTitle: 'Endbestand abschließen?',
    finalizeDescription:
      'Alle Artikel wurden gezählt. Nach dem Abschluss kann die Auswertung des offenen Thekenverkaufs erstellt werden.',
    completedDescription:
      'Der Endbestand wurde abgeschlossen. Die Werte werden schreibgeschützt angezeigt.',
  };
}

function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  const axiosError = error as AxiosError<string>;

  if (
    axiosError.response?.status === 409 &&
    axiosError.response.data === 'Opening stock must be completed first'
  ) {
    return 'Der Anfangsbestand muss zuerst abgeschlossen werden.';
  }

  return (
    axiosError.response?.data || 'Der Vorgang konnte nicht gespeichert werden.'
  );
}
