export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { mkdir, stat, writeFile } from "fs/promises"
import { randomUUID } from "crypto"
import path from "path"
import os from "os"

// Keep below Vercel Serverless payload limit to avoid 413s
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"])

const ensureUploadsDir = async (dirPath: string) => {
  try {
    const info = await stat(dirPath)
    if (!info.isDirectory()) {
      throw new Error("Uploads path exists and is not a directory")
    }
  } catch (error: unknown) {
    const notFound = (error as NodeJS.ErrnoException).code === "ENOENT"
    if (notFound) {
      await mkdir(dirPath, { recursive: true })
      return
    }
    throw error
  }
}

const saveFile = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer())
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("File too large")
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Unsupported file type")
  }
  const ext = path.extname(file.name) || ""
  const filename = `${Date.now()}-${randomUUID()}${ext}`

  // Try Vercel Blob first for persistence (loaded at runtime)
  try {
    const mod: unknown = await import("@vercel/blob")
    const put = (mod as { put?: (key: string, data: Buffer, opts: { access?: string; contentType?: string }) => Promise<{ url: string }> }).put
    if (typeof put === "function") {
      const blob = await put(`uploads/${filename}`, buffer, {
        access: "public",
        contentType: file.type || undefined,
      })
      return blob.url
    }
  } catch {}

  // Fallback to local/temp disk (ephemeral)
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_REGION || process.env.LAMBDA_TASK_ROOT)
  const uploadsDir = isServerless
    ? path.join(os.tmpdir(), "uploads")
    : path.join(process.cwd(), "public", "uploads")
  await ensureUploadsDir(uploadsDir)
  const diskPath = path.join(uploadsDir, filename)
  await writeFile(diskPath, buffer)
  return `/uploads/${filename}`
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const fileEntry = formData.get("file")

    if (!fileEntry || !(fileEntry instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const url = await saveFile(fileEntry)

    return NextResponse.json({ url }, { status: 201 })
  } catch (error: unknown) {
    console.error("POST /api/uploads", error)
    return NextResponse.json({ error: (error as Error).message ?? "Upload failed" }, { status: 400 })
  }
}

