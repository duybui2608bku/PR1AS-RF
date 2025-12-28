import { getTranslationSync } from "./i18n-helper";

const UPLOAD_API_URL = "https://cfig.ibytecdn.org/upload";
const DEFAULT_SERVER = "server_1";

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
  server: string = DEFAULT_SERVER
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("images[]", file);
    formData.append("server", server);

    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data: UploadImageResponse | UploadImageError = await response.json();

    if (!data.success) {
      throw new Error(
        (data as UploadImageError).message || "Upload failed"
      );
    }

    const uploadData = data as UploadImageResponse;

    if (
      !uploadData.results ||
      uploadData.results.length === 0 ||
      !uploadData.results[0].success
    ) {
      throw new Error("Upload failed: No image URL returned");
    }

    return uploadData.results[0].url;
  } catch (error) {
    throw error;
  }
}

export async function uploadMultipleImages(
  files: File[],
  server: string = DEFAULT_SERVER
): Promise<string[]> {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images[]", file);
    });
    formData.append("server", server);

    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data: UploadImageResponse | UploadImageError = await response.json();

    if (!data.success) {
      throw new Error(
        (data as UploadImageError).message || "Upload failed"
      );
    }

    const uploadData = data as UploadImageResponse;

    if (!uploadData.results || uploadData.results.length === 0) {
      throw new Error("Upload failed: No images uploaded");
    }

    return uploadData.results
      .filter((result) => result.success)
      .map((result) => result.url);
  } catch (error) {
    throw error;
  }
}

