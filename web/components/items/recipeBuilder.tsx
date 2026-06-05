import { useMemo, useState } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { RecipeUnit } from '@prisma/client';
import {
  RecipeComponentInput,
  RecipeItemOption,
  formatRecipeAmount,
  getRecipeIngredientLabel,
  translateRecipeUnit,
} from '@/lib/models/itemRecipe';

type Props = {
  options: RecipeItemOption[];
  value: RecipeComponentInput[];
  onChange: (value: RecipeComponentInput[]) => void;
  excludedItemId?: string;
  disabled?: boolean;
};

export default function RecipeBuilder({
  options,
  value,
  onChange,
  excludedItemId,
  disabled = false,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<RecipeItemOption | null>(
    null,
  );

  const optionMap = useMemo(() => {
    return new Map(options.map((option) => [option.id, option]));
  }, [options]);

  const availableOptions = useMemo(() => {
    const selectedIds = new Set(
      value.map((component) => component.ingredientItemId),
    );

    return options.filter((option) => {
      if (option.id === excludedItemId) return false;
      if (selectedIds.has(option.id)) return false;

      return true;
    });
  }, [excludedItemId, options, value]);

  const handleAdd = () => {
    if (!selectedItem) return;

    onChange([
      ...value,
      {
        ingredientItemId: selectedItem.id,
        amount: 1,
        unit: RecipeUnit.UNIT,
      },
    ]);

    setSelectedItem(null);
  };

  const handleUpdate = (
    index: number,
    patch: Partial<RecipeComponentInput>,
  ) => {
    onChange(
      value.map((component, componentIndex) =>
        componentIndex === index
          ? {
              ...component,
              ...patch,
            }
          : component,
      ),
    );
  };

  const handleRemove = (index: number) => {
    onChange(
      value.filter((_component, componentIndex) => componentIndex !== index),
    );
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          Rezeptur zusammenstellen
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Wähle die Artikel aus, die beim Herausgeben dieses Produktes
          theoretisch verbraucht werden.
        </Typography>
      </Box>

      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 3,
          borderColor: 'grey.200',
          bgcolor: 'grey.50',
        }}
      >
        <Stack
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          spacing={1}
        >
          <Autocomplete
            fullWidth
            disabled={disabled}
            options={availableOptions}
            value={selectedItem}
            onChange={(_event, nextValue) => setSelectedItem(nextValue)}
            getOptionLabel={getRecipeIngredientLabel}
            isOptionEqualToValue={(option, selected) =>
              option.id === selected.id
            }
            renderOption={(props, option) => (
              <Box
                component="li"
                {...props}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600} noWrap>
                    {option.name}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {option.brand.name}
                    {option.sizeInMl ? ` · ${option.sizeInMl} ml` : ''}
                  </Typography>
                </Box>

                {option.inventoryEnabled && (
                  <Chip
                    size="small"
                    label="Inventur"
                    icon={<Inventory2OutlinedIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      height: 22,
                      fontSize: 11,
                    }}
                  />
                )}
              </Box>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Zutat suchen"
                placeholder="Zum Beispiel Aperol oder Secco"
              />
            )}
          />

          <Button
            variant="contained"
            disabled={disabled || !selectedItem}
            startIcon={<AddRoundedIcon />}
            onClick={handleAdd}
            sx={{
              minHeight: 52,
              minWidth: {
                sm: 140,
              },
              borderRadius: 2.5,
              textTransform: 'none',
            }}
          >
            Hinzufügen
          </Button>
        </Stack>
      </Paper>

      {value.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            mt: 2,
            px: 2,
            py: 4,
            borderRadius: 3,
            borderStyle: 'dashed',
            borderColor: 'grey.300',
            textAlign: 'center',
          }}
        >
          <RestaurantMenuRoundedIcon
            sx={{
              fontSize: 36,
              color: 'grey.400',
            }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Noch keine Zutaten hinzugefügt.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.25} sx={{ mt: 2 }}>
          {value.map((component, index) => {
            const ingredient = optionMap.get(component.ingredientItemId);

            if (!ingredient) return null;

            return (
              <Paper
                key={component.ingredientItemId}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 3,
                  borderColor: 'grey.200',
                }}
              >
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {ingredient.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {ingredient.brand.name}
                      {ingredient.sizeInMl
                        ? ` · Gebinde mit ${ingredient.sizeInMl} ml`
                        : ''}
                    </Typography>
                  </Box>

                  <IconButton
                    disabled={disabled}
                    size="small"
                    aria-label={`${ingredient.name} entfernen`}
                    onClick={() => handleRemove(index)}
                    sx={{
                      color: 'error.main',
                    }}
                  >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack
                  direction={{
                    xs: 'column',
                    sm: 'row',
                  }}
                  spacing={1.25}
                  sx={{ mt: 1.5 }}
                >
                  <TextField
                    label="Menge"
                    disabled={disabled}
                    value={component.amount || ''}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);

                      handleUpdate(index, {
                        amount: Number.isInteger(parsed) ? parsed : 0,
                      });
                    }}
                    inputProps={{
                      inputMode: 'numeric',
                      min: 1,
                    }}
                    sx={{
                      width: {
                        sm: 140,
                      },
                    }}
                  />

                  <TextField
                    select
                    fullWidth
                    disabled={disabled}
                    label="Einheit"
                    value={component.unit}
                    onChange={(event) =>
                      handleUpdate(index, {
                        unit: event.target.value as RecipeUnit,
                      })
                    }
                  >
                    {Object.values(RecipeUnit).map((unit) => (
                      <MenuItem key={unit} value={unit}>
                        {translateRecipeUnit(unit)}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                {component.unit === RecipeUnit.MILLILITER &&
                  ingredient.sizeInMl && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        mt: 1,
                      }}
                    >
                      {component.amount || 0} ml entsprechen{' '}
                      {(
                        (component.amount || 0) / ingredient.sizeInMl
                      ).toLocaleString('de-DE', {
                        maximumFractionDigits: 3,
                      })}{' '}
                      Gebinden.
                    </Typography>
                  )}
              </Paper>
            );
          })}
        </Stack>
      )}

      {value.length > 0 && (
        <Paper
          sx={{
            mt: 2,
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'primary.50',
          }}
        >
          <Typography variant="caption" fontWeight={700} color="primary.dark">
            Rezept-Vorschau
          </Typography>

          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 0.75 }}>
            {value.map((component) => {
              const ingredient = optionMap.get(component.ingredientItemId);

              if (!ingredient) return null;

              return (
                <Chip
                  key={component.ingredientItemId}
                  label={`${formatRecipeAmount(
                    component.amount,
                    component.unit,
                  )} ${ingredient.name}`}
                  sx={{
                    bgcolor: 'white',
                  }}
                />
              );
            })}
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
