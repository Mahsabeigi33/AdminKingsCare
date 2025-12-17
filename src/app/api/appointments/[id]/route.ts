import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod'

const STATUS_ENUM = ['BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const

const updateSchema = z.object({
  patientId: z.string().min(1).nullable().optional(),
  patientName: z.string().trim().min(1).nullable().optional(),
  serviceId: z.string().min(1).optional(),
  staffId: z.string().min(1).nullable().optional(),
  date: z.coerce.date().optional(),
  status: z.enum(STATUS_ENUM).optional(),
  notes: z.string().nullable().optional(),
})

const sanitizePatientName = (name: string | null | undefined) => name?.trim() || undefined

export async function PATCH(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise
  try {
    const payload = updateSchema.parse(await request.json())
    const { patientId, patientName, ...rest } = payload

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        ...rest,
        patientId: patientId === undefined ? undefined : patientId,
        customPatientName:
          patientId !== undefined && patientId
            ? null
            : patientName !== undefined
              ? sanitizePatientName(patientName) ?? null
              : undefined,
      },

      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        service: { select: { id: true, name: true } },
        staff: { select: { id: true, name: true } },
      },
    })
    return NextResponse.json(appointment)
  } catch (error: unknown) {
    console.error('PATCH /api/appointments/[id]', error)
    return NextResponse.json({ error: 'Unable to update appointment' }, { status: 400 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise
  try {
    await prisma.appointment.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('DELETE /api/appointments/[id]', error)
    return NextResponse.json({ error: 'Unable to delete appointment' }, { status: 400 })
  }
}

export async function GET( Request: NextRequest , { params }: { params: Promise<{ id: string }> }) {
   const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id: id },
    include: {
      patient: { select: { firstName: true, lastName: true, id: true } },
      service: { select: { name: true, id: true } },
      staff: { select: { name: true, id: true } },
    },
  })
  if (!appointment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(appointment)
}
