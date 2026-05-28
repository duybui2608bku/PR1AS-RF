import { Check, X } from "lucide-react"

import { FieldDescription } from "@/components/ui/field"
import { passwordRules } from "@/lib/auth/password.utils"
import { cn } from "@/lib/utils"

type PasswordStrengthChecklistProps = {
  password: string
  title?: string
  className?: string
}

export function PasswordStrengthChecklist({
  password,
  title = "Yêu cầu mật khẩu",
  className,
}: PasswordStrengthChecklistProps) {
  return (
    <div className={cn("rounded-lg border bg-muted/30 p-3", className)}>
      <FieldDescription className="mb-2 font-medium text-foreground">
        {title}
      </FieldDescription>
      <ul className="grid grid-cols-1 gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        {passwordRules.map((rule) => {
          const isMet = rule.test(password)

          return (
            <li key={rule.label} className="flex items-center gap-2">
              {isMet ? (
                <Check className="size-4 text-primary" aria-hidden="true" />
              ) : (
                <X className="size-4" aria-hidden="true" />
              )}
              <span>
                <span className="sr-only">
                  {isMet ? "Đã đạt: " : "Chưa đạt: "}
                </span>
                {rule.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
