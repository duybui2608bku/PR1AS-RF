"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  useCreateService,
  useUpdateService,
} from "@/lib/hooks/use-admin-services"
import type { AdminServiceItem } from "@/services/admin-service.service"

type ServiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: AdminServiceItem | null
}

type FormState = {
  code: string
  category: string
  icon: string
  nameVi: string
  nameEn: string
  descriptionVi: string
  descriptionEn: string
}

const EMPTY_FORM: FormState = {
  code: "",
  category: "VIRTUAL",
  icon: "",
  nameVi: "",
  nameEn: "",
  descriptionVi: "",
  descriptionEn: "",
}

export const ServiceFormDialog = ({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) => {
  const isEdit = Boolean(service)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  useEffect(() => {
    if (service) {
      setForm({
        code: service.code,
        category: service.category,
        icon: service.icon ?? "",
        nameVi: service.name.vi ?? "",
        nameEn: service.name.en ?? "",
        descriptionVi: service.description?.vi ?? "",
        descriptionEn: service.description?.en ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [service, open])

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const shared = {
      category: form.category,
      icon: form.icon,
      name: { vi: form.nameVi, en: form.nameEn },
      description: { vi: form.descriptionVi, en: form.descriptionEn },
    }

    if (isEdit && service) {
      updateMutation.mutate(
        { id: service.id, payload: shared },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    createMutation.mutate(
      { code: form.code, ...shared },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa dịch vụ" : "Tạo dịch vụ mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-code">Mã (không đổi sau khi tạo)</Label>
            <Input
              id="service-code"
              value={form.code}
              onChange={handleChange("code")}
              disabled={isEdit}
              placeholder="OFFICE_BASIC"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-category">Nhóm</Label>
            <select
              id="service-category"
              value={form.category}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, category: event.target.value }))
              }
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="VIRTUAL">VIRTUAL</option>
              <option value="PHYSICAL">PHYSICAL</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-icon">Icon (tên lucide)</Label>
            <Input
              id="service-icon"
              value={form.icon}
              onChange={handleChange("icon")}
              placeholder="FileText"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-name-vi">Tên (VI)</Label>
              <Input
                id="service-name-vi"
                value={form.nameVi}
                onChange={handleChange("nameVi")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-name-en">Tên (EN)</Label>
              <Input
                id="service-name-en"
                value={form.nameEn}
                onChange={handleChange("nameEn")}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="service-desc-vi">Mô tả (VI)</Label>
              <Input
                id="service-desc-vi"
                value={form.descriptionVi}
                onChange={handleChange("descriptionVi")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-desc-en">Mô tả (EN)</Label>
              <Input
                id="service-desc-en"
                value={form.descriptionEn}
                onChange={handleChange("descriptionEn")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEdit ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
