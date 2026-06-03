// lib/realtime/publishWaiterChange.ts

export async function publishWaiterChange(eventId: string) {
  const realtimeUrl = process.env.REALTIME_INTERNAL_URL;
  const realtimeSecret = process.env.INTERNAL_REALTIME_SECRET;

  if (!realtimeUrl || !realtimeSecret) {
    console.warn('Realtime configuration is missing. Skipping broadcast.');

    return;
  }

  try {
    const response = await fetch(
      `${realtimeUrl}/internal/waiter/${encodeURIComponent(eventId)}/changed`,
      {
        method: 'POST',
        headers: {
          'x-realtime-secret': realtimeSecret,
        },
      },
    );

    if (!response.ok) {
      console.error('Realtime broadcast failed:', response.status);
    }
  } catch (error) {
    /**
     * Die eigentliche Datenbankänderung war bereits erfolgreich.
     * Ein Ausfall des Realtime-Service darf die Herausgabe deshalb
     * nicht rückgängig machen.
     */
    console.error('Realtime broadcast failed:', error);
  }
}
