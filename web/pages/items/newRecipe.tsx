import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Alert,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { ItemCategory } from '@prisma/client';
import RecipeBuilder from '@/components/items/recipeBuilder';
import {
  RecipeComponentInput,
  RecipeItemOption,
} from '@/lib/models/itemRecipe';
import { CATEGORIES, translateCategory } from '@/lib/models/item';
import AutocompleteInput from '@/components/utils/autocompleteInput';
import OpenBarInferenceFields from '@/components/items/openBarInferenceFields';

type Brand = {
  id: string;
  name: string;
};

function parseEuroInput(value: string) {
  const normalized = value.replace(',', '.').trim();

  if (!normalized) return 0;

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed * 100);
}

export default function NewRecipePage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState<ItemCategory>();

  const [price, setPrice] = useState('');
  const [inventoryEnabled, setInventoryEnabled] = useState(false);

  const [waiterEnabled, setWaiterEnabled] = useState(true);

  const [deriveFromOpenBarStock, setDeriveFromOpenBarStock] = useState(false);

  const [openBarInferenceIngredientId, setOpenBarInferenceIngredientId] =
    useState('');

  const [openBarInferencePriority, setOpenBarInferencePriority] =
    useState('100');

  const [components, setComponents] = useState<RecipeComponentInput[]>([]);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [options, setOptions] = useState<RecipeItemOption[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get<Brand[]>('/api/brands'),
      axios.get<RecipeItemOption[]>('/api/items/options'),
    ])
      .then(([brandsResponse, optionsResponse]) => {
        setBrands(brandsResponse.data);
        setOptions(optionsResponse.data);
      })
      .catch(() => setError('Die Stammdaten konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    const priceCents = parseEuroInput(price);

    if (!name.trim()) {
      setError('Bitte gib einen Namen ein.');
      return;
    }

    if (!brandName) {
      setError('Bitte wähle eine Marke aus.');
      return;
    }

    if (priceCents === null) {
      setError('Bitte gib einen gültigen Preis ein.');
      return;
    }

    if (components.length === 0) {
      setError('Bitte füge mindestens eine Zutat hinzu.');
      return;
    }

    if (components.some((component) => component.amount <= 0)) {
      setError('Bitte gib für jede Zutat eine gültige Menge ein.');
      return;
    }

    const inferencePriority = Number(openBarInferencePriority);

    if (deriveFromOpenBarStock && !openBarInferenceIngredientId) {
      setError(
        'Bitte wähle einen Leitartikel für die Ableitung aus dem Warenverbrauch aus.',
      );

      return;
    }

    if (
      deriveFromOpenBarStock &&
      (!Number.isInteger(inferencePriority) || inferencePriority < 0)
    ) {
      setError('Bitte gib eine gültige Priorität ein.');

      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await axios.post<{
        item: {
          id: string;
        };
      }>('/api/items/recipes', {
        name: name.trim(),
        brandName,
        category,
        priceCents,
        inventoryEnabled,
        waiterEnabled,
        deriveFromOpenBarStock,
        openBarInferencePriority: deriveFromOpenBarStock
          ? inferencePriority
          : 0,
        openBarInferenceIngredientId: deriveFromOpenBarStock
          ? openBarInferenceIngredientId
          : null,
        recipeComponents: components,
      });

      await router.push(`/items/${response.data.item.id}`);
    } catch (error) {
      setError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error ??
              'Das Rezept konnte nicht gespeichert werden.')
          : 'Das Rezept konnte nicht gespeichert werden.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={450} sx={{ mt: 2 }} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-6">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/items"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            Artikel
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Neues Rezept
          </h1>

          <span className="invisible text-sm">Artikel</span>
        </div>
      </header>

      <section className="px-3 pt-4">
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
          }}
        >
          <Stack direction="row" spacing={1.5}>
            <RestaurantMenuRoundedIcon
              sx={{
                mt: 0.25,
                color: 'primary.main',
              }}
            />

            <div>
              <Typography variant="h6" fontWeight={700}>
                Verkaufsprodukt
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Lege zunächst den Artikel an, der auf der Tischkellner-Seite
                ausgegeben wird.
              </Typography>
            </div>
          </Stack>

          <Stack spacing={2} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Name"
              placeholder="Zum Beispiel Aperol Boot"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />

            <AutocompleteInput
              label="Marke"
              value={brandName}
              handleChange={(v) => setBrandName(v)}
              options={brands.map(({ name }) => name)}
            />

            <FormControl fullWidth>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={category}
                label="Kategorie"
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem value={c} key={c}>
                    {translateCategory(c)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
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

            <div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={inventoryEnabled}
                    onChange={(event) =>
                      setInventoryEnabled(event.target.checked)
                    }
                  />
                }
                label="In der Inventur anzeigen"
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={waiterEnabled}
                    onChange={(event) => setWaiterEnabled(event.target.checked)}
                  />
                }
                label="Für Tischkellner verfügbar"
              />
            </div>
            <OpenBarInferenceFields
              enabled={deriveFromOpenBarStock}
              onEnabledChange={setDeriveFromOpenBarStock}
              ingredientItemId={openBarInferenceIngredientId}
              onIngredientItemIdChange={setOpenBarInferenceIngredientId}
              priority={openBarInferencePriority}
              onPriorityChange={setOpenBarInferencePriority}
              options={options}
            />
          </Stack>
        </Paper>

        <Paper
          sx={{
            mt: 3,
            p: 2,
            borderRadius: 3,
          }}
        >
          <RecipeBuilder
            options={options}
            value={components}
            onChange={setComponents}
          />
        </Paper>

        <Button
          fullWidth
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={saving}
          onClick={handleSubmit}
          sx={{
            mt: 3,
            minHeight: 50,
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Rezept speichern
        </Button>
      </section>
    </main>
  );
}
