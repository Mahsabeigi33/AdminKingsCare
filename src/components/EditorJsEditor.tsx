"use client"

import { useEffect, useId, useRef } from "react"

type EditorJsEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeightClass?: string
}

const buildEmptyValue = (text?: string) =>
  JSON.stringify({
    time: Date.now(),
    blocks: text
      ? [{ type: "paragraph", data: { text } }]
      : [],
    version: "2.28.2",
  })

export default function EditorJsEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[160px]",
}: EditorJsEditorProps) {
  const holderId = useId()
  const editorRef = useRef<import("@editorjs/editorjs").default | null>(null)
  const lastValueRef = useRef<string>("")
  const isApplyingValueRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const placeholderRef = useRef(placeholder)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    placeholderRef.current = placeholder
  }, [placeholder])

  useEffect(() => {
    if (editorRef.current) return
    if (typeof window === "undefined") return
    const parsed = value ? value : buildEmptyValue()
    lastValueRef.current = parsed
    let isMounted = true
    const init = async () => {
      const [{ default: EditorJS }, { default: List }, { default: Header }] = await Promise.all([
        import("@editorjs/editorjs"),
        import("@editorjs/list"),
        import("@editorjs/header"),
      ])
      if (!isMounted) return
      const editor = new EditorJS({
        holder: holderId,
        data: normalizeData(parsed),
        placeholder: placeholderRef.current,
        tools: {
          header: {
            class: Header as unknown as EditorJS.ToolConstructable,
            inlineToolbar: true,
            config: { levels: [2, 3, 4], defaultLevel: 3 },
          },
          list: {
            class: List as unknown as EditorJS.ToolConstructable,
            inlineToolbar: true,
          },
        },
        onChange: async () => {
          if (!editorRef.current) return
          const output = await editorRef.current.save()
          const serialized = JSON.stringify(output)
          lastValueRef.current = serialized
          onChangeRef.current(serialized)
        },
      })
      editorRef.current = editor
    }
    void init()
    return () => {
      isMounted = false
      editorRef.current?.destroy()
      editorRef.current = null
    }
  }, [holderId])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (!value || value === lastValueRef.current) return
    const parsed = normalizeData(value)
    if (!parsed) return
    if (isApplyingValueRef.current) return
    isApplyingValueRef.current = true
    lastValueRef.current = value
    editor.render(parsed).finally(() => {
      isApplyingValueRef.current = false
    })
  }, [value])

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/70 px-4 py-3 ${minHeightClass}`}
    >
      <div id={holderId} />
    </div>
  )
}

const safeParse = (value: string) => {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const normalizeData = (value: string) => {
  const parsed = safeParse(value)
  if (parsed && Array.isArray(parsed.blocks)) return parsed
  if (value && value.trim()) {
    return safeParse(buildEmptyValue(value))
  }
  return safeParse(buildEmptyValue())
}
