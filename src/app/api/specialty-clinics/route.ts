import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const clinicSchema = z.object({
  title: z.string().trim().min(1),
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  image: z.string().trim().min(1),
})

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const clinics = await prisma.specialtyClinic.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(clinics)
}

export async function POST(request: Request) {
  try {
    const payload = clinicSchema.parse(await request.json())
    const clinic = await prisma.specialtyClinic.create({
      data: payload,
    })
    return NextResponse.json(clinic, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/specialty-clinics", error)
    return NextResponse.json({ error: "Unable to create specialty clinic" }, { status: 400 })
  }
}
