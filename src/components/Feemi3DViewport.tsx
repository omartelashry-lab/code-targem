import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ArrowUp, Footprints, Hand, RotateCcw } from 'lucide-react';
import { CharacterBlueprint, FeemiDesignSpec } from '../types/project';
import { detectCharacterBlueprint } from '../engine/feemiEngine';
import {
  CharacterPhysicsState,
  computeCharacterPose,
  computeCompanionMovement,
  createInitialPhysicsState,
  stepCharacterPhysics,
} from '../engine/characterPhysics';
import {
  applyPoseToCharacterRig,
  BuiltCharacterRig,
  createDetailedCharacterRig,
  createStageEnvironment,
  StageEnvironmentHandle,
} from '../engine/feemi3dBuilder';

interface Feemi3DViewportProps {
  spec: FeemiDesignSpec;
  heightClass?: string;
  compactControls?: boolean;
  onSelectCharacter?: (characterId: string) => void;
}

interface ActorHandle {
  id: string;
  blueprint: CharacterBlueprint;
  rig: BuiltCharacterRig;
  shadow: THREE.Mesh;
  physics: CharacterPhysicsState;
}

function getSpawnOffset(index: number): { x: number; z: number } {
  if (index === 0) return { x: 0, z: 0 };
  const side = index % 2 === 1 ? -1 : 1;
  const ring = Math.ceil(index / 2);
  return { x: side * (1.55 * ring), z: -0.9 * ring };
}

function createActorShadow(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.54, 24);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.024;
  return mesh;
}

export function Feemi3DViewport({
  spec,
  heightClass = 'h-[320px]',
  compactControls = false,
  onSelectCharacter,
}: Feemi3DViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [autoWalk, setAutoWalk] = useState(true);

  const roster: CharacterBlueprint[] = useMemo(() => {
    if (spec.characterRoster && spec.characterRoster.length > 0) {
      return spec.characterRoster.map((c, idx) => ({
        ...c,
        id: c.id || `char-${idx + 1}`,
      }));
    }
    const single =
      spec.characterBlueprint ??
      detectCharacterBlueprint(
        spec.sourcePrompt || spec.appName,
        spec.primaryColor,
        spec.accentColor,
        spec.subGenre
      );
    return [{ ...single, id: single.id || 'char-1-hero', role: single.role || 'hero' }];
  }, [spec.characterRoster, spec.characterBlueprint, spec.sourcePrompt, spec.appName, spec.primaryColor, spec.accentColor, spec.subGenre]);

  const activeCharacterId = spec.activeCharacterId || roster[0]?.id || 'char-1-hero';
  const activeBlueprint =
    roster.find((c) => c.id === activeCharacterId) || roster[0];

  // Live mutable refs so React updates never tear down the WebGLRenderer
  const configRef = useRef({
    speed: spec.playerSpeed || 290,
    gravity: spec.gravity || 980,
    autoWalk,
    activeCharacterId,
  });
  configRef.current = {
    speed: spec.playerSpeed || 290,
    gravity: spec.gravity || 980,
    autoWalk,
    activeCharacterId,
  };

  const pendingActionRef = useRef({
    jump: false,
    wave: false,
    reset: false,
  });

  const sceneHandlesRef = useRef<{
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;
    actors: ActorHandle[];
    env: StageEnvironmentHandle | null;
  } | null>(null);

  // Initialize Three.js WebGL stage once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) || '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = Math.max(300, container.clientWidth);
    const height = Math.max(220, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color('#0c1628');
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0x0c1628, 0.032);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(2.5, 2.25, 4.75);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.4;
    controls.maxDistance = 10.5;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 1.05, 0);
    controls.update();

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.72);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.85);
    keyLight.position.set(4.5, 8.5, 5.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 24;
    keyLight.shadow.camera.left = -6.5;
    keyLight.shadow.camera.right = 6.5;
    keyLight.shadow.camera.top = 6.5;
    keyLight.shadow.camera.bottom = -6.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rimLight.position.set(-4.5, 4.2, -5.0);
    scene.add(rimLight);

    const env = createStageEnvironment(
      spec.accentColor,
      spec.primaryColor,
      renderer.capabilities.getMaxAnisotropy()
    );
    env.contactShadow.visible = false;
    scene.add(env.group);

    const actors: ActorHandle[] = roster.map((bp, idx) => {
      const offset = getSpawnOffset(idx);
      const rig = createDetailedCharacterRig(bp);
      const shadow = createActorShadow();
      rig.root.position.set(offset.x, 0, offset.z);
      shadow.position.set(offset.x, 0.024, offset.z);
      scene.add(rig.root);
      scene.add(shadow);
      return {
        id: bp.id || `char-${idx + 1}`,
        blueprint: bp,
        rig,
        shadow,
        physics: createInitialPhysicsState(offset.x, offset.z, 0),
      };
    });

    sceneHandlesRef.current = {
      scene,
      renderer,
      actors,
      env,
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        pendingActionRef.current.jump = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const resizeObserver = new ResizeObserver(() => {
      const w = Math.max(300, container.clientWidth);
      const h = Math.max(220, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync && gl.deleteSync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const handles = sceneHandlesRef.current;
      if (handles && handles.actors.length > 0) {
        if (pendingActionRef.current.reset) {
          handles.actors.forEach((actor, idx) => {
            const offset = getSpawnOffset(idx);
            actor.physics = createInitialPhysicsState(offset.x, offset.z, 0);
          });
          controls.target.set(0, 1.05, 0);
          camera.position.set(2.5, 2.25, 4.75);
          pendingActionRef.current.reset = false;
        }

        const activeIdx = Math.max(
          0,
          handles.actors.findIndex((a) => a.id === configRef.current.activeCharacterId)
        );
        const leader = handles.actors[activeIdx];

        const moveX =
          (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
          (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
        const moveZ =
          (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) -
          (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);

        const jumpRequested = pendingActionRef.current.jump;
        const waveRequested = pendingActionRef.current.wave;
        pendingActionRef.current.jump = false;
        pendingActionRef.current.wave = false;

        // 1. Step active / primary controlled character
        leader.physics = stepCharacterPhysics(
          leader.physics,
          {
            moveX,
            moveZ,
            jumpPressed: jumpRequested,
            wavePressed: waveRequested,
            autoDemoWalk: configRef.current.autoWalk,
          },
          {
            speed: configRef.current.speed,
            gravity: configRef.current.gravity,
            arenaRadius: 4.8,
          },
          dt
        );

        // 2. Step companion characters sharing the same game arena
        let companionRank = 1;
        handles.actors.forEach((actor, idx) => {
          if (idx !== activeIdx) {
            const steer = computeCompanionMovement(
              actor.physics,
              leader.physics,
              companionRank++,
              configRef.current.autoWalk
            );
            actor.physics = stepCharacterPhysics(
              actor.physics,
              {
                moveX: steer.moveX,
                moveZ: steer.moveZ,
                jumpPressed: jumpRequested,
                wavePressed: waveRequested,
                autoDemoWalk: false,
              },
              {
                speed: configRef.current.speed * 0.92,
                gravity: configRef.current.gravity,
                arenaRadius: 4.8,
              },
              dt
            );
          }

          actor.rig.root.position.set(actor.physics.x, actor.physics.y, actor.physics.z);
          actor.rig.root.rotation.y = actor.physics.facingYaw;

          const pose = computeCharacterPose(actor.physics);
          applyPoseToCharacterRig(actor.rig, pose, actor.physics.squashY);

          actor.shadow.position.set(actor.physics.x, 0.024, actor.physics.z);
          const shadowScale = Math.max(0.45, 1 - actor.physics.y * 0.28);
          actor.shadow.scale.setScalar(shadowScale);
          (actor.shadow.material as THREE.MeshBasicMaterial).opacity =
            Math.max(0.18, 0.5 - actor.physics.y * 0.16);
        });

        // 3. Smooth camera + target follow around active character
        const followAlpha = 1 - Math.exp(-7 * dt);
        const targetX = leader.physics.x;
        const targetY = 1.05 + leader.physics.y * 0.55;
        const targetZ = leader.physics.z;
        const dx = (targetX - controls.target.x) * followAlpha;
        const dy = (targetY - controls.target.y) * followAlpha;
        const dz = (targetZ - controls.target.z) * followAlpha;
        controls.target.x += dx;
        controls.target.y += dy;
        controls.target.z += dz;
        camera.position.x += dx;
        camera.position.y += dy * 0.65;
        camera.position.z += dz;
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.dispose();
      if (sceneHandlesRef.current) {
        sceneHandlesRef.current.actors.forEach((a) => {
          a.rig.dispose();
          a.shadow.geometry.dispose();
          (a.shadow.material as THREE.Material).dispose();
        });
        sceneHandlesRef.current.env?.dispose();
      }
      envTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneHandlesRef.current = null;
    };
    // Mount WebGL context once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize multi-character 3D roster & stage accents whenever characters change
  useEffect(() => {
    const handles = sceneHandlesRef.current;
    if (!handles) return;

    const prevPhysicsMap = new Map<string, CharacterPhysicsState>();
    handles.actors.forEach((a) => {
      prevPhysicsMap.set(a.id, a.physics);
      handles.scene.remove(a.rig.root);
      handles.scene.remove(a.shadow);
      a.rig.dispose();
      a.shadow.geometry.dispose();
      (a.shadow.material as THREE.Material).dispose();
    });

    handles.actors = roster.map((bp, idx) => {
      const id = bp.id || `char-${idx + 1}`;
      const offset = getSpawnOffset(idx);
      const savedPhysics = prevPhysicsMap.get(id);
      const physics = savedPhysics ?? createInitialPhysicsState(offset.x, offset.z, 0);
      const rig = createDetailedCharacterRig(bp);
      const shadow = createActorShadow();
      rig.root.position.set(physics.x, physics.y, physics.z);
      shadow.position.set(physics.x, 0.024, physics.z);
      handles.scene.add(rig.root);
      handles.scene.add(shadow);
      return { id, blueprint: bp, rig, shadow, physics };
    });

    if (handles.env) {
      handles.scene.remove(handles.env.group);
      handles.env.dispose();
    }
    const nextEnv = createStageEnvironment(
      spec.accentColor,
      spec.primaryColor,
      handles.renderer.capabilities.getMaxAnisotropy()
    );
    nextEnv.contactShadow.visible = false;
    handles.scene.add(nextEnv.group);
    handles.env = nextEnv;
  }, [roster, spec.primaryColor, spec.accentColor]);

  return (
    <div
      data-testid="feemi-3d-viewport"
      data-character={activeBlueprint?.archetype || 'adventurer_hero'}
      data-character-count={roster.length}
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-slate-800 bg-[#0c1628] select-none`}
    >
      {/* Isolated empty mount node for WebGL canvas */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Minimal Top Character Title & Multi-Character Switcher */}
      <div className="pointer-events-none absolute top-3 right-3 left-3 flex flex-wrap items-start justify-between gap-2">
        <div className="rounded-lg bg-[#0b1220]/90 border border-slate-700/80 px-3 py-1.5 text-right">
          <div className="text-xs font-extrabold text-white truncate max-w-[230px]">
            {activeBlueprint?.displayNameAr || spec.appName}
          </div>
          {!compactControls && (
            <div className="text-[11px] text-slate-300">
              اسحب للتدوير · الأسهم للحركة · مسافة للقفز
            </div>
          )}
        </div>

        {roster.length > 1 && (
          <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg bg-[#0b1220]/90 border border-slate-700/80 p-1">
            {roster.map((c) => {
              const id = c.id || '';
              const isSelected = id === activeCharacterId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectCharacter?.(id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-sky-500 text-slate-950'
                      : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {c.displayNameAr.replace(' (القط الذكي ثلاثي الأبعاد)', '').slice(0, 16)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Compact Bottom Interactive Controls Dock */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-xl bg-[#0b1220]/90 border border-slate-700/80 px-2.5 py-1.5 shadow-lg">
        <button
          type="button"
          onClick={() => setAutoWalk((v) => !v)}
          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap ${
            autoWalk
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>{autoWalk ? 'حركة حية' : 'تشغيل المشي'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            pendingActionRef.current.jump = true;
          }}
          className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[11px] font-extrabold flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          <ArrowUp className="w-3.5 h-3.5" />
          <span>قفز</span>
        </button>

        <button
          type="button"
          onClick={() => {
            pendingActionRef.current.wave = true;
          }}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
        >
          <Hand className="w-3.5 h-3.5 text-amber-400" />
          <span>تحية</span>
        </button>

        <button
          type="button"
          onClick={() => {
            pendingActionRef.current.reset = true;
          }}
          aria-label="إعادة ضبط الشخصية"
          title="إعادة ضبط الشخصية"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
