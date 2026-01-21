import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

const updateSchema = z.object({
  title: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  image: z.string().trim().min(1).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const clinic = await prisma.specialtyClinic.findUnique({ where: { id } })
  if (!clinic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(clinic)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const payload = updateSchema.parse(await request.json())
    const clinic = await prisma.specialtyClinic.update({
      where: { id },
      data: payload,
    })
    return NextResponse.json(clinic)
  } catch (error: unknown) {
    console.error("PATCH /api/specialty-clinics/[id]", error)
    return NextResponse.json({ error: "Unable to update specialty clinic" }, { status: 400 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    await prisma.specialtyClinic.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("DELETE /api/specialty-clinics/[id]", error)
    return NextResponse.json({ error: "Unable to delete specialty clinic" }, { status: 400 })
  }
}
