export interface CharacterPhysicsState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  facingYaw: number;
  grounded: boolean;
  jumpsUsed: number;
  maxJumps: number;
  stridePhase: number;
  idlePhase: number;
  squashY: number;
  squashVelY: number;
  waveTimer: number;
  blinkTimer: number;
  isBlinking: boolean;
}

export interface CharacterInputState {
  moveX: number;
  moveZ: number;
  jumpPressed: boolean;
  wavePressed: boolean;
  autoDemoWalk: boolean;
}

export interface CharacterPhysicsConfig {
  speed: number;
  gravity: number;
  arenaRadius: number;
}

export interface CharacterPoseAngles {
  torsoBobY: number;
  torsoLeanX: number;
  torsoTwistY: number;
  headPitchX: number;
  headYawY: number;
  eyeScaleY: number;
  leftShoulderX: number;
  leftShoulderZ: number;
  leftElbowX: number;
  rightShoulderX: number;
  rightShoulderZ: number;
  rightElbowX: number;
  leftHipX: number;
  leftKneeX: number;
  leftAnkleX: number;
  rightHipX: number;
  rightKneeX: number;
  rightAnkleX: number;
  tailWaveY: number;
  tailWaveX: number;
  capePitchX: number;
}

export function createInitialPhysicsState(
  offsetX = 0,
  offsetZ = 0,
  facingYaw = 0
): CharacterPhysicsState {
  return {
    x: offsetX,
    y: 0,
    z: offsetZ,
    vx: 0,
    vy: 0,
    vz: 0,
    facingYaw,
    grounded: true,
    jumpsUsed: 0,
    maxJumps: 2,
    stridePhase: 0,
    idlePhase: Math.abs(offsetX) * 0.7,
    squashY: 1,
    squashVelY: 0,
    waveTimer: 0,
    blinkTimer: 2.0 + (Math.abs(offsetX) % 1.4),
    isBlinking: false,
  };
}

/**
 * Computes smooth non-overlapping movement vectors for secondary/companion 3D characters
 * sharing the same game arena with the primary hero.
 */
export function computeCompanionMovement(
  self: CharacterPhysicsState,
  leader: CharacterPhysicsState,
  companionIndex: number,
  autoDemoWalk: boolean
): { moveX: number; moveZ: number } {
  const angleOffset = (companionIndex % 2 === 1 ? -1 : 1) * (2.15 + Math.floor((companionIndex - 1) / 2) * 0.65);
  const orbitRadius = 1.75 + Math.floor((companionIndex - 1) / 2) * 0.85;
  const targetAngle = leader.facingYaw + Math.PI + angleOffset * 0.55;
  const desiredX = leader.x + Math.sin(targetAngle) * orbitRadius;
  const desiredZ = leader.z + Math.cos(targetAngle) * orbitRadius;

  let dx = desiredX - self.x;
  let dz = desiredZ - self.z;

  // Separation force to prevent overlapping with leader
  const sepX = self.x - leader.x;
  const sepZ = self.z - leader.z;
  const leaderDist = Math.hypot(sepX, sepZ);
  if (leaderDist > 0.001 && leaderDist < 1.35) {
    const push = (1.35 - leaderDist) * 2.2;
    dx += (sepX / leaderDist) * push;
    dz += (sepZ / leaderDist) * push;
  }

  const dist = Math.hypot(dx, dz);
  if (!autoDemoWalk && dist < 0.35) {
    return { moveX: 0, moveZ: 0 };
  }
  if (dist < 0.2) {
    return { moveX: 0, moveZ: 0 };
  }
  const strength = Math.min(0.85, dist * 0.55);
  return {
    moveX: (dx / dist) * strength,
    moveZ: (dz / dist) * strength,
  };
}

function normalizeAngleDelta(from: number, to: number): number {
  let diff = (to - from + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

/**
 * Pure deterministic 3D character physics & gravity step (frame-rate independent).
 */
export function stepCharacterPhysics(
  prev: CharacterPhysicsState,
  input: CharacterInputState,
  config: CharacterPhysicsConfig,
  rawDt: number
): CharacterPhysicsState {
  const dt = Math.min(Math.max(rawDt, 0), 0.05);
  if (dt <= 0) return prev;

  const next: CharacterPhysicsState = { ...prev };

  // Convert UI speed (140..620) and gravity (500..1900) into realistic meters/sec^2
  const moveSpeedMps = Math.max(2.2, Math.min(9.5, config.speed / 72));
  const gravityMps2 = Math.max(9.8, Math.min(34, config.gravity / 52));
  const jumpVelocity = Math.sqrt(2 * gravityMps2 * 1.45);

  let dirX = input.moveX;
  let dirZ = input.moveZ;

  // Optional smooth figure-8 autonomous showcase walk when enabled and user isn't pressing keys
  if (input.autoDemoWalk && Math.abs(dirX) < 0.05 && Math.abs(dirZ) < 0.05) {
    const orbitAngle = prev.idlePhase * 0.65;
    const targetX = Math.sin(orbitAngle) * 2.2;
    const targetZ = Math.cos(orbitAngle * 0.5) * 1.4;
    const dx = targetX - prev.x;
    const dz = targetZ - prev.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      dirX = (dx / dist) * 0.62;
      dirZ = (dz / dist) * 0.62;
    }
  }

  const mag = Math.hypot(dirX, dirZ);
  if (mag > 1) {
    dirX /= mag;
    dirZ /= mag;
  }

  const targetVx = dirX * moveSpeedMps;
  const targetVz = dirZ * moveSpeedMps;

  // Exponential velocity damping for weighty, responsive inertia
  const accelFactor = 1 - Math.exp(-(prev.grounded ? 12 : 6) * dt);
  next.vx = prev.vx + (targetVx - prev.vx) * accelFactor;
  next.vz = prev.vz + (targetVz - prev.vz) * accelFactor;

  if (Math.abs(next.vx) < 0.01) next.vx = 0;
  if (Math.abs(next.vz) < 0.01) next.vz = 0;

  // Jump impulse & double-jump
  if (input.jumpPressed && prev.jumpsUsed < prev.maxJumps) {
    next.vy = prev.jumpsUsed === 0 ? jumpVelocity : jumpVelocity * 0.88;
    next.grounded = false;
    next.jumpsUsed = prev.jumpsUsed + 1;
    next.squashY = 1.18;
    next.squashVelY = 0;
  }

  // Wave gesture trigger
  if (input.wavePressed) {
    next.waveTimer = 1.35;
  } else if (prev.waveTimer > 0) {
    next.waveTimer = Math.max(0, prev.waveTimer - dt);
  }

  // Gravity & vertical integration
  next.vy -= gravityMps2 * dt;
  next.x += next.vx * dt;
  next.y += next.vy * dt;
  next.z += next.vz * dt;

  // Circular arena boundary containment
  const radialDist = Math.hypot(next.x, next.z);
  if (radialDist > config.arenaRadius) {
    const scale = config.arenaRadius / radialDist;
    next.x *= scale;
    next.z *= scale;
  }

  // Ground contact & realistic landing squash spring
  if (next.y <= 0) {
    if (!prev.grounded && prev.vy < -2.5) {
      const impact = Math.min(0.24, Math.abs(prev.vy) * 0.022);
      next.squashY = 1 - impact;
      next.squashVelY = impact * 6;
    }
    next.y = 0;
    next.vy = 0;
    next.grounded = true;
    next.jumpsUsed = 0;
  } else {
    next.grounded = false;
  }

  // Second-order spring recovery for squash & stretch
  const springForce = (1 - next.squashY) * 140;
  const dampingForce = -next.squashVelY * 14;
  next.squashVelY += (springForce + dampingForce) * dt;
  next.squashY = Math.max(0.75, Math.min(1.28, next.squashY + next.squashVelY * dt));

  // Smooth facing direction toward movement vector
  const planarSpeed = Math.hypot(next.vx, next.vz);
  if (planarSpeed > 0.2) {
    const targetYaw = Math.atan2(next.vx, next.vz);
    const yawDelta = normalizeAngleDelta(prev.facingYaw, targetYaw);
    const turnAlpha = 1 - Math.exp(-12 * dt);
    next.facingYaw = prev.facingYaw + yawDelta * turnAlpha;
  }

  // Gait phase advances proportionally to ground speed
  next.idlePhase = prev.idlePhase + dt;
  if (next.grounded && planarSpeed > 0.15) {
    next.stridePhase = prev.stridePhase + planarSpeed * dt * 2.3;
  } else {
    // Relax stride back toward neutral when airborne or standing
    next.stridePhase = prev.stridePhase + dt * 1.2;
  }

  // Natural blinking cycle
  next.blinkTimer = prev.blinkTimer - dt;
  if (next.blinkTimer <= 0) {
    next.isBlinking = !prev.isBlinking;
    next.blinkTimer = next.isBlinking ? 0.12 : 2.2 + ((Math.sin(next.idlePhase * 7.3) + 1) * 1.1);
  }

  return next;
}

/**
 * Computes articulated 3D skeletal joint rotations from the current physics state.
 */
export function computeCharacterPose(state: CharacterPhysicsState): CharacterPoseAngles {
  const speed = Math.hypot(state.vx, state.vz);
  const moveBlend = Math.min(1, speed / 3.4);
  const s = state.stridePhase;
  const idle = state.idlePhase;

  const legSwing = Math.sin(s) * 0.78 * moveBlend;
  const oppositeLegSwing = -legSwing;

  // Knee bends naturally on backward/lift phase
  const leftKnee = state.grounded
    ? Math.max(0, -Math.cos(s) * 0.65 * moveBlend) + 0.06
    : 0.55;
  const rightKnee = state.grounded
    ? Math.max(0, Math.cos(s) * 0.65 * moveBlend) + 0.06
    : 0.35;

  const leftHip = state.grounded ? legSwing : 0.42;
  const rightHip = state.grounded ? oppositeLegSwing : -0.28;

  // Counter-swinging arms
  const armBase = state.grounded
    ? Math.sin(s) * 0.68 * moveBlend
    : -0.55;

  let rightShoulderX = state.grounded ? armBase : -0.65;
  let rightShoulderZ = -0.14;
  let rightElbowX = -0.25 - Math.max(0, -armBase) * 0.35;

  if (state.waveTimer > 0) {
    rightShoulderX = -0.25;
    rightShoulderZ = -2.35 + Math.sin(state.waveTimer * 14) * 0.35;
    rightElbowX = -0.65 + Math.sin(state.waveTimer * 14) * 0.25;
  }

  const leftShoulderX = state.grounded ? -armBase : -0.5;
  const leftShoulderZ = 0.14;
  const leftElbowX = -0.25 - Math.max(0, armBase) * 0.35;

  const torsoBobY = state.grounded
    ? Math.abs(Math.sin(s)) * 0.055 * moveBlend + Math.sin(idle * 2.4) * 0.014 * (1 - moveBlend)
    : 0;

  return {
    torsoBobY,
    torsoLeanX: moveBlend * 0.16 + (state.grounded ? 0 : Math.max(-0.18, Math.min(0.18, -state.vy * 0.025))),
    torsoTwistY: Math.sin(s) * 0.11 * moveBlend,
    headPitchX: Math.sin(idle * 1.9) * 0.03 - moveBlend * 0.06,
    headYawY: state.waveTimer > 0 ? Math.sin(state.waveTimer * 5) * 0.16 : Math.sin(idle * 0.9) * 0.08 * (1 - moveBlend),
    eyeScaleY: state.isBlinking ? 0.12 : 1,
    leftShoulderX,
    leftShoulderZ,
    leftElbowX,
    rightShoulderX,
    rightShoulderZ,
    rightElbowX,
    leftHipX: leftHip,
    leftKneeX: leftKnee,
    leftAnkleX: -leftKnee * 0.35,
    rightHipX: rightHip,
    rightKneeX: rightKnee,
    rightAnkleX: -rightKnee * 0.35,
    tailWaveY: Math.sin(idle * 3.8 + s * 0.6) * (0.35 + moveBlend * 0.25),
    tailWaveX: 0.35 + Math.cos(idle * 2.5) * 0.12 + moveBlend * 0.22,
    capePitchX: 0.12 + moveBlend * 0.45 + (state.grounded ? 0 : 0.25),
  };
}
