import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

const imagesSchema = z
  .array(z.string().trim().min(1, "Image URL or path is required"))
  .transform((items) => Array.from(new Set(items)))
  .refine((items) => items.length > 0, { message: "At least one image is required" })

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1, "Description is required").optional(),
  shortDescription: z.string().trim().max(200).nullable().optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  active: z.coerce.boolean().optional(),
  parentId: z.string().cuid().optional().nullable(),
  images: imagesSchema.optional(),
})

const baseIncludes = {
  parent: { select: { id: true, name: true } },
  subServices: {
    select: { id: true, name: true, active: true, images: true, shortDescription: true },
    orderBy: { name: "asc" as const },
  },
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const payload = updateSchema.parse(await request.json())

    if (payload.parentId && payload.parentId === id) {
      return NextResponse.json({ error: "A service cannot be its own parent" }, { status: 400 })
    }

    const data: Record<string, unknown> = {}

    if (payload.name !== undefined) data.name = payload.name
    if (payload.description !== undefined) data.description = payload.description
    if (payload.active !== undefined) data.active = payload.active
    if (payload.parentId !== undefined) {
      data.parent = payload.parentId
        ? { connect: { id: payload.parentId } }
        : { disconnect: true }
    }
    if (payload.shortDescription !== undefined) data.shortDescription = payload.shortDescription ?? null
    if (payload.priority !== undefined) data.priority = payload.priority ?? null
    if (payload.images !== undefined) data.images = payload.images

    try {
      const service = await prisma.service.update({
        where: { id },
        data,
        include: baseIncludes,
      })
      return NextResponse.json(service)
    } catch (innerErr: unknown) {
      const msg = String((innerErr as Error)?.message ?? "")
      if (msg.includes("Unknown argument `shortDescription`") || msg.includes("Unknown argument `priority`")) {
        const rest: Record<string, unknown> = { ...(data as Record<string, unknown>) }
        delete (rest as Record<string, unknown>)["shortDescription"]
        delete (rest as Record<string, unknown>)["priority"]
        const service = await prisma.service.update({
          where: { id },
          data: rest,
          include: baseIncludes,
        })
        return NextResponse.json(service)
      }
      throw innerErr
    }
  } catch (error: unknown) {
    console.error("PATCH /api/services/[id]", error)
    return NextResponse.json({ error: "Unable to update service" }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await prisma.service.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("DELETE /api/services/[id]", error)
    return NextResponse.json({ error: "Unable to delete service" }, { status: 400 })
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const service = await prisma.service.findUnique({
    where: { id },
    include: baseIncludes,
  })
  if (!service) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(service)
}
