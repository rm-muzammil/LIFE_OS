export async function roadmapRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const data: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function jsonBody(value: object): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  };
}
