"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { ImageEditorDialog } from "@/components/ui/image-editor-dialog"
import { SiteLayout } from "@/components/layout/site-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet"
import { useMe } from "@/lib/hooks/use-auth"
import { useImageEditorQueue } from "@/lib/hooks/use-image-editor-queue"
import {
  useMyWorkerServices,
  useUpdateWorkerProfile,
  useUpsertWorkerServices,
} from "@/lib/hooks/use-worker-setup"
import { useAuthStore } from "@/lib/store/auth-store"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/utils/error-handler"
import { uploadImage } from "@/lib/utils/upload-image"
import {
  filterAssistanceServicesForWorkerSetup,
  isServiceIncludedInWorkerSetupStep,
  splitCompanionshipServices,
} from "@/lib/worker/worker-setup-catalog"
import {
  buildPricingFromUnits,
  normalizeWorkerPricingSlots,
  priceForUnit,
  validateNormalizedPricing,
  WORKER_SETUP_PRICING_SLOT_ORDER,
} from "@/lib/worker/worker-setup-pricing"
import {
  formatProvinceLabel,
  formatWardLabel,
  getProvinces,
  getWardsByProvince,
  WORK_LOCATIONS_MAX,
  type ProvinceOption,
  type WardOption,
} from "@/lib/vn-provinces/work-locations-api"
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { arrayMove, rectSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { serviceService, type ServiceItem } from "@/services/service.service"
import { INTL_LOCALE_TAGS, type SupportedLocale } from "@/lib/locale"
import type {
  WorkerExperience,
  WorkerGender,
  WorkerPricingSlot,
  WorkerPricingUnit,
  WorkerProfilePublic,
  WorkerProfileUpdateInput,
  WorkerServiceUpsertItem,
} from "@/types"

const EMPTY_SERVICE_LIST: ServiceItem[] = []
const MAX_GALLERY = 10
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const TOTAL_STEPS = 4

const STAR_SIGN_VALUES = [
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
  "AQUARIUS",
  "PISCES",
] as const

const EXPERIENCE_VALUES: WorkerExperience[] = [
  "LESS_THAN_1",
  "ONE_TO_3",
  "THREE_TO_5",
  "FIVE_TO_10",
  "MORE_THAN_10",
]

const STEP_KEYS = ["area", "style", "gallery", "services"] as const

function parseVndInput(value: string) {
  const digits = value.replace(/[^\d]/g, "")
  if (!digits) return undefined
  const amount = Number(digits)
  return Number.isFinite(amount) && amount > 0 ? amount : undefined
}

function formatVndInput(value: number | string | undefined, localeTag: string) {
  const digits = String(value ?? "").replace(/[^\d]/g, "")
  if (!digits) return ""
  return new Intl.NumberFormat(localeTag).format(Number(digits))
}

function parseWorkerProfile(raw: unknown): WorkerProfilePublic | null {
  if (!raw || typeof raw !== "object") return null
  return raw as WorkerProfilePublic
}

function SortableImage({
  url,
  index,
  onRemove,
}: {
  url: string
  index: number
  onRemove: () => void
}) {
  const t = useTranslations("WorkerSetup")
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: url })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="relative aspect-square overflow-hidden rounded-2xl border border-border cursor-grab active:cursor-grabbing touch-none select-none"
      {...attributes}
      {...listeners}
    >
      <Image src={url} alt="" fill className="object-cover pointer-events-none" sizes="150px" />
      {index === 0 && (
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
          {t("gallery.primary")}
        </span>
      )}
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="absolute right-1.5 top-1.5 size-7 rounded-full bg-black/70 text-white shadow-sm backdrop-blur-sm hover:bg-black/80"
        aria-label={t("gallery.removeImage")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

export default function WorkerSetupPage() {
  const t = useTranslations("WorkerSetup")
  const locale = useLocale() as SupportedLocale
  const localeTag = INTL_LOCALE_TAGS[locale]
  const router = useRouter()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.user?.id)

  const meQuery = useMe()
  const catalogQuery = useQuery({
    queryKey: ["services", "list"],
    queryFn: serviceService.getServices,
    staleTime: 5 * 60_000,
  })
  const mineQuery = useMyWorkerServices()
  const updateProfileMutation = useUpdateWorkerProfile()
  const upsertServicesMutation = useUpsertWorkerServices()

  const hydratedRef = useRef(false)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const hobbyInputRef = useRef<HTMLInputElement>(null)

  // Step state
  const [currentStep, setCurrentStep] = useState(0)
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward")

  // Work locations
  const [workLocations, setWorkLocations] = useState<
    Array<{ province_code: number; ward_code: number | null; label_snapshot?: string }>
  >([])
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationPickerPhase, setLocationPickerPhase] = useState<"province" | "ward">("province")
  const [locationPickerProvince, setLocationPickerProvince] = useState<ProvinceOption | null>(null)
  const [provinceQuery, setProvinceQuery] = useState("")
  const [wardQuery, setWardQuery] = useState("")
  const [activeProvinceCode, setActiveProvinceCode] = useState<number | null>(null)

  const provincesQuery = useQuery({
    queryKey: ["vn", "provinces", "v2"],
    queryFn: getProvinces,
    staleTime: Infinity,
    enabled: locationOpen,
  })

  const wardsQuery = useQuery({
    queryKey: ["vn", "wards", "v2", activeProvinceCode],
    queryFn: () => getWardsByProvince(activeProvinceCode as number),
    enabled: locationOpen && activeProvinceCode != null,
    staleTime: Infinity,
  })

  const filteredProvinces = useMemo(() => {
    const list = provincesQuery.data ?? []
    const q = provinceQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (p) => p.short_name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    )
  }, [provincesQuery.data, provinceQuery])

  const filteredWards = useMemo(() => {
    const list = wardsQuery.data ?? []
    const q = wardQuery.trim().toLowerCase()
    if (!q) return list
    return list.filter((w) => w.name.toLowerCase().includes(q))
  }, [wardsQuery.data, wardQuery])

  // Profile fields
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [gender, setGender] = useState<WorkerGender>("MALE")
  const [heightCm, setHeightCm] = useState("")
  const [weightKg, setWeightKg] = useState("")
  const [experience, setExperience] = useState<WorkerExperience | "">("")
  const [starSign, setStarSign] = useState("")
  const [title, setTitle] = useState("")
  const [lifestyle, setLifestyle] = useState("")
  const [quote, setQuote] = useState("")
  const [introduction, setIntroduction] = useState("")
  const [hobbies, setHobbies] = useState<string[]>([])
  const [hobbyDraft, setHobbyDraft] = useState("")
  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [galleryUploading, setGalleryUploading] = useState(false)
  const [selectedPricing, setSelectedPricing] = useState<Map<string, WorkerPricingSlot[]>>(new Map())

  const persistedCoordsRef = useRef<{ latitude: number; longitude: number } | null>(null)

  const gallerySensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
  )

  function handleGalleryDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setGalleryUrls((prev) => {
        const oldIndex = prev.indexOf(active.id as string)
        const newIndex = prev.indexOf(over.id as string)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  const galleryEditor = useImageEditorQueue()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login?from=/worker/setup")
    }
  }, [isAuthenticated, router])

  const catalog = catalogQuery.data ?? EMPTY_SERVICE_LIST

  const assistanceList = useMemo(
    () => filterAssistanceServicesForWorkerSetup(catalog),
    [catalog],
  )

  const companionshipSplit = useMemo(() => {
    const list = catalog.filter((s) => s.category === "COMPANIONSHIP")
    return splitCompanionshipServices(list)
  }, [catalog])

  // Hydrate from server data
  useEffect(() => {
    if (hydratedRef.current) return
    if (!meQuery.isSuccess || !meQuery.data?.data?.user) return
    if (!catalogQuery.isSuccess) return
    if (mineQuery.isLoading) return

    const user = meQuery.data.data.user
    const profile = parseWorkerProfile(user.worker_profile)

    const mine = mineQuery.data ?? []
    const cat = catalogQuery.data ?? EMPTY_SERVICE_LIST
    const nextMap = new Map<string, WorkerPricingSlot[]>()
    for (const ws of mine) {
      const svc = cat.find((c) => c.id === ws.service_id)
      if (svc && isServiceIncludedInWorkerSetupStep(svc)) {
        nextMap.set(
          ws.service_id,
          normalizeWorkerPricingSlots(
            ws.pricing.map((p) => ({
              unit: p.unit,
              duration: p.duration,
              price: p.price,
              currency: p.currency,
            })),
          ),
        )
      }
    }

    queueMicrotask(() => {
      if (hydratedRef.current) return

      if (profile?.work_locations?.length) {
        setWorkLocations(
          profile.work_locations.map((w) => ({
            province_code: w.province_code,
            ward_code: w.ward_code ?? null,
            label_snapshot: w.label_snapshot,
          })),
        )
      }

      if (profile?.date_of_birth) {
        const d = new Date(profile.date_of_birth)
        if (!Number.isNaN(d.getTime())) setDateOfBirth(d)
      }

      if (profile?.gender) setGender(profile.gender)
      if (profile?.height_cm != null) setHeightCm(String(profile.height_cm))
      if (profile?.weight_kg != null) setWeightKg(String(profile.weight_kg))
      if (profile?.experience) setExperience(profile.experience)
      if (profile?.star_sign) setStarSign(profile.star_sign)
      if (profile?.title) setTitle(profile.title)
      if (profile?.lifestyle) setLifestyle(profile.lifestyle)
      if (profile?.quote) setQuote(profile.quote)
      if (profile?.introduction) setIntroduction(profile.introduction)
      if (profile?.hobbies?.length) setHobbies(profile.hobbies)
      if (profile?.gallery_urls?.length) setGalleryUrls(profile.gallery_urls)

      if (profile?.coords?.latitude != null && profile?.coords?.longitude != null) {
        persistedCoordsRef.current = {
          latitude: profile.coords.latitude,
          longitude: profile.coords.longitude,
        }
      }

      setSelectedPricing(nextMap)
      hydratedRef.current = true
    })
  }, [
    meQuery.isSuccess,
    meQuery.data,
    catalogQuery.isSuccess,
    catalogQuery.data,
    mineQuery.isLoading,
    mineQuery.data,
  ])

  useEffect(() => {
    if (provincesQuery.isError) toast.error(t("toast.loadProvincesError"))
  }, [provincesQuery.isError, t])

  useEffect(() => {
    if (wardsQuery.isError) toast.error(t("toast.loadWardsError"))
  }, [wardsQuery.isError, t])

  // Location helpers
  const addProvinceLocation = (p: ProvinceOption) => {
    setWorkLocations((prev) => {
      const cleaned = prev.filter((w) => w.province_code !== p.code)
      if (cleaned.some((w) => w.province_code === p.code && w.ward_code == null)) return cleaned
      if (cleaned.length >= WORK_LOCATIONS_MAX) {
        toast.warning(t("toast.maxLocations", { max: WORK_LOCATIONS_MAX }))
        return prev
      }
      const removedWardCount = prev.length - cleaned.length
      if (removedWardCount > 0) {
        toast.info(t("toast.replacedWards", { count: removedWardCount, province: p.short_name }))
      }
      return [...cleaned, { province_code: p.code, ward_code: null, label_snapshot: formatProvinceLabel(p) }]
    })
  }

  const addWardLocation = (p: ProvinceOption, w: WardOption) => {
    setWorkLocations((prev) => {
      const cleaned = prev.filter((x) => !(x.province_code === p.code && x.ward_code == null))
      if (cleaned.some((x) => x.ward_code === w.code)) return cleaned
      if (cleaned.length >= WORK_LOCATIONS_MAX) {
        toast.warning(t("toast.maxLocations", { max: WORK_LOCATIONS_MAX }))
        return prev
      }
      if (prev.length !== cleaned.length) {
        toast.info(t("toast.removedWholeProvince", { province: p.short_name }))
      }
      return [...cleaned, { province_code: p.code, ward_code: w.code, label_snapshot: formatWardLabel(w, p) }]
    })
  }

  const removeWorkLocation = (provinceCode: number, wardCode: number | null) => {
    setWorkLocations((prev) =>
      prev.filter(
        (w) => !(w.province_code === provinceCode && (w.ward_code ?? null) === (wardCode ?? null)),
      ),
    )
  }

  const addHobby = () => {
    const v = hobbyDraft.trim()
    if (!v || hobbies.includes(v)) return
    setHobbies((h) => [...h, v])
    setHobbyDraft("")
    hobbyInputRef.current?.focus()
  }

  const setPriceForUnit = (serviceId: string, unit: WorkerPricingUnit, raw: string) => {
    const value = parseVndInput(raw)
    setSelectedPricing((prev) => {
      const next = new Map(prev)
      const cur = normalizeWorkerPricingSlots(next.get(serviceId) ?? [])
      next.set(serviceId, buildPricingFromUnits(unit, value, cur))
      return next
    })
  }

  const toggleService = (serviceId: string) => {
    setSelectedPricing((prev) => {
      const next = new Map(prev)
      if (next.has(serviceId)) {
        next.delete(serviceId)
      } else {
        next.set(serviceId, [])
      }
      return next
    })
  }

  const handleGalleryFiles = (files: FileList | null) => {
    const arr = Array.from(files ?? [])
    if (galleryInputRef.current) galleryInputRef.current.value = ""
    if (!arr.length) return
    const remaining = MAX_GALLERY - galleryUrls.length
    const slice = arr.slice(0, remaining)
    const valid = slice.filter((f) => {
      if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) {
        toast.error(t("toast.invalidImageType"))
        return false
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(t("toast.imageTooLarge"))
        return false
      }
      return true
    })
    if (!valid.length) return
    galleryEditor.start(valid, async (croppedFiles) => {
      setGalleryUploading(true)
      try {
        const urls: string[] = []
        for (const file of croppedFiles) {
          urls.push(await uploadImage(file))
        }
        setGalleryUrls((prev) => [...prev, ...urls].slice(-MAX_GALLERY))
      } catch (e) {
        toast.error(getErrorMessage(e, t("toast.uploadFailed")))
      } finally {
        setGalleryUploading(false)
      }
    })
  }

  const buildProfilePayload = (): WorkerProfileUpdateInput => {
    const height = heightCm.trim() === "" ? undefined : Number(heightCm)
    const weight = weightKg.trim() === "" ? undefined : Number(weightKg)
    const payload: WorkerProfileUpdateInput = {
      gender,
      hobbies,
      gallery_urls: galleryUrls,
      work_locations: workLocations,
      title: title.trim() || undefined,
      lifestyle: lifestyle.trim() || undefined,
      quote: quote.trim() || undefined,
      introduction: introduction.trim() || undefined,
    }
    if (dateOfBirth) payload.date_of_birth = format(dateOfBirth, "yyyy-MM-dd")
    if (experience) payload.experience = experience
    if (starSign) payload.star_sign = starSign
    if (height !== undefined && !Number.isNaN(height) && height > 0) payload.height_cm = height
    if (weight !== undefined && !Number.isNaN(weight) && weight > 0) payload.weight_kg = weight
    if (persistedCoordsRef.current) payload.coords = persistedCoordsRef.current
    return payload
  }

  const buildServicesPayload = (): WorkerServiceUpsertItem[] | null => {
    const items: WorkerServiceUpsertItem[] = []
    for (const [serviceId, pricing] of selectedPricing) {
      const svc = catalog.find((c) => c.id === serviceId)
      if (!svc || !isServiceIncludedInWorkerSetupStep(svc)) continue
      const norm = normalizeWorkerPricingSlots(pricing)
      const err = validateNormalizedPricing(norm)
      if (err) {
        toast.error(t("toast.serviceNeedsPrice", { service: serviceService.getName(svc.name) }))
        return null
      }
      items.push({ service_id: serviceId, pricing: norm.map((p) => ({ ...p, currency: "VND" })) })
    }
    if (items.length === 0) {
      toast.error(t("toast.selectServiceAndPrice"))
      return null
    }
    return items
  }

  const handleSubmit = async () => {
    if (!gender) { toast.error(t("toast.selectGender")); return }
    if (workLocations.length < 1) { toast.error(t("toast.selectLocation")); return }
    const servicesPayload = buildServicesPayload()
    if (!servicesPayload) return
    const profilePayload = buildProfilePayload()
    try {
      await updateProfileMutation.mutateAsync(profilePayload)
      await upsertServicesMutation.mutateAsync({ services: servicesPayload })
      toast.success(t("toast.saveSuccess"))
      const id = userId ?? meQuery.data?.data?.user?.id
      if (id) router.push(`/worker/${id}`)
      else router.push("/")
    } catch (e) {
      toast.error(getErrorMessage(e, t("toast.saveError")))
    }
  }

  const handleNext = () => {
    setStepDirection("forward")
    setCurrentStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
  }

  const handleBack = () => {
    if (currentStep === 0) { router.back(); return }
    setStepDirection("back")
    setCurrentStep((s) => Math.max(s - 1, 0))
  }

  const isLoadingPage =
    !isAuthenticated || meQuery.isLoading || catalogQuery.isLoading || mineQuery.isLoading
  const isSaving =
    updateProfileMutation.isPending || upsertServicesMutation.isPending
  const currentStepKey = STEP_KEYS[currentStep]

  // ─── Service row (mobile-optimised) ─────────────────────────────────────────
  const renderServiceRow = (service: ServiceItem) => {
    const checked = selectedPricing.has(service.id)
    const pricing = normalizeWorkerPricingSlots(selectedPricing.get(service.id) ?? [])

    return (
      <div
        key={service.id}
        className="overflow-hidden rounded-2xl border border-border bg-card"
      >
        <Button
          type="button"
          variant="ghost"
          className="flex h-auto w-full items-center gap-3 px-4 py-4 text-left active:bg-accent/60 transition-colors"
          onClick={() => toggleService(service.id)}
        >
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all",
              checked
                ? "border-primary bg-primary"
                : "border-muted-foreground/40 bg-transparent",
            )}
          >
            {checked && <Check className="size-3.5 text-primary-foreground stroke-[3]" />}
          </div>
          <span className="flex-1 text-sm font-medium leading-snug">
            {serviceService.getName(service.name)}
          </span>
        </Button>

        {checked && (
          <div className="border-t border-border px-4 py-3 space-y-2.5 bg-muted/30">
            <p className="text-xs text-muted-foreground">{t("pricing.priceHelp")}</p>
            {WORKER_SETUP_PRICING_SLOT_ORDER.map((unit) => (
              <div key={unit} className="flex items-center gap-3">
                <Label className="w-20 shrink-0 text-xs text-muted-foreground">
                  {t(`units.${unit}`)}
                </Label>
                <div className="relative flex-1">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatVndInput(priceForUnit(pricing, unit), localeTag)}
                    onChange={(e) => setPriceForUnit(service.id, unit, e.target.value)}
                    className="h-11 pr-10 text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                    ₫
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─── Step renderers ──────────────────────────────────────────────────────────
  const renderStep0 = () => (
    <div className="space-y-5">
      {/* Work locations */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="size-4 text-primary" />
            {t("sections.workLocations.title")}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("sections.workLocations.subtitle", { max: WORK_LOCATIONS_MAX })}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {workLocations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {workLocations.map((w) => {
                const isProvince = w.ward_code == null
                const id = `${w.province_code}:${w.ward_code ?? "ALL"}`
                return (
                  <Badge
                    key={id}
                    variant={isProvince ? "default" : "secondary"}
                    className="gap-1 pl-2 pr-1 py-1 text-xs rounded-full"
                  >
                    {isProvince ? <Globe2 className="size-3" /> : <MapPin className="size-3" />}
                    {w.label_snapshot ?? id}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="ml-0.5 size-4 rounded-full hover:bg-black/20 active:bg-black/30"
                      aria-label={t("actions.remove")}
                      onClick={() => removeWorkLocation(w.province_code, w.ward_code)}
                    >
                      <X className="size-2.5" />
                    </Button>
                  </Badge>
                )
              })}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl gap-2 border-dashed"
            disabled={workLocations.length >= WORK_LOCATIONS_MAX}
            onClick={() => {
              setLocationPickerPhase("province")
              setLocationPickerProvince(null)
              setProvinceQuery("")
              setWardQuery("")
              setLocationOpen(true)
            }}
          >
            <Plus className="size-4" />
            {t("actions.addLocation")}
          </Button>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.basicInfo.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.dateOfBirth")}</Label>
            <DatePicker
              value={dateOfBirth}
              onChange={setDateOfBirth}
              placeholder={t("placeholders.dateOfBirth")}
              toDate={new Date()}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.gender")}</Label>
            <div className="flex gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
              {(["MALE", "FEMALE", "OTHER"] as WorkerGender[]).map((g) => (
                <Button
                  key={g}
                  type="button"
                  variant={gender === g ? "secondary" : "ghost"}
                  className={cn(
                    "flex-1 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                    gender === g
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground active:bg-background/60",
                  )}
                  onClick={() => setGender(g)}
                >
                  {t(`gender.${g}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("fields.experience")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
            </Label>
            <Select value={experience} onValueChange={(v) => setExperience(v as WorkerExperience)}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder={t("placeholders.experience")} />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>{t(`experience.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-5">
      {/* Physical */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.physical.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("fields.height")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  placeholder="170"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="h-11 rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  cm
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t("fields.weight")}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  placeholder="60"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="h-11 rounded-xl pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                  kg
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              {t("fields.starSign")} <span className="font-normal text-muted-foreground">{t("optional")}</span>
            </Label>
            <Select value={starSign} onValueChange={setStarSign}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder={t("placeholders.starSign")} />
              </SelectTrigger>
              <SelectContent>
                {STAR_SIGN_VALUES.map((value) => (
                  <SelectItem key={value} value={value}>{t(`starSigns.${value}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Identity */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.identity.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.title")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={t("placeholders.title")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.lifestyle")}</Label>
            <Input
              value={lifestyle}
              onChange={(e) => setLifestyle(e.target.value)}
              placeholder={t("placeholders.lifestyle")}
              className="h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("fields.quote")}</Label>
            <Input
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder={t("placeholders.quote")}
              className="h-11 rounded-xl"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hobbies */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.hobbies.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {hobbies.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hobbies.map((h) => (
                <Badge key={h} variant="secondary" className="gap-1 pl-2.5 pr-1 py-1 rounded-full text-sm">
                  {h}
                  <button
                    type="button"
                    className="flex size-4 items-center justify-center rounded-full hover:bg-black/15 active:bg-black/25"
                    aria-label={t("actions.removeHobby", { hobby: h })}
                    onClick={() => setHobbies((prev) => prev.filter((x) => x !== h))}
                  >
                    <X className="size-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input
              ref={hobbyInputRef}
              placeholder={t("placeholders.hobby")}
              value={hobbyDraft}
              onChange={(e) => setHobbyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addHobby() }
              }}
              className="h-11 flex-1 rounded-xl"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              onClick={addHobby}
              aria-label={t("actions.addHobby")}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Introduction */}
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.introduction.title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <Textarea
            rows={5}
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder={t("placeholders.introduction")}
            className="rounded-xl resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-5">
      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("sections.gallery.title")}</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("gallery.summary", { count: galleryUrls.length, max: MAX_GALLERY })}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void handleGalleryFiles(e.target.files)}
          />

          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full h-14 rounded-xl gap-2.5 border-dashed text-base font-medium transition-all",
              galleryUrls.length >= MAX_GALLERY && "opacity-50",
            )}
            disabled={galleryUrls.length >= MAX_GALLERY || galleryUploading}
            onClick={() => galleryInputRef.current?.click()}
          >
            {galleryUploading ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                {t("gallery.uploading")}
              </>
            ) : (
              <>
                <ImagePlus className="size-5" />
                {t("gallery.chooseImage")}
              </>
            )}
          </Button>

          {galleryUrls.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground">
                {t("gallery.dragHelp")}
              </p>
              <DndContext
                sensors={gallerySensors}
                collisionDetection={closestCenter}
                onDragEnd={handleGalleryDragEnd}
              >
                <SortableContext items={galleryUrls} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {galleryUrls.map((url, i) => (
                      <SortableImage
                        key={url}
                        url={url}
                        index={i}
                        onRemove={() =>
                          setGalleryUrls((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}

          {galleryUrls.length === 0 && !galleryUploading && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-10 text-center">
              <ImagePlus className="size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("gallery.emptyTitle")}</p>
              <p className="text-xs text-muted-foreground/70">{t("gallery.emptyDesc")}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-5">
      {catalogQuery.isError && (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertCircle className="size-4" />
          <AlertTitle>{t("services.loadErrorTitle")}</AlertTitle>
          <AlertDescription>{t("services.loadErrorDesc")}</AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <WalletCards className="size-4 text-primary" />
            {t("services.assistanceTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("services.subtitle")}
          </p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {assistanceList.map((s) => renderServiceRow(s))}
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-2xl border-border shadow-none">
        <CardHeader className="px-4 pt-4 pb-3">
          <CardTitle className="text-base">{t("services.companionshipTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {companionshipSplit.base && renderServiceRow(companionshipSplit.base)}
          {companionshipSplit.levels.map((s) => renderServiceRow(s))}
          {!companionshipSplit.base && companionshipSplit.levels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("services.emptyCompanionship")}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-300">
          {t.rich("services.requirement", {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      </div>
    </div>
  )

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoadingPage) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-2xl px-4 py-6 space-y-4 pb-48 md:pb-28 lg:pb-12">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-52 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </SiteLayout>
    )
  }

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <SiteLayout>
      <div className="container mx-auto max-w-2xl px-4 pb-48 pt-4 md:pb-28 lg:pb-12">
        {/* Header */}
        <div className="mb-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
              {t("stepCounter", { current: currentStep + 1, total: TOTAL_STEPS })}
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t(`steps.${currentStepKey}.title`)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t(`steps.${currentStepKey}.subtitle`, { max: MAX_GALLERY })}</p>
          </div>

          {/* Progress bar */}
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-500",
                  i <= currentStep ? "bg-primary" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content with slide animation */}
        <div
          key={currentStep}
          className={cn(
            "duration-300",
            stepDirection === "forward"
              ? "animate-in fade-in-0 slide-in-from-right-4"
              : "animate-in fade-in-0 slide-in-from-left-4",
          )}
        >
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Desktop navigation — prev/next ở cuối nội dung mỗi bước */}
        <div className="mt-6 hidden items-center justify-between gap-4 lg:flex">
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-1.5 rounded-xl px-5"
            onClick={handleBack}
          >
            <ChevronLeft className="size-4" />
            {currentStep === 0 ? t("actions.exit") : t("actions.back")}
          </Button>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              className="h-11 gap-1.5 rounded-xl px-5"
              onClick={handleNext}
            >
              {t("actions.next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-11 min-w-[120px] gap-1.5 rounded-xl px-5"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t("actions.finish")}
            </Button>
          )}
        </div>
      </div>

      {/* Fixed bottom navigation — mobile nâng lên trên bottom nav, md sát đáy, lg ẩn (dùng nút 2 bên) */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px)+var(--bottom-toolbar-offset,0px))] z-40 border-t border-border bg-background/95 backdrop-blur-sm md:bottom-0 lg:hidden">
        <div className="container mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            className="gap-1.5 text-muted-foreground h-11 px-4 rounded-xl"
            onClick={handleBack}
          >
            <ChevronLeft className="size-4" />
            {currentStep === 0 ? t("actions.exit") : t("actions.back")}
          </Button>

          {/* Step dots */}
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setStepDirection(i > currentStep ? "forward" : "back")
                  setCurrentStep(i)
                }}
                className={cn(
                  "rounded-full transition-all duration-300",
                  i === currentStep
                    ? "w-6 h-2.5 bg-primary"
                    : i < currentStep
                    ? "w-2.5 h-2.5 bg-primary/50"
                    : "w-2.5 h-2.5 bg-muted-foreground/30",
                )}
                aria-label={t("stepAria", { step: i + 1 })}
              />
            ))}
          </div>

          {currentStep < TOTAL_STEPS - 1 ? (
            <Button
              type="button"
              className="gap-1.5 h-11 px-4 rounded-xl"
              onClick={handleNext}
            >
              {t("actions.next")}
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="gap-1.5 h-11 px-4 rounded-xl min-w-[100px]"
              onClick={() => void handleSubmit()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
              {t("actions.finish")}
            </Button>
          )}
        </div>
      </div>


      {/* Location picker BottomSheet */}
      <BottomSheet
        open={locationOpen}
        onOpenChange={(open) => {
          setLocationOpen(open)
          if (!open) {
            setLocationPickerPhase("province")
            setLocationPickerProvince(null)
            setProvinceQuery("")
            setWardQuery("")
          }
        }}
      >
        <BottomSheetContent className="max-h-[88vh] flex flex-col">
          {/* Sheet header */}
          <div className="flex items-center gap-2 px-4 pb-3">
            {locationPickerPhase === "ward" && (
              <button
                type="button"
                className="flex items-center gap-1 text-sm text-primary font-medium active:opacity-70"
                onClick={() => {
                  setLocationPickerPhase("province")
                  setLocationPickerProvince(null)
                  setWardQuery("")
                }}
              >
                <ChevronLeft className="size-4" />
                {t("locationPicker.province")}
              </button>
            )}
            <BottomSheetTitle className="flex-1 text-base">
              {locationPickerPhase === "province"
                ? t("locationPicker.chooseProvince")
                : t("locationPicker.chooseArea", { province: locationPickerProvince?.short_name ?? "" })}
            </BottomSheetTitle>
          </div>

          {/* Search input */}
          <div className="px-4 pb-3">
            <Input
              placeholder={
                locationPickerPhase === "province"
                  ? t("locationPicker.searchProvince")
                  : t("locationPicker.searchWard")
              }
              value={locationPickerPhase === "province" ? provinceQuery : wardQuery}
              onChange={(e) =>
                locationPickerPhase === "province"
                  ? setProvinceQuery(e.target.value)
                  : setWardQuery(e.target.value)
              }
              className="h-11 rounded-xl"
              autoFocus={false}
            />
          </div>

          {/* List */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="px-2 pb-6">
              {locationPickerPhase === "province" ? (
                <>
                  {provincesQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProvinces.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("locationPicker.noProvinceResults")}
                    </p>
                  ) : (
                    filteredProvinces.map((p) => (
                      <button
                        key={p.code}
                        type="button"
                        onClick={() => {
                          setActiveProvinceCode(p.code)
                          setLocationPickerProvince(p)
                          setLocationPickerPhase("ward")
                          setWardQuery("")
                        }}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left active:bg-accent/70 transition-colors"
                      >
                        <span className="text-sm">{p.short_name}</span>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </>
              ) : (
                <>
                  {/* Whole province option */}
                  <button
                    type="button"
                    onClick={() => {
                      if (locationPickerProvince) addProvinceLocation(locationPickerProvince)
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3.5 mb-2 active:bg-primary/20 transition-colors",
                      workLocations.some(
                        (w) => w.province_code === locationPickerProvince?.code && w.ward_code == null,
                      )
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted/50 border border-border",
                    )}
                  >
                    <Globe2 className="size-4 text-primary shrink-0" />
                    <span className="flex-1 text-sm font-medium text-left">
                      {t("locationPicker.wholeProvince", { province: locationPickerProvince?.name.toLowerCase() ?? "" })}
                    </span>
                    {workLocations.some(
                      (w) => w.province_code === locationPickerProvince?.code && w.ward_code == null,
                    ) && <Check className="size-4 text-primary shrink-0" />}
                  </button>

                  <Separator className="my-2" />

                  {wardsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredWards.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      {t("locationPicker.noWardResults")}
                    </p>
                  ) : (
                    filteredWards.map((w) => {
                      const isSelected = workLocations.some((x) => x.ward_code === w.code)
                      return (
                        <button
                          key={w.code}
                          type="button"
                          onClick={() => {
                            if (locationPickerProvince) addWardLocation(locationPickerProvince, w)
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-3.5 text-left active:bg-accent/70 transition-colors",
                            isSelected && "text-primary font-medium",
                          )}
                        >
                          <span className="text-sm">{w.name}</span>
                          {isSelected && <Check className="size-4 text-primary shrink-0" />}
                        </button>
                      )
                    })
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </BottomSheetContent>
      </BottomSheet>

      <ImageEditorDialog
        file={galleryEditor.currentFile}
        queueInfo={galleryEditor.queuePosition}
        onConfirm={galleryEditor.confirm}
        onSkip={galleryEditor.skip}
        onCancel={galleryEditor.cancel}
      />
    </SiteLayout>
  )
}
