// Hard cap on client-side orientation work. Past this we upload the original
// file: correct rotation is never worth a stuck upload button on a slow phone.
const ORIENTATION_TIMEOUT_MS = 4000

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ])
}

function readExifOrientation(file: File): Promise<number> {
  // Never rejects/hangs: any parse error (e.g. a RangeError from an EXIF offset
  // that points past the 64 KB slice we read — common in real phone photos)
  // resolves to the neutral orientation (1) so the upload can still proceed.
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => resolve(1)
    reader.onload = (e) => {
      try {
        const view = new DataView(e.target!.result as ArrayBuffer)
        if (view.getUint16(0, false) !== 0xffd8) return resolve(1)
        let offset = 2
        while (offset + 1 < view.byteLength) {
          const marker = view.getUint16(offset, false)
          offset += 2
          if (marker === 0xffe1) {
            if (view.getUint32(offset + 2, false) !== 0x45786966) break
            const little = view.getUint16(offset + 8, false) === 0x4949
            const ifdOffset = offset + 10 + view.getUint32(offset + 12, little)
            // Bail if the IFD lies past the bytes we actually loaded.
            if (ifdOffset + 2 > view.byteLength) break
            const tags = view.getUint16(ifdOffset, little)
            for (let i = 0; i < tags; i++) {
              const entry = ifdOffset + 2 + i * 12
              if (entry + 10 > view.byteLength) break
              if (view.getUint16(entry, little) === 0x0112) {
                return resolve(view.getUint16(entry + 8, little))
              }
            }
            break
          } else if ((marker & 0xff00) !== 0xff00) {
            break
          } else {
            offset += view.getUint16(offset, false)
          }
        }
      } catch {
        // Malformed/truncated EXIF — fall through to the neutral default.
      }
      resolve(1)
    }
    reader.readAsArrayBuffer(file.slice(0, 64 * 1024))
  })
}

async function fixImageOrientationCore(file: File): Promise<File> {
  const orientation = await readExifOrientation(file)
  if (orientation <= 1) return file

  const bitmap = await createImageBitmap(file)
  const { width: bw, height: bh } = bitmap
  const swapped = orientation >= 5
  const canvas = document.createElement("canvas")
  canvas.width = swapped ? bh : bw
  canvas.height = swapped ? bw : bh
  const ctx = canvas.getContext("2d")!
  switch (orientation) {
    case 2: ctx.transform(-1, 0, 0, 1, canvas.width, 0); break
    case 3: ctx.transform(-1, 0, 0, -1, canvas.width, canvas.height); break
    case 4: ctx.transform(1, 0, 0, -1, 0, canvas.height); break
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
    case 6: ctx.transform(0, 1, -1, 0, canvas.height, 0); break
    case 7: ctx.transform(0, -1, -1, 0, canvas.height, canvas.width); break
    case 8: ctx.transform(0, -1, 1, 0, 0, canvas.width); break
  }
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()

  return new Promise<File>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file),
      "image/jpeg",
      0.92,
    )
  })
}

// Best-effort: correct EXIF rotation when we can, but ALWAYS return a usable
// File. Any decode failure or a slow device (timeout) falls back to the
// original bytes so the upload can never stall on this step.
async function fixImageOrientation(file: File): Promise<File> {
  if (!file.type.startsWith("image/jpeg")) return file
  try {
    return await withTimeout(fixImageOrientationCore(file), ORIENTATION_TIMEOUT_MS, file)
  } catch {
    return file
  }
}

export enum UploadErrorCode {
    REQUEST_FAILED = "UPLOAD_REQUEST_FAILED",
    RESPONSE_INVALID = "UPLOAD_RESPONSE_INVALID",
    RESULT_EMPTY = "UPLOAD_RESULT_EMPTY",
    RESULT_INVALID = "UPLOAD_RESULT_INVALID",
    MULTIPLE_UPLOAD_EMPTY = "UPLOAD_MULTIPLE_UPLOAD_EMPTY",
  }

enum UploadConfig {
  API_URL = "https://cfig.ibytecdn.org/upload",
  DEFAULT_SERVER = "server_1",
}

enum UploadFormField {
  Images = "images[]",
  Server = "server",
}

const EMPTY_RESULTS_LENGTH = 0;
const FIRST_RESULT_INDEX = 0;

const IMAGE_EXTENSION_PATTERN = "\\.(jpg|jpeg|png|gif|webp|bmp|svg)(\\?.*)?$";
const IMAGE_EXTENSION_FLAGS = "i";

const IMAGE_HOST_KEYWORDS = ["ibytecdn.org", "cdn", "imgur", "imgbb"] as const;

export interface UploadImageResponse {
  success: boolean;
  results: Array<{
    success: boolean;
    filename: string;
    url: string;
    server: string;
  }>;
}

export interface UploadImageError {
  success: false;
  message?: string;
}

export async function uploadImage(
  file: File,
  server: string = UploadConfig.DEFAULT_SERVER
): Promise<string> {
  const formData = new FormData();
  formData.append(UploadFormField.Images, await fixImageOrientation(file));
  formData.append(UploadFormField.Server, server);

  const response = await fetch(UploadConfig.API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(UploadErrorCode.REQUEST_FAILED);
  }

  const data: UploadImageResponse | UploadImageError = await response.json();

  if (!data.success) {
    throw new Error(UploadErrorCode.RESPONSE_INVALID);
  }

  const uploadData = data as UploadImageResponse;

  if (
    !uploadData.results ||
    uploadData.results.length === EMPTY_RESULTS_LENGTH ||
    !uploadData.results[FIRST_RESULT_INDEX].success
  ) {
    throw new Error(UploadErrorCode.RESULT_INVALID);
  }

  return uploadData.results[FIRST_RESULT_INDEX].url;
}

export async function uploadMultipleImages(
  files: File[],
  server: string = UploadConfig.DEFAULT_SERVER
): Promise<string[]> {
  const formData = new FormData();
  // Orientation fixes run in parallel — each is independently time-boxed and
  // falls back to the original file, so one slow/odd photo can't stall the lot.
  const prepared = await Promise.all(files.map((file) => fixImageOrientation(file)));
  for (const file of prepared) {
    formData.append(UploadFormField.Images, file);
  }
  formData.append(UploadFormField.Server, server);

  const response = await fetch(UploadConfig.API_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(UploadErrorCode.REQUEST_FAILED);
  }

  const data: UploadImageResponse | UploadImageError = await response.json();

  if (!data.success) {
    throw new Error(UploadErrorCode.RESPONSE_INVALID);
  }

  const uploadData = data as UploadImageResponse;

  if (
    !uploadData.results ||
    uploadData.results.length === EMPTY_RESULTS_LENGTH
  ) {
    throw new Error(UploadErrorCode.MULTIPLE_UPLOAD_EMPTY);
  }

  return uploadData.results
    .filter((result) => result.success)
    .map((result) => result.url);
}

export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    const urlObj = new URL(url);
    const imageExtensionRegex = new RegExp(
      IMAGE_EXTENSION_PATTERN,
      IMAGE_EXTENSION_FLAGS
    );
    if (imageExtensionRegex.test(urlObj.pathname)) {
      return true;
    }
    const hasImageHostKeyword = IMAGE_HOST_KEYWORDS.some((keyword) =>
      urlObj.hostname.includes(keyword)
    );
    if (hasImageHostKeyword) {
      return true;
    }
  } catch {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return true;
    }
  }
  return false;
}
