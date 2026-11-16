/**
 * Build animation frame input from a v3 project + optional settings overrides.
 * Applies normalizeAnimation so legacy colorEffect: field migrates like the editor.
 */
import { normalizeAnimation } from '../../project-validation.js';

export function mergeAnimationSettings(data, settings = {}) {
  let anim = { ...(data.animation || {}), ...settings };
  if (settings.motionEffect !== undefined) {
    anim.effect = settings.motionEffect;
  }
  if (settings.colorEffect !== undefined) {
    anim.colorEffect = settings.colorEffect;
  }
  if (settings.backgroundEffect !== undefined) {
    anim.backgroundEffect = settings.backgroundEffect;
  }
  if (settings.motion !== undefined && settings.motionEffect === undefined) {
    anim.effect = settings.motion;
  }
  return normalizeAnimation(anim);
}

export function buildAnimationSource(data, anim) {
  const cellCount = data.columns * data.rows;
  const colors = {
    ink: data.colors?.ink ?? 14,
    background: data.colors?.background ?? 0,
  };
  return {
    W: data.columns,
    H: data.rows,
    machine: data.machine,
    grid: data.grid.slice(),
    inks: (data.cellColors || Array(cellCount).fill(colors.ink)).slice(),
    base: (data.replayBase || Array(cellCount).fill('')).slice(),
    baseColors: (data.replayBaseColors || Array(cellCount).fill(colors.ink)).slice(),
    events: (data.replayEvents || []).map((e) => e.slice()),
    eventColors: (data.replayEventColors || []).slice(),
    colors,
    effect: anim.effect ?? 'none',
    colorEffect: anim.colorEffect ?? 'none',
    backgroundEffect: anim.backgroundEffect ?? 'none',
    seconds: anim.seconds ?? 2,
    scale: anim.scale ?? 1,
    background: anim.background ?? 'dark',
    motionCycles: anim.motionCycles ?? 1,
    colorCycles: anim.colorCycles ?? 1,
    backgroundCycles: anim.backgroundCycles ?? 1,
    cameraDistance: anim.cameraDistance ?? 4,
    cameraOrbit: anim.cameraOrbit ?? 0,
    cameraElevation: anim.cameraElevation ?? 0,
    cameraMotion: anim.cameraMotion ?? 0,
    scrollDirection: anim.scrollDirection ?? 'left',
    waveDirection: anim.waveDirection ?? 'up',
    waveShape: anim.waveShape ?? 'sine',
    waveAmplitude: anim.waveAmplitude ?? 100,
    waveLength: anim.waveLength ?? 50,
    colorWaveDirection: anim.colorWaveDirection ?? 'up-left',
    colorWaveShape: anim.colorWaveShape ?? 'sawtooth',
    colorWaveAmplitude: anim.colorWaveAmplitude ?? 100,
    colorWaveLength: anim.colorWaveLength ?? 50,
    fieldWaveDirection: anim.fieldWaveDirection,
    fieldWaveShape: anim.fieldWaveShape,
    fieldWaveAmplitude: anim.fieldWaveAmplitude,
    fieldWaveLength: anim.fieldWaveLength,
    fieldBrightness: anim.fieldBrightness ?? 100,
    wipePattern: anim.wipePattern ?? 'diagonal',
    depthTravel: anim.depthTravel ?? 'toward',
    depthWaveShape: anim.depthWaveShape ?? 'sawtooth',
    fieldRamp: anim.fieldRamp ?? 'cycle',
    fieldDirection: anim.fieldDirection ?? 'forward',
    fieldLead: anim.fieldLead ?? 1,
    parallaxGroup: anim.parallaxGroup ?? 'ink',
    parallaxSpread: anim.parallaxSpread ?? 1,
    parallaxTravel: anim.parallaxTravel ?? 'same',
  };
}