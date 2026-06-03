import Link from 'next/link';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { RecipeUnit } from '@prisma/client';
import {
  RecipeComponentView,
  formatRecipeAmount,
} from '@/lib/models/itemRecipe';

type Props = {
  itemId: string;
  components: RecipeComponentView[];
};

export default function RecipeViewer({ itemId, components }: Props) {
  const hasRecipe = components.length > 0;

  return (
    <Paper
      sx={{
        p: 2,
        borderRadius: 3,
        boxShadow: 1,
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
      >
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Rezeptur
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Theoretischer Verbrauch pro herausgegebener Flasche
          </Typography>
        </Box>

        <Button
          component={Link}
          href={`/items/${itemId}/editRecipe`}
          size="small"
          startIcon={<EditOutlinedIcon />}
          sx={{
            flexShrink: 0,
            textTransform: 'none',
          }}
        >
          {hasRecipe ? 'Bearbeiten' : 'Anlegen'}
        </Button>
      </Stack>

      {!hasRecipe ? (
        <Box
          sx={{
            mt: 2,
            py: 2,
            borderRadius: 2.5,
            bgcolor: 'grey.50',
            textAlign: 'center',
          }}
        >
          <RestaurantMenuRoundedIcon
            sx={{
              fontSize: 30,
              color: 'grey.400',
            }}
          />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Für diesen Artikel ist keine Rezeptur hinterlegt.
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1} sx={{ mt: 2 }}>
          {components.map((component) => (
            <Box
              key={component.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.25,
                py: 1,
                borderRadius: 2.5,
                bgcolor: 'grey.50',
              }}
            >
              <Box
                sx={{
                  minWidth: 62,
                  textAlign: 'center',
                }}
              >
                <Chip
                  size="small"
                  label={formatRecipeAmount(component.amount, component.unit)}
                  color="primary"
                  variant="outlined"
                  sx={{
                    fontWeight: 700,
                  }}
                />
              </Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {component.ingredientItem.name}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {component.ingredientItem.brand.name}
                  {component.ingredientItem.sizeInMl
                    ? ` · ${component.ingredientItem.sizeInMl} ml`
                    : ''}
                </Typography>
              </Box>

              {component.ingredientItem.inventoryEnabled && (
                <Inventory2OutlinedIcon
                  sx={{
                    flexShrink: 0,
                    color: 'success.main',
                    fontSize: 19,
                  }}
                />
              )}

              {component.unit === RecipeUnit.MILLILITER &&
                component.ingredientItem.sizeInMl && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      flexShrink: 0,
                    }}
                  >
                    {(
                      component.amount / component.ingredientItem.sizeInMl
                    ).toLocaleString('de-DE', {
                      maximumFractionDigits: 3,
                    })}{' '}
                    Gebinde
                  </Typography>
                )}
            </Box>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
