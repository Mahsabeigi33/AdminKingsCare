import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const imagesSchema = z
  .array(z.string().trim().min(1, "Image URL or path is required"))
  .transform((items) => Array.from(new Set(items)))
  .refine((items) => items.length > 0, { message: "At least one image is required" })

const serviceSchema = z.object({
  name: z.string().trim().min(1),
  durationMin: z.coerce.number().int().positive().max(480).default(30),
  priceCents: z.coerce.number().int().nonnegative().optional(),
  description: z.string().trim().min(1, "Description is required"),
  shortDescription: z.string().trim().max(200).nullable().optional(),
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
    orderBy: { createdAt: "desc" },
    include: baseIncludes,
  })

  return NextResponse.json(services)
}

export async function POST(request: Request) {
  try {
    const payload = serviceSchema.parse(await request.json())

    try {
      const service = await prisma.service.create({
        data: {
          name: payload.name,
          durationMin: payload.durationMin,
          priceCents: payload.priceCents ?? 0,
          description: payload.description,
          shortDescription: payload.shortDescription ?? null,
          ...(payload.parentId ? { parent: { connect: { id: payload.parentId } } } : {}),
          images: payload.images,
          active: payload.active ?? true,
        },
        include: baseIncludes,
      })
      return NextResponse.json(service, { status: 201 })
    } catch (innerErr: unknown) {
      const msg = String((innerErr as Error)?.message ?? "")
      if (msg.includes("Unknown argument `shortDescription`")) {
        const service = await prisma.service.create({
          data: {
            name: payload.name,
            durationMin: payload.durationMin,
            priceCents: payload.priceCents ?? 0,
            description: payload.description,
            ...(payload.parentId ? { parent: { connect: { id: payload.parentId } } } : {}),
            images: payload.images,
            active: payload.active ?? true,
          },
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
