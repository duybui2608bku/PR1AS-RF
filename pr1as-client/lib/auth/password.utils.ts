export type PasswordRule = {
  label: string
  test: (value: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  { label: "Ít nhất 8 ký tự", test: (value) => value.length >= 8 },
  { label: "Có chữ hoa", test: (value) => /[A-Z]/.test(value) },
  { label: "Có chữ thường", test: (value) => /[a-z]/.test(value) },
  { label: "Có số", test: (value) => /[0-9]/.test(value) },
  {
    label: "Có ký tự đặc biệt",
    test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value),
  },
]

export const isPasswordStrong = (value: string): boolean =>
  passwordRules.every((rule) => rule.test(value))
