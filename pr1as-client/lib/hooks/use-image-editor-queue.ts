"use client"

import { useCallback, useEffect, useRef, useState } from "react"

type DoneCallback = (editedFiles: File[]) => void

export function useImageEditorQueue() {
  const [queue, setQueue] = useState<File[]>([])
  const [total, setTotal] = useState(0)
  const onDoneRef = useRef<DoneCallback | null>(null)
  const editedRef = useRef<File[]>([])
  const calledRef = useRef(false)

  const currentFile = queue[0] ?? null
  const queuePosition =
    total > 0 ? { current: total - queue.length + 1, total } : null

  // Gọi onDone sau khi queue cạn — dùng useEffect để tránh side effect trong state setter
  useEffect(() => {
    if (total > 0 && queue.length === 0 && !calledRef.current) {
      calledRef.current = true
      const result = [...editedRef.current]
      editedRef.current = []
      setTotal(0)
      onDoneRef.current?.(result)
    }
  }, [queue.length, total])

  const start = useCallback((files: File[], onDone: DoneCallback) => {
    if (!files.length) return
    onDoneRef.current = onDone
    editedRef.current = []
    calledRef.current = false
    setTotal(files.length)
    setQueue(files)
  }, [])

  const confirm = useCallback((croppedFile: File) => {
    editedRef.current = [...editedRef.current, croppedFile]
    setQueue((q) => q.slice(1))
  }, [])

  const skip = useCallback(() => {
    setQueue((q) => q.slice(1))
  }, [])

  const cancel = useCallback(() => {
    editedRef.current = []
    calledRef.current = true
    setQueue([])
    setTotal(0)
  }, [])

  return { currentFile, queuePosition, start, confirm, skip, cancel }
}
