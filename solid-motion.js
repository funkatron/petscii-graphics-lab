// Sample the nearest opaque surface once per destination cell. Empty texture
// cells show background; glyphs remain whole and unscaled.
export const SOLID_EFFECTS = ['rotating-cube', 'spinning-globe', 'rolling-drum'];

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

export function solidMotionFrame(phase, source) {
  const normalized = wrap01(phase);
  const angle = normalized * 2 * Math.PI;

  let yaw = angle;
  if (source.effect === 'rolling-drum') {
    yaw = 0.35;
  }
  let tilt;
  if (source.effect === 'rotating-cube') {
    tilt = 0.45 + 0.3 * Math.sin(angle);
  } else if (source.effect === 'rolling-drum') {
    tilt = angle;
  } else {
    tilt = 0.25;
  }

  const cosYaw = Math.cos(yaw);
  const sinYaw = Math.sin(yaw);
  const cosTilt = Math.cos(tilt);
  const sinTilt = Math.sin(tilt);

  const toLocal = ([x, y, z]) => {
    const yy = cosTilt * y + sinTilt * z;
    const zz = -sinTilt * y + cosTilt * z;
    return [
      cosYaw * x - sinYaw * zz,
      yy,
      sinYaw * x + cosYaw * zz,
    ];
  };

  const cameraOrbits = source.cameraMotion === 1 || source.cameraMotion === 3;
  const cameraDollies = source.cameraMotion === 2 || source.cameraMotion === 3;
  const orbitRadians = (source.cameraOrbit ?? 0) * Math.PI / 180 - (cameraOrbits ? angle : 0);
  const elevationRadians = (source.cameraElevation ?? 0) * Math.PI / 180;
  const cosOrbit = Math.cos(orbitRadians);
  const sinOrbit = Math.sin(orbitRadians);
  const cosElevation = Math.cos(elevationRadians);
  const sinElevation = Math.sin(elevationRadians);

  const cameraLocal = (x, y, z) => {
    const forward = y * sinElevation + z * cosElevation;
    return toLocal([
      x * cosOrbit + forward * sinOrbit,
      y * cosElevation - z * sinElevation,
      forward * cosOrbit - x * sinOrbit,
    ]);
  };

  const startDistance = source.cameraDistance ?? 4;
  const pullbackDistance = startDistance === 2.5 ? 4 : 2.5;
  let cameraDistance = startDistance;
  if (cameraDollies) {
    cameraDistance = startDistance
      + (pullbackDistance - startDistance) * (1 - Math.cos(angle)) / 2;
  }

  const rayOrigin = cameraLocal(0, 0, -cameraDistance);
  const gridScale = Math.max(1, Math.min(source.W, source.H));
  const cells = Array(source.W * source.H).fill('');
  const inks = source.inks.slice();

  for (let y = 0; y < source.H; y++) {
    for (let x = 0; x < source.W; x++) {
      const direction = cameraLocal(
        (2 * x + 1 - source.W) / gridScale * 0.55,
        (2 * y + 1 - source.H) / gridScale * 0.55,
        1,
      );

      let hitDistance = Infinity;
      let hitAxis = -1;

      if (source.effect === 'rotating-cube') {
        let near = -Infinity;
        let far = Infinity;
        for (let axis = 0; axis < 3; axis++) {
          if (Math.abs(direction[axis]) < 1e-12) {
            if (Math.abs(rayOrigin[axis]) > 1) {
              far = -Infinity;
              break;
            }
            continue;
          }
          const tLow = (-1 - rayOrigin[axis]) / direction[axis];
          const tHigh = (1 - rayOrigin[axis]) / direction[axis];
          const enter = Math.min(tLow, tHigh);
          const exit = Math.max(tLow, tHigh);
          if (enter > near) {
            near = enter;
            hitAxis = axis;
          }
          far = Math.min(far, exit);
        }
        if (near > 0 && near <= far) {
          hitDistance = near;
        }
      } else {
        const axes = source.effect === 'spinning-globe' ? [0, 1, 2] : [1, 2];
        const quadA = axes.reduce((sum, axis) => sum + direction[axis] * direction[axis], 0);
        const quadB = 2 * axes.reduce((sum, axis) => sum + rayOrigin[axis] * direction[axis], 0);
        const quadC = axes.reduce((sum, axis) => sum + rayOrigin[axis] * rayOrigin[axis], -1);
        const discriminant = quadB * quadB - 4 * quadA * quadC;
        if (quadA > 1e-12 && discriminant >= 0) {
          const t = (-quadB - Math.sqrt(discriminant)) / (2 * quadA);
          if (t > 0 && (source.effect === 'spinning-globe' || Math.abs(rayOrigin[0] + t * direction[0]) <= 1)) {
            hitDistance = t;
          }
        }
        if (source.effect === 'rolling-drum' && Math.abs(direction[0]) > 1e-12) {
          for (const cap of [-1, 1]) {
            const t = (cap - rayOrigin[0]) / direction[0];
            const yy = rayOrigin[1] + t * direction[1];
            const zz = rayOrigin[2] + t * direction[2];
            if (t > 0 && t < hitDistance && yy * yy + zz * zz <= 1) {
              hitDistance = t;
              hitAxis = 0;
            }
          }
        }
      }

      if (!Number.isFinite(hitDistance)) {
        continue;
      }

      const hit = rayOrigin.map((component, axis) => component + hitDistance * direction[axis]);
      let u;
      let v;
      if (source.effect === 'rotating-cube') {
        const faceSign = hit[hitAxis] > 0 ? 1 : -1;
        if (hitAxis === 0) {
          u = (1 - faceSign * hit[2]) / 2;
          v = (hit[1] + 1) / 2;
        } else if (hitAxis === 1) {
          u = (hit[0] + 1) / 2;
          v = (1 - faceSign * hit[2]) / 2;
        } else {
          u = (1 + faceSign * hit[0]) / 2;
          v = (hit[1] + 1) / 2;
        }
      } else if (source.effect === 'spinning-globe') {
        u = wrap01(Math.atan2(hit[0], -hit[2]) / (2 * Math.PI) + 0.5);
        v = Math.acos(Math.max(-1, Math.min(1, -hit[1]))) / Math.PI;
      } else if (hitAxis === 0) {
        u = (hit[2] + 1) / 2;
        v = (hit[1] + 1) / 2;
      } else {
        u = (hit[0] + 1) / 2;
        v = wrap01(Math.atan2(hit[1], -hit[2]) / (2 * Math.PI) + 0.5);
      }

      const tx = Math.max(0, Math.min(source.W - 1, Math.floor(u * source.W)));
      const ty = Math.max(0, Math.min(source.H - 1, Math.floor(v * source.H)));
      const src = ty * source.W + tx;
      const dst = y * source.W + x;
      cells[dst] = source.grid[src];
      inks[dst] = source.inks[src];
    }
  }
  return {cells, inks};
}
