import { RECIPE_IMAGE_ASPECT } from './recipeImageConstants'

/**
 * Resize image and return a JPEG data URL for recipe card display.
 * @param {File} file
 * @param {number} maxWidth
 */
export function fileToRecipeImageDataUrl(file, maxWidth = 900) {
  return fileToCanvasDataUrl(file, maxWidth, 0.92, true)
}

/**
 * Local-only crop/enhance fallback when API is unavailable.
 * @param {File} file
 * @param {object} options
 */
async function createRecipeCardImageLocal(file, options = {}) {
  const {
    region = null,
    focalX = 0.5,
    focalY = 0.5,
    targetAspect = RECIPE_IMAGE_ASPECT,
    maxWidth = 2000,
  } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const baseRect = region
          ? {
              x: Math.round(clamp01(region.x) * img.width),
              y: Math.round(clamp01(region.y) * img.height),
              width: Math.max(1, Math.round(clamp01(region.width) * img.width)),
              height: Math.max(1, Math.round(clamp01(region.height) * img.height)),
            }
          : { x: 0, y: 0, width: img.width, height: img.height }

        const bounded = {
          x: Math.max(0, Math.min(img.width - 1, baseRect.x)),
          y: Math.max(0, Math.min(img.height - 1, baseRect.y)),
          width: Math.max(1, Math.min(baseRect.width, img.width - baseRect.x)),
          height: Math.max(1, Math.min(baseRect.height, img.height - baseRect.y)),
        }

        const crop = fitRectToAspectAroundFocal(
          bounded,
          targetAspect,
          clamp01(focalX),
          clamp01(focalY),
        )

        const outW = Math.max(1, Math.min(maxWidth, crop.width))
        const outH = Math.max(1, Math.round(outW / targetAspect))

        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image'))
          return
        }

        ctx.drawImage(
          img,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          outW,
          outH,
        )
        enhanceCanvasImage(ctx, outW, outH)
        resolve(canvas.toDataURL('image/jpeg', 0.97))
      }
      img.onerror = () => reject(new Error('Invalid image file'))
      img.src = reader.result
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Crop a normalized region and return JPEG data URL for recipe card display.
 * Region values are in [0..1] relative to original image dimensions.
 * @param {File} file
 * @param {{ x: number, y: number, width: number, height: number } | null | undefined} region
 * @param {number} maxWidth
 */
export function cropImageFileToRecipeDataUrl(file, region, maxWidth = 900) {
  if (!region) return fileToRecipeImageDataUrl(file, maxWidth)

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const rx = clamp01(region.x)
        const ry = clamp01(region.y)
        const rw = clamp01(region.width)
        const rh = clamp01(region.height)
        if (rw <= 0 || rh <= 0) {
          resolve(fileToRecipeImageDataUrl(file, maxWidth))
          return
        }

        const sx = Math.round(rx * img.width)
        const sy = Math.round(ry * img.height)
        const sw = Math.max(1, Math.round(rw * img.width))
        const sh = Math.max(1, Math.round(rh * img.height))

        const boundedSw = Math.min(sw, img.width - sx)
        const boundedSh = Math.min(sh, img.height - sy)
        if (boundedSw <= 0 || boundedSh <= 0) {
          resolve(fileToRecipeImageDataUrl(file, maxWidth))
          return
        }

        const scale = Math.min(1, maxWidth / boundedSw)
        const w = Math.max(1, Math.round(boundedSw * scale))
        const h = Math.max(1, Math.round(boundedSh * scale))

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image crop'))
          return
        }
        ctx.drawImage(img, sx, sy, boundedSw, boundedSh, 0, 0, w, h)
        enhanceCanvasImage(ctx, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.94))
      }
      img.onerror = () => reject(new Error('Invalid image file'))
      img.src = reader.result
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Prepare a final dish image that fills the recipe placeholder:
 * - centers crop around focal point
 * - enforces placeholder aspect ratio
 * - sharpens / enhances slightly for readability
 *
 * @param {File} file
 * @param {{
 *   region?: { x:number, y:number, width:number, height:number } | null,
 *   focalX?: number,
 *   focalY?: number,
 *   targetAspect?: number,
 *   maxWidth?: number
 * }} [options]
 */
export async function createRecipeCardImageDataUrl(file, options = {}) {
  const region = options.region ?? null
  const isDedicatedFoodPhoto = options.isDedicatedFoodPhoto === true

  // The photo stays authentic: crop the AI-detected food region (or the whole
  // dedicated dish photo) on a canvas — no generative image model involved.
  if (!region && !isDedicatedFoodPhoto) return ''

  return createRecipeCardImageLocal(file, options)
}

/**
 * High-resolution image for vision API (accurate text reading).
 * @param {File} file
 * @param {number} maxWidth
 */
export function fileToVisionApiDataUrl(file, maxWidth = 2400) {
  return fileToCanvasDataUrl(file, maxWidth, 0.92, false)
}

/**
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality
 * @param {boolean} enhance
 */
function fileToCanvasDataUrl(file, maxWidth, quality, enhance = false) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = maxWidth / img.width
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Could not process image'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        if (enhance) {
          enhanceCanvasImage(ctx, w, h)
        }
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Invalid image file'))
      img.src = reader.result
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function fitRectToAspectAroundFocal(rect, targetAspect, focalX, focalY) {
  const rectAspect = rect.width / rect.height
  let cropW = rect.width
  let cropH = rect.height

  if (rectAspect > targetAspect) {
    cropW = Math.round(rect.height * targetAspect)
  } else if (rectAspect < targetAspect) {
    cropH = Math.round(rect.width / targetAspect)
  }

  const focalAbsX = rect.x + Math.round(focalX * rect.width)
  const focalAbsY = rect.y + Math.round(focalY * rect.height)

  let x = focalAbsX - Math.round(cropW / 2)
  let y = focalAbsY - Math.round(cropH / 2)

  const minX = rect.x
  const minY = rect.y
  const maxX = rect.x + rect.width - cropW
  const maxY = rect.y + rect.height - cropH

  x = Math.max(minX, Math.min(maxX, x))
  y = Math.max(minY, Math.min(maxY, y))

  return { x, y, width: cropW, height: cropH }
}

function enhanceCanvasImage(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h)
  const data = img.data

  // Global enhancement: boost contrast/saturation while preserving highlights.
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    // Contrast (around midpoint 128) with gentle highlight rolloff.
    r = (r - 128) * 1.12 + 128
    g = (g - 128) * 1.12 + 128
    b = (b - 128) * 1.12 + 128

    // Slight vibrance boost.
    const gray = (r + g + b) / 3
    r = gray + (r - gray) * 1.1
    g = gray + (g - gray) * 1.1
    b = gray + (b - gray) * 1.1

    data[i] = clamp255(r)
    data[i + 1] = clamp255(g)
    data[i + 2] = clamp255(b)
  }

  // Unsharp mask pass for edge clarity.
  const src = new Uint8ClampedArray(data)
  const amount = 0.55
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = src[idx + c]
        const left = src[idx - 4 + c]
        const right = src[idx + 4 + c]
        const up = src[idx - w * 4 + c]
        const down = src[idx + w * 4 + c]
        const blur = (left + right + up + down + center * 4) / 8
        const sharpened = center + (center - blur) * amount
        data[idx + c] = clamp255(sharpened)
      }
    }
  }

  // Local contrast pass (small-radius high-pass blend).
  const src2 = new Uint8ClampedArray(data)
  const localAmount = 0.18
  for (let y = 2; y < h - 2; y++) {
    for (let x = 2; x < w - 2; x++) {
      const idx = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = src2[idx + c]
        const a = src2[idx - 4 + c]
        const b = src2[idx + 4 + c]
        const d = src2[idx - w * 4 + c]
        const e = src2[idx + w * 4 + c]
        const f = src2[idx - 2 * w * 4 + c]
        const g = src2[idx + 2 * w * 4 + c]
        const avg = (a + b + d + e + f + g + center) / 7
        const boosted = center + (center - avg) * localAmount
        data[idx + c] = clamp255(boosted)
      }
    }
  }

  ctx.putImageData(img, 0, 0)
}

function clamp255(v) {
  return Math.max(0, Math.min(255, Math.round(v)))
}

function clamp01(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}
