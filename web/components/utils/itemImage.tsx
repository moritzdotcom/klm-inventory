import { Avatar } from '@mui/material';
import { ItemCategory } from '@prisma/client';
import SportsBarIcon from '@mui/icons-material/SportsBar';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import WineBarIcon from '@mui/icons-material/WineBar';
import LocalDrinkIcon from '@mui/icons-material/LocalDrink';

function Icon({ category }: { category: ItemCategory }) {
  switch (category) {
    case 'BEER':
      return <SportsBarIcon fontSize="inherit" />;
    case 'LIQUOR':
      return <LocalBarIcon fontSize="inherit" />;
    case 'SOFTDRINK':
      return <LocalDrinkIcon fontSize="inherit" />;
    case 'WATER':
      return <WaterDropIcon fontSize="inherit" />;
    case 'WINE':
      return <WineBarIcon fontSize="inherit" />;
  }
}

export default function ItemImage({
  image,
  category,
}: {
  image: string;
  category: ItemCategory;
}) {
  if (image) return <Avatar src={image} />;

  return <Icon category={category} />;
}
