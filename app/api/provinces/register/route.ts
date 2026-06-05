// POST /api/provinces/register
// Creates a new province. Returns raw apiKey + pullSecret ONCE.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { provinces } from '@/db/schema'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

function makeKey(len = 32) {
  return randomBytes(len).toString('hex')
}

export async function POST(req: NextRequest) {
  const { name, slug, url, weight } = await req.json()

  if (!name || !slug || !url || weight == null) {
    return NextResponse.json({ error: 'name, slug, url, weight required' }, { status: 400 })
  }

  const rawApiKey     = makeKey()
  const rawPullSecret = makeKey()

  const [apiKeyHash, pullSecret] = await Promise.all([
    bcrypt.hash(rawApiKey, 10),
    bcrypt.hash(rawPullSecret, 10),
  ])

  await db.insert(provinces).values({
    name,
    slug,
    url,
    weight: Number(weight),
    apiKeyHash,
    pullSecret,
  })

  // Return raw keys once — never stored in plaintext
  return NextResponse.json({ apiKey: rawApiKey, pullSecret: rawPullSecret })
}