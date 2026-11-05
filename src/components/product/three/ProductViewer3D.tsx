import { Component, Suspense, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Center, ContactShadows, Environment, Html, Lightformer, OrbitControls, useGLTF, useProgress } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Icon } from '@/components/ui/Icon';
import { Loader } from '@/components/brand/Loader';
import type { ModelPreset } from '@/lib/types';
import { Explodable } from './Explodable';
import { PresetModel } from './Presets';

interface Props {
  modelUrl: string | null;
  preset: ModelPreset | null;
  accent: string;
  name: string;
}

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function Progress() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <Loader size={48} label="Loading 3D model" />
        <span className="text-xs font-medium text-ink-500">{Math.round(progress)}%</span>
      </div>
    </Html>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/**
 * Interactive product viewer. This module (and three.js) is lazy-loaded only on the
 * product page, and the model file is fetched only when the viewer mounts.
 */
export default function ProductViewer3D({ modelUrl, preset, accent, name }: Props) {
  const [exploded, setExploded] = useState(1); // intro: parts fly in and assemble
  const [autoRotate, setAutoRotate] = useState(true);
  const controls = useRef<OrbitControlsImpl>(null);

  // Kick off the assembly once the first frame is up.
  const onCreated = () => setTimeout(() => setExploded(0), 350);

  const zoom = (factor: number) => {
    const c = controls.current;
    if (!c) return;
    const cam = c.object;
    const dir = cam.position.clone().sub(c.target);
    const len = Math.min(c.maxDistance, Math.max(c.minDistance, dir.length() * factor));
    cam.position.copy(c.target).add(dir.setLength(len));
    c.update();
  };

  const fallbackModel = <PresetModel preset={preset ?? 'generic'} accent={accent} />;

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.6, 5.2], fov: 38 }}
        onCreated={onCreated}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        aria-label={`Interactive 3D model of ${name}`}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[4, 6, 4]} intensity={1.4} />
        <pointLight position={[-3, 1, -2]} intensity={12} color={accent} />
        <Environment resolution={256}>
          <Lightformer intensity={2} position={[0, 4, 2]} scale={[8, 2, 1]} />
          <Lightformer intensity={1.2} position={[-5, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
          <Lightformer intensity={0.8} position={[5, 0, -1]} rotation-y={-Math.PI / 2} scale={[6, 3, 1]} color={accent} />
        </Environment>

        <Suspense fallback={<Progress />}>
          <Bounds fit clip observe margin={1.25}>
            <Center>
              <Explodable exploded={exploded}>
                {modelUrl ? (
                  <ModelBoundary fallback={fallbackModel}>
                    <GltfModel url={modelUrl} />
                  </ModelBoundary>
                ) : fallbackModel}
              </Explodable>
            </Center>
          </Bounds>
          <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={8} blur={2.6} far={4} />
        </Suspense>

        <OrbitControls
          ref={controls}
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          enablePan={false}
          minDistance={2.2}
          maxDistance={9}
          enableDamping
        />
      </Canvas>

      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 p-1.5 shadow-lift backdrop-blur">
        <ViewerButton icon={exploded > 0.5 ? 'join_inner' : 'open_in_full'} label={exploded > 0.5 ? 'Assemble' : 'Explode view'} onClick={() => setExploded((e) => (e > 0.5 ? 0 : 1))} active={exploded > 0.5} />
        <ViewerButton icon="3d_rotation" label={autoRotate ? 'Stop rotation' : 'Auto-rotate'} onClick={() => setAutoRotate((v) => !v)} active={autoRotate} />
        <ViewerButton icon="zoom_in" label="Zoom in" onClick={() => zoom(0.8)} />
        <ViewerButton icon="zoom_out" label="Zoom out" onClick={() => zoom(1.25)} />
        <ViewerButton icon="restart_alt" label="Reset view" onClick={() => controls.current?.reset()} />
      </div>
      <p className="pointer-events-none absolute left-4 top-4 flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-xs text-ink-500 backdrop-blur">
        <Icon name="pan_tool" size={14} />Drag to rotate · scroll to zoom
      </p>
    </div>
  );
}

function ViewerButton({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition ${active ? 'bg-ink text-white' : 'text-ink hover:bg-ink/5'}`}
    >
      <Icon name={icon} size={20} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
