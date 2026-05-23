import type { Area } from "react-easy-crop"

export interface FlipState {
  horizontal: boolean
  vertical: boolean
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener("load", () => resolve(img))
    img.addEventListener("error", reject)
    img.setAttribute("crossOrigin", "anonymous")
    img.src = url
  })
}

function degToRad(deg: number) {
  return (deg * Math.PI) / 180
}

export async function getCroppedFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation: number = 0,
  flip: FlipState = { horizontal: false, vertical: false },
  originalFile: File,
): Promise<File> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  const maxSize = Math.max(image.width, image.height)
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2))

  canvas.width = safeArea
  canvas.height = safeArea

  ctx.translate(safeArea / 2, safeArea / 2)
  ctx.rotate(degToRad(rotation))
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
  ctx.translate(-image.width / 2, -image.height / 2)
  ctx.drawImage(image, 0, 0)

  const data = ctx.getImageData(
    pixelCrop.x + safeArea / 2 - image.width / 2,
    pixelCrop.y + safeArea / 2 - image.height / 2,
    pixelCrop.width,
    pixelCrop.height,
  )

  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  ctx.putImageData(data, 0, 0)

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Canvas toBlob failed"))
      resolve(new File([blob], originalFile.name, { type: "image/jpeg" }))
    }, "image/jpeg", 0.92)
  })
}
