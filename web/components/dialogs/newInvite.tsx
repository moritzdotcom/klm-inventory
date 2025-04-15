import BaseDialog, { BaseDialogProps } from './base';
import axios, { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import ErrorMessage from '@/components/utils/errorMessage';
import { Close } from '@mui/icons-material';
import { ApiPostInviteResponse } from '@/pages/api/invites';

interface NewInviteDialogProps extends BaseDialogProps {
  onSuccess?: (invite: ApiPostInviteResponse) => void;
}

export default function NewInviteDialog({
  open,
  onSuccess,
  ...other
}: NewInviteDialogProps) {
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [formDirty, setFormDirty] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitError('');
    e.preventDefault();
    setFormDirty(true);
    if (!validateInputs()) return;
    setLoading(true);
    try {
      const { data: invite } = await axios({
        url: `/api/invites`,
        method: 'POST',
        data: {
          email,
        },
      });
      setEmail('');
      setEmailError('');
      setFormDirty(false);
      onSuccess?.(invite);
    } catch (e) {
      if (isAxiosError(e)) {
        setSubmitError(e.response?.data);
      }
    }

    setLoading(false);
  };

  const validateInputs = () => {
    setEmailError('');
    if (!email) setEmailError('Email darf nicht leer sein');
    return Boolean(email);
  };

  const onClose = (event: {}) => {
    setLoading(false);
    setSubmitError('');
    other?.onClose?.(event, 'backdropClick');
  };

  useEffect(() => {
    if (!formDirty) return;
    validateInputs();
  }, [email]);

  return (
    <BaseDialog open={open} onClose={onClose} {...other}>
      <div className="w-full flex flex-col gap-4 p-5">
        <div className="flex justify-between items-end">
          <p className="text-gray-700 text-2xl">Benutzer einladen</p>
          <button type="button" className="mb-3 text-3xl" onClick={onClose}>
            <Close fontSize="inherit" className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="w-full flex flex-col gap-3">
          <div>
            <input
              className="textfield p-3"
              placeholder="Email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
            <ErrorMessage message={emailError} />
          </div>
          <ErrorMessage message={submitError} />
          <button className="btn-primary" type="submit" disabled={loading}>
            Einladen
          </button>
        </form>
      </div>
    </BaseDialog>
  );
}
