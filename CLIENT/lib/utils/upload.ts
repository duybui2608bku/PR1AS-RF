/**
 * Upload Image API - Bên thứ 3 (iByteCDN)
 */

import { getTranslationSync } from "./i18n-helper";

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

/**
 * Upload ảnh lên bên thứ 3 (iByteCDN)
 * @param file - File ảnh cần upload
 * @param server - Server name (mặc định: "server_1")
 * @returns Promise với URL của ảnh đã upload
 */
export async function uploadImage(
  file: File,
  server: string = "server_1"
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("images[]", file);
    formData.append("server", server);

    const response = await fetch("https://cfig.ibytecdn.org/upload", {
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
    // Error sẽ được xử lý bởi component gọi hàm này
    throw error;
  }
}

/**
 * Upload nhiều ảnh cùng lúc
 * @param files - Mảng các file ảnh cần upload
 * @param server - Server name (mặc định: "server_1")
 * @returns Promise với mảng các URL của ảnh đã upload
 */
export async function uploadMultipleImages(
  files: File[],
  server: string = "server_1"
): Promise<string[]> {
  try {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images[]", file);
    });
    formData.append("server", server);

    const response = await fetch("https://cfig.ibytecdn.org/upload", {
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

    // Lọc các ảnh upload thành công và trả về URLs
    return uploadData.results
      .filter((result) => result.success)
      .map((result) => result.url);
  } catch (error) {
    // Error sẽ được xử lý bởi component gọi hàm này
    throw error;
  }
}

