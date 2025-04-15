import { Session } from '@/hooks/useSession';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

export default function AuthLogoutPage({ session }: { session: Session }) {
  const router = useRouter();

  useEffect(() => {
    localStorage.clear();
    session.logout().then(() => {
      router.push('/auth/login');
    });
  }, []);
  return <div></div>;
}
