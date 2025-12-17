import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  password: z.string().min(6),
})

const baseSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

export async function GET() {
  const users = await prisma.user.findMany({
    select: baseSelect,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users)
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json())
    const passwordHash = await bcrypt.hash(payload.password, 10)
    const user = await prisma.user.create({
      data: {
        email: payload.email,
        name: payload.name,
        role: payload.role ?? 'STAFF',
        passwordHash,
      },
      select: baseSelect,
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/users', error)
    return NextResponse.json({ error: 'Unable to create user' }, { status: 400 })
  }
}
