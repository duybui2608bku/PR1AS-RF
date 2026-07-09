"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import {
  Baby,
  BookOpen,
  Briefcase,
  Camera,
  Car,
  Code,
  Dog,
  Dumbbell,
  FileText,
  GraduationCap,
  Hammer,
  Heart,
  HeartPulse,
  Home,
  Languages,
  Laptop,
  type LucideIcon,
  Mic,
  Music,
  Paintbrush,
  Palette,
  PenTool,
  Plane,
  Scale,
  Scissors,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  Users,
  Utensils,
  Video,
  Wrench,
} from "lucide-react"

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
import { cn } from "@/lib/utils"
import {
  useCreateService,
  useUpdateService,
} from "@/lib/hooks/use-admin-services"
import type { AdminServiceItem } from "@/services/admin-service.service"

const SERVICE_ICONS: Array<{ name: string; Icon: LucideIcon }> = [
  { name: "Briefcase", Icon: Briefcase },
  { name: "FileText", Icon: FileText },
  { name: "Laptop", Icon: Laptop },
  { name: "Code", Icon: Code },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Languages", Icon: Languages },
  { name: "HeartPulse", Icon: HeartPulse },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "Baby", Icon: Baby },
  { name: "Dog", Icon: Dog },
  { name: "Music", Icon: Music },
  { name: "Mic", Icon: Mic },
  { name: "Palette", Icon: Palette },
  { name: "Paintbrush", Icon: Paintbrush },
  { name: "Camera", Icon: Camera },
  { name: "Video", Icon: Video },
  { name: "Dumbbell", Icon: Dumbbell },
  { name: "Scale", Icon: Scale },
  { name: "Scissors", Icon: Scissors },
  { name: "Utensils", Icon: Utensils },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "Car", Icon: Car },
  { name: "Plane", Icon: Plane },
  { name: "Home", Icon: Home },
  { name: "Wrench", Icon: Wrench },
  { name: "Hammer", Icon: Hammer },
  { name: "PenTool", Icon: PenTool },
  { name: "Sparkles", Icon: Sparkles },
  { name: "Users", Icon: Users },
  { name: "Heart", Icon: Heart },
]

type ServiceFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  service?: AdminServiceItem | null
}

type FormState = {
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
}

const EMPTY_FORM: FormState = {
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

  // Reset/populate the form whenever the dialog (re)opens or targets a
  // different service — done during render (React's recommended alternative to
  // a syncing effect) so edits never leak between opens.
  const currentId = service?.id ?? null
  const [syncKey, setSyncKey] = useState<string | null>(null)
  const openKey = open ? `open:${currentId ?? "new"}` : null
  if (openKey !== syncKey) {
    setSyncKey(openKey)
    if (open) {
      setForm(
        service
          ? {
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
            }
          : EMPTY_FORM
      )
    }
  }

  const handleChange =
    (field: keyof FormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, category: event.target.value }))
  }

  const handleIconSelect = (name: string) => {
    setForm((prev) => ({ ...prev, icon: name }))
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.icon) return

    const payload = {
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
    }

    if (isEdit && service) {
      updateMutation.mutate(
        { id: service.id, payload },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }

    createMutation.mutate(payload, {
      onSuccess: () => onOpenChange(false),
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const canSubmit = Boolean(form.icon) && !isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Sửa dịch vụ" : "Tạo dịch vụ mới"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && service ? (
            <p className="text-sm text-muted-foreground">
              Mã dịch vụ:{" "}
              <span className="font-mono font-medium">{service.code}</span>
            </p>
          ) : null}
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
            <Label>Icon</Label>
            <div
              role="radiogroup"
              aria-label="Chọn icon dịch vụ"
              className="grid grid-cols-6 gap-2 sm:grid-cols-8"
            >
              {SERVICE_ICONS.map(({ name, Icon }) => {
                const selected = form.icon === name
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={name}
                    title={name}
                    onClick={() => handleIconSelect(name)}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md border transition-colors hover:bg-accent",
                      selected
                        ? "border-primary ring-2 ring-primary"
                        : "border-input"
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </button>
                )
              })}
            </div>
            {form.icon ? null : (
              <p className="text-xs text-muted-foreground">
                Vui lòng chọn một icon.
              </p>
            )}
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
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isEdit ? "Lưu" : "Tạo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
