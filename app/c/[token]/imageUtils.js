'use client'

/** Kompres foto bukti sebelum dikirim/disimpan: sisi terpanjang 800px, JPEG
 *  kualitas 0.7. Kamera HP menghasilkan 3-8 MB per foto; server menolak di atas
 *  6 MB dan kuota Storage cepat habis kalau aslinya diunggah. Kalau apa pun
 *  gagal, file aslinya dikembalikan -- lebih baik besar daripada tidak ada. */
export function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 800
        let { width, height } = img
        if (width > height && width > MAX) {
          height *= MAX / width
          width = MAX
        } else if (height > MAX) {
          width *= MAX / height
          height = MAX
        }
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(width)
        canvas.height = Math.round(height)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) =>
            resolve(
              blob
                ? new File([blob], file.name || 'bukti.jpg', {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  })
                : file
            ),
          'image/jpeg',
          0.7
        )
      }
      img.onerror = () => resolve(file)
      img.src = event.target.result
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** Jalur cadangan kalau Cache API tidak tersedia: bukti disimpan sebagai data
 *  URL di dalam entri antrean, lalu dijadikan File lagi saat sinkronisasi. */
export function dataUrlToFile(dataUrl, name) {
  const [header, base64] = String(dataUrl).split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], name || 'bukti.jpg', { type: mime, lastModified: Date.now() })
}
