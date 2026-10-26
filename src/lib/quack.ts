// A tiny synthesized quack: two nasal blips (sawtooth through a bandpass,
// pitch falling). No audio file, and it only ever plays from a click, so
// the site makes no sound unless someone asks for it.

let audio: AudioContext | null = null

export function quack() {
  try {
    audio ??= new AudioContext()
    const t = audio.currentTime
    const blips: [number, number][] = [
      [0, 0.12],
      [0.16, 0.15],
    ]
    for (const [start, length] of blips) {
      const osc = audio.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(560, t + start)
      osc.frequency.exponentialRampToValueAtTime(280, t + start + length)

      const nasal = audio.createBiquadFilter()
      nasal.type = 'bandpass'
      nasal.frequency.value = 1150
      nasal.Q.value = 2.5

      const gain = audio.createGain()
      gain.gain.setValueAtTime(0.0001, t + start)
      gain.gain.exponentialRampToValueAtTime(0.16, t + start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + start + length)

      osc.connect(nasal).connect(gain).connect(audio.destination)
      osc.start(t + start)
      osc.stop(t + start + length + 0.02)
    }
  } catch {
    // no Web Audio: a silent duck is still a duck
  }
}
