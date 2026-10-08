// Original, synthesized forest soundscape: no recordings or external requests.
let context, master, wind, water, birdTimer, scene = 'forest';
let enabled = false;
let moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;
try { enabled = localStorage.getItem('liam-sound') === 'on'; moving = localStorage.getItem('liam-motion') !== 'off' && moving; } catch {}
const emit = () => window.dispatchEvent(new CustomEvent('liam-preferences', {detail: {sound: enabled, motion: moving}}));
const volume = () => scene === 'forest' ? .22 : scene === 'focus' ? .045 : .075;

function noise(seconds, cutoff, gain, type) {
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) { last = (last + .025 * (Math.random() * 2 - 1)) / 1.025; data[i] = last * 6; }
  const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
  const filter = context.createBiquadFilter(); filter.type = type; filter.frequency.value = cutoff;
  const level = context.createGain(); level.gain.value = gain;
  source.connect(filter).connect(level).connect(master); source.start();
  return level;
}
function bird() {
  if (!context || !enabled || document.hidden || scene !== 'forest') return;
  const start = context.currentTime;
  const base = 1700 + Math.random() * 1600;
  for (let i = 0; i < 3; i++) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    const at = start + i * .17;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(base, at);
    oscillator.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * .2), at + .055);
    oscillator.frequency.exponentialRampToValueAtTime(base * .85, at + .12);
    envelope.gain.setValueAtTime(0, at); envelope.gain.linearRampToValueAtTime(.035, at + .015); envelope.gain.exponentialRampToValueAtTime(.0001, at + .13);
    oscillator.connect(envelope).connect(master); oscillator.start(at); oscillator.stop(at + .15);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }
}
async function unlock() {
  if (!enabled) return;
  if (!context) {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) { enabled = false; emit(); return; }
    context = new Audio(); master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    wind = noise(9, 850, .48, 'lowpass'); water = noise(11, 1600, .2, 'highpass');
    const lfo = context.createOscillator(), amount = context.createGain();
    lfo.frequency.value = .13; amount.gain.value = .1; lfo.connect(amount).connect(wind.gain); lfo.start();
    birdTimer = setInterval(bird, 5700);
  }
  await context.resume();
  master.gain.setTargetAtTime(document.hidden || !enabled ? 0 : volume(), context.currentTime, .5);
}
export const ambience = {
  get enabled() { return enabled; },
  get motion() { return moving; },
  async toggle() {
    enabled = !enabled;
    try { localStorage.setItem('liam-sound', enabled ? 'on' : 'off'); } catch {}
    if (enabled) await unlock(); else if (context) master.gain.setTargetAtTime(0, context.currentTime, .12);
    emit();
    return enabled;
  },
  toggleMotion() { moving = !moving; try { localStorage.setItem('liam-motion', moving ? 'on' : 'off'); } catch {} emit(); return moving; },
  async unlock() { try { await unlock(); } catch { enabled = false; emit(); } },
  setScene(next) { scene = next; if (context && enabled) master.gain.setTargetAtTime(volume(), context.currentTime, .5); },
  speak(text) {
    if (!('speechSynthesis' in window)) return false;
    speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(text); voice.lang = 'es-CO'; voice.rate = .88;
    const spanish = speechSynthesis.getVoices().find(v => v.lang.startsWith('es'));
    if (spanish) voice.voice = spanish;
    speechSynthesis.speak(voice); return true;
  },
  stopVoice() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
};
document.addEventListener('visibilitychange', () => {
  if (!context) return;
  if (document.hidden) { context.suspend(); ambience.stopVoice(); }
  else if (enabled) ambience.unlock();
});
window.addEventListener('pagehide', () => { if (context) context.suspend(); clearInterval(birdTimer); });
