import { NextApiResponse } from 'next';

export function setCookie(res: NextApiResponse, name: string, value: string) {
  res.setHeader('Set-Cookie', `${name}=${value}; path=/; HttpOnly`);
}

export function deleteCookie(res: NextApiResponse, name: string) {
  res.setHeader(
    'Set-Cookie',
    `${name}=deleted; path=/; HttpOnly; expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
}
