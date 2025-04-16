import BaseDialog, { BaseDialogProps } from './base';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import ErrorMessage from '@/components/utils/errorMessage';
import { Close } from '@mui/icons-material';
import { ApiPostItemResponse } from '@/pages/api/items';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import {
  CATEGORIES,
  SIZESINML,
  translateCategory,
  translateSize,
} from '@/lib/models/item';
import AutocompleteInput from '../utils/autocompleteInput';
import { ApiGetBrandsResponse } from '@/pages/api/brands';

interface NewItemDialogProps extends BaseDialogProps {
  onSuccess?: (item: ApiPostItemResponse) => void;
}

export default function NewItemDialog({
  open,
  onSuccess,
  ...other
}: NewItemDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [category, setCategory] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [brandName, setBrandName] = useState('');
  const [brandNameError, setBrandNameError] = useState('');
  const [sizeInMl, setSizeInMl] = useState('');
  const [sizeInMlError, setSizeInMlError] = useState('');
  const [image, setImage] = useState('');
  const [amountInStock, setAmountInStock] = useState('');
  const [amountPerCrate, setAmountPerCrate] = useState('');
  const [amountPerCrateError, setAmountPerCrateError] = useState('');
  const [formDirty, setFormDirty] = useState(false);

  const [brandOptions, setBrandOptions] = useState<ApiGetBrandsResponse>([]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitError('');
    e.preventDefault();
    setFormDirty(true);
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const { data: item } = await axios({
        url: `/api/items`,
        method: 'POST',
        data: {
          name,
          category,
          brandName,
          sizeInMl,
          image,
          amountInStock,
          amountPerCrate,
        },
      });
      resetForm();
      onSuccess?.(item);
    } catch (e) {
      if (isAxiosError(e)) {
        setSubmitError(e.response?.data);
      }
    }

    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setNameError('');
    setCategory('');
    setCategoryError('');
    setBrandName('');
    setBrandNameError('');
    setSizeInMl('');
    setSizeInMlError('');
    setImage('');
    setAmountInStock('');
    setAmountPerCrate('');
    setAmountPerCrateError('');
    setFormDirty(false);
  };

  const validateInputs = () => {
    let nameErrorValue = '';
    let categoryErrorValue = '';
    let brandNameErrorValue = '';
    let sizeInMlErrorValue = '';
    let amountPerCrateErrorValue = '';

    if (!name) nameErrorValue = 'Name darf nicht leer sein';
    if (!category) categoryErrorValue = 'Kategorie darf nicht leer sein';
    if (!brandName) brandNameErrorValue = 'Marke darf nicht leer sein';
    if (!sizeInMl) sizeInMlErrorValue = 'Gebindegröße darf nicht leer sein';
    if (!amountPerCrate)
      amountPerCrateErrorValue = 'Flaschen/Kiste darf nicht leer sein';
    setNameError(nameErrorValue);
    setCategoryError(categoryErrorValue);
    setBrandNameError(brandNameErrorValue);
    setSizeInMlError(sizeInMlErrorValue);
    setAmountPerCrateError(amountPerCrateErrorValue);
    return !Boolean(
      nameErrorValue ||
        categoryErrorValue ||
        brandNameErrorValue ||
        sizeInMlErrorValue ||
        amountPerCrateErrorValue
    );
  };

  const onClose = (event: {}) => {
    setLoading(false);
    setSubmitError('');
    other?.onClose?.(event, 'backdropClick');
  };

  useEffect(() => {
    if (!formDirty) return;
    validateInputs();
  }, [name, name, category, brandName, sizeInMl, amountPerCrate]);

  useEffect(() => {
    axios('/api/brands').then(({ data }) => setBrandOptions(data));
  }, []);

  return (
    <BaseDialog open={open} onClose={onClose} {...other}>
      <div className="w-full flex flex-col gap-4 p-5">
        <div className="flex justify-between items-end">
          <p className="text-gray-700 text-2xl">Neuer Artikel</p>
          <button type="button" className="mb-3 text-3xl" onClick={onClose}>
            <Close fontSize="inherit" className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="w-full flex flex-col gap-5">
          <div>
            <FormControl fullWidth>
              <InputLabel>Kategorie</InputLabel>
              <Select
                value={category}
                label="Kategorie"
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem value={c} key={c}>
                    {translateCategory(c)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ErrorMessage message={categoryError} />
          </div>
          <div>
            <AutocompleteInput
              label="Marke"
              value={brandName}
              handleChange={(v) => setBrandName(v)}
              options={brandOptions.map(({ name }) => name)}
            />
            <ErrorMessage message={brandNameError} />
          </div>
          <div>
            <FormControl fullWidth>
              <InputLabel>Gebindegröße</InputLabel>
              <Select
                value={sizeInMl}
                label="Gebindegröße"
                onChange={(e) => setSizeInMl(e.target.value)}
              >
                {SIZESINML.map((s) => (
                  <MenuItem value={s} key={s}>
                    {translateSize(s)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <ErrorMessage message={sizeInMlError} />
          </div>
          <div>
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <ErrorMessage message={nameError} />
          </div>
          <div>
            <TextField
              label="Flaschen im Bestand"
              variant="outlined"
              fullWidth
              type="number"
              value={amountInStock}
              onChange={(e) => setAmountInStock(e.currentTarget.value)}
            />
          </div>
          <div>
            <TextField
              label="Flaschen pro Kiste"
              variant="outlined"
              fullWidth
              type="number"
              value={amountPerCrate}
              onChange={(e) => setAmountPerCrate(e.currentTarget.value)}
            />
            <ErrorMessage message={amountPerCrateError} />
          </div>
          <ErrorMessage message={submitError} />
          <button
            className="btn-primary disabled:opacity-80"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Lädt...' : 'Erstellen'}
          </button>
        </form>
      </div>
    </BaseDialog>
  );
}
