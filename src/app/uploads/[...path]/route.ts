export const runtime = "nodejs"

import { NextResponse, NextRequest } from "next/server"
import path from "path"
import os from "os"
import { stat, readFile } from "fs/promises"

const guessContentType = (p: string): string => {
  const ext = path.extname(p).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".gif":
      return "image/gif"
    case ".svg":
      return "image/svg+xml"
    default:
      return "application/octet-stream"
  }
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await ctx.params
    if (!Array.isArray(segments) || segments.length === 0) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const base = path.join(os.tmpdir(), "uploads")
    const filePath = path.join(base, ...segments)

    const info = await stat(filePath)
    if (!info.isFile()) {
      return new NextResponse("Not Found", { status: 404 })
    }

    const data = await readFile(filePath)
    const contentType = guessContentType(filePath)
    const arr = new Uint8Array(data)
    return new NextResponse(arr, {
      status: 200,
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=60" },
    })
  } catch {
    return new NextResponse("Not Found", { status: 404 })
  }
}
