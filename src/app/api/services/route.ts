import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const imagesSchema = z
  .array(z.string().trim().min(1, "Image URL or path is required"))
  .transform((items) => Array.from(new Set(items)))
  .refine((items) => items.length > 0, { message: "At least one image is required" })

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1, "Description is required"),
  shortDescription: z.string().trim().max(200).nullable().optional(),
  priority: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  active: z.coerce.boolean().optional(),
  parentId: z.string().cuid().optional().nullable(),
  images: imagesSchema,
})

const baseIncludes = {
  parent: { select: { id: true, name: true } },
  subServices: {
    select: { id: true, name: true, active: true, images: true, shortDescription: true },
    orderBy: { name: "asc" as const },
  },
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") ?? undefined

  const services = await prisma.service.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { shortDescription: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    include: baseIncludes,
  })

  return NextResponse.json(services)
}

export async function POST(request: Request) {
  try {
    const payload = serviceSchema.parse(await request.json())

    try {
      const data = {
        name: payload.name,
        description: payload.description,
        shortDescription: payload.shortDescription ?? null,
        priority: payload.priority ?? null,
        ...(payload.parentId ? { parent: { connect: { id: payload.parentId } } } : {}),
        images: payload.images,
        active: payload.active ?? true,
      }
      const service = await prisma.service.create({
        data,
        include: baseIncludes,
      })
      return NextResponse.json(service, { status: 201 })
    } catch (innerErr: unknown) {
      const msg = String((innerErr as Error)?.message ?? "")
      if (msg.includes("Unknown argument `shortDescription`") || msg.includes("Unknown argument `priority`")) {
        const fallback: Record<string, unknown> = {
          name: payload.name,
          description: payload.description,
          ...(payload.parentId ? { parent: { connect: { id: payload.parentId } } } : {}),
          images: payload.images,
          active: payload.active ?? true,
        }
        const service = await prisma.service.create({
          data: fallback,
          include: baseIncludes,
        })
        return NextResponse.json(service, { status: 201 })
      }
      throw innerErr
    }
  } catch (error: unknown) {
    console.error("POST /api/services", error)
    return NextResponse.json({ error: "Unable to create service" }, { status: 400 })
  }
}
