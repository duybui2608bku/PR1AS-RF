"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useEditor, EditorContent, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TextStyle } from "@tiptap/extension-text-style"
import { Color } from "@tiptap/extension-color"
import Image from "@tiptap/extension-image"
import Link from "@tiptap/extension-link"
import TextAlign from "@tiptap/extension-text-align"
import Underline from "@tiptap/extension-underline"
import Placeholder from "@tiptap/extension-placeholder"
import { BulletList, OrderedList, ListItem, ListKeymap } from "@tiptap/extension-list"
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { uploadImage } from "@/lib/utils/upload-image"
import { toast } from "sonner"

const PRESET_COLORS = [
  "#000000", "#374151", "#6B7280", "#D1D5DB",
  "#EF4444", "#F97316", "#EAB308", "#FFFFFF",
  "#3B82F6", "#8B5CF6", "#EC4899", "#22C55E",
  "#06B6D4", "#84CC16", "#F59E0B", "#10B981",
]

function ColorPicker({ editor }: { editor: Editor }) {
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [hexInput, setHexInput] = useState("")

  useEffect(() => {
    try {
      const stored = localStorage.getItem("tiptap-recent-colors")
      if (stored) setRecentColors(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  const applyColor = (color: string) => {
    editor.chain().focus().setColor(color).run()
    setRecentColors((prev) => {
      const next = [color, ...prev.filter((c) => c !== color)].slice(0, 8)
      localStorage.setItem("tiptap-recent-colors", JSON.stringify(next))
      return next
    })
  }

  const handleHexApply = () => {
    const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`
    if (/^#[0-9A-Fa-f]{6}$/i.test(val)) {
      applyColor(val)
      setHexInput("")
    }
  }

  const currentColor = editor.getAttributes("textStyle").color ?? "#000000"

  const swatchPreview = (() => {
    const val = hexInput.startsWith("#") ? hexInput : `#${hexInput}`
    return /^#[0-9A-Fa-f]{6}$/i.test(val) ? val : null
  })()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Màu chữ"
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-accent"
        >
          <span
            className="text-sm font-bold leading-none"
            style={{
              color: currentColor,
              textDecoration: "underline",
              textDecorationColor: currentColor,
            }}
          >
            A
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        {recentColors.length > 0 && (
          <div className="mb-2">
            <p className="mb-1 text-xs text-muted-foreground">Màu đã dùng</p>
            <div className="grid grid-cols-8 gap-1">
              {recentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  className="h-6 w-6 rounded-sm border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ backgroundColor: color }}
                  onClick={() => applyColor(color)}
                />
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-8 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              className="h-6 w-6 rounded-sm border border-gray-200 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ backgroundColor: color }}
              onClick={() => applyColor(color)}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2 border-t pt-2">
          <div
            className="h-5 w-5 shrink-0 rounded border border-gray-200"
            style={{ backgroundColor: swatchPreview ?? "transparent" }}
          />
          <input
            type="text"
            placeholder="#000000"
            maxLength={7}
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleHexApply() } }}
            onBlur={handleHexApply}
            className="h-7 w-full rounded border border-input bg-background px-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ToolbarButtonProps {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, disabled, title, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("h-7 w-7 p-0", active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  )
}

function Toolbar({
  editor,
  isHtmlMode,
  onToggleHtmlMode,
}: {
  editor: Editor
  isHtmlMode: boolean
  onToggleHtmlMode: () => void
}) {
  const handleLinkInsert = useCallback(() => {
    const url = window.prompt("Nhập URL:")
    if (!url) return
    editor.chain().focus().toggleLink({ href: url, target: "_blank" }).run()
  }, [editor])

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const url = await uploadImage(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch {
        toast.error("Không thể tải ảnh lên.")
      }
    }
    input.click()
  }, [editor])

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
      {!isHtmlMode && (
        <>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
            title="Đậm"
          >
            <Bold className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
            title="Nghiêng"
          >
            <Italic className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive("underline")}
            title="Gạch chân"
          >
            <UnderlineIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
            title="Gạch ngang"
          >
            <Strikethrough className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-7 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            active={editor.isActive({ textAlign: "left" })}
            title="Căn trái"
          >
            <AlignLeft className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            active={editor.isActive({ textAlign: "center" })}
            title="Căn giữa"
          >
            <AlignCenter className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            active={editor.isActive({ textAlign: "right" })}
            title="Căn phải"
          >
            <AlignRight className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-7 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
            title="Danh sách"
          >
            <List className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
            title="Danh sách số"
          >
            <ListOrdered className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-7 w-px bg-border" />

          <ToolbarButton
            onClick={handleLinkInsert}
            active={editor.isActive("link")}
            title="Chèn link"
          >
            <LinkIcon className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={handleImageUpload} title="Chèn ảnh">
            <ImageIcon className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-7 w-px bg-border" />

          <ColorPicker editor={editor} />

          <div className="mx-1 h-7 w-px bg-border" />

          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Hoàn tác"
          >
            <Undo className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Làm lại"
          >
            <Redo className="size-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-7 w-px bg-border" />
        </>
      )}

      <Button
        type="button"
        variant={isHtmlMode ? "outline" : "ghost"}
        size="sm"
        onClick={onToggleHtmlMode}
        title={isHtmlMode ? "Chuyển về soạn thảo trực quan" : "Chỉnh sửa HTML trực tiếp"}
        className="h-7 gap-1 px-2 text-xs"
      >
        <Code className="size-3.5" />
        {isHtmlMode ? "Visual" : "HTML"}
      </Button>
    </div>
  )
}

interface TipTapEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
}

export function TipTapEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung thông báo...",
  className,
  minHeight = "200px",
}: TipTapEditorProps) {
  const [isHtmlMode, setIsHtmlMode] = useState(false)
  const isHtmlModeRef = useRef(false)
  const isSyncingRef = useRef(false)
  const initializedRef = useRef(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
      BulletList,
      OrderedList,
      ListItem,
      ListKeymap,
      TextStyle,
      Color,
      Underline,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, defaultProtocol: "https" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    // Always start empty — never let TipTap auto-process the raw value prop.
    // Raw HTML (with div/style) would be treated as unknown nodes and escaped
    // by TipTap's serializer, corrupting the content.
    content: "",
    onUpdate: ({ editor }) => {
      if (!isHtmlModeRef.current && !isSyncingRef.current) onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm max-w-none focus:outline-none px-3 py-2",
          "[&_img]:max-w-full [&_img]:rounded-md [&_a]:text-primary [&_a]:underline"
        ),
      },
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (!editor || !value || initializedRef.current) return
    initializedRef.current = true
    isSyncingRef.current = true
    editor.commands.setContent(value)
    isSyncingRef.current = false
  }, [editor, value])

  const handleToggleHtmlMode = useCallback(() => {
    if (!editor) return
    if (!isHtmlMode) {
      isHtmlModeRef.current = true
      setIsHtmlMode(true)
    } else {
      // Suppress onUpdate while syncing textarea HTML → editor
      isSyncingRef.current = true
      editor.commands.setContent(value)
      isSyncingRef.current = false
      isHtmlModeRef.current = false
      setIsHtmlMode(false)
    }
  }, [editor, isHtmlMode, value])

  if (!editor) return null

  return (
    <div className={cn("overflow-hidden rounded-md border", className)}>
      <Toolbar editor={editor} isHtmlMode={isHtmlMode} onToggleHtmlMode={handleToggleHtmlMode} />

      {isHtmlMode ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full resize-none bg-muted/30 p-3 font-mono text-xs focus:outline-none"
          style={{ minHeight }}
          placeholder="<div>Nhập HTML tùy chỉnh...</div>"
        />
      ) : (
        <EditorContent editor={editor} style={{ minHeight }} className="cursor-text" />
      )}
    </div>
  )
}
