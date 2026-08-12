"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface TermsAgreementProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}

/**
 * Ô "Tôi đồng ý" bắt buộc trước khi tạo tài khoản / nạp tiền / thanh toán.
 * Luôn hiển thị và luôn bắt đầu ở trạng thái chưa tích (state do phía gọi giữ,
 * khởi tạo `false`) — không được ẩn hoặc mặc định tích sẵn.
 */
export const TermsAgreement = ({
  id,
  checked,
  onCheckedChange,
  className,
}: TermsAgreementProps) => {
  const t = useTranslations("Common")

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-2.5 text-sm leading-relaxed text-muted-foreground",
        className
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        className="mt-0.5"
      />
      <span>
        {t.rich("agreeTerms", {
          terms: (chunks) => (
            <Link
              href="/terms"
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              {chunks}
            </Link>
          ),
          liability: (chunks) => (
            <Link
              href="/legal-responsibility"
              target="_blank"
              className="font-medium text-primary hover:underline"
            >
              {chunks}
            </Link>
          ),
        })}
      </span>
    </label>
  )
}
