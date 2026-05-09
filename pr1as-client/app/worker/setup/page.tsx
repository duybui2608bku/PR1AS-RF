"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import {
  AlertCircle,
  ImagePlus,
  Loader2,
  MapPin,
  WalletCards,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { SiteLayout } from "@/components/layout/site-layout"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import { useMe } from "@/lib/hooks/use-auth"
import {
  useMyWorkerServices,
  useUpdateWorkerProfile,
  useUpsertWorkerServices,
} from "@/lib/hooks/use-worker-setup"
import { useAuthStore } from "@/lib/store/auth-store"
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
  searchWorkLocations,
  WORK_LOCATIONS_MAX,
  type WorkLocationOption,
} from "@/lib/vn-provinces/work-locations-api"
import { serviceService, type ServiceItem } from "@/services/service.service"
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

const STAR_SIGNS: { value: string; label: string }[] = [
  { value: "ARIES", label: "Bạch Dương" },
  { value: "TAURUS", label: "Kim Ngưu" },
  { value: "GEMINI", label: "Song Tử" },
  { value: "CANCER", label: "Cự Giải" },
  { value: "LEO", label: "Sư Tử" },
  { value: "VIRGO", label: "Xử Nữ" },
  { value: "LIBRA", label: "Thiên Bình" },
  { value: "SCORPIO", label: "Bọ Cạp" },
  { value: "SAGITTARIUS", label: "Nhân Mã" },
  { value: "CAPRICORN", label: "Ma Kết" },
  { value: "AQUARIUS", label: "Bảo Bình" },
  { value: "PISCES", label: "Song Ngư" },
]

const EXPERIENCE_OPTIONS: { value: WorkerExperience; label: string }[] = [
  { value: "LESS_THAN_1", label: "Dưới 1 năm" },
  { value: "ONE_TO_3", label: "1–3 năm" },
  { value: "THREE_TO_5", label: "3–5 năm" },
  { value: "FIVE_TO_10", label: "5–10 năm" },
  { value: "MORE_THAN_10", label: "Trên 10 năm" },
]

const UNIT_VI: Record<WorkerPricingUnit, string> = {
  HOURLY: "Giờ",
  DAILY: "Ngày",
  MONTHLY: "Tháng",
}

function parseWorkerProfile(raw: unknown): WorkerProfilePublic | null {
  if (!raw || typeof raw !== "object") return null
  return raw as WorkerProfilePublic
}

export default function WorkerSetupPage() {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
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
  const locationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const [workLocations, setWorkLocations] = useState<
    Array<{ province_code: number; ward_code: number; label_snapshot?: string }>
  >([])
  const [locationOpen, setLocationOpen] = useState(false)
  const [locationQuery, setLocationQuery] = useState("")
  const [locationOptions, setLocationOptions] = useState<WorkLocationOption[]>(
    [],
  )
  const [locationLoading, setLocationLoading] = useState(false)

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

  const [selectedPricing, setSelectedPricing] = useState<
    Map<string, WorkerPricingSlot[]>
  >(new Map())

  const persistedCoordsRef = useRef<{
    latitude: number
    longitude: number
  } | null>(null)

  useEffect(() => {
    if (!token) {
      router.replace("/login?from=/worker/setup")
    }
  }, [token, router])

  const catalog = catalogQuery.data ?? EMPTY_SERVICE_LIST

  const assistanceList = useMemo(
    () => filterAssistanceServicesForWorkerSetup(catalog),
    [catalog],
  )

  const companionshipSplit = useMemo(() => {
    const list = catalog.filter((s) => s.category === "COMPANIONSHIP")
    return splitCompanionshipServices(list)
  }, [catalog])

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
            ward_code: w.ward_code,
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

      if (
        profile?.coords?.latitude != null &&
        profile?.coords?.longitude != null
      ) {
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

  const runLocationSearch = useCallback(async (q: string) => {
    setLocationLoading(true)
    try {
      const opts = await searchWorkLocations(q)
      setLocationOptions(opts)
    } catch {
      setLocationOptions([])
      toast.error("Không tải được danh sách khu vực.")
    } finally {
      setLocationLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!locationOpen) return
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    locationTimerRef.current = setTimeout(() => {
      void runLocationSearch(locationQuery)
    }, 320)
    return () => {
      if (locationTimerRef.current) clearTimeout(locationTimerRef.current)
    }
  }, [locationQuery, locationOpen, runLocationSearch])

  const addWorkLocation = (opt: WorkLocationOption) => {
    if (workLocations.length >= WORK_LOCATIONS_MAX) {
      toast.warning(`Tối đa ${WORK_LOCATIONS_MAX} khu vực.`)
      return
    }
    if (workLocations.some((w) => w.ward_code === opt.ward_code)) return
    setWorkLocations((prev) => [
      ...prev,
      {
        province_code: opt.province_code,
        ward_code: opt.ward_code,
        label_snapshot: opt.label,
      },
    ])
    setLocationOpen(false)
    setLocationQuery("")
  }

  const removeWorkLocation = (wardCode: number) => {
    setWorkLocations((prev) => prev.filter((w) => w.ward_code !== wardCode))
  }

  const addHobby = () => {
    const v = hobbyDraft.trim()
    if (!v || hobbies.includes(v)) return
    setHobbies((h) => [...h, v])
    setHobbyDraft("")
  }

  const setPriceForUnit = (
    serviceId: string,
    unit: WorkerPricingUnit,
    raw: string,
  ) => {
    const num = raw.trim() === "" ? undefined : Number(raw)
    const value =
      num !== undefined && !Number.isNaN(num) && num > 0 ? num : undefined
    setSelectedPricing((prev) => {
      const next = new Map(prev)
      const cur = normalizeWorkerPricingSlots(next.get(serviceId) ?? [])
      next.set(serviceId, buildPricingFromUnits(unit, value, cur))
      return next
    })
  }

  const handleGalleryFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const arr = Array.from(files)
    const remaining = MAX_GALLERY - galleryUrls.length
    const slice = arr.slice(0, remaining)
    for (const file of slice) {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        toast.error("Chỉ chấp nhận JPG, PNG hoặc WebP.")
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error("Ảnh vượt quá 5MB.")
        continue
      }
    }
    const valid = slice.filter(
      (f) =>
        /^image\/(jpeg|png|webp)$/i.test(f.type) && f.size <= MAX_IMAGE_BYTES,
    )
    if (!valid.length) return
    setGalleryUploading(true)
    try {
      const urls: string[] = []
      for (const file of valid) {
        urls.push(await uploadImage(file))
      }
      setGalleryUrls((prev) => [...prev, ...urls].slice(-MAX_GALLERY))
    } catch (e) {
      toast.error(getErrorMessage(e, "Tải ảnh thất bại."))
    } finally {
      setGalleryUploading(false)
      if (galleryInputRef.current) galleryInputRef.current.value = ""
    }
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

    if (dateOfBirth) {
      payload.date_of_birth = format(dateOfBirth, "yyyy-MM-dd")
    }

    if (experience) payload.experience = experience
    if (starSign) payload.star_sign = starSign

    if (height !== undefined && !Number.isNaN(height) && height > 0) {
      payload.height_cm = height
    }
    if (weight !== undefined && !Number.isNaN(weight) && weight > 0) {
      payload.weight_kg = weight
    }

    if (persistedCoordsRef.current) {
      payload.coords = {
        latitude: persistedCoordsRef.current.latitude,
        longitude: persistedCoordsRef.current.longitude,
      }
    }

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
        toast.error(
          `${serviceService.getName(svc.name)}: nhập ít nhất một mức giá hợp lệ.`,
        )
        return null
      }
      items.push({
        service_id: serviceId,
        pricing: norm.map((p) => ({
          ...p,
          currency: "VND",
        })),
      })
    }

    if (items.length === 0) {
      toast.error("Chọn ít nhất một dịch vụ và nhập giá.")
      return null
    }

    return items
  }

  const handleSubmit = async () => {
    if (!gender) {
      toast.error("Chọn giới tính.")
      return
    }
    if (workLocations.length < 1) {
      toast.error("Chọn ít nhất một khu vực làm việc.")
      return
    }

    const servicesPayload = buildServicesPayload()
    if (!servicesPayload) return

    const profilePayload = buildProfilePayload()

    try {
      await updateProfileMutation.mutateAsync(profilePayload)
      await upsertServicesMutation.mutateAsync({ services: servicesPayload })
      toast.success("Đã lưu hồ sơ và dịch vụ.")
      const id = userId ?? meQuery.data?.data?.user?.id
      if (id) router.push(`/worker/${id}`)
      else router.push("/")
    } catch (e) {
      toast.error(getErrorMessage(e, "Không thể lưu. Vui lòng thử lại."))
    }
  }

  const isLoadingPage =
    !token ||
    meQuery.isLoading ||
    catalogQuery.isLoading ||
    mineQuery.isLoading

  const isSaving =
    updateProfileMutation.isPending || upsertServicesMutation.isPending

  const renderServiceRow = (service: ServiceItem) => {
    const checked = selectedPricing.has(service.id)
    const pricing = normalizeWorkerPricingSlots(
      selectedPricing.get(service.id) ?? [],
    )

    return (
      <div
        key={service.id}
        className="rounded-lg border border-border p-3 space-y-3"
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => {
              setSelectedPricing((prev) => {
                const next = new Map(prev)
                const on = v === true
                if (on) {
                  if (!next.has(service.id)) next.set(service.id, [])
                } else {
                  next.delete(service.id)
                }
                return next
              })
            }}
            aria-label={serviceService.getName(service.name)}
          />
          <span className="text-sm font-medium leading-snug pt-0.5">
            {serviceService.getName(service.name)}
          </span>
        </div>

        {checked ? (
          <div className="space-y-2 pl-7 border-l-2 border-muted ml-1">
            <p className="text-xs text-muted-foreground">
              Nhập giá (VND) cho ít nhất một đơn vị.
            </p>
            {WORKER_SETUP_PRICING_SLOT_ORDER.map((unit) => (
              <div
                key={unit}
                className="grid grid-cols-[100px_1fr_auto] items-center gap-2"
              >
                <Label className="text-xs text-muted-foreground">
                  {UNIT_VI[unit]}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="1000"
                  placeholder="Giá"
                  value={
                    priceForUnit(pricing, unit) ?? ""
                  }
                  onChange={(e) =>
                    setPriceForUnit(service.id, unit, e.target.value)
                  }
                />
                <span className="text-xs text-muted-foreground shrink-0">
                  đ
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Thiết lập hồ sơ worker
          </h1>
          <p className="text-sm text-muted-foreground">
            Điền thông tin cá nhân, ảnh và dịch vụ bạn cung cấp.
          </p>
        </div>

        {catalogQuery.isError ? (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Không tải được danh mục dịch vụ</AlertTitle>
            <AlertDescription>Vui lòng tải lại trang.</AlertDescription>
          </Alert>
        ) : null}

        {isLoadingPage ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="size-5" />
                  Thông tin cá nhân
                </CardTitle>
                <CardDescription>
                  Khu vực làm việc (tối đa {WORK_LOCATIONS_MAX}), giới tính bắt buộc.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Khu vực làm việc</Label>
                  <div className="flex flex-wrap gap-2">
                    {workLocations.map((w) => (
                      <Badge
                        key={w.ward_code}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {w.label_snapshot ??
                          `${w.province_code} · ${w.ward_code}`}
                        <button
                          type="button"
                          className="rounded-full p-0.5 hover:bg-muted"
                          aria-label="Xóa"
                          onClick={() => removeWorkLocation(w.ward_code)}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Thêm khu vực
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-2" align="start">
                      <Input
                        placeholder="Tìm phường / xã..."
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="mb-2"
                      />
                      <ScrollArea className="h-48 rounded-md border">
                        <div className="p-1">
                          {locationLoading ? (
                            <div className="flex justify-center py-6">
                              <Loader2 className="size-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : locationOptions.length === 0 ? (
                            <p className="p-3 text-xs text-muted-foreground">
                              Nhập từ khóa để tìm.
                            </p>
                          ) : (
                            locationOptions.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                                onClick={() => addWorkLocation(opt)}
                              >
                                {opt.label}
                              </button>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <Separator />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Ngày sinh</Label>
                    <DatePicker
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                      placeholder="Chọn ngày"
                      toDate={new Date()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Giới tính</Label>
                    <Select
                      value={gender}
                      onValueChange={(v) => setGender(v as WorkerGender)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MALE">Nam</SelectItem>
                        <SelectItem value="FEMALE">Nữ</SelectItem>
                        <SelectItem value="OTHER">Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Kinh nghiệm</Label>
                    <Select
                      value={experience || undefined}
                      onValueChange={(v) =>
                        setExperience(v as WorkerExperience)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn (tuỳ chọn)" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPERIENCE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chiều cao (cm)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cân nặng (kg)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cung hoàng đạo</Label>
                    <Select
                      value={starSign || undefined}
                      onValueChange={setStarSign}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn (tuỳ chọn)" />
                      </SelectTrigger>
                      <SelectContent>
                        {STAR_SIGNS.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tên nghề / chức danh</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Lối sống</Label>
                    <Input
                      value={lifestyle}
                      onChange={(e) => setLifestyle(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Quote</Label>
                  <Input value={quote} onChange={(e) => setQuote(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Sở thích</Label>
                  <div className="flex flex-wrap gap-2 rounded-md border p-2">
                    {hobbies.map((h) => (
                      <Badge key={h} variant="outline" className="gap-1 pr-1">
                        {h}
                        <button
                          type="button"
                          className="rounded-full p-0.5 hover:bg-muted"
                          aria-label={`Xóa ${h}`}
                          onClick={() =>
                            setHobbies((prev) => prev.filter((x) => x !== h))
                          }
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                    <Input
                      className="min-w-[140px] flex-1 border-0 shadow-none focus-visible:ring-0"
                      placeholder="Thêm rồi Enter"
                      value={hobbyDraft}
                      onChange={(e) => setHobbyDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addHobby()
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Giới thiệu</Label>
                  <Textarea
                    rows={5}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Thư viện ảnh</CardTitle>
                <CardDescription>
                  Tối đa {MAX_GALLERY} ảnh, mỗi ảnh tối đa 5MB (JPG/PNG/WebP).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  size="sm"
                  disabled={
                    galleryUrls.length >= MAX_GALLERY || galleryUploading
                  }
                  onClick={() => galleryInputRef.current?.click()}
                  className="gap-2"
                >
                  {galleryUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="size-4" />
                  )}
                  Tải ảnh
                </Button>
                {galleryUrls.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {galleryUrls.map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        className="group relative aspect-square overflow-hidden rounded-lg border"
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
                          className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Xóa ảnh"
                          onClick={() =>
                            setGalleryUrls((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <WalletCards className="size-5" />
                  Dịch vụ &amp; giá
                </CardTitle>
                <CardDescription>
                  Chọn dịch vụ và nhập giá theo giờ / ngày / tháng (VND).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Trợ lý &amp; hỗ trợ</h3>
                  <div className="space-y-3">
                    {assistanceList.map((s) => renderServiceRow(s))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Đồng hành</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {companionshipSplit.base
                      ? renderServiceRow(companionshipSplit.base)
                      : null}
                    {companionshipSplit.levels.map((s) =>
                      renderServiceRow(s),
                    )}
                  </div>
                  {!companionshipSplit.base &&
                  companionshipSplit.levels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Không có dịch vụ đồng hành trong danh mục.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={isSaving}
                className="min-w-[140px]"
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Hoàn tất
              </Button>
            </div>
          </>
        )}
      </div>
    </SiteLayout>
  )
}
