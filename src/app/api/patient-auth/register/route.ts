import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { z } from "zod"

import { prisma } from "@/lib/prisma"

const corsHeaders = () => {
  const origin =
    process.env.PATIENT_PORTAL_ORIGIN ??
    process.env.PUBLIC_BOOKING_ORIGIN ??
    "*"

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  }
}

const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: z
      .string()
      .optional()
      .transform((value) => value?.trim() || undefined)
      .refine(
        (value) => !value || value.length >= 5,
        {
          message: "Phone number is too short",
          path: ["phone"],
        },
      ),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }
  })

const sanitizeName = (value: string) => value.trim().replace(/\s+/g, " ")

type PrismaKnownError = { code?: string; meta?: { target?: string | string[] } }
function isUniqueConstraintError(err: unknown): err is PrismaKnownError {
  if (typeof err !== 'object' || err === null) return false
  const maybe = err as { code?: unknown; meta?: { target?: string | string[] } }
  return typeof maybe.code === 'string' && maybe.code === 'P2002'
}

const handleKnownError = (error: unknown) => {
  if (isUniqueConstraintError(error)) {
    const target = error.meta?.target
    const fields = Array.isArray(target)
      ? target
      : typeof target === "string"
        ? [target]
        : []

    if (fields.includes("email") || fields.includes("patientId")) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409, headers: corsHeaders() },
      )
    }

    if (fields.includes("phone")) {
      return NextResponse.json(
        { error: "Phone number already in use." },
        { status: 409, headers: corsHeaders() },
      )
    }

    return NextResponse.json(
      { error: "Duplicate value detected." },
      { status: 409, headers: corsHeaders() },
    )
  }

  return null
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export async function POST(request: Request) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON payload.",
      },
      { status: 400, headers: corsHeaders() },
    )
  }

  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten()

    return NextResponse.json(
      {
        error: "Validation failed.",
        details: { fieldErrors },
      },
      { status: 400, headers: corsHeaders() },
    )
  }

  const data = parsed.data
  const email = data.email

  try {
    const existingAccount = await prisma.patientAccount.findUnique({
      where: { email },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: "Email already in use." },
        { status: 409, headers: corsHeaders() },
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 10)

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
      const patientMatches: { email?: string; phone?: string }[] = [{ email }]
      if (data.phone) {
        patientMatches.push({ phone: data.phone })
      }

      let patient = await tx.patient.findFirst({
        where: {
          OR: patientMatches,
        },
      })

      if (!patient) {
        patient = await tx.patient.create({
          data: {
            firstName: sanitizeName(data.firstName),
            lastName: sanitizeName(data.lastName),
            email,
            phone: data.phone ?? null,
          },
        })
      } else {
        const updates: {
          firstName?: string
          lastName?: string
          phone?: string | null
          email?: string | null
        } = {}

        const nextFirstName = sanitizeName(data.firstName)
        const nextLastName = sanitizeName(data.lastName)
        const nextPhone = data.phone ?? null

        if (patient.firstName !== nextFirstName) {
          updates.firstName = nextFirstName
        }
        if (patient.lastName !== nextLastName) {
          updates.lastName = nextLastName
        }
        if (patient.phone !== nextPhone) {
          updates.phone = nextPhone
        }
        if (patient.email !== email) {
          updates.email = email
        }

        if (Object.keys(updates).length) {
          patient = await tx.patient.update({
            where: { id: patient.id },
            data: updates,
          })
        }
      }

      const account = await tx.patientAccount.create({
        data: {
          patientId: patient.id,
          email,
          passwordHash,
        },
        select: {
          id: true,
          createdAt: true,
        },
      })

      return {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          email: patient.email,
          phone: patient.phone,
        },
        account,
      }
    })

    return NextResponse.json(result, {
      status: 201,
      headers: corsHeaders(),
    })
  } catch (error) {
    console.error("POST /api/patient-auth/register", error) // The 'error' variable is used here in the log.
    const handled = handleKnownError(error)
    if (handled) return handled

    return NextResponse.json(
      { error: "Unable to register patient account." },
      { status: 500, headers: corsHeaders() },
    )
  }
}
import type { Prisma } from '@prisma/client'
