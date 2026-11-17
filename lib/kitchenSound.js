// Notifikasi suara untuk layar dapur (KDS). Tidak perlu file audio eksternal:
// bunyi "ketok" disintesis langsung dengan Web Audio API, jadi tidak ada
// permintaan jaringan dan tidak ada file yang harus di-host.
//
// Fitur ini memanggil play() sebagai reaksi langsung pada interaksi pengguna
// (mis. saat membuka halaman dapur pertama kali) atau setelah izin audio
// diberikan, sehingga browser tidak memblokirnya.

let audioCtx = null

function ensureAudioContext() {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext
    audioCtx = new Ctx()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

/** Mainkan bunyi notifikasi pendek (ketok panjang + pendek). */
export function playKitchenNotification() {
  const ctx = ensureAudioContext()
  if (!ctx) return

  const now = ctx.currentTime

  // Nada tinggi pendek sebagai penanda pesanan baru.
  const playTone = (frequency, startTime, duration, type = 'square') => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.15, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  playTone(880, now, 0.12)
  playTone(1046, now + 0.14, 0.12)
  playTone(1318, now + 0.28, 0.18)
}

/** Mainkan bunyi konfirmasi pendek saat pesanan ditandai selesai. */
export function playKitchenDone() {
  const ctx = ensureAudioContext()
  if (!ctx) return

  const now = ctx.currentTime
  const playTone = (frequency, startTime, duration) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, startTime)
    gain.gain.setValueAtTime(0.12, startTime)
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(startTime)
    osc.stop(startTime + duration)
  }

  playTone(659, now, 0.1)
  playTone(784, now + 0.1, 0.1)
  playTone(1046, now + 0.2, 0.15)
}
