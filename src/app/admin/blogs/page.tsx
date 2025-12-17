import BlogsManager, { type BlogPost as ManagerBlogPost } from "./BlogsManager"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export default async function BlogsPage() {
  const posts = await prisma.blog.findMany({
    orderBy: { createdAt: "desc" },
  })

  const serializedPosts: ManagerBlogPost[] = posts.map((post) => ({
    ...(post as unknown as Omit<ManagerBlogPost, "createdAt" | "updatedAt"> & {
      createdAt: Date
      updatedAt: Date
    }),
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Content</p>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Manage Blog Articles</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Draft, publish, and organize KingsCare Medical Clinic blog posts using Vuexy-inspired tools.
        </p>
      </header>
      <BlogsManager initialPosts={serializedPosts} />
    </div>
  )
}


