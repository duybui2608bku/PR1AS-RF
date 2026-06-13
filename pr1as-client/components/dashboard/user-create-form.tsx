"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import {
  Check,
  Copy,
  Globe2,
  KeyRound,
  Loader2,
  MapPin,
  Plus,
  Upload,
  Wand2,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { uploadImage } from "@/lib/utils/upload-image"
import { serviceService, type ServiceItem } from "@/services/service.service"
import {
  getProvinces,
  getWardsByProvince,
  formatWardLabel,
  WORK_LOCATIONS_MAX,
} from "@/lib/vn-provinces/work-locations-api"
import type {
  AdminCreateUserPayload,
  AdminUpdateUserPayload,
  AdminUserDetail,
  AdminUserStatus,
} from "@/services/user.service"
import type {
  WorkerExperience,
  WorkerGender,
  WorkerPricingUnit,
  WorkerProfilePublic,
} from "@/types"

const MAX_GALLERY = 10

const GENDER_OPTIONS: { value: WorkerGender; label: string }[] = [
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
]

const EXPERIENCE_OPTIONS: { value: WorkerExperience; label: string }[] = [
  { value: "LESS_THAN_1", label: "Dưới 1 năm" },
  { value: "ONE_TO_3", label: "1–3 năm" },
  { value: "THREE_TO_5", label: "3–5 năm" },
  { value: "FIVE_TO_10", label: "5–10 năm" },
  { value: "MORE_THAN_10", label: "Trên 10 năm" },
]

const STATUS_OPTIONS: { value: AdminUserStatus; label: string }[] = [
  { value: "active", label: "Hoạt động" },
  { value: "inactive", label: "Tạm ngưng" },
  { value: "banned", label: "Bị khóa" },
]

const PRICING_UNITS: WorkerPricingUnit[] = ["HOURLY", "DAILY", "MONTHLY"]
const UNIT_LABEL: Record<WorkerPricingUnit, string> = {
  HOURLY: "Theo giờ",
  DAILY: "Theo ngày",
  MONTHLY: "Theo tháng",
}

const STAR_SIGNS: { value: string; label: string }[] = [
  { value: "ARIES", label: "Bạch Dương ♈" },
  { value: "TAURUS", label: "Kim Ngưu ♉" },
  { value: "GEMINI", label: "Song Tử ♊" },
  { value: "CANCER", label: "Cự Giải ♋" },
  { value: "LEO", label: "Sư Tử ♌" },
  { value: "VIRGO", label: "Xử Nữ ♍" },
  { value: "LIBRA", label: "Thiên Bình ♎" },
  { value: "SCORPIO", label: "Bọ Cạp ♏" },
  { value: "SAGITTARIUS", label: "Nhân Mã ♐" },
  { value: "CAPRICORN", label: "Ma Kết ♑" },
  { value: "AQUARIUS", label: "Bảo Bình ♒" },
  { value: "PISCES", label: "Song Ngư ♓" },
]

export type DraftServicePrices = Record<WorkerPricingUnit, string>

export type DraftService = {
  service_code: string
  prices: DraftServicePrices
}

export type DraftWorkLocation = {
  province_code: number
  ward_code: number | null
  label_snapshot: string
}

export type DraftSaveStatus = "draft" | "saving" | "saved" | "error"

export type UserDraft = {
  id: string
  email: string
  password: string
  full_name: string
  phone: string
  avatar: string | null
  isWorker: boolean
  status: AdminUserStatus
  // worker profile
  title: string
  gender: WorkerGender
  date_of_birth: string
  experience: WorkerExperience | ""
  height_cm: string
  weight_kg: string
  star_sign: string
  lifestyle: string
  quote: string
  introduction: string
  hobbies: string[]
  gallery_urls: string[]
  work_locations: DraftWorkLocation[]
  services: DraftService[]
  // meta
  savedStatus: DraftSaveStatus
  errorMsg?: string
  createdId?: string
}

let draftCounter = 0
function uid(prefix: string): string {
  draftCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${draftCounter}`
}

function emptyPrices(): DraftServicePrices {
  return { HOURLY: "", DAILY: "", MONTHLY: "" }
}

export function createEmptyDraft(): UserDraft {
  return {
    id: uid("draft"),
    email: "",
    password: "",
    full_name: "",
    phone: "",
    avatar: null,
    isWorker: true,
    status: "active",
    title: "",
    gender: "FEMALE",
    date_of_birth: "",
    experience: "",
    height_cm: "",
    weight_kg: "",
    star_sign: "",
    lifestyle: "",
    quote: "",
    introduction: "",
    hobbies: [],
    gallery_urls: [],
    work_locations: [],
    services: [],
    savedStatus: "draft",
  }
}

export function draftLabel(draft: UserDraft): string {
  return draft.full_name.trim() || draft.email.trim() || "Người dùng mới"
}

function formatVnd(value: string): string {
  const digits = String(value).replace(/\D/g, "")
  if (!digits) return ""
  return new Intl.NumberFormat("vi-VN").format(Number(digits))
}

function slugifyName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
  return base || "user"
}

export function generateEmail(fullName: string): string {
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `${slugifyName(fullName)}.${suffix}@pr1as.local`
}

export function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const digits = "23456789"
  const all = upper + lower + digits
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)]
  let pwd = pick(upper) + pick(lower) + pick(digits) + "@"
  for (let i = 0; i < 8; i += 1) pwd += pick(all)
  return pwd
}

function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1))
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// Accurate zodiac sign from a birth date.
function zodiacFromDate(d: Date): string {
  const signs = [
    "CAPRICORN",
    "AQUARIUS",
    "PISCES",
    "ARIES",
    "TAURUS",
    "GEMINI",
    "CANCER",
    "LEO",
    "VIRGO",
    "LIBRA",
    "SCORPIO",
    "SAGITTARIUS",
    "CAPRICORN",
  ]
  const lastDay = [19, 18, 20, 19, 20, 20, 22, 22, 21, 22, 21, 21]
  const month = d.getMonth() // 0-based
  return d.getDate() > lastDay[month] ? signs[month + 1] : signs[month]
}

// ---- Sample data for the "Điền mẫu" convenience button ----
const SAMPLE_FEMALE_NAMES = [
  "Nguyễn Thị Mai Anh",
  "Lê Thị Thu Hà",
  "Võ Thị Ngọc Lan",
  "Bùi Thị Phương Thảo",
  "Trần Thị Khánh Linh",
]
const SAMPLE_MALE_NAMES = [
  "Trần Minh Khôi",
  "Phạm Quốc Bảo",
  "Đặng Hoàng Long",
  "Hoàng Anh Tuấn",
  "Nguyễn Đức Mạnh",
]
const SAMPLE_TITLES = [
  "Trợ lý cá nhân chuyên nghiệp",
  "Hướng dẫn viên địa phương thân thiện",
  "Phiên dịch viên Anh – Việt",
  "Người bạn đồng hành tinh tế",
]
const SAMPLE_LIFESTYLES = [
  "Năng động, thích khám phá và giao tiếp",
  "Điềm đạm, chỉn chu và đúng giờ",
  "Vui vẻ, hoà đồng và chuyên nghiệp",
]
const SAMPLE_QUOTES = [
  "Tận tâm trong từng khoảnh khắc đồng hành.",
  "Sự thoải mái của bạn là ưu tiên của tôi.",
  "Mỗi hành trình là một trải nghiệm đáng nhớ.",
]
const SAMPLE_INTROS = [
  "Mình có nhiều năm kinh nghiệm hỗ trợ khách hàng, luôn đúng giờ, tận tâm và linh hoạt theo nhu cầu công việc. Rất mong được đồng hành cùng bạn.",
  "Thân thiện, giao tiếp tốt và am hiểu địa phương. Mình sẽ giúp bạn có trải nghiệm thoải mái và trọn vẹn nhất trong suốt thời gian làm việc.",
  "Chuyên nghiệp, kín đáo và đáng tin cậy. Sẵn sàng đồng hành trong các sự kiện, chuyến đi và hoạt động hằng ngày của bạn.",
]
const SAMPLE_HOBBIES = [
  ["Du lịch", "Nhiếp ảnh", "Cà phê"],
  ["Đọc sách", "Yoga", "Ẩm thực"],
  ["Âm nhạc", "Xem phim", "Chạy bộ"],
]
// Real VN province codes (provinces.open-api.vn v2) + label snapshot.
const SAMPLE_LOCATIONS: DraftWorkLocation[] = [
  {
    province_code: 79,
    ward_code: null,
    label_snapshot: "Thành phố Hồ Chí Minh",
  },
  { province_code: 1, ward_code: null, label_snapshot: "Thành phố Hà Nội" },
  { province_code: 48, ward_code: null, label_snapshot: "Thành phố Đà Nẵng" },
]
// Realistic service offerings keyed by the seeded service codes.
const SAMPLE_SERVICE_SETS: DraftService[][] = [
  [
    {
      service_code: "TOUR_GUIDE",
      prices: { HOURLY: "", DAILY: "1500000", MONTHLY: "" },
    },
  ],
  [
    {
      service_code: "PRESENCE",
      prices: { HOURLY: "300000", DAILY: "1800000", MONTHLY: "" },
    },
  ],
  [
    {
      service_code: "CONNECTION",
      prices: { HOURLY: "400000", DAILY: "", MONTHLY: "" },
    },
  ],
  [
    {
      service_code: "TRANSLATION",
      prices: { HOURLY: "500000", DAILY: "", MONTHLY: "" },
    },
  ],
  [
    {
      service_code: "VIRTUAL_ASSISTANT",
      prices: { HOURLY: "", DAILY: "", MONTHLY: "8000000" },
    },
    {
      service_code: "DIRECT_SUPPORT",
      prices: { HOURLY: "350000", DAILY: "", MONTHLY: "" },
    },
  ],
]

export function buildSamplePatch(draft: UserDraft): Partial<UserDraft> {
  const gender: WorkerGender = pickRandom<WorkerGender>(["MALE", "FEMALE"])
  const name =
    gender === "FEMALE"
      ? pickRandom(SAMPLE_FEMALE_NAMES)
      : pickRandom(SAMPLE_MALE_NAMES)

  // Account info (always filled — avatar is left for the admin).
  const patch: Partial<UserDraft> = {
    full_name: name,
    email: generateEmail(name),
    password: generatePassword(),
    phone: `09${randomInt(10000000, 99999999)}`,
  }

  if (!draft.isWorker) return patch

  // Birth date → age 20–34, with an accurate zodiac sign.
  const year = new Date().getFullYear() - randomInt(20, 34)
  const month = randomInt(1, 12)
  const day = randomInt(1, 28)
  const dob = new Date(year, month - 1, day)
  const isoDob = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  const height = gender === "FEMALE" ? randomInt(150, 168) : randomInt(165, 184)
  const weight = gender === "FEMALE" ? randomInt(45, 58) : randomInt(58, 80)

  return {
    ...patch,
    gender,
    date_of_birth: isoDob,
    star_sign: zodiacFromDate(dob),
    experience: pickRandom(EXPERIENCE_OPTIONS).value,
    height_cm: String(height),
    weight_kg: String(weight),
    title: pickRandom(SAMPLE_TITLES),
    lifestyle: pickRandom(SAMPLE_LIFESTYLES),
    quote: pickRandom(SAMPLE_QUOTES),
    introduction: pickRandom(SAMPLE_INTROS),
    hobbies: pickRandom(SAMPLE_HOBBIES),
    work_locations: [pickRandom(SAMPLE_LOCATIONS)],
    services: pickRandom(SAMPLE_SERVICE_SETS).map((s) => ({
      service_code: s.service_code,
      prices: { ...s.prices },
    })),
  }
}

// Assembles the worker_profile + worker_services parts shared by create/update.
function buildWorkerFields(draft: UserDraft):
  | {
      worker_profile: AdminCreateUserPayload["worker_profile"]
      worker_services: AdminCreateUserPayload["worker_services"]
    }
  | { error: string } {
  const selected = draft.services.filter((s) => s.service_code)
  if (selected.length === 0) return { error: "Worker cần ít nhất 1 dịch vụ." }

  const worker_services: NonNullable<
    AdminCreateUserPayload["worker_services"]
  > = []
  for (const s of selected) {
    const pricing = PRICING_UNITS.flatMap((unit) => {
      const price = Number(String(s.prices[unit]).replace(/\D/g, ""))
      return price > 0 ? [{ unit, duration: 1, price }] : []
    })
    if (pricing.length === 0)
      return { error: `Dịch vụ "${s.service_code}" cần ít nhất 1 mức giá.` }
    worker_services.push({ service_code: s.service_code, pricing })
  }

  return {
    worker_services,
    worker_profile: {
      gender: draft.gender,
      title: draft.title.trim() || null,
      date_of_birth: draft.date_of_birth || null,
      experience: draft.experience || undefined,
      height_cm: draft.height_cm ? Number(draft.height_cm) : null,
      weight_kg: draft.weight_kg ? Number(draft.weight_kg) : null,
      star_sign: draft.star_sign.trim() || null,
      lifestyle: draft.lifestyle.trim() || null,
      quote: draft.quote.trim() || null,
      introduction: draft.introduction.trim() || null,
      hobbies: draft.hobbies,
      gallery_urls: draft.gallery_urls,
      work_locations: draft.work_locations.map((w) => ({
        province_code: w.province_code,
        ward_code: w.ward_code,
        label_snapshot: w.label_snapshot,
      })),
    },
  }
}

/** Builds the create payload from a draft. Returns an error message if invalid. */
export function buildPayload(
  draft: UserDraft
): { payload: AdminCreateUserPayload } | { error: string } {
  if (!draft.email.trim()) return { error: "Vui lòng nhập email." }
  if (draft.password.trim().length < 8)
    return { error: "Mật khẩu phải có ít nhất 8 ký tự." }
  if (!draft.full_name.trim()) return { error: "Vui lòng nhập họ tên." }

  const payload: AdminCreateUserPayload = {
    email: draft.email.trim(),
    password: draft.password,
    full_name: draft.full_name.trim(),
    phone: draft.phone.trim() || null,
    avatar: draft.avatar || null,
    roles: draft.isWorker ? ["worker"] : ["client"],
    status: draft.status,
  }

  if (draft.isWorker) {
    const worker = buildWorkerFields(draft)
    if ("error" in worker) return { error: worker.error }
    payload.worker_profile = worker.worker_profile
    payload.worker_services = worker.worker_services
  }

  return { payload }
}

/** Builds the update payload. Password is sent only when the admin set one. */
export function buildUpdatePayload(
  draft: UserDraft
): { payload: AdminUpdateUserPayload } | { error: string } {
  if (!draft.email.trim()) return { error: "Vui lòng nhập email." }
  if (!draft.full_name.trim()) return { error: "Vui lòng nhập họ tên." }
  const pwd = draft.password.trim()
  if (pwd && pwd.length < 8)
    return { error: "Mật khẩu phải có ít nhất 8 ký tự." }

  const payload: AdminUpdateUserPayload = {
    email: draft.email.trim(),
    full_name: draft.full_name.trim(),
    phone: draft.phone.trim() || null,
    avatar: draft.avatar || null,
    roles: draft.isWorker ? ["worker"] : ["client"],
    status: draft.status,
  }
  if (pwd) payload.password = draft.password

  if (draft.isWorker) {
    const worker = buildWorkerFields(draft)
    if ("error" in worker) return { error: worker.error }
    payload.worker_profile = worker.worker_profile
    payload.worker_services = worker.worker_services
  }

  return { payload }
}

const EDITABLE_STATUSES: AdminUserStatus[] = ["active", "inactive", "banned"]

/** Converts a fetched user detail into an editable draft (prefilled). */
export function draftFromUser(detail: AdminUserDetail): UserDraft {
  const base = createEmptyDraft()
  const profile = (detail.worker_profile ?? null) as WorkerProfilePublic | null
  const roles = detail.roles ?? (detail.role ? [detail.role] : [])
  const isWorker = roles.includes("worker")
  const status = (
    EDITABLE_STATUSES.includes(detail.status as AdminUserStatus)
      ? detail.status
      : "active"
  ) as AdminUserStatus

  const services: DraftService[] = (detail.worker_services ?? []).map((s) => {
    const prices = emptyPrices()
    for (const p of s.pricing) {
      if (p.unit in prices && !prices[p.unit]) {
        prices[p.unit] = String(p.price)
      }
    }
    return { service_code: s.service_code, prices }
  })

  return {
    ...base,
    email: detail.email ?? "",
    password: "",
    full_name: detail.full_name ?? "",
    phone: detail.phone ?? "",
    avatar: detail.avatar ?? null,
    isWorker,
    status,
    title: profile?.title ?? "",
    gender: profile?.gender ?? "FEMALE",
    date_of_birth: profile?.date_of_birth
      ? String(profile.date_of_birth).slice(0, 10)
      : "",
    experience: profile?.experience ?? "",
    height_cm: profile?.height_cm != null ? String(profile.height_cm) : "",
    weight_kg: profile?.weight_kg != null ? String(profile.weight_kg) : "",
    star_sign: profile?.star_sign ?? "",
    lifestyle: profile?.lifestyle ?? "",
    quote: profile?.quote ?? "",
    introduction: profile?.introduction ?? "",
    hobbies: profile?.hobbies ?? [],
    gallery_urls: profile?.gallery_urls ?? [],
    work_locations: (profile?.work_locations ?? []).map((w) => ({
      province_code: w.province_code,
      ward_code: w.ward_code ?? null,
      label_snapshot: w.label_snapshot ?? String(w.province_code),
    })),
    services,
  }
}

type Props = {
  draft: UserDraft
  onPatch: (patch: Partial<UserDraft>) => void
}

export function UserCreateForm({ draft, onPatch }: Props) {
  const locked = draft.savedStatus === "saved" || draft.savedStatus === "saving"

  const catalogQuery = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60_000,
  })
  const catalog = catalogQuery.data ?? []

  return (
    <div
      className={cn("space-y-5", locked && "pointer-events-none opacity-70")}
    >
      <AccountSection draft={draft} onPatch={onPatch} />

      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">Tài khoản worker</p>
            <p className="text-sm text-muted-foreground">
              Bật để tạo hồ sơ worker (hiển thị &amp; nhận booking ngay).
            </p>
          </div>
          <Switch
            checked={draft.isWorker}
            onCheckedChange={(v) => onPatch({ isWorker: v })}
          />
        </CardContent>
      </Card>

      {draft.isWorker && (
        <>
          <WorkLocationsSection draft={draft} onPatch={onPatch} />
          <BasicInfoSection draft={draft} onPatch={onPatch} />
          <PhysicalSection draft={draft} onPatch={onPatch} />
          <IdentitySection draft={draft} onPatch={onPatch} />
          <HobbiesSection draft={draft} onPatch={onPatch} />
          <IntroductionSection draft={draft} onPatch={onPatch} />
          <GallerySection draft={draft} onPatch={onPatch} />
          <ServicesSection
            draft={draft}
            onPatch={onPatch}
            catalog={catalog}
            loading={catalogQuery.isLoading}
          />
        </>
      )}
    </div>
  )
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-2xl border-border shadow-none">
      <CardHeader className="px-4 pt-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">{children}</CardContent>
    </Card>
  )
}

function FieldRow({
  label,
  optional,
  children,
}: {
  label: string
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {optional && (
          <span className="font-normal text-muted-foreground"> (tuỳ chọn)</span>
        )}
      </Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Account
// ---------------------------------------------------------------------------
function AccountSection({ draft, onPatch }: Props) {
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleAvatar = async (file: File | undefined) => {
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      onPatch({ avatar: url })
    } catch {
      toast.error("Tải ảnh đại diện thất bại.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <SectionCard title="Tài khoản">
      <div className="flex items-center gap-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-full border bg-muted">
          {draft.avatar ? (
            <Image
              src={draft.avatar}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
              Ảnh
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAvatar(e.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Tải ảnh
          </Button>
          {draft.avatar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onPatch({ avatar: null })}
            >
              Xóa
            </Button>
          )}
        </div>
      </div>

      <FieldRow label="URL ảnh đại diện" optional>
        <Input
          className="h-11 rounded-xl"
          value={draft.avatar ?? ""}
          placeholder="https://..."
          onChange={(e) => onPatch({ avatar: e.target.value || null })}
        />
      </FieldRow>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Họ tên">
          <Input
            className="h-11 rounded-xl"
            value={draft.full_name}
            placeholder="Nguyễn Văn A"
            onChange={(e) => onPatch({ full_name: e.target.value })}
          />
        </FieldRow>
        <FieldRow label="Số điện thoại" optional>
          <Input
            className="h-11 rounded-xl"
            value={draft.phone}
            placeholder="09xxxxxxxx"
            onChange={(e) => onPatch({ phone: e.target.value })}
          />
        </FieldRow>
      </div>

      <FieldRow label="Email (dùng để đăng nhập)">
        <div className="flex gap-2">
          <Input
            type="email"
            className="h-11 rounded-xl"
            value={draft.email}
            placeholder="email@pr1as.local"
            onChange={(e) => onPatch({ email: e.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            title="Tạo email tự động"
            onClick={() => onPatch({ email: generateEmail(draft.full_name) })}
          >
            <Wand2 className="size-4" />
          </Button>
        </div>
      </FieldRow>

      <FieldRow label="Mật khẩu (tối thiểu 8 ký tự)">
        <div className="flex gap-2">
          <Input
            className="h-11 rounded-xl"
            value={draft.password}
            placeholder="Mật khẩu"
            onChange={(e) => onPatch({ password: e.target.value })}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            title="Tạo mật khẩu mạnh"
            onClick={() => onPatch({ password: generatePassword() })}
          >
            <KeyRound className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0 rounded-xl"
            title="Sao chép mật khẩu"
            disabled={!draft.password}
            onClick={() => {
              navigator.clipboard.writeText(draft.password)
              toast.success("Đã sao chép mật khẩu.")
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </FieldRow>

      <FieldRow label="Trạng thái">
        <Select
          value={draft.status}
          onValueChange={(v) => onPatch({ status: v as AdminUserStatus })}
        >
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Work locations
// ---------------------------------------------------------------------------
function WorkLocationsSection({ draft, onPatch }: Props) {
  const [provinceCode, setProvinceCode] = useState<number | null>(null)
  const [wardCode, setWardCode] = useState<number | null>(null)

  const provincesQuery = useQuery({
    queryKey: ["vn", "provinces", "v2"],
    queryFn: getProvinces,
    staleTime: Infinity,
  })
  const wardsQuery = useQuery({
    queryKey: ["vn", "wards", provinceCode],
    queryFn: () => getWardsByProvince(provinceCode as number),
    enabled: provinceCode != null,
    staleTime: Infinity,
  })

  const provinces = provincesQuery.data ?? []
  const wards = wardsQuery.data ?? []
  const atMax = draft.work_locations.length >= WORK_LOCATIONS_MAX

  const addLocation = () => {
    if (provinceCode == null) return
    const province = provinces.find((p) => p.code === provinceCode)
    if (!province) return
    const ward =
      wardCode != null ? wards.find((w) => w.code === wardCode) : null
    const label = ward ? formatWardLabel(ward, province) : province.name

    const exists = draft.work_locations.some(
      (w) =>
        w.province_code === provinceCode && w.ward_code === (wardCode ?? null)
    )
    if (exists) return

    onPatch({
      work_locations: [
        ...draft.work_locations,
        {
          province_code: provinceCode,
          ward_code: wardCode ?? null,
          label_snapshot: label,
        },
      ].slice(0, WORK_LOCATIONS_MAX),
    })
    setWardCode(null)
  }

  return (
    <SectionCard
      title="Khu vực làm việc"
      subtitle={`Tối đa ${WORK_LOCATIONS_MAX} khu vực, nên chọn ít nhất 1`}
      icon={<MapPin className="size-4 text-primary" />}
    >
      {draft.work_locations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.work_locations.map((w, i) => {
            const isProvince = w.ward_code == null
            return (
              <Badge
                key={`${w.province_code}-${w.ward_code}-${i}`}
                variant={isProvince ? "default" : "secondary"}
                className="gap-1 rounded-full py-1 pr-1 pl-2 text-xs"
              >
                {isProvince ? (
                  <Globe2 className="size-3" />
                ) : (
                  <MapPin className="size-3" />
                )}
                {w.label_snapshot}
                <button
                  type="button"
                  className="ml-0.5 flex size-4 items-center justify-center rounded-full hover:bg-black/20"
                  aria-label="Xóa"
                  onClick={() =>
                    onPatch({
                      work_locations: draft.work_locations.filter(
                        (_, idx) => idx !== i
                      ),
                    })
                  }
                >
                  <X className="size-2.5" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Select
          value={provinceCode != null ? String(provinceCode) : undefined}
          onValueChange={(v) => {
            setProvinceCode(Number(v))
            setWardCode(null)
          }}
        >
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Tỉnh / thành" />
          </SelectTrigger>
          <SelectContent>
            {provinces.map((p) => (
              <SelectItem key={p.code} value={String(p.code)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={wardCode != null ? String(wardCode) : undefined}
          onValueChange={(v) => setWardCode(Number(v))}
          disabled={provinceCode == null}
        >
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Phường / xã (tuỳ chọn)" />
          </SelectTrigger>
          <SelectContent>
            {wards.map((w) => (
              <SelectItem key={w.code} value={String(w.code)}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="h-11 gap-2 rounded-xl border-dashed"
          onClick={addLocation}
          disabled={provinceCode == null || atMax}
        >
          <Plus className="size-4" />
          Thêm
        </Button>
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Basic info (dob, gender, experience)
// ---------------------------------------------------------------------------
function BasicInfoSection({ draft, onPatch }: Props) {
  const dob = draft.date_of_birth ? new Date(draft.date_of_birth) : undefined

  return (
    <SectionCard title="Thông tin cơ bản">
      <FieldRow label="Ngày sinh" optional>
        <DatePicker
          value={dob}
          onChange={(d) =>
            onPatch({
              date_of_birth: d
                ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
                    d.getDate()
                  ).padStart(2, "0")}`
                : "",
            })
          }
          placeholder="Chọn ngày sinh"
          toDate={new Date()}
        />
      </FieldRow>

      <FieldRow label="Giới tính">
        <div className="flex gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
          {GENDER_OPTIONS.map((g) => (
            <Button
              key={g.value}
              type="button"
              variant={draft.gender === g.value ? "secondary" : "ghost"}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all",
                draft.gender === g.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
              onClick={() => onPatch({ gender: g.value })}
            >
              {g.label}
            </Button>
          ))}
        </div>
      </FieldRow>

      <FieldRow label="Kinh nghiệm" optional>
        <Select
          value={draft.experience || undefined}
          onValueChange={(v) => onPatch({ experience: v as WorkerExperience })}
        >
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Chọn kinh nghiệm" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Physical (height, weight, star sign)
// ---------------------------------------------------------------------------
function PhysicalSection({ draft, onPatch }: Props) {
  return (
    <SectionCard title="Thể chất">
      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Chiều cao">
          <div className="relative">
            <Input
              type="number"
              min={0}
              placeholder="170"
              className="h-11 rounded-xl pr-8"
              value={draft.height_cm}
              onChange={(e) => onPatch({ height_cm: e.target.value })}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              cm
            </span>
          </div>
        </FieldRow>
        <FieldRow label="Cân nặng">
          <div className="relative">
            <Input
              type="number"
              min={0}
              placeholder="60"
              className="h-11 rounded-xl pr-8"
              value={draft.weight_kg}
              onChange={(e) => onPatch({ weight_kg: e.target.value })}
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              kg
            </span>
          </div>
        </FieldRow>
      </div>

      <FieldRow label="Cung hoàng đạo" optional>
        <Select
          value={draft.star_sign || undefined}
          onValueChange={(v) => onPatch({ star_sign: v })}
        >
          <SelectTrigger className="h-11 w-full rounded-xl">
            <SelectValue placeholder="Chọn cung hoàng đạo" />
          </SelectTrigger>
          <SelectContent>
            {STAR_SIGNS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldRow>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Identity (title, lifestyle, quote)
// ---------------------------------------------------------------------------
function IdentitySection({ draft, onPatch }: Props) {
  return (
    <SectionCard title="Định danh cá nhân">
      <FieldRow label="Tên nghề / Chức danh">
        <Input
          className="h-11 rounded-xl"
          maxLength={100}
          placeholder="VD: Trợ lý cá nhân, Người bạn đồng hành..."
          value={draft.title}
          onChange={(e) => onPatch({ title: e.target.value })}
        />
      </FieldRow>
      <FieldRow label="Lối sống">
        <Input
          className="h-11 rounded-xl"
          placeholder="VD: Năng động, thích khám phá..."
          value={draft.lifestyle}
          onChange={(e) => onPatch({ lifestyle: e.target.value })}
        />
      </FieldRow>
      <FieldRow label="Câu nói yêu thích">
        <Input
          className="h-11 rounded-xl"
          placeholder="Một câu nói ấn tượng về bạn..."
          value={draft.quote}
          onChange={(e) => onPatch({ quote: e.target.value })}
        />
      </FieldRow>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Hobbies
// ---------------------------------------------------------------------------
function HobbiesSection({ draft, onPatch }: Props) {
  const [hobbyDraft, setHobbyDraft] = useState("")

  const addHobby = () => {
    const value = hobbyDraft.trim()
    if (!value || draft.hobbies.includes(value)) {
      setHobbyDraft("")
      return
    }
    onPatch({ hobbies: [...draft.hobbies, value].slice(0, 30) })
    setHobbyDraft("")
  }

  return (
    <SectionCard title="Sở thích">
      {draft.hobbies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {draft.hobbies.map((h) => (
            <Badge
              key={h}
              variant="secondary"
              className="gap-1 rounded-full py-1 pr-1 pl-2.5 text-sm"
            >
              {h}
              <button
                type="button"
                className="flex size-4 items-center justify-center rounded-full hover:bg-black/15"
                aria-label={`Xóa ${h}`}
                onClick={() =>
                  onPatch({ hobbies: draft.hobbies.filter((x) => x !== h) })
                }
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input
          className="h-11 flex-1 rounded-xl"
          placeholder="Thêm sở thích..."
          value={hobbyDraft}
          onChange={(e) => setHobbyDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addHobby()
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-xl"
          onClick={addHobby}
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Introduction
// ---------------------------------------------------------------------------
function IntroductionSection({ draft, onPatch }: Props) {
  return (
    <SectionCard title="Lời giới thiệu">
      <Textarea
        rows={5}
        className="resize-none rounded-xl"
        placeholder="Viết vài dòng giới thiệu bản thân, điểm mạnh và phong cách làm việc..."
        value={draft.introduction}
        onChange={(e) => onPatch({ introduction: e.target.value })}
      />
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Gallery (admin adds manually)
// ---------------------------------------------------------------------------
function GallerySection({ draft, onPatch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        urls.push(await uploadImage(file))
      }
      onPatch({
        gallery_urls: [...draft.gallery_urls, ...urls].slice(-MAX_GALLERY),
      })
    } catch {
      toast.error("Tải ảnh thất bại.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <SectionCard
      title="Thư viện ảnh"
      subtitle={`${draft.gallery_urls.length}/${MAX_GALLERY} ảnh · thêm thủ công`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        className="h-14 w-full gap-2.5 rounded-xl border-dashed text-base font-medium"
        disabled={uploading || draft.gallery_urls.length >= MAX_GALLERY}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <Upload className="size-5" />
        )}
        Chọn ảnh
      </Button>

      <div className="flex gap-2">
        <Input
          className="h-11 rounded-xl"
          value={urlInput}
          placeholder="Dán URL ảnh..."
          onChange={(e) => setUrlInput(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 rounded-xl"
          disabled={
            !urlInput.trim() || draft.gallery_urls.length >= MAX_GALLERY
          }
          onClick={() => {
            onPatch({
              gallery_urls: [...draft.gallery_urls, urlInput.trim()].slice(
                -MAX_GALLERY
              ),
            })
            setUrlInput("")
          }}
        >
          Thêm URL
        </Button>
      </div>

      {draft.gallery_urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {draft.gallery_urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative aspect-square overflow-hidden rounded-xl border"
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
              />
              <button
                type="button"
                className="absolute top-1 right-1 rounded-full bg-black/70 p-1 text-white"
                onClick={() =>
                  onPatch({
                    gallery_urls: draft.gallery_urls.filter(
                      (_, idx) => idx !== i
                    ),
                  })
                }
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Services + pricing (mirrors the worker setup catalogue UI)
// ---------------------------------------------------------------------------
function ServicesSection({
  draft,
  onPatch,
  catalog,
  loading,
}: Props & { catalog: ServiceItem[]; loading: boolean }) {
  const toggleService = (code: string) => {
    const exists = draft.services.some((s) => s.service_code === code)
    onPatch({
      services: exists
        ? draft.services.filter((s) => s.service_code !== code)
        : [...draft.services, { service_code: code, prices: emptyPrices() }],
    })
  }

  const setPrice = (code: string, unit: WorkerPricingUnit, value: string) => {
    const digits = value.replace(/\D/g, "")
    onPatch({
      services: draft.services.map((s) =>
        s.service_code === code
          ? { ...s, prices: { ...s.prices, [unit]: digits } }
          : s
      ),
    })
  }

  return (
    <SectionCard
      title="Dịch vụ & Giá"
      subtitle="Chọn dịch vụ cung cấp và nhập giá (VND) cho ít nhất một đơn vị"
    >
      {loading && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Đang tải danh mục dịch vụ...
        </p>
      )}

      {catalog.map((service) => {
        const selected = draft.services.find(
          (s) => s.service_code === service.code
        )
        const checked = Boolean(selected)
        return (
          <div
            key={service.code}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/60"
              onClick={() => toggleService(service.code)}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                  checked
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/40 bg-transparent"
                )}
              >
                {checked && (
                  <Check className="size-3.5 stroke-[3] text-primary-foreground" />
                )}
              </span>
              <span className="flex-1 text-sm leading-snug font-medium">
                {serviceService.getName(service.name)}
              </span>
            </button>

            {checked && selected && (
              <div className="space-y-2.5 border-t border-border bg-muted/30 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Nhập giá (VND) cho ít nhất một đơn vị
                </p>
                {PRICING_UNITS.map((unit) => (
                  <div key={unit} className="flex items-center gap-3">
                    <Label className="w-20 shrink-0 text-xs text-muted-foreground">
                      {UNIT_LABEL[unit]}
                    </Label>
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        className="h-11 pr-10 text-sm"
                        value={formatVnd(selected.prices[unit])}
                        onChange={(e) =>
                          setPrice(service.code, unit, e.target.value)
                        }
                      />
                      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
                        ₫
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </SectionCard>
  )
}
