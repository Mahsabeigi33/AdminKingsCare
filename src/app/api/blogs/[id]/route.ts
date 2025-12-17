import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  excerpt: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  published: z.coerce.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
  removeImage: z.coerce.boolean().optional(),
})

// Keep below Vercel Serverless payload limit to avoid 413s
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024 // 4MB
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT)
const uploadsDirectory = isServerless
  ? path.join(os.tmpdir(), 'uploads', 'blogs')
  : path.join(process.cwd(), 'public', 'uploads', 'blogs')

type RouteContext = { params: Promise<{ id: string }> }

async function persistImage(file: File) {
  if (file.size === 0) return undefined
  if (file.size > MAX_UPLOAD_SIZE) {
    throw new Error('IMAGE_TOO_LARGE')
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const extension = path.extname(file.name) || '.jpg'
  const filename = `${randomUUID()}${extension}`
  // Try Vercel Blob first (dynamic import to avoid build-time dependency)
  try {
    const mod: unknown = await import('@vercel/blob')
    const put = (mod as { put?: (key: string, data: Buffer, opts: { access?: string; contentType?: string }) => Promise<{ url: string }> }).put
    if (typeof put === 'function') {
      const blob = await put(`uploads/blogs/${filename}`, buffer, {
        access: 'public',
        contentType: file.type || 'image/jpeg',
      })
      return blob.url
    }
  } catch {}

  // Fallback to local/temp storage (ephemeral)
  const filePath = path.join(uploadsDirectory, filename)
  await fs.mkdir(uploadsDirectory, { recursive: true })
  await fs.writeFile(filePath, buffer)
  return path.posix.join('/uploads/blogs', filename)
}

function formFlag(value: FormDataEntryValue | null) {
  if (value == null) return undefined
  const normalized = value.toString().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false
  return undefined
}

function formString(value: FormDataEntryValue | null) {
  return value != null ? value.toString().trim() : undefined
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const data: Record<string, unknown> = {}

      if (formData.has('title')) {
        const value = formString(formData.get('title'))
        if (value) data.title = value
      }

      if (formData.has('slug')) {
        const value = formString(formData.get('slug'))
        if (value) data.slug = value
      }

      if (formData.has('excerpt')) {
        const value = formString(formData.get('excerpt'))
        data.excerpt = value || null
      }

      if (formData.has('content')) {
        const value = formString(formData.get('content'))
        data.content = value || null
      }

      const publishedFlag = formFlag(formData.get('published'))
      if (typeof publishedFlag === 'boolean') {
        data.published = publishedFlag
      }

      const removeImageFlag = formFlag(formData.get('removeImage'))
      if (removeImageFlag === true) {
        data.imageUrl = null
      }

      const file = formData.get('image')
      if (file instanceof File && file.size > 0) {
        try {
          data.imageUrl = await persistImage(file)
        } catch (error) {
          if (error instanceof Error && error.message === 'IMAGE_TOO_LARGE') {
            return NextResponse.json({ error: 'Image must be smaller than 5MB.' }, { status: 413 })
          }
          console.error('Image upload failed', error)
          return NextResponse.json({ error: 'Unable to save image.' }, { status: 500 })
        }
      }

      const blog = await prisma.blog.update({
        where: { id },
        data,
      })

      return NextResponse.json(blog)
    }

    const payload = updateSchema.parse(await request.json())
    const blog = await prisma.blog.update({
      where: { id },
      data: payload,

    })
    return NextResponse.json(blog)
  } catch (error: unknown) {
    console.error('PATCH /api/blogs/[id]', error)
    return NextResponse.json({ error: 'Unable to update blog post' }, { status: 400 })
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    await prisma.blog.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('DELETE /api/blogs/[id]', error)
    return NextResponse.json({ error: 'Unable to delete blog post' }, { status: 400 })
  }
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params
  const blog = await prisma.blog.findUnique({ where: { id } })
  if (!blog) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json(blog)
}
