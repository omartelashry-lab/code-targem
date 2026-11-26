import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCharacterPose,
  computeCompanionMovement,
  createInitialPhysicsState,
  stepCharacterPhysics,
} from './characterPhysics';

test('character physics applies gravity and lands cleanly on ground with squash spring', () => {
  let state = createInitialPhysicsState();
  const cfg = { speed: 300, gravity: 980, arenaRadius: 8 };

  // Trigger jump
  state = stepCharacterPhysics(
    state,
    { moveX: 0, moveZ: 0, jumpPressed: true, wavePressed: false, autoDemoWalk: false },
    cfg,
    0.016
  );
  assert.equal(state.grounded, false);
  assert.ok(state.vy > 0);
  assert.ok(state.y > 0);

  // Step forward until gravity pulls character back to ground y === 0
  for (let i = 0; i < 120; i++) {
    state = stepCharacterPhysics(
      state,
      { moveX: 0, moveZ: 0, jumpPressed: false, wavePressed: false, autoDemoWalk: false },
      cfg,
      0.016
    );
  }

  assert.equal(state.grounded, true);
  assert.equal(state.y, 0);
  assert.equal(state.jumpsUsed, 0);
});

test('character skeletal pose swings arms and legs smoothly in antiphase when moving', () => {
  let state = createInitialPhysicsState();
  const cfg = { speed: 380, gravity: 980, arenaRadius: 8 };

  for (let i = 0; i < 15; i++) {
    state = stepCharacterPhysics(
      state,
      { moveX: 1, moveZ: 0, jumpPressed: false, wavePressed: false, autoDemoWalk: false },
      cfg,
      0.016
    );
  }

  assert.ok(state.vx > 1);
  const pose = computeCharacterPose(state);
  // Left hip & right hip swing in opposite directions
  assert.ok(pose.leftHipX * pose.rightHipX <= 0);
  // Left shoulder & right shoulder counter-swing opposite each other
  assert.ok(pose.leftShoulderX * pose.rightShoulderX <= 0);
});

test('wave gesture raises right arm and eye blink modulates eyeScaleY', () => {
  let state = createInitialPhysicsState();
  state = stepCharacterPhysics(
    state,
    { moveX: 0, moveZ: 0, jumpPressed: false, wavePressed: true, autoDemoWalk: false },
    { speed: 300, gravity: 980, arenaRadius: 8 },
    0.016
  );
  const pose = computeCharacterPose(state);
  assert.ok(pose.rightShoulderZ < -1.5);
  assert.equal(pose.eyeScaleY, 1);

  state.isBlinking = true;
  const blinkPose = computeCharacterPose(state);
  assert.ok(blinkPose.eyeScaleY < 0.25);
});

test('companion movement maintains separation and follows primary character smoothly', () => {
  const leader = createInitialPhysicsState(0, 0, 0);
  let companion = createInitialPhysicsState(0.2, 0.1, 0);
  for (let i = 0; i < 40; i++) {
    const steer = computeCompanionMovement(companion, leader, 1, true);
    companion = stepCharacterPhysics(
      companion,
      { moveX: steer.moveX, moveZ: steer.moveZ, jumpPressed: false, wavePressed: false, autoDemoWalk: false },
      { speed: 290, gravity: 980, arenaRadius: 4.8 },
      0.03
    );
  }
  const dist = Math.hypot(companion.x - leader.x, companion.z - leader.z);
  assert.ok(dist >= 1.15);
});
