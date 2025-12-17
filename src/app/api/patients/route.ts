import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"

const patientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(5).optional().nullable(),
  email: z.string().email().optional().nullable(),
  dob: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  serviceIds: z.array(z.string().min(1)).optional(),
})

const patientInclude = {
  serviceUsages: {
    orderBy: { usedAt: "desc" as const },
    include: {
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.PatientInclude

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email")

  if (email) {
    const patient = await prisma.patient.findUnique({
      where: { email },
      include: patientInclude,
    })
    return NextResponse.json(patient)
  }

  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: "desc" },
    include: patientInclude,
  })
  return NextResponse.json(patients)
}

export async function POST(request: Request) {
  try {
    const payload = patientSchema.parse(await request.json())
    const { serviceIds = [], ...patientData } = payload

    const patient = await prisma.$transaction(async (tx) => {
      const created = await tx.patient.create({
        data: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          phone: patientData.phone ?? null,
          email: patientData.email ?? null,
          dob: patientData.dob ?? null,
          notes: patientData.notes ?? null,
        },
      })

      if (serviceIds.length) {
        await tx.patientServiceUsage.createMany({
          data: serviceIds.map((serviceId) => ({
            patientId: created.id,
            serviceId,
          })),
          skipDuplicates: true,
        })
      }

      return tx.patient.findUniqueOrThrow({
        where: { id: created.id },
        include: patientInclude,
      })
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/patients", error)
    const handled = handleKnownError(error)
    if (handled) return handled
    return NextResponse.json({ error: "Unable to create patient" }, { status: 400 })
  }
}
