import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const stringArray = z
  .array(z.string().trim().min(1))
  .transform((items) => Array.from(new Set(items)))
  .default([])

const nullableStr = (min?: number) =>
  z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? null : value))
    .pipe(min ? z.string().min(min) : z.string())
    .nullable()
    .optional()

const updateSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  title: z.string().trim().optional().nullable(),
  specialty: z.string().trim().optional().nullable(),
  shortBio: z.string().trim().max(240).optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  email: nullableStr().refine((value) => !value || /\S+@\S+\.\S+/.test(value), {
    message: "Invalid email",
  }),
  phone: nullableStr(5),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional().nullable(),
  languages: stringArray.optional(),
  photoUrl: z.string().trim().optional().nullable(),
  gallery: stringArray.optional(),
  active: z.coerce.boolean().optional(),
  featured: z.coerce.boolean().optional(),
})

const uniqueFieldMessage: Record<string, string> = {
  email: "Email already in use.",
  phone: "Phone number already in use.",
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

type RouteContext = { params: Promise<{ id: string }> }

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const revalidate = 0

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: RouteContext
) {
  const params = await paramsPromise
  const doctor = await prisma.doctor.findUnique({ where: { id: params.id } })
  if (!doctor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(doctor)
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: RouteContext
) {
  const params = await paramsPromise
  try {
    const payload = updateSchema.parse(await request.json())
    const doctor = await prisma.doctor.update({
      where: { id: params.id },
      data: {
        ...payload,
        title: payload.title?.trim() ?? null,
        specialty: payload.specialty?.trim() ?? null,
        shortBio: payload.shortBio?.trim() ?? null,
        bio: payload.bio?.trim() ?? null,
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        languages: payload.languages ?? undefined,
        gallery: payload.gallery ?? undefined,
        photoUrl: payload.photoUrl ?? undefined,
      },
    })
    return NextResponse.json(doctor)
  } catch (error: unknown) {
    console.error("PUT /api/doctors/[id]", error)
    const handled = handleKnownError(error)
    if (handled) return handled
    return NextResponse.json({ error: "Unable to update doctor" }, { status: 400 })
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return PUT(request, context)
}

export async function DELETE(
  _request: NextRequest,
  { params: paramsPromise }: RouteContext
) {
  const params = await paramsPromise
  try {
    await prisma.doctor.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("DELETE /api/doctors/[id]", error)
    return NextResponse.json({ error: "Unable to delete doctor" }, { status: 400 })
  }
}
