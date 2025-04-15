import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ErrorMessage from '@/components/utils/errorMessage';
import Link from 'next/link';
import { Session } from '@/hooks/useSession';
import AppFooter from '@/components/utils/appFooter';

export default function AuthLoginPage({ session }: { session: Session }) {
  const router = useRouter();
  const { status, login } = session;
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formDirty, setFormDirty] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    setSubmitError('');
    e.preventDefault();
    setFormDirty(true);
    validateInputs();
    try {
      await login(email, password);
    } catch (error) {
      setSubmitError('Falsche Zugangsdaten');
    }
  };

  const validateInputs = () => {
    setEmailError('');
    setPasswordError('');
    if (email) {
      if (email.length < 3 || !/^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(email)) {
        setEmailError('Ungültige Email');
      }
    } else {
      setEmailError('Email darf nicht leer sein');
    }

    if (password) {
      if (password.length < 8) {
        setPasswordError('Mindestens 8 Zeichen');
      }
    } else {
      setPasswordError('Passwort darf nicht leer sein');
    }
  };

  useEffect(() => {
    if (!router.isReady) return;
    if (status === 'authenticated') {
      router.push('/');
    }
  }, [status, router.isReady]);

  useEffect(() => {
    if (formDirty) validateInputs();
  }, [email, password]);

  return (
    <div className="w-full max-w-2xl mx-auto px-3 h-screen flex flex-col justify-center">
      <h1 className="text-5xl text-center font-bold text-sky-900 my-4">KLM</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div>
          <input
            className="textfield p-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <ErrorMessage message={emailError} />
        </div>
        <div>
          <input
            className="textfield p-3"
            placeholder="Passwort"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <ErrorMessage message={passwordError} />
        </div>
        <ErrorMessage message={submitError} />
        <button className="btn-primary" type="submit">
          Anmelden
        </button>
      </form>
      <div className="mt-4 text-center text-gray-700">
        <Link href="/auth/signup">Registrieren</Link>
      </div>
      <AppFooter />
    </div>
  );
}
