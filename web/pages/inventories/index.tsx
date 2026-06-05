// pages/inventories/index.tsx

import {
  ApiGetInventoriesResponse,
  ApiInventoryListItem,
  ApiPostInventoriesPayload,
  ApiPostInventoriesResponse,
} from '@/pages/api/inventories';

import AddRoundedIcon from '@mui/icons-material/AddRounded';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';

import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import axios, { AxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function InventoriesPage() {
  const router = useRouter();
  const [data, setData] = useState<ApiGetInventoriesResponse>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(undefined);

    axios
      .get<ApiGetInventoriesResponse>('/api/inventories')
      .then(({ data }) => setData(data))
      .catch((error) => {
        console.error(error);

        setError('Die Inventuren konnten nicht geladen werden.');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleInventoryCreated = (inventory: ApiPostInventoriesResponse) => {
    setData((currentData) => {
      if (!currentData) {
        return {
          inventories: [inventory],
          inventoryItemCount: 0,
        };
      }

      return {
        ...currentData,
        inventories: [inventory, ...currentData.inventories],
      };
    });

    setDialogOpen(false);

    router.push(`/inventories/${inventory.id}/count`);
  };

  return (
    <PageWrapper>
      <PageHeader />

      {error && (
        <Alert
          severity="error"
          onClose={() => setError(undefined)}
          sx={{ mt: 2 }}
        >
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        size="large"
        startIcon={<AddRoundedIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{
          mt: 2,
          borderRadius: 2,
          py: 1.25,
        }}
      >
        Neue Inventur starten
      </Button>

      <Box sx={{ mt: 3 }}>
        <Typography
          variant="h6"
          sx={{
            mb: 1.5,
            color: 'primary.main',
            fontWeight: 600,
          }}
        >
          Bestandsaufnahmen
        </Typography>

        {loading ? (
          <InventoryListSkeleton />
        ) : (
          <InventoryList
            inventories={data?.inventories || []}
            inventoryItemCount={data?.inventoryItemCount || 0}
          />
        )}
      </Box>

      <NewInventoryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleInventoryCreated}
      />
    </PageWrapper>
  );
}

function PageHeader() {
  return (
    <Box
      component="header"
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        mx: -2,
        px: 2,
        py: 1.5,
        bgcolor: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '88px minmax(0, 1fr) 88px',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Button
          component={Link}
          href="/"
          variant="text"
          size="small"
          startIcon={<ArrowBackIosIcon fontSize="inherit" />}
          sx={{
            justifyContent: 'flex-start',
            minWidth: 0,
            px: 0,
            textTransform: 'none',
          }}
        >
          Zurück
        </Button>

        <Typography
          variant="h5"
          color="primary"
          noWrap
          sx={{
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          Inventuren
        </Typography>

        <Box />
      </Box>
    </Box>
  );
}

function InventoryList({
  inventories,
  inventoryItemCount,
}: {
  inventories: ApiInventoryListItem[];
  inventoryItemCount: number;
}) {
  if (inventories.length === 0) {
    return (
      <Card
        variant="outlined"
        sx={{
          borderRadius: 3,
          borderStyle: 'dashed',
        }}
      >
        <CardContent
          sx={{
            px: 3,
            py: 5,
            textAlign: 'center',
          }}
        >
          <Inventory2RoundedIcon
            sx={{
              fontSize: 44,
              color: 'text.disabled',
            }}
          />

          <Typography variant="h6" sx={{ mt: 1.5 }}>
            Noch keine Inventuren vorhanden
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.75,
              mx: 'auto',
              maxWidth: 420,
            }}
          >
            Erstelle eine neue Bestandsaufnahme, um den aktuellen Lagerbestand
            unabhängig von einer Veranstaltung zu erfassen.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Stack spacing={1.5}>
      {inventories.map((inventory) => (
        <InventoryCard
          key={inventory.id}
          inventory={inventory}
          inventoryItemCount={inventoryItemCount}
        />
      ))}
    </Stack>
  );
}

function InventoryCard({
  inventory,
  inventoryItemCount,
}: {
  inventory: ApiInventoryListItem;
  inventoryItemCount: number;
}) {
  const progress =
    inventoryItemCount > 0
      ? Math.min((inventory.countedItemsCount / inventoryItemCount) * 100, 100)
      : 0;

  const fallbackLabel = `Inventur vom ${formatDate(inventory.createdAt)}`;

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        borderColor: inventory.done ? 'divider' : 'warning.light',
      }}
    >
      <CardActionArea
        component={Link}
        href={
          inventory.done
            ? `/inventories/${inventory.id}`
            : `/inventories/${inventory.id}/count`
        }
        sx={{
          display: 'block',
        }}
      >
        <CardContent
          sx={{
            p: 2,
            '&:last-child': {
              pb: 2,
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                borderRadius: '50%',
                bgcolor: inventory.done
                  ? 'rgba(46, 125, 50, 0.10)'
                  : 'rgba(237, 108, 2, 0.10)',
                color: inventory.done ? 'success.main' : 'warning.main',
              }}
            >
              {inventory.done ? (
                <CheckCircleRoundedIcon />
              ) : (
                <PendingActionsRoundedIcon />
              )}
            </Box>

            <Box
              sx={{
                minWidth: 0,
                flex: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 1,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    noWrap
                    sx={{
                      color: 'primary.main',
                      fontWeight: 700,
                    }}
                  >
                    {inventory.label || fallbackLabel}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.25 }}
                  >
                    {formatDateTime(inventory.createdAt)}
                    {' · '}
                    von {inventory.creator.name}
                  </Typography>
                </Box>

                <ChevronRightRoundedIcon
                  sx={{
                    flexShrink: 0,
                    color: 'text.disabled',
                  }}
                />
              </Box>

              {inventory.note && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                    display: '-webkit-box',
                    overflow: 'hidden',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {inventory.note}
                </Typography>
              )}

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  mt: 1.5,
                }}
              >
                <Chip
                  size="small"
                  color={inventory.done ? 'success' : 'warning'}
                  variant="outlined"
                  label={
                    inventory.done
                      ? 'Abgeschlossen'
                      : `${inventory.countedItemsCount} von ${inventoryItemCount} Artikeln`
                  }
                />

                {!inventory.done && (
                  <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{
                      fontWeight: 600,
                    }}
                  >
                    Inventur fortsetzen
                  </Typography>
                )}
              </Box>

              {!inventory.done && (
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  color="warning"
                  sx={{
                    mt: 1.25,
                    height: 5,
                    borderRadius: 999,
                  }}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function NewInventoryDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (inventory: ApiPostInventoriesResponse) => void;
}) {
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const reset = () => {
    setLabel('');
    setNote('');
    setError(undefined);
  };

  const handleClose = () => {
    if (saving) return;

    reset();
    onClose();
  };

  const createInventory = async () => {
    setSaving(true);
    setError(undefined);

    const payload: ApiPostInventoriesPayload = {
      label,
      note,
    };

    try {
      const { data } = await axios.post<ApiPostInventoriesResponse>(
        '/api/inventories',
        payload,
      );

      reset();
      onSuccess(data);
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Neue Inventur starten</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Die Bestandsaufnahme ist unabhängig von einer Veranstaltung. Du kannst
          beispielsweise das Hauptlager, einen Kühlwagen oder einen bestimmten
          Lagerbereich zählen.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Bezeichnung"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          fullWidth
          placeholder="Zum Beispiel: Hauptlager nach Wochenende"
          autoFocus
        />

        <TextField
          label="Notiz"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          fullWidth
          multiline
          minRows={3}
          placeholder="Optional: Hinweise zur Bestandsaufnahme"
          sx={{ mt: 2 }}
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Abbrechen
        </Button>

        <Button variant="contained" onClick={createInventory} disabled={saving}>
          {saving ? 'Erstellt ...' : 'Inventur starten'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function InventoryListSkeleton() {
  return (
    <Stack spacing={1.5}>
      <Skeleton variant="rounded" height={150} />
      <Skeleton variant="rounded" height={150} />
      <Skeleton variant="rounded" height={150} />
    </Stack>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 720,
        mx: 'auto',
        px: { xs: 2, sm: 3 },
        pb: 4,
      }}
    >
      {children}
    </Box>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getApiErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return 'Ein unbekannter Fehler ist aufgetreten.';
  }

  const axiosError = error as AxiosError<string>;

  return (
    axiosError.response?.data || 'Die Inventur konnte nicht erstellt werden.'
  );
}
