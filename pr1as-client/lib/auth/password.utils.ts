export type PasswordRule = {
  key: string
  test: (value: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  { key: "minLength", test: (value) => value.length >= 8 },
  { key: "uppercase", test: (value) => /[A-Z]/.test(value) },
  { key: "lowercase", test: (value) => /[a-z]/.test(value) },
  { key: "number", test: (value) => /[0-9]/.test(value) },
  { key: "special", test: (value) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value) },
]

export const isPasswordStrong = (value: string): boolean =>
  passwordRules.every((rule) => rule.test(value))
