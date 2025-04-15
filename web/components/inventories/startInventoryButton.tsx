import React, { useState } from 'react';
import { useRouter } from 'next/router';
import axios, { isAxiosError } from 'axios';

type StartInventoryButtonProps = {
  eventId: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function StartInventoryButton({
  eventId,
  ...props
}: StartInventoryButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data: inventory } = await axios.post(`/api/inventories`, {
        eventId,
      });
      router.push(`/inventories/${inventory.id}/count`);
    } catch (e) {
      if (isAxiosError(e)) {
        console.error(e.response?.data);
      }
    }
    setLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={loading} {...props}>
      {loading ? 'Lädt...' : props.children ?? 'Inventur beginnen'}
    </button>
  );
}
