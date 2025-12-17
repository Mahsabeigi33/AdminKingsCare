import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

type PrismaTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
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
} as const

const uniqueFieldMessage: Record<string, string> = {
  email: "Email already in use.",
  phone: "Phone number already in use.",
}

type PrismaKnownError = { code?: string; meta?: { target?: string | string[] } }

function isUniqueConstraintError(err: unknown): err is PrismaKnownError {
  if (typeof err !== 'object' || err === null) {
    return false
  }
  const maybe = err as { code?: unknown; meta?: { target?: string | string[] } }
  return typeof maybe.code === 'string' && maybe.code === 'P2002'
}

const handleKnownError = (error: unknown) => {
  if (isUniqueConstraintError(error)) {
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

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: RouteContext
) {
  const params = await paramsPromise
  const patient = await prisma.patient.findUnique({
    where: { id: params.id },
    include: patientInclude,
  })
  if (!patient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  return NextResponse.json(patient)
}

export async function PUT(
  request: NextRequest,
  { params: paramsPromise }: RouteContext
) {
  const params = await paramsPromise
  try {
    const payload = updateSchema.parse(await request.json())
    const { serviceIds, ...updateData } = payload

    const patient = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.patient.update({
        where: { id: params.id },
        data: {
          ...updateData,
        },
      })

      if (serviceIds) {
        const existingUsages = await tx.patientServiceUsage.findMany({
          where: { patientId: params.id },
          select: { serviceId: true },
        })

        const existingIds = new Set<string>(
          existingUsages.map((usage: { serviceId: string }) => usage.serviceId)
        )
        const incomingIds = new Set<string>(serviceIds)

        const toDelete = [...existingIds].filter((id) => !incomingIds.has(id))
        const toCreate = [...incomingIds].filter((id) => !existingIds.has(id))

        if (toDelete.length) {
          await tx.patientServiceUsage.deleteMany({
            where: {
              patientId: params.id,
              serviceId: { in: toDelete },
            },
          })
        }

        if (toCreate.length) {
          await tx.patientServiceUsage.createMany({
            data: toCreate.map((serviceId) => ({
              patientId: params.id,
              serviceId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return tx.patient.findUniqueOrThrow({
        where: { id: params.id },
        include: patientInclude,
      })
    })

    return NextResponse.json(patient)
  } catch (error: unknown) {
    console.error("PUT /api/patients/[id]", error)
    const handled = handleKnownError(error)
    if (handled) return handled
    return NextResponse.json({ error: "Unable to update patient" }, { status: 400 })
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
    await prisma.$transaction([
      prisma.patientServiceUsage.deleteMany({ where: { patientId: params.id } }),
      prisma.patient.delete({ where: { id: params.id } }),
    ])
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error("DELETE /api/patients/[id]", error)
    return NextResponse.json({ error: "Unable to delete patient" }, { status: 400 })
  }
}