/** Adjective–noun export stems for the Project name field (device-local, not in v3 JSON). */

export const PROJECT_STEM_KEY = 'petscii-project-stem';

/** Sanitize a project file stem (no .json suffix). Returns empty when invalid. */
export function sanitizeProjectStem(raw) {
  const name = String(raw ?? '')
    .trim()
    .replace(/(?:\.json)+$/i, '')
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/[. ]+$/g, '');
  if (!name || /^\.+$/.test(name)) {
    return '';
  }
  return name;
}

export function readStoredProjectStem() {
  try {
    const stem = sanitizeProjectStem(localStorage.getItem(PROJECT_STEM_KEY));
    return stem || null;
  } catch {
    return null;
  }
}

export function writeStoredProjectStem(raw) {
  try {
    const stem = sanitizeProjectStem(raw);
    if (!stem) {
      localStorage.removeItem(PROJECT_STEM_KEY);
      return;
    }
    localStorage.setItem(PROJECT_STEM_KEY, stem);
  } catch {
    // Device storage may be unavailable.
  }
}

export const PROJECT_NAME_ADJECTIVES = [
  'amber', 'azure', 'bright', 'cosmic', 'crimson', 'electric', 'golden', 'gentle',
  'quiet', 'misty', 'neon', 'silver', 'vivid', 'warm', 'wild', 'lunar',
  'ancient', 'bold', 'brisk', 'calm', 'clever', 'coral', 'crisp', 'dapper',
  'daring', 'deep', 'eager', 'emerald', 'fancy', 'frosty', 'happy', 'hidden',
  'icy', 'jolly', 'kindly', 'lucky', 'mellow', 'nimble', 'olive', 'peppy',
  'regal', 'rusty', 'sunny', 'tawny', 'tender', 'trusty', 'velvet', 'zesty',
];

export const PROJECT_NAME_NOUNS = [
  'otter', 'badger', 'comet', 'falcon', 'fern', 'fox', 'gecko', 'heron',
  'lynx', 'moth', 'nebula', 'owl', 'panda', 'raven', 'tiger', 'wren',
  'anchor', 'beacon', 'bison', 'canyon', 'cedar', 'coyote', 'delta', 'finch',
  'harbor', 'island', 'juniper', 'kelp', 'maple', 'meadow', 'monsoon', 'orbit',
  'pelican', 'quartz', 'raptor', 'summit', 'thistle', 'trail', 'valley', 'willow',
  'yarrow', 'zephyr', 'glacier', 'lagoon', 'prairie', 'sparrow', 'tundra', 'violet',
];

const NAME_SPACE = PROJECT_NAME_ADJECTIVES.length * PROJECT_NAME_NOUNS.length;

function pickIndex(length, uint32) {
  return uint32 % length;
}

/**
 * @param {(buf: Uint32Array) => Uint32Array} [getRandomValues]
 */
export function randomProjectFilename(getRandomValues = (buf) => crypto.getRandomValues(buf)) {
  const values = getRandomValues(new Uint32Array(2));
  const adj = PROJECT_NAME_ADJECTIVES[pickIndex(PROJECT_NAME_ADJECTIVES.length, values[0])];
  const noun = PROJECT_NAME_NOUNS[pickIndex(PROJECT_NAME_NOUNS.length, values[1])];
  return `${adj}-${noun}`;
}

/**
 * @param {string} previous
 * @param {(buf: Uint32Array) => Uint32Array} [getRandomValues]
 */
export function regenerateProjectFilename(previous, getRandomValues) {
  const tries = Math.min(16, NAME_SPACE);
  for (let i = 0; i < tries; i++) {
    const next = randomProjectFilename(getRandomValues);
    if (next !== previous) return next;
  }
  const [adj, noun] = previous.split('-');
  const adjIdx = PROJECT_NAME_ADJECTIVES.indexOf(adj);
  const nounIdx = PROJECT_NAME_NOUNS.indexOf(noun);
  if (adjIdx >= 0 && nounIdx >= 0) {
    const nextNoun = PROJECT_NAME_NOUNS[(nounIdx + 1) % PROJECT_NAME_NOUNS.length];
    return `${adj}-${nextNoun}`;
  }
  return randomProjectFilename(getRandomValues);
}

export function projectNameCombinationCount() {
  return NAME_SPACE;
}