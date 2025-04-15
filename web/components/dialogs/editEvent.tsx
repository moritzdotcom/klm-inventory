import BaseDialog, { BaseDialogProps } from './base';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import ErrorMessage from '@/components/utils/errorMessage';
import { Close } from '@mui/icons-material';
import { ApiPutEventResponse } from '@/pages/api/events/[eventId]';
import { Event } from '@prisma/client';

interface EditEventDialogProps extends BaseDialogProps {
  event: Event;
  onSuccess?: (event: ApiPutEventResponse) => void;
}

export default function EditEventDialog({
  event,
  open,
  onSuccess,
  ...other
}: EditEventDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(event.name);
  const [nameError, setNameError] = useState('');
  const [date, setDate] = useState(event.date.toISOString().split('T')[0]);
  const [dateError, setDateError] = useState('');
  const [formDirty, setFormDirty] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitError('');
    e.preventDefault();
    setFormDirty(true);
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const { data } = await axios({
        url: `/api/events/${event.id}`,
        method: 'PUT',
        data: {
          name,
          date,
        },
      });
      onSuccess?.(data);
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
        <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
          <div>
            <input
              className="textfield p-3"
              placeholder="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <ErrorMessage message={nameError} />
          </div>
          <div>
            <input
              className="textfield p-3"
              placeholder="Datum"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
            <ErrorMessage message={dateError} />
          </div>
          <ErrorMessage message={submitError} />
          <button className="btn-primary" type="submit" disabled={loading}>
            Erstellen
          </button>
        </form>
      </div>
    </BaseDialog>
  );
}
