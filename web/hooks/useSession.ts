import axios from 'axios';
import { useEffect, useState } from 'react';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

type UpdateUserProps = {
  name?: string;
  email?: string;
  password?: string;
  newPassword?: string;
};

export type Session = {
  status: SessionStatus;
  user: SessionUser;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  update: ({
    name,
    email,
    password,
    newPassword,
  }: UpdateUserProps) => Promise<void>;
  logout: () => Promise<void>;
};

export default function UseSession() {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser>();

  const signup = async (name: string, email: string, password: string) => {
    setStatus('loading');
    try {
      const { data } = await axios({
        method: 'POST',
        url: '/api/users',
        data: { name, email, password },
      });
      setUser(data);
      setStatus('authenticated');
    } catch (error) {
      setStatus('unauthenticated');
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    setStatus('loading');
    try {
      const { data } = await axios({
        method: 'POST',
        url: '/api/session',
        data: { email, password },
      });
      setUser(data);
      setStatus('authenticated');
    } catch (error) {
      setStatus('unauthenticated');
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { data } = await axios({
        method: 'DELETE',
        url: '/api/session',
      });
      console.log(data);
      setUser(undefined);
      setStatus('unauthenticated');
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  const update = async ({
    name,
    email,
    password,
    newPassword,
  }: UpdateUserProps) => {
    setStatus('loading');
    try {
      const { data } = await axios({
        method: 'PUT',
        url: '/api/users',
        data: { name, email, password, newPassword },
      });
      setUser(data);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    axios('/api/session')
      .then(({ data }) => {
        setUser(data);
        setStatus('authenticated');
      })
      .catch((err) => {
        console.log(err);
        setStatus('unauthenticated');
      });
  }, []);

  return {
    user,
    status,
    login,
    signup,
    logout,
    update,
  };
}
