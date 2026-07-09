"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import {
  Baby,
  BookOpen,
  Brain,
  Briefcase,
  Brush,
  Building2,
  Bus,
  Calculator,
  Camera,
  Car,
  Cat,
  ChefHat,
  ClipboardList,
  Cloud,
  Code,
  Coffee,
  Cog,
  Coins,
  CreditCard,
  Dog,
  Dumbbell,
  Factory,
  FileText,
  Film,
  FlaskConical,
  Flower2,
  Gavel,
  GraduationCap,
  Guitar,
  Hammer,
  Handshake,
  HeartPulse,
  Home,
  Languages,
  Laptop,
  Leaf,
  Lightbulb,
  type LucideIcon,
  Mail,
  Megaphone,
  MessagesSquare,
  Mic,
  Microscope,
  Music,
  Newspaper,
  Paintbrush,
  Palette,
  PawPrint,
  PenTool,
  Phone,
  PiggyBank,
  Pill,
  Plane,
  Presentation,
  Rocket,
  Scale,
  Scissors,
  Server,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Sprout,
  Stethoscope,
  Store,
  Syringe,
  Target,
  TestTube,
  TreePine,
  Trophy,
  Truck,
  Users,
  Utensils,
  Video,
  Wine,
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
  { name: "ClipboardList", Icon: ClipboardList },
  { name: "Presentation", Icon: Presentation },
  { name: "Calculator", Icon: Calculator },
  { name: "Laptop", Icon: Laptop },
  { name: "Code", Icon: Code },
  { name: "Server", Icon: Server },
  { name: "Cloud", Icon: Cloud },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "BookOpen", Icon: BookOpen },
  { name: "Languages", Icon: Languages },
  { name: "Microscope", Icon: Microscope },
  { name: "FlaskConical", Icon: FlaskConical },
  { name: "TestTube", Icon: TestTube },
  { name: "Brain", Icon: Brain },
  { name: "HeartPulse", Icon: HeartPulse },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "Pill", Icon: Pill },
  { name: "Syringe", Icon: Syringe },
  { name: "Baby", Icon: Baby },
  { name: "Dog", Icon: Dog },
  { name: "Cat", Icon: Cat },
  { name: "PawPrint", Icon: PawPrint },
  { name: "Music", Icon: Music },
  { name: "Mic", Icon: Mic },
  { name: "Guitar", Icon: Guitar },
  { name: "Film", Icon: Film },
  { name: "Palette", Icon: Palette },
  { name: "Paintbrush", Icon: Paintbrush },
  { name: "Brush", Icon: Brush },
  { name: "PenTool", Icon: PenTool },
  { name: "Camera", Icon: Camera },
  { name: "Video", Icon: Video },
  { name: "Newspaper", Icon: Newspaper },
  { name: "Megaphone", Icon: Megaphone },
  { name: "Dumbbell", Icon: Dumbbell },
  { name: "Trophy", Icon: Trophy },
  { name: "Target", Icon: Target },
  { name: "Scale", Icon: Scale },
  { name: "Gavel", Icon: Gavel },
  { name: "Scissors", Icon: Scissors },
  { name: "ChefHat", Icon: ChefHat },
  { name: "Utensils", Icon: Utensils },
  { name: "Coffee", Icon: Coffee },
  { name: "Wine", Icon: Wine },
  { name: "Store", Icon: Store },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "Building2", Icon: Building2 },
  { name: "Factory", Icon: Factory },
  { name: "Car", Icon: Car },
  { name: "Bus", Icon: Bus },
  { name: "Truck", Icon: Truck },
  { name: "Plane", Icon: Plane },
  { name: "Home", Icon: Home },
  { name: "Wrench", Icon: Wrench },
  { name: "Hammer", Icon: Hammer },
  { name: "Cog", Icon: Cog },
  { name: "Lightbulb", Icon: Lightbulb },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "Sprout", Icon: Sprout },
  { name: "Leaf", Icon: Leaf },
  { name: "TreePine", Icon: TreePine },
  { name: "Flower2", Icon: Flower2 },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "Coins", Icon: Coins },
  { name: "CreditCard", Icon: CreditCard },
  { name: "Handshake", Icon: Handshake },
  { name: "Users", Icon: Users },
  { name: "Phone", Icon: Phone },
  { name: "Mail", Icon: Mail },
  { name: "MessagesSquare", Icon: MessagesSquare },
  { name: "Rocket", Icon: Rocket },
  { name: "Sparkles", Icon: Sparkles },
]

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
}

export const ServiceFormDialog = ({
  open,
  onOpenChange,
  service,
}: ServiceFormDialogProps) => {
  const isEdit = Boolean(service)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [iconQuery, setIconQuery] = useState("")
  const createMutation = useCreateService()
  const updateMutation = useUpdateService()

  const normalizedQuery = iconQuery.trim().toLowerCase()
  const filteredIcons = normalizedQuery
    ? SERVICE_ICONS.filter((item) =>
        item.name.toLowerCase().includes(normalizedQuery)
      )
    : SERVICE_ICONS

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

  const handleIconQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setIconQuery(event.target.value)
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

    createMutation.mutate(
      { code: form.code, ...payload },
      { onSuccess: () => onOpenChange(false) }
    )
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
          <div className="space-y-2">
            <Label htmlFor="service-code">
              Mã dịch vụ (không đổi sau khi tạo)
            </Label>
            <Input
              id="service-code"
              value={form.code}
              onChange={handleChange("code")}
              disabled={isEdit}
              placeholder="OFFICE_BASIC"
              required
            />
            {isEdit ? null : (
              <p className="text-xs text-muted-foreground">
                Chữ IN HOA, số và dấu gạch dưới (vd: OFFICE_BASIC).
              </p>
            )}
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
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="service-icon-search">Icon</Label>
              {form.icon ? (
                <span className="text-xs text-muted-foreground">
                  Đã chọn: <span className="font-medium">{form.icon}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Vui lòng chọn một icon
                </span>
              )}
            </div>
            <Input
              id="service-icon-search"
              value={iconQuery}
              onChange={handleIconQueryChange}
              placeholder="Tìm icon (vd: laptop, health, music)..."
            />
            <div
              role="radiogroup"
              aria-label="Chọn icon dịch vụ"
              className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-8"
            >
              {filteredIcons.map(({ name, Icon }) => {
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
              {filteredIcons.length === 0 ? (
                <p className="col-span-full py-2 text-center text-xs text-muted-foreground">
                  Không tìm thấy icon phù hợp.
                </p>
              ) : null}
            </div>
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
