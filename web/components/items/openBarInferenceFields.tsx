// components/items/openBarInferenceFields.tsx

import {
  Alert,
  Box,
  Checkbox,
  Collapse,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { RecipeItemOption } from '@/lib/models/itemRecipe';
import { translateSize } from '@/lib/models/item';

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;

  ingredientItemId: string;
  onIngredientItemIdChange: (itemId: string) => void;

  priority: string;
  onPriorityChange: (priority: string) => void;

  options: RecipeItemOption[];
};

export default function OpenBarInferenceFields({
  enabled,
  onEnabledChange,
  ingredientItemId,
  onIngredientItemIdChange,
  priority,
  onPriorityChange,
  options,
}: Props) {
  /**
   * Als Leitartikel kommen nur physische Artikel infrage,
   * die tatsächlich in der Inventur gezählt werden.
   *
   * Beispiele:
   * - Aperol 0,7 l
   * - Aperol 1,0 l
   * - Secco 0,75 l
   *
   * Keine abstrakten Verkaufsprodukte:
   * - Aperol Spritz
   * - Aperol Baum
   */
  const inventoryOptions = options.filter((option) => option.inventoryEnabled);

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <FormControlLabel
        control={
          <Checkbox
            checked={enabled}
            onChange={(event) => onEnabledChange(event.target.checked)}
          />
        }
        label="Aus offenem Warenverbrauch ableiten"
      />

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          ml: 4,
          mt: -0.5,
          lineHeight: 1.55,
        }}
      >
        Aktivieren, wenn sich die verkaufte Anzahl dieses Produktes aus einem
        bestimmten Lagerartikel ableiten lässt. Zum Beispiel wird ein Aperol
        Boot anhand der fehlenden Aperol-Flaschen erkannt.
      </Typography>

      <Collapse in={enabled}>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Alert severity="info">
            Der Leitartikel sollte möglichst eindeutig sein. Für ein Aperol Boot
            eignet sich beispielsweise Aperol 0,7 l, weil jede fehlende Flasche
            genau einem Boot entspricht.
          </Alert>

          <FormControl fullWidth>
            <InputLabel>Leitartikel</InputLabel>

            <Select
              value={ingredientItemId}
              label="Leitartikel"
              onChange={(event) => onIngredientItemIdChange(event.target.value)}
            >
              {inventoryOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {formatItemLabel(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Priorität"
            value={priority}
            onChange={(event) => onPriorityChange(event.target.value)}
            type="number"
            inputProps={{
              min: 0,
              step: 1,
            }}
            helperText="Produkte mit einer höheren Priorität werden zuerst abgeleitet. Für größere Produkte wie Boot oder Baum ist 100 ein guter Startwert."
          />
        </Stack>
      </Collapse>
    </Box>
  );
}

function formatItemLabel(option: RecipeItemOption) {
  const size = option.sizeInMl ? ` · ${translateSize(option.sizeInMl)}` : '';

  return `${option.brand.name} · ${option.name}${size}`;
}
