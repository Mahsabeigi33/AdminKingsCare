"use client"
import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import type { ChangeEvent, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import slugify from 'slugify'
import Image from 'next/image'
export type BlogPost = {
  id: string
  title: string
  slug: string
  excerpt?: string | null
  content?: string | null
  imageUrl?: string | null
  published: boolean
  createdAt?: string
  updatedAt?: string
}

type Props = {
  initialPosts: BlogPost[]
}

type FormState = {
  title: string
  slug: string
  excerpt: string
  content: string
  published: boolean
}

const cardClass = 'rounded-3xl border border-slate-200/70 dark:border-slate-800/60 bg-white/90 dark:bg-slate-950/80 p-6 shadow-2xl shadow-slate-200/60 dark:shadow-black/20'

export default function BlogsManager({ initialPosts }: Props) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)
  const [form, setForm] = useState<FormState>({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    published: false,
  })

  const handleChange = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setImageFile(file)
    setImageRemoved(false)
    setImagePreview((previous) => {
      if (previous?.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return file ? URL.createObjectURL(file) : null
    })
    event.target.value = ''
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImageRemoved(true)
    setImagePreview((previous) => {
      if (previous?.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startEditing = (post: BlogPost) => {
    setEditingPost(post)
    setForm({
      title: post.title ?? '',
      slug: post.slug ?? '',
      excerpt: post.excerpt ?? '',
      content: post.content ?? '',
      published: post.published ?? false,
    })
    setImageRemoved(false)
    setImageFile(null)
    setImagePreview(post.imageUrl ?? null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEditing = () => {
    resetForm()
    setToast({ tone: 'success', message: 'Editing cancelled.' })
  }

  const resetForm = () => {
    setForm({ title: '', slug: '', excerpt: '', content: '', published: false })
    setEditingPost(null)
    setImageRemoved(false)
    setImageFile(null)
    setImagePreview((previous) => {
      if (previous?.startsWith('blob:')) {
        URL.revokeObjectURL(previous)
      }
      return null
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.title.trim()) {
      setToast({ tone: 'error', message: 'Title is required.' })
      return
    }
    setSubmitting(true)
    try {
      const isEditing = Boolean(editingPost)
      const slug = form.slug.trim() || slugify(form.title, { lower: true, strict: true })
      const payload = new FormData()
      payload.append('title', form.title.trim())
      if (slug) payload.append('slug', slug)
      if (form.excerpt.trim()) payload.append('excerpt', form.excerpt.trim())
      if (form.content.trim()) payload.append('content', form.content.trim())
      payload.append('published', form.published ? 'true' : 'false')
      if (imageFile) payload.append('image', imageFile)
      if (isEditing && imageRemoved && !imageFile) {
        payload.append('removeImage', 'true')
      }

      const endpoint = isEditing && editingPost ? `/api/blogs/${editingPost.id}` : '/api/blogs'
      const response = await fetch(endpoint, {
        method: isEditing ? 'PATCH' : 'POST',
        body: payload,
      })
      if (!response.ok) throw new Error('Failed to save post')
      const saved: BlogPost = await response.json()
      setPosts((prev) =>
        isEditing ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]
      )
      resetForm()
      setToast({ tone: 'success', message: isEditing ? 'Post updated.' : 'Post created.' })
      router.refresh()
    } catch (error) {
      console.error(error)
      setToast({ tone: 'error', message: 'Unable to save blog post.' })
    } finally {
      setSubmitting(false)
    }
  }

  const togglePublish = async (post: BlogPost) => {
    setSubmitting(true)
    try {
      const response = await fetch(`/api/blogs/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !post.published }),
      })
      if (!response.ok) throw new Error('Failed to update post')
      const updated: BlogPost = await response.json()
      setPosts((prev) => prev.map((item) => (item.id === post.id ? updated : item)))
      if (editingPost?.id === updated.id) {
        setForm((prev) => ({ ...prev, published: updated.published }))
      }
      setToast({ tone: 'success', message: updated.published ? 'Post published.' : 'Post saved as draft.' })
      router.refresh()
    } catch (error) {
      console.error(error)
      setToast({ tone: 'error', message: 'Unable to update publish state.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (post: BlogPost) => {
    if (!window.confirm(`Delete "${post.title}"?`)) return
    setSubmitting(true)
    try {
      const response = await fetch(`/api/blogs/${post.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete post')
      setPosts((prev) => prev.filter((item) => item.id !== post.id))
      if (editingPost?.id === post.id) {
        resetForm()
      }
      setToast({ tone: 'success', message: 'Post deleted.' })
      router.refresh()
    } catch (error) {
      console.error(error)
      setToast({ tone: 'error', message: 'Unable to delete blog post.' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg transition ${
            toast.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-400/40 bg-rose-500/10 text-rose-100'
          }`}
        >
          <span className="font-medium uppercase tracking-[0.2em]">
            {toast.tone === 'success' ? 'Success' : 'Error'}
          </span>
          <span className="text-slate-900 dark:text-slate-100">{toast.message}</span>
        </div>
      )}
      <section className={cardClass}>
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">
              {editingPost ? 'Update Post' : 'Create Post'}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {editingPost ? 'Edit blog article' : 'Share a new update'}
            </h2>
          </div>
          {editingPost && (
            <span className="text-xs uppercase tracking-[0.3em] text-amber-300">
              Editing: {editingPost.title}
            </span>
          )}
        </header>
        <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Title</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.title}
              onChange={(event) => handleChange('title', event.target.value)}
              placeholder="How we design bespoke care plans"
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Slug</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.slug}
              onChange={(event) => handleChange('slug', event.target.value)}
              placeholder="optional-friendly-url"
              disabled={submitting}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Feature image</label>
            <div className="mt-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 p-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={submitting}
                className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-indigo-500 file:px-4 file:py-1 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-white hover:file:bg-indigo-400 disabled:file:cursor-not-allowed"
              />
              {imagePreview ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200/70 dark:border-slate-800/60 bg-slate-200/80 dark:bg-slate-950/40 p-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={imagePreview}
                      alt="Selected blog cover"
                      width={64}
                      height={64}
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Preview</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="rounded-full border border-rose-500/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={submitting}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Upload a JPG or PNG under 4MB to highlight this post.</p>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Publish immediately</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.published ? 'yes' : 'no'}
              onChange={(event) => handleChange('published', event.target.value === 'yes')}
              disabled={submitting}
            >
              <option value="no">Save as draft</option>
              <option value="yes">Publish</option>
            </select>
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Excerpt</label>
            <textarea
              className="mt-1 h-20 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.excerpt}
              onChange={(event) => handleChange('excerpt', event.target.value)}
              placeholder="Short teaser for the blog list"
              disabled={submitting}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <label className="text-xs uppercase tracking-[0.3em] text-slate-500">Body copy</label>
            <textarea
              className="mt-1 h-32 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
              value={form.content}
              onChange={(event) => handleChange('content', event.target.value)}
              placeholder="Markdown or HTML accepted"
              disabled={submitting}
            />
          </div>
          <div className="lg:col-span-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            >
              {submitting ? 'Saving...' : editingPost ? 'Update Post' : 'Save Post'}
            </button>
            {editingPost && (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-slate-700 dark:text-slate-200 transition hover:border-amber-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className={cardClass}>
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-400">Library</p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent posts</h2>
          </div>
          <span className="text-xs text-slate-500">{posts.length} entries</span>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase tracking-[0.3em] text-slate-500">
              <tr className="border-b border-slate-200/70 dark:border-slate-800/60">
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-slate-200/60 dark:border-slate-800/40 last:border-b-0">
                  <td className="px-3 py-3 text-slate-900 dark:text-slate-100">
                    <div className="flex items-start gap-3">
                      {post.imageUrl && (
                        <Image
                          src={post.imageUrl}
                          alt={`${post.title} cover`}
                          width={48}
                          height={48}
                          className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium">{post.title}</div>
                        {post.excerpt && <p className="text-xs text-slate-500 line-clamp-2">{post.excerpt}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">/{post.slug}</td>
                  <td className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => togglePublish(post)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                        post.published
                          ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200'
                          : 'border-slate-400 dark:border-slate-600 bg-slate-700/30 text-slate-600 dark:text-slate-300'
                      }`}
                      disabled={submitting}
                    >
                      {post.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-slate-500 dark:text-slate-400">
                    {post.updatedAt ? format(new Date(post.updatedAt), 'MMM d, yyyy') : '---'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="rounded-full border border-slate-300 dark:border-slate-700 px-3 py-1 text-slate-700 dark:text-slate-200 transition hover:border-indigo-500 hover:text-white"
                        onClick={() => startEditing(post)}
                        disabled={submitting}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-rose-500/60 px-3 py-1 text-rose-300 transition hover:bg-rose-500/10"
                        onClick={() => handleDelete(post)}
                        disabled={submitting}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    No posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}






