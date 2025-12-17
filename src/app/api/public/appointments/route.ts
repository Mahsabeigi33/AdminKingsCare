import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const STATUS_DEFAULT = 'BOOKED' as const
const bookingSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    patientName: z.string().trim().min(1, 'Patient name is required when no patient is selected.').optional(),
    serviceId: z.string().min(1),
    date: z.coerce.date(),
    notes: z.string().trim().optional(),
  })
  .refine(
    (value) => Boolean(value.patientId || value.patientName),
    {
      message: 'Provide a patient from the directory or enter a name.',
      path: ['patientId'],
    },
  )

const sanitize = (value?: string | null) => value?.trim() || undefined

const corsHeaders = () => {
  const origin = process.env.PUBLIC_BOOKING_ORIGIN ?? '*'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(),
  })
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: Request) {
  try {
    const payload = bookingSchema.parse(await request.json())
    const customName = sanitize(payload.patientName)

    const appointment = await prisma.appointment.create({
      data: {
        patientId: payload.patientId,
        customPatientName: payload.patientId ? undefined : customName,
        serviceId: payload.serviceId,
        date: payload.date,
        status: STATUS_DEFAULT,
        notes: sanitize(payload.notes) ?? undefined,
      },
      select: {
        id: true,
        date: true,
        status: true,
        customPatientName: true,
        notes: true,
        patient: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(appointment, {
      status: 201,
      headers: corsHeaders(),
    })
  } catch (error) {
    console.error('POST /api/public/appointments', error)
    return NextResponse.json(
      { error: 'Unable to create appointment request.' },
      {
        status: 400,
        headers: corsHeaders(),
      },
    )
  }
}
