import ItemImage from '@/components/utils/itemImage';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import Link from 'next/link';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { TextField } from '@mui/material';
import { GetServerSidePropsContext } from 'next';
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ApiGetInventoryCountingResponse } from '@/pages/api/inventories/[inventoryId]/countings';
import { itemCompareFn, translateSize } from '@/lib/models/item';
import CrateIcon from '@/components/icons/crateIcon';
import BottleIcon from '@/components/icons/bottleIcon';
import CircularProgressWithLabel from '@/components/utils/circularProgressWithLabel';
import { ItemCategory } from '@prisma/client';
import NavigationAccordion from '@/components/countPage/navigationAccordion';
import FinalizeCountingDialog from '@/components/dialogs/finalizeCounting';
import { useRouter } from 'next/router';

export default function InventoryCountPage({
  inventoryId,
}: {
  inventoryId: string;
}) {
  const [items, setItems] = useState<ApiGetInventoryCountingResponse['items']>(
    []
  );
  const [countings, setCountings] = useState<
    ApiGetInventoryCountingResponse['countings']
  >([]);
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [index, setIndex] = useState(0);

  const [inputMode, setInputMode] = useState<'bottle' | 'crate'>('bottle');
  const [crateAmount, setCrateAmount] = useState('');
  const [residualAmount, setResidualAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const orderedItems = useMemo(() => {
    return [...items].sort(itemCompareFn);
  }, [items]);

  const currentItem = orderedItems[index];
  const currentCounting = currentItem
    ? countings.find((c) => c.itemId == currentItem.id)
    : undefined;

  const saveCounting = async () => {
    setLoading(true);
    try {
      const { data } = await axios({
        url: `/api/inventories/${inventoryId}/countings`,
        method: 'POST',
        data: {
          itemId: currentItem.id,
          amount,
        },
      });
      setCountings((cnt) => [
        ...cnt.filter((c) => c.itemId != data.itemId),
        data,
      ]);
      setIndex((i) => Math.min(i + 1, items.length - 1));
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  const toggleInputMode = () => {
    setInputMode((m) => {
      if (m == 'bottle') {
        const crates = currentCounting?.amount
          ? Math.floor(currentCounting.amount / currentItem.amountPerCrate)
          : 0;
        setCrateAmount(`${currentCounting ? crates : ''}`);
        setResidualAmount(
          `${
            currentCounting
              ? currentCounting.amount - crates * currentItem.amountPerCrate
              : ''
          }`
        );
        setAmount(`${currentCounting ? currentCounting.amount : ''}`);
        return 'crate';
      } else {
        setAmount(`${currentCounting ? currentCounting.amount : ''}`);
        return 'bottle';
      }
    });
  };

  const navigateToCategory = (c: ItemCategory) => {
    setIndex(orderedItems.findIndex((i) => i.category == c));
  };

  const onFinalize = () => {
    router.push('/inventories');
  };

  useEffect(() => {
    if (currentCounting) {
      const crates = currentCounting
        ? Math.floor(currentCounting.amount / currentItem.amountPerCrate)
        : 0;
      setCrateAmount(`${currentCounting ? crates : ''}`);
      setResidualAmount(
        `${
          currentCounting
            ? currentCounting.amount - crates * currentItem.amountPerCrate
            : ''
        }`
      );
      setAmount(`${currentCounting ? currentCounting.amount : ''}`);
    } else {
      setCrateAmount('');
      setResidualAmount('');
      setAmount('');
    }
  }, [index, currentCounting]);

  useEffect(() => {
    if (inputMode == 'bottle') return;
    const calcAmt =
      Number(residualAmount) + Number(crateAmount) * currentItem.amountPerCrate;
    setAmount(
      `${crateAmount == '0' && residualAmount == '0' ? 0 : calcAmt || ''}`
    );
  }, [crateAmount, residualAmount]);

  useEffect(() => {
    axios(`/api/inventories/${inventoryId}/countings`).then(
      ({ data }: { data: ApiGetInventoryCountingResponse }) => {
        setItems(data.items);
        setCountings(data.countings);
      }
    );
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 mt-4">
      <div className="flex items-center gap-2 mb-5">
        <Link href="/" className="flex items-center text-sm text-sky-600">
          <ArrowBackIosIcon fontSize="inherit" />
          <p>Zurück</p>
        </Link>
        <h3 className="w-full text-3xl text-center text-sky-700">
          Position {index + 1}/{items.length}
        </h3>
        <CircularProgressWithLabel
          value={items.length ? (countings.length / items.length) * 100 : 0}
        />
      </div>
      <NavigationAccordion
        items={items}
        countings={countings}
        onClickCategory={navigateToCategory}
      />
      {currentItem ? (
        <div className="flex flex-col items-center gap-8 rounded-md shadow-md p-5 text-5xl text-sky-700">
          <ItemImage
            image={currentItem.image}
            category={currentItem.category}
          />
          <div className="w-full">
            <h6 className="text-xl text-gray-600">{currentItem.brand.name}</h6>
            <h5 className="text-2xl sm:text-3xl">
              {currentItem.name} ({translateSize(currentItem.sizeInMl)})
            </h5>
          </div>
          {inputMode == 'bottle' ? (
            <TextField
              label="Flaschen im Bestand"
              fullWidth
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.currentTarget.value)}
            />
          ) : (
            <div className="w-full flex flex-col items-center">
              <TextField
                label="Volle Kästen im Bestand"
                fullWidth
                type="number"
                value={crateAmount}
                onChange={(e) => setCrateAmount(e.currentTarget.value)}
              />
              <p className="text-5xl font-bold mb-2">+</p>
              <TextField
                label="Restliche Flaschen"
                fullWidth
                type="number"
                value={residualAmount}
                onChange={(e) => setResidualAmount(e.currentTarget.value)}
              />
              <p className="text-5xl font-bold mb-2">=</p>
              <div className="w-full flex items-center justify-between text-lg py-3">
                <p className="text-gray-400">Flaschen im Bestand</p>
                <p className="font-bold">{amount}</p>
              </div>
            </div>
          )}
          <button
            onClick={saveCounting}
            disabled={loading}
            className="btn-primary text-lg w-full disabled:opacity-80"
          >
            {loading ? 'SPEICHERT...' : 'SPEICHERN'}
          </button>
          <div className="w-full flex justify-between">
            <button
              disabled={index == 0}
              onClick={() => setIndex((i) => i - 1)}
              className="w-16 disabled:text-gray-300"
            >
              <ArrowBackIosIcon />
            </button>
            <button onClick={toggleInputMode}>
              {inputMode == 'crate' ? <BottleIcon /> : <CrateIcon />}
            </button>
            <button
              disabled={index == items.length - 1}
              onClick={() => setIndex((i) => i + 1)}
              className="w-16 disabled:text-gray-300"
            >
              <ArrowForwardIosIcon />
            </button>
          </div>
        </div>
      ) : (
        <></>
      )}
      <button
        onClick={() => setDialogOpen(true)}
        className="w-full mt-5 p-3 bg-emerald-500 text-white rounded-lg"
      >
        INVENTUR ABSCHLIEßEN
      </button>
      <FinalizeCountingDialog
        maxWidth="sm"
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={onFinalize}
        inventoryId={inventoryId}
        items={orderedItems}
        countings={countings}
      />
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
