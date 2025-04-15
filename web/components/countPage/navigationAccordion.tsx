import ItemImage from '@/components/utils/itemImage';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Collapse, MenuItem, MenuList } from '@mui/material';
import { useMemo, useState } from 'react';
import { ApiGetInventoryCountingResponse } from '@/pages/api/inventories/[inventoryId]/countings';
import { translateCategory } from '@/lib/models/item';
import { ItemCategory } from '@prisma/client';

export default function NavigationAccordion({
  items,
  countings,
  onClickCategory,
}: {
  items: ApiGetInventoryCountingResponse['items'];
  countings: ApiGetInventoryCountingResponse['countings'];
  onClickCategory: (c: ItemCategory) => void;
}) {
  const [open, setOpen] = useState(false);

  const categories = useMemo(() => {
    const categoryList = [
      ...new Set(items.map(({ category }) => category)),
    ].sort((a, b) => a.localeCompare(b));
    return categoryList.map((c) => {
      const itemsInCategory = items
        .filter(({ category }) => category == c)
        .map(({ id }) => id);
      return {
        name: c,
        total: itemsInCategory.length,
        completed: countings.filter(({ itemId }) =>
          itemsInCategory.includes(itemId)
        ).length,
      };
    });
  }, [countings]);

  const onClick = (c: ItemCategory) => {
    onClickCategory(c);
    setOpen(false);
  };

  return (
    <div className="mb-3 text-sky-700">
      <button
        className="w-full flex items-center justify-between text-xl text-gray-500"
        onClick={() => setOpen((o) => !o)}
      >
        <p>Kategorien</p>
        <ExpandMoreIcon
          fontSize="large"
          className="transition-transform"
          style={{
            transition: 'transform 300ms ease',
            transform: `rotate(${open ? '180deg' : '0'})`,
          }}
        />
      </button>
      <Collapse in={open}>
        <MenuList>
          {categories.map((c) => (
            <MenuItem
              key={c.name}
              onClick={() => onClick(c.name)}
              className="flex items-center"
              sx={{ fontSize: '1.3rem', justifyContent: 'space-between' }}
            >
              <div className="flex items-center gap-3">
                <ItemImage image="" category={c.name} />
                {translateCategory(c.name)}
              </div>
              <p>
                {c.completed} / {c.total}
              </p>
            </MenuItem>
          ))}
        </MenuList>
      </Collapse>
    </div>
  );
}
