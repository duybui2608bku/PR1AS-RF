/**
 * Client-side upload validation utilities.
 * Use these before calling uploadImage / uploadMultipleImages to surface errors
 * early and reduce unnecessary CDN requests.
 */

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
] as const

export const MAX_IMAGE_SIZE_MB = 5
export const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024

/**
 * Validates a single image file for type and size constraints.
 * Returns a human-readable error string, or `null` if the file is valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return `Chỉ hỗ trợ định dạng JPG, PNG, WebP hoặc GIF.`
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Kích thước ảnh tối đa là ${MAX_IMAGE_SIZE_MB}MB.`
  }
  return null
}

/**
 * Filters a list of files to only valid images.
 * Calls `onError(message)` once with a summary if any files are invalid.
 * Returns the list of valid files.
 */
export function filterValidImageFiles(
  files: File[],
  onError: (message: string) => void
): File[] {
  const valid: File[] = []
  const typeErrors: string[] = []
  const sizeErrors: string[] = []

  for (const file of files) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      typeErrors.push(file.name)
    } else if (file.size > MAX_IMAGE_SIZE_BYTES) {
      sizeErrors.push(file.name)
    } else {
      valid.push(file)
    }
  }

  if (typeErrors.length > 0) {
    onError(`${typeErrors.length} file không đúng định dạng (chỉ hỗ trợ JPG, PNG, WebP, GIF).`)
  }
  if (sizeErrors.length > 0) {
    onError(`${sizeErrors.length} file vượt quá ${MAX_IMAGE_SIZE_MB}MB.`)
  }

  return valid
}
