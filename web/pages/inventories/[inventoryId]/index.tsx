import Link from 'next/link';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  itemCompareFn,
  translateCategory,
  translateSize,
} from '@/lib/models/item';
import {
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import ExcelIcon from '@/components/icons/excel';
import { downloadTableAsExcel } from '@/lib/excel';
import { ApiGetInventoryResponse } from '@/pages/api/inventories/[inventoryId]';
import { GetServerSidePropsContext } from 'next';

export default function InventoryShowPage({
  inventoryId,
}: {
  inventoryId: string;
}) {
  const [inventory, setInventory] = useState<ApiGetInventoryResponse>();

  const orderedItems = useMemo(() => {
    if (!inventory) return [];
    return [
      ...inventory.countings.map(({ amount, item }) => ({
        ...item,
        amountInStock: amount,
      })),
    ].sort(itemCompareFn);
  }, [inventory]);

  const getMaxLength = (
    arr: typeof orderedItems,
    accessor: (i: (typeof orderedItems)[number]) => string | undefined
  ) => {
    return Math.max(
      ...arr.map((item) => accessor(item)?.toString().length || 0)
    );
  };

  const columnWidths = {
    category:
      getMaxLength(orderedItems, (i) => translateCategory(i.category)) * 8 + 24,
    brand: getMaxLength(orderedItems, (i) => i.brand.name) * 8 + 24,
    name: getMaxLength(orderedItems, (i) => i.name) * 8 + 24,
  };

  const downloadExcel = () => {
    if (!inventory) return;
    const data = orderedItems.map((item) => ({
      Kategorie: translateCategory(item.category),
      Marke: item.brand.name,
      Artikel: item.name,
      Gebindegröße: translateSize(item.sizeInMl),
      Bestand: item.amountInStock,
      'Flaschen pro Kiste': item.amountPerCrate,
      Kästen:
        Math.round((item.amountInStock * 100) / item.amountPerCrate) / 100,
      'Letzte Bestandsaufnahme': new Date(
        inventory.createdAt
      ).toLocaleDateString('de'),
    }));

    const dateStr = new Date(inventory.createdAt)
      .toLocaleDateString('en-GB')
      .split('/')
      .reverse()
      .map((part, i) => (i === 0 ? part.slice(2) : part))
      .join('');
    downloadTableAsExcel({
      data,
      fileName: `Bestandsliste-${dateStr}.xlsx`,
      sheetName: `Lagerbestand-${dateStr}`,
    });
  };

  useEffect(() => {
    axios(`/api/inventories/${inventoryId}`).then(({ data }) =>
      setInventory(data)
    );
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <header className="w-full sticky top-0 pt-4 pb-2 px-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href="/inventories"
            className="flex items-center text-sm text-sky-600"
          >
            <ArrowBackIosIcon fontSize="inherit" />
            <p>Zurück</p>
          </Link>
          {inventory ? (
            <div className="w-full text-center">
              <h4 className="text-sm text-center text-gray-600">
                Inventur nach
              </h4>
              <h3 className="text-xl text-center text-sky-700">
                {inventory.lastEvent.name}
              </h3>
            </div>
          ) : (
            <div className="w-full text-center">
              <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
              <Skeleton variant="text" sx={{ fontSize: '2rem' }} />
            </div>
          )}
          <p className="invisible">Zurück</p>
        </div>
      </header>
      {inventory && (
        <div className="px-3 mt-5">
          {!inventory.done && (
            <Link
              href={`/inventories/${inventoryId}/count`}
              className="w-full sm:w-auto sm:ml-3 text-white bg-amber-600 rounded-md px-4 py-2 flex items-center justify-center gap-2 float-right my-2"
            >
              Inventur fortsetzen
            </Link>
          )}
          <button
            onClick={downloadExcel}
            className="w-full sm:w-auto text-white bg-green-700 rounded-md px-4 py-2 flex items-center justify-center gap-2 float-right my-2"
          >
            <ExcelIcon /> <span>Bestandsliste herunterladen</span>
          </button>
          <TableContainer sx={{ maxHeight: '60vh' }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell
                    style={{
                      verticalAlign: 'bottom',
                      minWidth: columnWidths.category,
                    }}
                    align="left"
                  >
                    Kategorie
                  </TableCell>
                  <TableCell
                    style={{
                      verticalAlign: 'bottom',
                      minWidth: columnWidths.brand,
                    }}
                    align="left"
                  >
                    Marke
                  </TableCell>
                  <TableCell
                    style={{
                      verticalAlign: 'bottom',
                      minWidth: columnWidths.name,
                    }}
                    align="left"
                  >
                    Artikel
                  </TableCell>
                  <TableCell
                    style={{ verticalAlign: 'bottom', minWidth: 50 }}
                    align="left"
                  >
                    Gebindegröße
                  </TableCell>
                  <TableCell
                    style={{ verticalAlign: 'bottom', minWidth: 50 }}
                    align="right"
                  >
                    Bestand
                  </TableCell>
                  <TableCell
                    style={{ verticalAlign: 'bottom', minWidth: 100 }}
                    align="right"
                  >
                    Flaschen pro Kiste
                  </TableCell>
                  <TableCell
                    style={{ verticalAlign: 'bottom', minWidth: 50 }}
                    align="right"
                  >
                    Kästen
                  </TableCell>
                  <TableCell
                    style={{ verticalAlign: 'bottom', minWidth: 100 }}
                    align="right"
                  >
                    Letzte Bestandsaufnahme
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orderedItems.map((item) => {
                  return (
                    <TableRow hover role="checkbox" tabIndex={-1} key={item.id}>
                      <TableCell align="left">
                        {translateCategory(item.category)}
                      </TableCell>
                      <TableCell align="left">{item.brand.name}</TableCell>
                      <TableCell align="left">{item.name}</TableCell>
                      <TableCell align="left">
                        {translateSize(item.sizeInMl)}
                      </TableCell>
                      <TableCell align="right">{item.amountInStock}</TableCell>
                      <TableCell align="right">{item.amountPerCrate}</TableCell>
                      <TableCell align="right">
                        {Math.round(
                          (item.amountInStock * 100) / item.amountPerCrate
                        ) / 100}
                      </TableCell>
                      <TableCell align="right">
                        {new Date(inventory.createdAt).toLocaleDateString('de')}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
}

export function getServerSideProps(context: GetServerSidePropsContext) {
  const { inventoryId } = context.query;

  return {
    props: {
      inventoryId,
    },
  };
}
