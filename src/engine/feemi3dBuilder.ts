import * as THREE from 'three';
import { CharacterBlueprint } from '../types/project';
import { CharacterPoseAngles } from './characterPhysics';

export interface CharacterRigJoints {
  bodyGroup: THREE.Group;
  torsoPivot: THREE.Group;
  headPivot: THREE.Group;
  leftEyeGroup: THREE.Group;
  rightEyeGroup: THREE.Group;
  leftShoulderPivot: THREE.Group;
  leftElbowPivot: THREE.Group;
  rightShoulderPivot: THREE.Group;
  rightElbowPivot: THREE.Group;
  leftHipPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  leftAnklePivot: THREE.Group;
  rightHipPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  rightAnklePivot: THREE.Group;
  tailPivot: THREE.Group | null;
  capePivot: THREE.Group | null;
}

export interface BuiltCharacterRig {
  root: THREE.Group;
  joints: CharacterRigJoints;
  dispose: () => void;
}

export interface StageEnvironmentHandle {
  group: THREE.Group;
  contactShadow: THREE.Mesh;
  dispose: () => void;
}

function createProceduralGroundTexture(accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#182436';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle tile / stone grid with soft tonal variation
  for (let y = 0; y < 512; y += 64) {
    for (let x = 0; x < 512; x += 64) {
      const shade = ((x + y) / 64) % 2 === 0 ? '#1d2b40' : '#162132';
      ctx.fillStyle = shade;
      ctx.fillRect(x + 2, y + 2, 60, 60);
    }
  }

  // Subtle coordinate accent lines
  ctx.strokeStyle = accentHex;
  ctx.globalAlpha = 0.14;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(2, 6, 15, 0.72)');
  grad.addColorStop(0.55, 'rgba(2, 6, 15, 0.35)');
  grad.addColorStop(1, 'rgba(2, 6, 15, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createMicroBumpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const v = 112 + ((x * 17 + y * 31) % 36);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/**
 * Builds an articulated 3D character (head, facial features, torso, arms, hands, legs, shoes,
 * plus optional cat ears/tail, knight helmet/cape, or ranger visor/jetpack).
 * Grounded bottom-center pivot: feet soles touch y = 0 cleanly.
 */
export function createDetailedCharacterRig(
  blueprint: CharacterBlueprint
): BuiltCharacterRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const bumpMap = createMicroBumpTexture();
  textures.push(bumpMap);

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.skinOrFurColor,
      roughness: 0.72,
      metalness: 0.04,
      bumpMap,
      bumpScale: 0.008,
    })
  );

  const secondarySkinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.secondaryFurOrAccent,
      roughness: 0.76,
      metalness: 0.02,
      bumpMap,
      bumpScale: 0.006,
    })
  );

  const outfitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.outfitColor,
      roughness: 0.82,
      metalness: 0.08,
      bumpMap,
      bumpScale: 0.012,
    })
  );

  const trimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.outfitSecondaryColor,
      roughness: 0.35,
      metalness: 0.68,
    })
  );

  const hairHelmetMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.hairOrHelmetColor,
      roughness: blueprint.hasEars === 'helmet' || blueprint.hasEars === 'visor' ? 0.22 : 0.65,
      metalness: blueprint.hasEars === 'helmet' || blueprint.hasEars === 'visor' ? 0.78 : 0.08,
    })
  );

  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.shoeColor,
      roughness: 0.42,
      metalness: 0.18,
    })
  );

  const soleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      roughness: 0.85,
      metalness: 0.02,
    })
  );

  const scleraMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.15,
      metalness: 0.05,
    })
  );

  const irisMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: blueprint.eyeColor,
      roughness: 0.14,
      metalness: 0.1,
    })
  );

  const darkFeatureMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.3,
      metalness: 0.1,
    })
  );

  const pinkAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#fb7185',
      roughness: 0.55,
      metalness: 0.05,
    })
  );

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  bodyGroup.scale.set(1, blueprint.scaleY, 1);
  root.add(bodyGroup);

  // =========================================================================
  // 1. TORSO & PELVIS (Lathe sculpted silhouette + chest emblem + belt)
  // =========================================================================
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.8, 0);
  bodyGroup.add(torsoPivot);

  const pelvisMesh = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.205, 18, 14)),
    outfitMat
  );
  pelvisMesh.scale.set(1.08, 0.68, 0.85);
  pelvisMesh.position.y = 0.02;
  pelvisMesh.castShadow = true;
  torsoPivot.add(pelvisMesh);

  // Sculpted organic torso via LatheGeometry
  const torsoProfile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.19, 0.04),
    new THREE.Vector2(0.175, 0.18),
    new THREE.Vector2(0.23, 0.38),
    new THREE.Vector2(0.22, 0.49),
    new THREE.Vector2(0.11, 0.54),
    new THREE.Vector2(0.0, 0.55),
  ];
  const torsoMesh = new THREE.Mesh(
    trackGeo(new THREE.LatheGeometry(torsoProfile, 22)),
    outfitMat
  );
  torsoMesh.scale.set(1.06, 1.0, 0.82);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  torsoPivot.add(torsoMesh);

  // Chest patch / Armor breastplate
  const chestPlate = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.175, 16, 14)),
    blueprint.archetype === 'cat_tom' ? secondarySkinMat : trimMat
  );
  chestPlate.scale.set(0.95, 1.25, 0.42);
  chestPlate.position.set(0, 0.29, 0.13);
  chestPlate.castShadow = true;
  torsoPivot.add(chestPlate);

  // Waist belt + metallic buckle
  const beltMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.195, 0.198, 0.065, 22)),
    darkFeatureMat
  );
  beltMesh.scale.set(1.06, 1, 0.84);
  beltMesh.position.y = 0.07;
  beltMesh.castShadow = true;
  torsoPivot.add(beltMesh);

  const buckleMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.11, 0.08, 0.04)),
    trimMat
  );
  buckleMesh.position.set(0, 0.07, 0.165);
  torsoPivot.add(buckleMesh);

  // Collar / Shoulder pauldrons
  const collarRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.115, 0.028, 10, 20)),
    trimMat
  );
  collarRing.rotation.x = Math.PI / 2;
  collarRing.position.set(0, 0.525, 0);
  torsoPivot.add(collarRing);

  // =========================================================================
  // 2. NECK & DETAILED HEAD WITH FACIAL FEATURES
  // =========================================================================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, 0);
  headPivot.scale.setScalar(blueprint.headScale);
  torsoPivot.add(headPivot);

  const neckMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.075, 0.09, 0.11, 14)),
    skinMat
  );
  neckMesh.position.y = 0.04;
  headPivot.add(neckMesh);

  const headCenter = new THREE.Group();
  headCenter.position.set(0, 0.27, 0);
  headPivot.add(headCenter);

  const cranium = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.24, 24, 20)),
    skinMat
  );
  cranium.scale.set(1.05, 0.98, 0.98);
  cranium.castShadow = true;
  cranium.receiveShadow = true;
  headCenter.add(cranium);

  // Facial muzzle / cheeks
  if (blueprint.archetype === 'cat_tom') {
    // Cream cat cheeks / muzzle puffs
    const muzzleLeft = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.088, 14, 12)),
      secondarySkinMat
    );
    muzzleLeft.position.set(-0.062, -0.055, 0.2);
    muzzleLeft.scale.set(1.05, 0.82, 0.82);
    headCenter.add(muzzleLeft);

    const muzzleRight = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.088, 14, 12)),
      secondarySkinMat
    );
    muzzleRight.position.set(0.062, -0.055, 0.2);
    muzzleRight.scale.set(1.05, 0.82, 0.82);
    headCenter.add(muzzleRight);

    const chinMesh = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.07, 12, 10)),
      secondarySkinMat
    );
    chinMesh.position.set(0, -0.115, 0.17);
    headCenter.add(chinMesh);

    // Triangular pink cat nose
    const catNose = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.036, 0.042, 3)),
      pinkAccentMat
    );
    catNose.rotation.x = Math.PI * 0.55;
    catNose.rotation.z = Math.PI;
    catNose.position.set(0, -0.015, 0.265);
    headCenter.add(catNose);

    // Whiskers (3 per side)
    const whiskerGeo = trackGeo(new THREE.CylinderGeometry(0.004, 0.003, 0.18, 6));
    for (const side of [-1, 1]) {
      for (let w = -1; w <= 1; w++) {
        const whisker = new THREE.Mesh(whiskerGeo, darkFeatureMat);
        whisker.rotation.z = Math.PI / 2 + side * w * 0.14;
        whisker.rotation.y = side * -0.2;
        whisker.position.set(side * 0.17, -0.048 + w * 0.022, 0.21);
        headCenter.add(whisker);
      }
    }
  } else {
    // Sculpted nose & warm cheeks for hero characters
    const nose = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(0.028, 0.058, 10)),
      skinMat
    );
    nose.rotation.x = Math.PI * 0.42;
    nose.position.set(0, -0.02, 0.245);
    headCenter.add(nose);

    const cheekGeo = trackGeo(new THREE.SphereGeometry(0.038, 10, 10));
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(cheekGeo, pinkAccentMat);
      cheek.scale.set(1.2, 0.7, 0.4);
      cheek.position.set(side * 0.115, -0.05, 0.205);
      headCenter.add(cheek);
    }
  }

  // Smiling mouth arc
  const smileArc = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.055, 0.011, 8, 16, Math.PI * 0.75)),
    darkFeatureMat
  );
  smileArc.rotation.z = Math.PI * 1.12;
  smileArc.position.set(0, -0.088, 0.228);
  headCenter.add(smileArc);

  // Expressive Multi-Part Eyes (Sclera + Colored Iris + Pupil + Specular Catchlight + Eyebrow)
  const buildEye = (side: -1 | 1): THREE.Group => {
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(side * 0.086, 0.055, 0.205);
    eyeGroup.rotation.y = side * 0.18;

    const sclera = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.048, 14, 12)),
      scleraMat
    );
    sclera.scale.set(0.92, 1.16, 0.55);
    eyeGroup.add(sclera);

    const iris = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.032, 12, 10)),
      irisMat
    );
    iris.scale.set(0.95, 1.1, 0.45);
    iris.position.set(-side * 0.004, 0, 0.018);
    eyeGroup.add(iris);

    const pupil = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.018, 10, 10)),
      darkFeatureMat
    );
    pupil.scale.set(0.9, 1.05, 0.45);
    pupil.position.set(-side * 0.004, 0, 0.025);
    eyeGroup.add(pupil);

    const glint = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.008, 8, 8)),
      scleraMat
    );
    glint.position.set(0.011, 0.014, 0.03);
    eyeGroup.add(glint);

    const brow = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.012, 0.055, 4, 8)),
      blueprint.hasEars === 'cat' ? darkFeatureMat : hairHelmetMat
    );
    brow.rotation.z = Math.PI / 2 - side * 0.12;
    brow.position.set(0, 0.072, 0.012);
    eyeGroup.add(brow);

    headCenter.add(eyeGroup);
    return eyeGroup;
  };

  const leftEyeGroup = buildEye(-1);
  const rightEyeGroup = buildEye(1);

  // Ears, Hair, Helmet, or Space Visor
  if (blueprint.hasEars === 'cat') {
    for (const side of [-1, 1]) {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.155, 0.21, -0.01);
      earGroup.rotation.z = -side * 0.34;
      earGroup.rotation.x = 0.1;

      const outerEar = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.085, 0.18, 4)),
        skinMat
      );
      outerEar.rotation.y = Math.PI / 4;
      outerEar.castShadow = true;
      earGroup.add(outerEar);

      const innerEar = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.05, 0.12, 4)),
        pinkAccentMat
      );
      innerEar.rotation.y = Math.PI / 4;
      innerEar.position.set(0, -0.01, 0.026);
      earGroup.add(innerEar);

      headCenter.add(earGroup);
    }
  } else {
    // Human ears
    const humanEarGeo = trackGeo(new THREE.SphereGeometry(0.045, 10, 10));
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(humanEarGeo, skinMat);
      ear.scale.set(0.55, 1.05, 0.75);
      ear.position.set(side * 0.245, 0, 0);
      headCenter.add(ear);
    }

    if (blueprint.hasEars === 'helmet') {
      const dome = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.265, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.56)),
        hairHelmetMat
      );
      dome.position.y = 0.02;
      dome.castShadow = true;
      headCenter.add(dome);

      const crest = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.055, 0.14, 0.34)),
        trimMat
      );
      crest.position.set(0, 0.26, -0.02);
      crest.castShadow = true;
      headCenter.add(crest);
    } else if (blueprint.hasEars === 'visor') {
      const helmetShell = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.27, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.62)),
        hairHelmetMat
      );
      helmetShell.position.y = 0.015;
      helmetShell.castShadow = true;
      headCenter.add(helmetShell);

      const visorMat = trackMat(
        new THREE.MeshPhysicalMaterial({
          color: blueprint.outfitSecondaryColor,
          roughness: 0.1,
          metalness: 0.2,
          clearcoat: 1.0,
          transparent: true,
          opacity: 0.42,
        })
      );
      const visor = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.258, 20, 14, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.24, Math.PI * 0.36)),
        visorMat
      );
      visor.rotation.y = Math.PI / 2;
      headCenter.add(visor);
    } else {
      // Stylized layered hero hair cap + front tufts
      const hairCap = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.255, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56)),
        hairHelmetMat
      );
      hairCap.rotation.x = -0.22;
      hairCap.position.set(0, 0.02, -0.02);
      hairCap.castShadow = true;
      headCenter.add(hairCap);

      for (let t = -1; t <= 1; t++) {
        const tuft = new THREE.Mesh(
          trackGeo(new THREE.ConeGeometry(0.055, 0.14, 8)),
          hairHelmetMat
        );
        tuft.position.set(t * 0.075, 0.21, 0.13);
        tuft.rotation.x = 0.72;
        tuft.rotation.z = -t * 0.25;
        headCenter.add(tuft);
      }
    }
  }

  // =========================================================================
  // 3. ARTICULATED ARMS (Shoulder + Upper Arm + Elbow + Forearm + Hand)
  // =========================================================================
  const buildArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.28, 0.45, 0);
    torsoPivot.add(shoulderPivot);

    const shoulderCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.078, 12, 12)),
      outfitMat
    );
    shoulderCap.castShadow = true;
    shoulderPivot.add(shoulderCap);

    const upperArm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.055, 0.17, 6, 12)),
      outfitMat
    );
    upperArm.position.y = -0.13;
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.25, 0);
    shoulderPivot.add(elbowPivot);

    const elbowJoint = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.05, 10, 10)),
      skinMat
    );
    elbowPivot.add(elbowJoint);

    const forearm = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.048, 0.16, 6, 12)),
      skinMat
    );
    forearm.position.y = -0.11;
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    const cuff = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.054, 0.054, 0.04, 12)),
      trimMat
    );
    cuff.position.y = -0.19;
    elbowPivot.add(cuff);

    // Detailed hand / paw with thumb
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.25, 0);
    elbowPivot.add(handGroup);

    const palm = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.064, 12, 10)),
      blueprint.archetype === 'cat_tom' ? secondarySkinMat : skinMat
    );
    palm.scale.set(0.9, 1.05, 0.72);
    palm.castShadow = true;
    handGroup.add(palm);

    const thumb = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.018, 0.032, 4, 8)),
      blueprint.archetype === 'cat_tom' ? secondarySkinMat : skinMat
    );
    thumb.position.set(-side * 0.052, 0.01, 0.025);
    thumb.rotation.z = side * 0.65;
    handGroup.add(thumb);

    return { shoulderPivot, elbowPivot };
  };

  const leftArm = buildArm(-1);
  const rightArm = buildArm(1);

  // =========================================================================
  // 4. ARTICULATED LEGS & DETAILED SHOES / PAWS (Grounded at y = 0)
  // =========================================================================
  const buildLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.115, 0.78, 0);
    bodyGroup.add(hipPivot);

    const thigh = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.072, 0.22, 6, 12)),
      outfitMat
    );
    thigh.position.y = -0.16;
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.33, 0);
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.062, 10, 10)),
      trimMat
    );
    kneePivot.add(kneeCap);

    const shin = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.062, 0.22, 6, 12)),
      blueprint.archetype === 'cat_tom' ? skinMat : outfitMat
    );
    shin.position.y = -0.16;
    shin.castShadow = true;
    kneePivot.add(shin);

    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.33, 0);
    kneePivot.add(anklePivot);

    // Boot / Shoe / Paw sitting cleanly so bottom sole rests at y = 0 in rest pose
    // Rest hip is 0.78, knee is -0.33 (0.45), ankle is -0.33 (0.12) -> shoe bottom at -0.12 relative to ankle
    const shoeUpper = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.072, 0.11, 6, 12)),
      shoeMat
    );
    shoeUpper.rotation.x = Math.PI / 2;
    shoeUpper.position.set(0, -0.045, 0.055);
    shoeUpper.scale.set(1.05, 1.0, 0.85);
    shoeUpper.castShadow = true;
    anklePivot.add(shoeUpper);

    const shoeSole = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.155, 0.036, 0.25)),
      soleMat
    );
    shoeSole.position.set(0, -0.102, 0.055);
    shoeSole.castShadow = true;
    anklePivot.add(shoeSole);

    return { hipPivot, kneePivot, anklePivot };
  };

  const leftLeg = buildLeg(-1);
  const rightLeg = buildLeg(1);

  // =========================================================================
  // 5. TAIL / CAPE / JETPACK ACCESSORIES
  // =========================================================================
  let tailPivot: THREE.Group | null = null;
  let capePivot: THREE.Group | null = null;

  if (blueprint.hasTail) {
    tailPivot = new THREE.Group();
    tailPivot.position.set(0, 0.06, -0.17);
    torsoPivot.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.08, -0.18),
      new THREE.Vector3(0, 0.28, -0.32),
      new THREE.Vector3(0, 0.48, -0.24),
    ]);
    const tailMesh = new THREE.Mesh(
      trackGeo(new THREE.TubeGeometry(tailCurve, 18, 0.036, 8, false)),
      skinMat
    );
    tailMesh.castShadow = true;
    tailPivot.add(tailMesh);

    const tailTip = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.042, 10, 10)),
      secondarySkinMat
    );
    tailTip.position.set(0, 0.48, -0.24);
    tailPivot.add(tailTip);
  }

  if (blueprint.hasCapeOrPack === 'cape') {
    capePivot = new THREE.Group();
    capePivot.position.set(0, 0.49, -0.16);
    torsoPivot.add(capePivot);

    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.18, 0);
    capeShape.lineTo(0.18, 0);
    capeShape.lineTo(0.28, -0.74);
    capeShape.lineTo(-0.28, -0.74);
    capeShape.closePath();

    const capeGeo = trackGeo(
      new THREE.ExtrudeGeometry(capeShape, {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.008,
        bevelSegments: 2,
      })
    );
    const capeMesh = new THREE.Mesh(capeGeo, trimMat);
    capeMesh.castShadow = true;
    capePivot.add(capeMesh);
  } else if (blueprint.hasCapeOrPack === 'jetpack') {
    const packGroup = new THREE.Group();
    packGroup.position.set(0, 0.3, -0.21);
    torsoPivot.add(packGroup);

    for (const side of [-1, 1]) {
      const tank = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.065, 0.065, 0.28, 12)),
        hairHelmetMat
      );
      tank.position.set(side * 0.085, 0, 0);
      tank.castShadow = true;
      packGroup.add(tank);

      const nozzle = new THREE.Mesh(
        trackGeo(new THREE.ConeGeometry(0.045, 0.08, 10)),
        trimMat
      );
      nozzle.position.set(side * 0.085, -0.16, 0);
      packGroup.add(nozzle);
    }
  }

  return {
    root,
    joints: {
      bodyGroup,
      torsoPivot,
      headPivot,
      leftEyeGroup,
      rightEyeGroup,
      leftShoulderPivot: leftArm.shoulderPivot,
      leftElbowPivot: leftArm.elbowPivot,
      rightShoulderPivot: rightArm.shoulderPivot,
      rightElbowPivot: rightArm.elbowPivot,
      leftHipPivot: leftLeg.hipPivot,
      leftKneePivot: leftLeg.kneePivot,
      leftAnklePivot: leftLeg.anklePivot,
      rightHipPivot: rightLeg.hipPivot,
      rightKneePivot: rightLeg.kneePivot,
      rightAnklePivot: rightLeg.anklePivot,
      tailPivot,
      capePivot,
    },
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}

export function applyPoseToCharacterRig(
  rig: BuiltCharacterRig,
  pose: CharacterPoseAngles,
  squashY: number
) {
  const { joints } = rig;
  const invXZ = 1 / Math.sqrt(Math.max(0.5, squashY));
  joints.bodyGroup.scale.set(invXZ, squashY, invXZ);

  joints.torsoPivot.position.y = 0.8 + pose.torsoBobY;
  joints.torsoPivot.rotation.x = pose.torsoLeanX;
  joints.torsoPivot.rotation.y = pose.torsoTwistY;

  joints.headPivot.rotation.x = pose.headPitchX;
  joints.headPivot.rotation.y = pose.headYawY;

  joints.leftEyeGroup.scale.y = pose.eyeScaleY;
  joints.rightEyeGroup.scale.y = pose.eyeScaleY;

  joints.leftShoulderPivot.rotation.x = pose.leftShoulderX;
  joints.leftShoulderPivot.rotation.z = pose.leftShoulderZ;
  joints.leftElbowPivot.rotation.x = pose.leftElbowX;

  joints.rightShoulderPivot.rotation.x = pose.rightShoulderX;
  joints.rightShoulderPivot.rotation.z = pose.rightShoulderZ;
  joints.rightElbowPivot.rotation.x = pose.rightElbowX;

  joints.leftHipPivot.rotation.x = pose.leftHipX;
  joints.leftKneePivot.rotation.x = pose.leftKneeX;
  joints.leftAnklePivot.rotation.x = pose.leftAnkleX;

  joints.rightHipPivot.rotation.x = pose.rightHipX;
  joints.rightKneePivot.rotation.x = pose.rightKneeX;
  joints.rightAnklePivot.rotation.x = pose.rightAnkleX;

  if (joints.tailPivot) {
    joints.tailPivot.rotation.y = pose.tailWaveY;
    joints.tailPivot.rotation.x = pose.tailWaveX;
  }
  if (joints.capePivot) {
    joints.capePivot.rotation.x = pose.capePitchX;
  }
}

export function createStageEnvironment(
  accentHex: string,
  primaryHex: string,
  maxAnisotropy: number
): StageEnvironmentHandle {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const groundTex = createProceduralGroundTexture(accentHex);
  groundTex.anisotropy = maxAnisotropy;
  textures.push(groundTex);

  // Extended grounded outdoor stage floor
  const floorGeo = new THREE.CircleGeometry(44, 48);
  geometries.push(floorGeo);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTex,
    roughness: 0.88,
    metalness: 0.08,
  });
  materials.push(floorMat);
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Hero stage ring platform (offset >= 0.02 on Y to prevent Z-fighting)
  const stageRingGeo = new THREE.CylinderGeometry(5.6, 5.9, 0.04, 48);
  geometries.push(stageRingGeo);
  const stageRingMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.6,
    metalness: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(stageRingMat);
  const stageRing = new THREE.Mesh(stageRingGeo, stageRingMat);
  stageRing.position.y = -0.02;
  stageRing.receiveShadow = true;
  group.add(stageRing);

  const rimGeo = new THREE.TorusGeometry(5.6, 0.055, 10, 64);
  geometries.push(rimGeo);
  const rimMat = new THREE.MeshStandardMaterial({
    color: primaryHex,
    emissive: primaryHex,
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.7,
  });
  materials.push(rimMat);
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.02;
  group.add(rimMesh);

  // Natural perimeter instanced boulders & stylized landmark pillars
  const rockGeo = new THREE.DodecahedronGeometry(0.9, 0);
  geometries.push(rockGeo);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.05,
  });
  materials.push(rockMat);

  const rockCount = 28;
  const rockInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  const dummy = new THREE.Object3D();
  const rockColor = new THREE.Color();
  for (let i = 0; i < rockCount; i++) {
    const angle = (i / rockCount) * Math.PI * 2 + (i % 3) * 0.08;
    const radius = 10.5 + (i % 4) * 2.4;
    const scale = 0.85 + ((i * 7) % 10) * 0.07;
    dummy.position.set(
      Math.cos(angle) * radius,
      scale * 0.45,
      Math.sin(angle) * radius
    );
    dummy.rotation.set((i % 5) * 0.3, angle, (i % 3) * 0.2);
    dummy.scale.set(scale * 1.2, scale * 0.9, scale);
    dummy.updateMatrix();
    rockInst.setMatrixAt(i, dummy.matrix);
    rockColor.set(i % 2 === 0 ? '#273549' : '#1e293b');
    rockInst.setColorAt(i, rockColor);
  }
  rockInst.instanceMatrix.needsUpdate = true;
  if (rockInst.instanceColor) rockInst.instanceColor.needsUpdate = true;
  rockInst.computeBoundingSphere();
  rockInst.receiveShadow = true;
  group.add(rockInst);

  // Soft radial contact shadow directly beneath the actor
  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowGeo = new THREE.CircleGeometry(0.62, 24);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  materials.push(shadowMat);
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.025;
  group.add(contactShadow);

  return {
    group,
    contactShadow,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
