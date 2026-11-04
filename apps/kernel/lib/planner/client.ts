export async function plannerRequest<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(input, init);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('Planner returned an unreadable response.');
  }
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null &&
      'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Planner request failed.';
    throw new Error(message);
  }
  return payload as T;
}

export function jsonBody(body: unknown): Pick<RequestInit, 'headers' | 'body'> {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
