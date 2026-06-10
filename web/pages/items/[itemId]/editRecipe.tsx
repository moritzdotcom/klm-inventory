import { GetServerSidePropsContext } from 'next';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Alert, Button, Paper, Skeleton, Typography } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import RecipeBuilder from '@/components/items/recipeBuilder';
import {
  RecipeComponentInput,
  RecipeItemOption,
} from '@/lib/models/itemRecipe';
import type { ApiGetItemRecipeResponse } from '@/pages/api/items/[itemId]/recipe';
import OpenBarInferenceFields from '@/components/items/openBarInferenceFields';

export default function EditRecipePage({ itemId }: { itemId: string }) {
  const router = useRouter();

  const [recipe, setRecipe] = useState<ApiGetItemRecipeResponse | null>(null);

  const [options, setOptions] = useState<RecipeItemOption[]>([]);

  const [components, setComponents] = useState<RecipeComponentInput[]>([]);

  const [deriveFromOpenBarStock, setDeriveFromOpenBarStock] = useState(false);

  const [openBarInferenceIngredientId, setOpenBarInferenceIngredientId] =
    useState('');

  const [openBarInferencePriority, setOpenBarInferencePriority] =
    useState('100');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      axios.get<ApiGetItemRecipeResponse>(`/api/items/${itemId}/recipe`),
      axios.get<RecipeItemOption[]>('/api/items/options'),
    ])
      .then(([recipeResponse, optionsResponse]) => {
        setRecipe(recipeResponse.data);
        setOptions(optionsResponse.data);
        setDeriveFromOpenBarStock(
          recipeResponse.data.item.deriveFromOpenBarStock,
        );
        setOpenBarInferenceIngredientId(
          recipeResponse.data.item.openBarInferenceIngredientId || '',
        );
        setOpenBarInferencePriority(
          String(recipeResponse.data.item.openBarInferencePriority || 100),
        );

        setComponents(
          recipeResponse.data.components.map((component) => ({
            ingredientItemId: component.ingredientItemId,
            amount: component.amount,
            unit: component.unit,
          })),
        );
      })
      .catch(() => setError('Die Rezeptur konnte nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [itemId]);

  const handleSave = async () => {
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
      await axios.put(`/api/items/${itemId}/recipe`, {
        recipeComponents: components,
        deriveFromOpenBarStock,
        openBarInferencePriority: deriveFromOpenBarStock
          ? inferencePriority
          : 0,
        openBarInferenceIngredientId: deriveFromOpenBarStock
          ? openBarInferenceIngredientId
          : null,
      });

      await router.push(`/items/${itemId}`);
    } catch (error) {
      setError(
        axios.isAxiosError(error)
          ? (error.response?.data?.error ??
              'Die Rezeptur konnte nicht gespeichert werden.')
          : 'Die Rezeptur konnte nicht gespeichert werden.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={440} sx={{ mt: 2 }} />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl bg-gray-50 pb-6">
      <header className="sticky top-0 z-20 bg-white/90 px-3 pb-3 pt-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href={`/items/${itemId}`}
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            Artikel
          </Link>

          <h1 className="flex-grow text-center text-xl font-semibold text-sky-800">
            Rezept bearbeiten
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

        {recipe && (
          <Paper
            sx={{
              mb: 3,
              p: 2,
              borderRadius: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Rezeptur für
            </Typography>

            <Typography variant="h6" fontWeight={700}>
              {recipe.item.brand.name} · {recipe.item.name}
            </Typography>
          </Paper>
        )}

        <Paper
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
          }}
        >
          <Typography variant="h6" fontWeight={700}>
            Ableitung für offene Theke
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Optional kannst du festlegen, ob dieses Produkt aus fehlenden
            Lagerartikeln rekonstruiert werden soll.
          </Typography>

          <OpenBarInferenceFields
            enabled={deriveFromOpenBarStock}
            onEnabledChange={setDeriveFromOpenBarStock}
            ingredientItemId={openBarInferenceIngredientId}
            onIngredientItemIdChange={setOpenBarInferenceIngredientId}
            priority={openBarInferencePriority}
            onPriorityChange={setOpenBarInferencePriority}
            options={options.filter((option) => option.id !== itemId)}
          />
        </Paper>

        <Paper
          sx={{
            p: 2,
            borderRadius: 3,
          }}
        >
          <RecipeBuilder
            options={options}
            value={components}
            onChange={setComponents}
            excludedItemId={itemId}
          />
        </Paper>

        <Button
          fullWidth
          variant="contained"
          startIcon={<SaveRoundedIcon />}
          disabled={saving}
          onClick={handleSave}
          sx={{
            mt: 3,
            minHeight: 50,
            borderRadius: 3,
            textTransform: 'none',
          }}
        >
          Änderungen speichern
        </Button>
      </section>
    </main>
  );
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      itemId: context.query.itemId,
    },
  };
}
