import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'

const updateSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).nullable().optional(),
  role: z.enum(['ADMIN', 'STAFF']).optional(),
  password: z.string().min(6).optional(),
})

const baseSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const

type RouteContext = { params: Promise<{ id: string }> }
type UserUpdateBody = z.infer<typeof updateSchema>

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params
  try {
    const payload: UserUpdateBody = updateSchema.parse(await request.json())
    const { email, name, role, password } = payload
    const data: Prisma.UserUpdateInput = {}

    if (typeof email === 'string') {
      data.email = email
    }

    if (name !== undefined) {
      data.name = name
    }

    if (role) {
      data.role = role
    }

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: baseSelect,
    })
    return NextResponse.json(user)
  } catch (error: unknown) {
    console.error('PATCH /api/users/[id]', error)
    return NextResponse.json({ error: 'Unable to update user' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
  try {
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('DELETE /api/users/[id]', error)
    return NextResponse.json({ error: 'Unable to delete user' }, { status: 400 })
  }
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params
    // id extracted above from awaited params
  const user = await prisma.user.findUnique({ where: { id }, select: baseSelect })
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(user)
}

