"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  nameZh: string
  nameKo: string
  descriptionVi: string
  descriptionEn: string
  descriptionZh: string
  descriptionKo: string
  companionshipLevel: string
  physicalTouch: boolean
  intellectualConversationRequired: boolean
  dressCode: string
}

const EMPTY_FORM: FormState = {
  code: "",
  category: "VIRTUAL",
  icon: "",
  nameVi: "",
  nameEn: "",
  nameZh: "",
  nameKo: "",
  descriptionVi: "",
  descriptionEn: "",
  descriptionZh: "",
  descriptionKo: "",
  companionshipLevel: "",
  physicalTouch: false,
  intellectualConversationRequired: false,
  dressCode: "",
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
        nameZh: service.name.zh ?? "",
        nameKo: service.name.ko ?? "",
        descriptionVi: service.description?.vi ?? "",
        descriptionEn: service.description?.en ?? "",
        descriptionZh: service.description?.zh ?? "",
        descriptionKo: service.description?.ko ?? "",
        companionshipLevel:
          service.companionship_level != null
            ? String(service.companionship_level)
            : "",
        physicalTouch: service.rules?.physical_touch ?? false,
        intellectualConversationRequired:
          service.rules?.intellectual_conversation_required ?? false,
        dressCode: service.rules?.dress_code ?? "",
      })
    } else {
      setForm(EMPTY_FORM)
    }
  }, [service, open])

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, category: event.target.value }))
  }

  const handleCompanionshipLevelChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, companionshipLevel: event.target.value }))
  }

  const handleDressCodeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, dressCode: event.target.value }))
  }

  const handlePhysicalTouchChange = (value: boolean) => {
    setForm((prev) => ({ ...prev, physicalTouch: value }))
  }

  const handleIntellectualConversationChange = (value: boolean) => {
    setForm((prev) => ({
      ...prev,
      intellectualConversationRequired: value,
    }))
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const shared = {
      category: form.category,
      icon: form.icon,
      name: {
        vi: form.nameVi,
        en: form.nameEn,
        zh: form.nameZh || null,
        ko: form.nameKo || null,
      },
      description: {
        vi: form.descriptionVi,
        en: form.descriptionEn,
        zh: form.descriptionZh || null,
        ko: form.descriptionKo || null,
      },
      companionship_level:
        form.companionshipLevel === ""
          ? null
          : Number(form.companionshipLevel),
      rules: form.dressCode
        ? {
            physical_touch: form.physicalTouch,
            intellectual_conversation_required:
              form.intellectualConversationRequired,
            dress_code: form.dressCode,
          }
        : null,
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
              onChange={handleCategoryChange}
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
            <div className="space-y-2">
              <Label htmlFor="service-name-zh">Tên (ZH)</Label>
              <Input
                id="service-name-zh"
                value={form.nameZh}
                onChange={handleChange("nameZh")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-name-ko">Tên (KO)</Label>
              <Input
                id="service-name-ko"
                value={form.nameKo}
                onChange={handleChange("nameKo")}
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
            <div className="space-y-2">
              <Label htmlFor="service-desc-zh">Mô tả (ZH)</Label>
              <Input
                id="service-desc-zh"
                value={form.descriptionZh}
                onChange={handleChange("descriptionZh")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="service-desc-ko">Mô tả (KO)</Label>
              <Input
                id="service-desc-ko"
                value={form.descriptionKo}
                onChange={handleChange("descriptionKo")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-companionship-level">
              Cấp độ đồng hành (tùy chọn)
            </Label>
            <select
              id="service-companionship-level"
              value={form.companionshipLevel}
              onChange={handleCompanionshipLevelChange}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Không xác định</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="service-dress-code">
              Quy định trang phục (tùy chọn)
            </Label>
            <select
              id="service-dress-code"
              value={form.dressCode}
              onChange={handleDressCodeChange}
              className="h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Không áp dụng</option>
              <option value="CASUAL">CASUAL</option>
              <option value="SEMI_FORMAL">SEMI_FORMAL</option>
              <option value="FORMAL">FORMAL</option>
            </select>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label
              htmlFor="service-physical-touch"
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id="service-physical-touch"
                checked={form.physicalTouch}
                onCheckedChange={(value) =>
                  handlePhysicalTouchChange(value === true)
                }
              />
              Cho phép tiếp xúc vật lý
            </label>
            <label
              htmlFor="service-intellectual-conversation"
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id="service-intellectual-conversation"
                checked={form.intellectualConversationRequired}
                onCheckedChange={(value) =>
                  handleIntellectualConversationChange(value === true)
                }
              />
              Yêu cầu trò chuyện trí tuệ
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
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
