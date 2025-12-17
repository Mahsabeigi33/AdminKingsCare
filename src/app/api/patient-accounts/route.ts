import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const createSchema = z.object({
  patientId: z.string().min(1),
  email: z.string().email(),
  passwordHash: z.string().min(1),
})

const querySchema = z.object({
  email: z.string().email(),
})

const uniqueFieldMessage: Record<string, string> = {
  email: "Email already in use.",
  patientId: "Account already exists for this patient.",
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

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json())

    const account = await prisma.patientAccount.create({
      data: {
        patientId: payload.patientId,
        email: payload.email,
        passwordHash: payload.passwordHash,
      },
      include: {
        patient: true,
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error("POST /api/patient-accounts", error)
    const handled = handleKnownError(error)
    if (handled) return handled
    return NextResponse.json({ error: "Unable to create patient account" }, { status: 400 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rawEmail = searchParams.get("email")
    if (!rawEmail) {
      return NextResponse.json({ error: "Email query parameter is required" }, { status: 400 })
    }

    const { email } = querySchema.parse({ email: rawEmail })

    const account = await prisma.patientAccount.findUnique({
      where: { email },
      include: { patient: true },
    })

    if (!account) {
      return NextResponse.json(null, { status: 200 })
    }

    return NextResponse.json(account)
  } catch (error) {
    console.error("GET /api/patient-accounts", error)
    return NextResponse.json({ error: "Unable to retrieve patient account" }, { status: 400 })
  }
}
// @ts-nocheck
type PrismaKnownError = { code?: string; meta?: { target?: string | string[] } }
function isUniqueConstraintError(err: unknown): err is PrismaKnownError {
  if (typeof err !== 'object' || err === null) return false
  const maybe = err as { code?: unknown; meta?: { target?: string | string[] } }
  return typeof maybe.code === 'string' && maybe.code === 'P2002'
}
