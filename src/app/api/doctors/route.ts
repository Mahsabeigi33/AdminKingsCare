import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

const nullableStr = (min?: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .pipe(min ? z.string().min(min) : z.string())
    .nullable()
    .optional()

const baseSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  title: z.string().trim().optional().nullable(),
  specialty: z.string().trim().optional().nullable(),
  shortBio: z.string().trim().max(240).optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  email: nullableStr().refine((value) => !value || /\S+@\S+\.\S+/.test(value), {
    message: "Invalid email",
  }),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional().nullable(),
  priority: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  photoUrl: z.string().trim().optional().nullable(),
  gallery: z.array(z.string().trim().min(1)).default([]),
  active: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
})

const createSchema = baseSchema
const updateSchema = baseSchema.partial()

const uniqueFieldMessage: Record<string, string> = {
  email: "Email already in use.",
}

const handleKnownError = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target
    const fields = Array.isArray(target) ? target : typeof target === "string" ? [target] : []
    for (const field of fields) {
      const message = uniqueFieldMessage[field]
      if (message) {
        return NextResponse.json({ error: message }, { status: 409 })
      }
    }
    return NextResponse.json({ error: "Duplicate value detected." }, { status: 409 })
  }
  return null
}

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")?.trim()
  const featured = searchParams.get("featured")
  const active = searchParams.get("active")

  const doctors = await prisma.doctor.findMany({
    where: {
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: "insensitive" } },
              { specialty: { contains: query, mode: "insensitive" } },
              { title: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined),
      ...(featured ? { featured: featured === "true" } : undefined),
      ...(active ? { active: active === "true" } : undefined),
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(doctors)
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json())
    const doctor = await prisma.doctor.create({
      data: {
        fullName: payload.fullName,
        title: payload.title?.trim() || null,
        specialty: payload.specialty?.trim() || null,
        shortBio: payload.shortBio?.trim() || null,
        bio: payload.bio?.trim() || null,
        email: payload.email ?? null,
        yearsExperience: payload.yearsExperience ?? null,
        priority: payload.priority ?? null,
        photoUrl: payload.photoUrl?.trim() || null,
        gallery: payload.gallery,
        active: payload.active ?? true,
        featured: payload.featured ?? false,
      },
    })
    return NextResponse.json(doctor, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/doctors", error)
    const handled = handleKnownError(error)
    if (handled) return handled
    return NextResponse.json({ error: "Unable to create doctor" }, { status: 400 })
  }
}
