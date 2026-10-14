import { useHornStore } from '@/stores/hornStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from '@/stores/toastStore'

let audio: AudioContext | null = null
export function prepareHornAudio(): void {
  if (!audio) audio = new AudioContext()
  if (audio.state === 'suspended') void audio.resume().catch(() => {})
}
/** Sonido en la salida de audio de Windows y orden USB si está conectado. */
export async function signalHorn(): Promise<void> {
  if (useSettingsStore.getState().get('horn.sound', 'true') === 'true') {
    try {
      prepareHornAudio()
      if (audio) {
        await audio.resume()
        const oscillator = audio.createOscillator(), gain = audio.createGain()
        oscillator.type = 'square'; oscillator.frequency.value = 440
        gain.gain.setValueAtTime(0, audio.currentTime)
        gain.gain.linearRampToValueAtTime(0.12, audio.currentTime + 0.03)
        gain.gain.setValueAtTime(0.12, audio.currentTime + 0.9)
        gain.gain.linearRampToValueAtTime(0, audio.currentTime + 1)
        oscillator.connect(gain); gain.connect(audio.destination)
        oscillator.start(); oscillator.stop(audio.currentTime + 1.05)
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
      }
    } catch (error) { toast.error(error) }
  }
  if (useHornStore.getState().connected) await useHornStore.getState().send()
}
