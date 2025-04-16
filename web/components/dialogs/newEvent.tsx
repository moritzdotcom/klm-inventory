import BaseDialog, { BaseDialogProps } from './base';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import ErrorMessage from '@/components/utils/errorMessage';
import { Close } from '@mui/icons-material';
import { ApiPostEventsResponse } from '@/pages/api/events';
import { TextField } from '@mui/material';

interface NewEventDialogProps extends BaseDialogProps {
  onSuccess?: (event: ApiPostEventsResponse) => void;
}

export default function NewEventDialog({
  open,
  onSuccess,
  ...other
}: NewEventDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [date, setDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [formDirty, setFormDirty] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitError('');
    e.preventDefault();
    setFormDirty(true);
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const { data: event } = await axios({
        url: `/api/events`,
        method: 'POST',
        data: {
          name,
          date,
        },
      });
      setName('');
      setNameError('');
      setDate('');
      setDateError('');
      setFormDirty(false);
      onSuccess?.(event);
    } catch (e) {
      if (isAxiosError(e)) {
        setSubmitError(e.response?.data);
      }
    }

    setLoading(false);
  };

  const validateInputs = () => {
    setNameError('');
    setDateError('');
    if (!name) setNameError('Name darf nicht leer sein');
    if (!date) setDateError('Datum darf nicht leer sein');
    return Boolean(date && name);
  };

  const onClose = (event: {}) => {
    setLoading(false);
    setSubmitError('');
    other?.onClose?.(event, 'backdropClick');
  };

  useEffect(() => {
    if (!formDirty) return;
    validateInputs();
  }, [name, date]);

  return (
    <BaseDialog open={open} onClose={onClose} {...other}>
      <div className="w-full flex flex-col gap-4 p-5">
        <div className="flex justify-between items-end">
          <p className="text-gray-700 text-2xl">Neue Veranstaltung</p>
          <button type="button" className="mb-3 text-3xl" onClick={onClose}>
            <Close fontSize="inherit" className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="w-full flex flex-col gap-6">
          <div>
            <TextField
              label="Name"
              variant="outlined"
              fullWidth
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <ErrorMessage message={nameError} />
          </div>
          <div>
            <TextField
              slotProps={{ inputLabel: { shrink: true } }}
              label="Datum"
              variant="outlined"
              fullWidth
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
            <ErrorMessage message={dateError} />
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
