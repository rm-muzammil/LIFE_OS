'use client';

import clsx from 'clsx';
import { formatTimePKT } from '@/lib/time';
import type { ChatMessagePayload } from '@/lib/types';

export default function ChatBubble({ message }: { message: ChatMessagePayload }) {
  const isUser = message.role === 'user';
  return (
    <div className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser ? 'bg-brand-500/15 text-zinc-100' : 'bg-zinc-900 text-zinc-200'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className="mt-1 text-[10px] text-zinc-600">{formatTimePKT(message.createdAt)}</p>
      </div>
    </div>
  );
}
