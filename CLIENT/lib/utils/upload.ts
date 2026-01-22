import { UploadErrorCode } from "../constants/error-codes";

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
  try {
    const formData = new FormData();
    formData.append(UploadFormField.Images, file);
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
  } catch (error) {
    throw error;
  }
}

export async function uploadMultipleImages(
  files: File[],
  server: string = UploadConfig.DEFAULT_SERVER
): Promise<string[]> {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(UploadFormField.Images, file);
    });
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
  } catch (error) {
    throw error;
  }
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
