"use client"
import * as React from "react"

type SubView = { close: () => void; popped: boolean }

// Ngăn xếp các sub-view đang mở: một lần back chỉ đóng cái trên cùng
// (dialog lồng trong dialog, lightbox mở từ trong dialog…).
const stack: SubView[] = []
let listening = false
// Số lần history.back() do chính app gọi để tiêu entry đã push — popstate của
// những lần đó không được đóng thêm sub-view nào khác.
let selfBackCount = 0

const handlePopState = () => {
  if (selfBackCount > 0) {
    selfBackCount -= 1
    return
  }
  const entry = stack.pop()
  if (!entry) return
  entry.popped = true
  entry.close()
}

const remove = (entry: SubView) => {
  const index = stack.lastIndexOf(entry)
  if (index !== -1) stack.splice(index, 1)
}

/**
 * Gắn một sub-view mở bằng state (dialog, bottom sheet, lightbox, khung chat
 * trên mobile — không đổi route) vào một entry lịch sử, để nút back của trình
 * duyệt / thao tác vuốt back đóng sub-view thay vì rời khỏi trang.
 *
 * Đóng sub-view bằng state trong app cũng tự "tiêu" entry đã push, nên không
 * cần sửa các handler sẵn có.
 *
 * ponytail: nếu đóng một sub-view đang bị sub-view khác đè lên (hiếm), entry
 * lịch sử trên cùng bị tiêu nhầm và cả hai cùng đóng. Nâng lên "mỗi sub-view
 * một entry có id riêng" nếu gặp trường hợp đó thật.
 */
export function useSubViewHistory(isOpen: boolean, onClose: () => void) {
  const entryRef = React.useRef<SubView | null>(null)
  const onCloseRef = React.useRef(onClose)

  React.useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  React.useEffect(() => {
    if (!listening) {
      listening = true
      window.addEventListener("popstate", handlePopState)
    }

    if (isOpen) {
      const current = entryRef.current
      // Đã có entry (StrictMode mount lại) thì chỉ cần đưa lại vào ngăn xếp.
      if (current) {
        if (!stack.includes(current)) stack.push(current)
        return
      }
      const entry: SubView = {
        close: () => onCloseRef.current(),
        popped: false,
      }
      entryRef.current = entry
      stack.push(entry)
      window.history.pushState({ ...window.history.state }, "")
      return
    }

    const entry = entryRef.current
    if (!entry) return
    entryRef.current = null
    remove(entry)
    // Đóng từ trong app (nút X, click ra ngoài, Escape) → tiêu entry đã push.
    // Nếu chính back vừa đóng nó thì entry đã bị pop rồi, không back thêm.
    if (!entry.popped) {
      selfBackCount += 1
      window.history.back()
    }
  }, [isOpen])

  React.useEffect(
    () => () => {
      // Unmount khi còn mở (điều hướng sang trang khác): bỏ khỏi ngăn xếp,
      // không gọi back kẻo huỷ luôn lần điều hướng đó.
      const entry = entryRef.current
      if (entry) remove(entry)
    },
    []
  )
}

/**
 * Gộp state controlled/uncontrolled của một Radix `Root` (Dialog, AlertDialog,
 * BottomSheet) và gắn nó vào lịch sử. Trả về props để spread xuống `Root`.
 */
export function useOverlayHistory({
  open,
  defaultOpen,
  onOpenChange,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  )
  const isOpen = open ?? uncontrolledOpen
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (open === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [open, onOpenChange]
  )

  useSubViewHistory(isOpen, () => handleOpenChange(false))

  return { open: isOpen, onOpenChange: handleOpenChange }
}
