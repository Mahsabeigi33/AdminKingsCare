import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const STATUS_ENUM = ['BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const

const createSchema = z
  .object({
    patientId: z.string().min(1).optional(),
    patientName: z.string().trim().min(1, 'Patient name is required when no patient is selected.').optional(),
    serviceId: z.string().min(1),
    staffId: z.string().min(1).optional(),
    date: z.coerce.date(),
    status: z.enum(STATUS_ENUM).optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (value) => Boolean(value.patientId || value.patientName),
    {
      message: 'Provide a patient or enter a name.',
      path: ['patientId'],
    },
  )

const sanitizePatientName = (name?: string) => name?.trim() || undefined

type Status = typeof STATUS_ENUM[number]
export type CreateAppointmentPayload = z.infer<typeof createSchema>

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusParam = searchParams.get('status') ?? undefined
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')
    const from = fromParam ? new Date(fromParam) : undefined
    const to = toParam ? new Date(toParam) : undefined
    const patientId = searchParams.get('patientId') ?? undefined
    const status = statusParam && STATUS_ENUM.includes(statusParam as Status) ? (statusParam as Status) : undefined

    const appointments = await prisma.appointment.findMany({
      where: {
        status,
        patientId: patientId || undefined,
        date: {
          gte: from,
          lte: to,
        },
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(appointments)
  } catch (error) {
    console.error('GET /api/appointments', error)
    return NextResponse.json({ error: 'Unable to list appointments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json())
    const patientName = sanitizePatientName(payload.patientName)
    const appointment = await prisma.appointment.create({
      data: {
        patientId: payload.patientId,
        customPatientName: payload.patientId ? undefined : patientName,
        serviceId: payload.serviceId,
        staffId: payload.staffId,
        date: payload.date,
        status: (payload.status ?? 'BOOKED') as Status,
        notes: payload.notes ?? undefined,
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { name: true } },
        staff: { select: { name: true } },
      },
    })
    return NextResponse.json(appointment, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/appointments', error)
    return NextResponse.json({ error: 'Unable to create appointment' }, { status: 400 })
  }
}
