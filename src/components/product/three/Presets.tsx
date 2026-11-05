import { RoundedBox } from '@react-three/drei';
import type { ModelPreset } from '@/lib/types';

/**
 * Procedural stand-in models, rendered until a real .glb is uploaded for a product.
 * Every part is its own mesh so the Explodable assembly animation can separate them.
 */

const metal = { color: '#C9CDD2', metalness: 1, roughness: 0.28 } as const;
const darkMetal = { color: '#2A2A2E', metalness: 0.9, roughness: 0.35 } as const;
const soft = { color: '#E8E1D6', metalness: 0, roughness: 0.85 } as const;
const black = { color: '#141416', metalness: 0.2, roughness: 0.6 } as const;

function Glow({ accent }: { accent: string }) {
  return <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} toneMapped={false} />;
}

function Headphones({ accent }: { accent: string }) {
  const cup = (side: 1 | -1) => (
    <group position={[side * 0.95, -0.35, 0]} rotation={[0, 0, (side * Math.PI) / 2]}>
      <mesh userData={{ explode: 1.3 }}><cylinderGeometry args={[0.55, 0.55, 0.32, 64]} /><meshStandardMaterial {...metal} /></mesh>
      <mesh position={[0, side * -0.2, 0]} userData={{ explode: 0.7 }}><torusGeometry args={[0.47, 0.12, 24, 64]} /><meshStandardMaterial {...soft} />
      </mesh>
      <mesh position={[0, side * 0.17, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 1.6 }}><torusGeometry args={[0.5, 0.03, 16, 64]} /><Glow accent={accent} /></mesh>
      <mesh position={[0, side * 0.19, 0]} userData={{ explode: 2 }}><cylinderGeometry args={[0.38, 0.38, 0.04, 64]} /><meshStandardMaterial {...darkMetal} /></mesh>
    </group>
  );
  return (
    <group rotation={[0.15, -0.5, 0]}>
      <mesh position={[0, 0.45, 0]} userData={{ explode: 1.2 }}>
        <torusGeometry args={[1.0, 0.09, 24, 96, Math.PI]} /><meshStandardMaterial {...soft} />
      </mesh>
      <mesh position={[0, 0.45, 0]} userData={{ explode: 0.6 }}>
        <torusGeometry args={[1.08, 0.04, 16, 96, Math.PI]} /><meshStandardMaterial {...darkMetal} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 1.0, 0.25, 0]} userData={{ explode: 0.8 }}>
          <boxGeometry args={[0.08, 0.5, 0.18]} /><meshStandardMaterial {...metal} />
        </mesh>
      ))}
      {cup(1)}
      {cup(-1)}
    </group>
  );
}

function Earbuds({ accent }: { accent: string }) {
  return (
    <group rotation={[0.3, -0.4, 0]}>
      <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 0.5 }}>
        <torusGeometry args={[0.9, 0.22, 32, 96]} /><meshStandardMaterial {...soft} />
      </mesh>
      <mesh position={[0, -0.4, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 0.3 }}>
        <torusGeometry args={[0.9, 0.04, 16, 96]} /><Glow accent={accent} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s} position={[s * 0.45, 0.2, 0]}>
          <mesh userData={{ explode: 1.4 }}><sphereGeometry args={[0.28, 48, 48]} /><meshStandardMaterial {...black} /></mesh>
          <mesh position={[0, -0.35, 0]} userData={{ explode: 1.6 }}><capsuleGeometry args={[0.07, 0.35, 8, 16]} /><meshStandardMaterial {...metal} /></mesh>
          <mesh position={[s * 0.24, 0.05, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ explode: 2 }}><cylinderGeometry args={[0.12, 0.1, 0.12, 32]} /><meshStandardMaterial {...soft} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Speaker({ accent }: { accent: string }) {
  return (
    <group rotation={[0.2, -0.3, 0]}>
      <mesh userData={{ explode: 0.2 }}><cylinderGeometry args={[0.7, 0.75, 2.2, 64]} /><meshStandardMaterial {...darkMetal} /></mesh>
      <mesh position={[0, -1.2, 0]} userData={{ explode: 1 }}><cylinderGeometry args={[0.8, 0.85, 0.2, 64]} /><meshStandardMaterial color="#6B4A2B" roughness={0.7} /></mesh>
      <mesh position={[0, 1.15, 0]} userData={{ explode: 1.4 }}><cylinderGeometry args={[0.66, 0.7, 0.1, 64]} /><meshStandardMaterial {...metal} /></mesh>
      <mesh position={[0, 1.22, 0]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 1.8 }}><torusGeometry args={[0.5, 0.03, 16, 64]} /><Glow accent={accent} /></mesh>
      {[0.5, -0.2].map((y, i) => (
        <group key={y} position={[0, y, 0.7]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 1.5 + i * 0.3 }}><coneGeometry args={[i ? 0.38 : 0.22, 0.2, 48, 1, true]} /><meshStandardMaterial {...black} side={2} /></mesh>
          <mesh position={[0, 0, 0.02]} userData={{ explode: 2.2 }}><sphereGeometry args={[i ? 0.1 : 0.07, 32, 32]} /><meshStandardMaterial {...metal} /></mesh>
        </group>
      ))}
    </group>
  );
}

function Turntable({ accent }: { accent: string }) {
  return (
    <group rotation={[0.55, -0.4, 0]} position={[0, -0.2, 0]}>
      <RoundedBox args={[2.6, 0.22, 2.0]} radius={0.06} userData={{ explode: 0.3 }}><meshStandardMaterial color="#EDE7DD" roughness={0.6} /></RoundedBox>
      <mesh position={[-0.3, 0.2, 0]} userData={{ explode: 0.9 }}><cylinderGeometry args={[0.85, 0.85, 0.08, 96]} /><meshStandardMaterial {...metal} /></mesh>
      <mesh position={[-0.3, 0.27, 0]} userData={{ explode: 1.6 }}><cylinderGeometry args={[0.8, 0.8, 0.02, 96]} /><meshStandardMaterial color="#0d0d0f" roughness={0.25} metalness={0.4} /></mesh>
      <mesh position={[-0.3, 0.29, 0]} userData={{ explode: 2.0 }}><cylinderGeometry args={[0.26, 0.26, 0.012, 64]} /><Glow accent={accent} /></mesh>
      <mesh position={[0.95, 0.3, -0.6]} userData={{ explode: 1.2 }}><cylinderGeometry args={[0.1, 0.12, 0.25, 32]} /><meshStandardMaterial {...darkMetal} /></mesh>
      <mesh position={[0.6, 0.42, -0.1]} rotation={[0, 0.5, Math.PI / 2]} userData={{ explode: 1.5 }}><cylinderGeometry args={[0.025, 0.025, 1.3, 16]} /><meshStandardMaterial {...metal} /></mesh>
      {[[-1.1, -0.85], [1.1, -0.85], [-1.1, 0.85], [1.1, 0.85]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.18, z]} userData={{ explode: 0.8 }}><cylinderGeometry args={[0.1, 0.12, 0.14, 24]} /><meshStandardMaterial {...darkMetal} /></mesh>
      ))}
    </group>
  );
}

function Keyboard({ accent }: { accent: string }) {
  const whites = Array.from({ length: 14 });
  const blackIdx = [0, 1, 3, 4, 5, 7, 8, 10, 11, 12];
  return (
    <group rotation={[0.6, -0.25, 0]}>
      <RoundedBox args={[3.4, 0.22, 1.3]} radius={0.06} userData={{ explode: 0.3 }}><meshStandardMaterial {...darkMetal} /></RoundedBox>
      {whites.map((_, i) => (
        <mesh key={i} position={[-1.56 + i * 0.22, 0.16, 0.2]} userData={{ explode: 0.9 }}>
          <boxGeometry args={[0.2, 0.08, 0.75]} /><meshStandardMaterial color="#F7F5F0" roughness={0.4} />
        </mesh>
      ))}
      {blackIdx.map((i) => (
        <mesh key={`b${i}`} position={[-1.45 + i * 0.22, 0.22, 0.02]} userData={{ explode: 1.4 }}>
          <boxGeometry args={[0.12, 0.08, 0.45]} /><meshStandardMaterial {...black} />
        </mesh>
      ))}
      {[-1.2, -0.8, -0.4, 0, 0.4].map((x, i) => (
        <mesh key={x} position={[x, 0.18, -0.42]} userData={{ explode: 1.8 }}>
          <cylinderGeometry args={[0.08, 0.08, 0.12, 32]} />{i === 0 ? <Glow accent={accent} /> : <meshStandardMaterial {...metal} />}
        </mesh>
      ))}
      <mesh position={[1.1, 0.13, -0.42]} userData={{ explode: 1.6 }}><boxGeometry args={[0.9, 0.04, 0.3]} /><Glow accent={accent} /></mesh>
    </group>
  );
}

function Radio({ accent }: { accent: string }) {
  return (
    <group rotation={[0.2, -0.45, 0]}>
      <RoundedBox args={[2.6, 1.5, 0.9]} radius={0.12} userData={{ explode: 0.2 }}><meshStandardMaterial color="#8A5A34" roughness={0.55} /></RoundedBox>
      <mesh position={[-0.55, 0, 0.46]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 1.4 }}><cylinderGeometry args={[0.5, 0.5, 0.04, 64]} /><meshStandardMaterial {...darkMetal} /></mesh>
      <mesh position={[0.65, 0.25, 0.46]} userData={{ explode: 1.6 }}><boxGeometry args={[0.9, 0.35, 0.03]} /><Glow accent={accent} /></mesh>
      {[0.35, 0.95].map((x) => (
        <mesh key={x} position={[x, -0.35, 0.5]} rotation={[Math.PI / 2, 0, 0]} userData={{ explode: 2 }}><cylinderGeometry args={[0.14, 0.14, 0.12, 32]} /><meshStandardMaterial {...metal} /></mesh>
      ))}
      <mesh position={[0, 0.95, 0]} userData={{ explode: 1.3 }}><torusGeometry args={[0.8, 0.05, 16, 64, Math.PI]} /><meshStandardMaterial {...metal} /></mesh>
    </group>
  );
}

function Generic({ accent }: { accent: string }) {
  return (
    <group rotation={[0.45, -0.6, 0]}>
      <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.22} smoothness={6} userData={{ explode: 0.2 }}><meshStandardMaterial color="#EFEAE2" roughness={0.5} /></RoundedBox>
      <mesh position={[0, 0, 0.76]} userData={{ explode: 1.5 }}><torusGeometry args={[0.45, 0.05, 16, 64]} /><Glow accent={accent} /></mesh>
      <mesh position={[0, 0.8, 0]} userData={{ explode: 1.5 }}><cylinderGeometry args={[0.35, 0.35, 0.06, 64]} /><meshStandardMaterial {...metal} /></mesh>
      <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ explode: 1.5 }}><cylinderGeometry args={[0.25, 0.25, 0.06, 64]} /><meshStandardMaterial {...darkMetal} /></mesh>
    </group>
  );
}

export function PresetModel({ preset, accent }: { preset: ModelPreset; accent: string }) {
  switch (preset) {
    case 'headphones': return <Headphones accent={accent} />;
    case 'earbuds': return <Earbuds accent={accent} />;
    case 'speaker': return <Speaker accent={accent} />;
    case 'turntable': return <Turntable accent={accent} />;
    case 'keyboard': return <Keyboard accent={accent} />;
    case 'radio': return <Radio accent={accent} />;
    default: return <Generic accent={accent} />;
  }
}
