import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { z } from "zod"

const settingsSchema = z.object({
  homeHeroAnnouncement: z.string().trim().max(200).nullable().optional(),
})

const SETTINGS_ID = "site"

export async function GET() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
  })

  return NextResponse.json({
    id: SETTINGS_ID,
    homeHeroAnnouncement: settings?.homeHeroAnnouncement ?? null,
  })
}

export async function PUT(request: Request) {
  try {
    const payload = settingsSchema.parse(await request.json())
    const data = {
      id: SETTINGS_ID,
      homeHeroAnnouncement: payload.homeHeroAnnouncement ?? null,
    }
    const settings = await prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: data,
      update: { homeHeroAnnouncement: data.homeHeroAnnouncement },
    })
    return NextResponse.json(settings)
  } catch (error) {
    console.error("PUT /api/site-settings", error)
    return NextResponse.json({ error: "Unable to update site settings" }, { status: 400 })
  }
}
