import { prisma } from '@/lib/prisma'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import slugify from 'slugify'

const createSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  published: z.coerce.boolean().optional(),
  imageUrl: z.string().nullable().optional(),
})

// Keep below Vercel Serverless payload limit to avoid 413s
const MAX_UPLOAD_SIZE = 4 * 1024 * 1024 // 4MB
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT)
const uploadsDirectory = isServerless
  ? path.join(os.tmpdir(), 'uploads', 'blogs')
  : path.join(process.cwd(), 'public', 'uploads', 'blogs')

const shouldDeleteBlob = (url?: string | null) => Boolean(url && /blob\.vercel-storage\.com/i.test(url))

async function deleteBlobIfNeeded(url?: string | null) {
  if (!shouldDeleteBlob(url)) return
  try {
    const mod: unknown = await import('@vercel/blob')
    const del = (mod as { del?: (url: string) => Promise<void> }).del
    if (typeof del === 'function') {
      await del(url as string)
    }
  } catch (error) {
    console.error('Unable to delete blob asset', error)
  }
}

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

  if (isServerless) {
    throw new Error('BLOB_UPLOAD_FAILED')
  }

  // Fallback to local/temp storage (ephemeral)
  const filePath = path.join(uploadsDirectory, filename)
  await fs.mkdir(uploadsDirectory, { recursive: true })
  await fs.writeFile(filePath, buffer)
  return path.posix.join('/uploads/blogs', filename)
}

function formFlag(value: FormDataEntryValue | null, fallback = false) {
  if (value == null) return fallback
  const normalized = value.toString().toLowerCase()
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on'
}

function formString(value: FormDataEntryValue | null) {
  return value != null ? value.toString().trim() : ''
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') ?? undefined

  const blogs = await prisma.blog.findMany({
    where: query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(blogs)
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const title = formString(formData.get('title'))
      const slugInput = formString(formData.get('slug'))
      if (!title) {
        return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
      }

      const slug = slugInput || slugify(title, { lower: true, strict: true })
      if (!slug) {
        return NextResponse.json({ error: 'Slug is required.' }, { status: 400 })
      }

      let imageUrl: string | undefined
      const file = formData.get('image')
      if (file instanceof File && file.size > 0) {
        try {
          imageUrl = await persistImage(file)
        } catch (error) {
          if (error instanceof Error && error.message === 'IMAGE_TOO_LARGE') {
            return NextResponse.json({ error: 'Image must be smaller than 4MB.' }, { status: 413 })
          }
          if (error instanceof Error && error.message === 'BLOB_UPLOAD_FAILED') {
            return NextResponse.json({ error: 'Unable to upload image to blob storage.' }, { status: 503 })
          }
          console.error('Image upload failed', error)
          return NextResponse.json({ error: 'Unable to save image.' }, { status: 500 })
        }
      }

      const blog = await prisma.blog.create({
        data: {
          title,
          slug,
          excerpt: formString(formData.get('excerpt')) || undefined,
          content: formString(formData.get('content')) || undefined,
          published: formFlag(formData.get('published')),
          imageUrl,
        },
      })
      return NextResponse.json(blog, { status: 201 })
    }

    const payload = createSchema.parse(await request.json())
    const blog = await prisma.blog.create({
      data: {
        title: payload.title,
        slug: payload.slug,
        excerpt: payload.excerpt ?? undefined,
        content: payload.content ?? undefined,
        published: payload.published ?? false,
        imageUrl: payload.imageUrl ?? undefined,
      },
    })
    return NextResponse.json(blog, { status: 201 })
  } catch (error: unknown) {
    console.error('POST /api/blogs', error)
    return NextResponse.json({ error: 'Unable to create blog post' }, { status: 400 })
  }
}
