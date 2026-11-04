/*
 * Tela de abertura em 3D do Radar de Audiências.
 * O monograma "D" da Diferencial Soluções extrudado em metal, girando sobre
 * um radar que varre o chão e acende os pontos (as audiências).
 *
 * Gera web/assets/loader3d.js com:  npm run build:loader
 */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Shape, Path, ExtrudeGeometry,
  MeshPhysicalMaterial, MeshBasicMaterial, ShaderMaterial, CircleGeometry, RingGeometry,
  PlaneGeometry, SphereGeometry, BufferGeometry, Float32BufferAttribute, Points, PointsMaterial,
  Mesh, DirectionalLight, PointLight, AmbientLight, Color, CanvasTexture, PMREMGenerator,
  ACESFilmicToneMapping, SRGBColorSpace, AdditiveBlending, DoubleSide, MathUtils, Vector2
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const PALETAS = {
  claro: { frente: '#7A4223', lado: '#3E1E0E', anel: '#6B3A1F', varredura: '#C7702E', blip: '#B4441C', poeira: '#9A6A44', luz: '#FFE2BF' },
  escuro: { frente: '#D9AE80', lado: '#7A4A2A', anel: '#D9A77A', varredura: '#E39A4E', blip: '#FF8A4C', poeira: '#E8C9A2', luz: '#FFD9A8' }
};

const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Formas do monograma, desenhadas a partir da marca (quadrado 228 × 228). */
function formasDoMonograma(tamanho) {
  const s = tamanho / 228;
  const rr = (p, x0, y0, x1, y1, r) => {
    p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    p.lineTo(x1, y1 - r); p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    p.lineTo(x0 + r, y1); p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    p.lineTo(x0, y0 + r); p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
  };
  const quadro = new Shape();
  rr(quadro, -114 * s, -114 * s, 114 * s, 114 * s, 30 * s);
  const furo = new Path();
  rr(furo, -107 * s, -107 * s, 107 * s, 107 * s, 23 * s);
  quadro.holes.push(furo);

  const P = (x, y) => [(x - 114) * s, (114 - y) * s];
  const cx = 6 * s, cy = 1 * s;
  const letra = new Shape();
  letra.moveTo(...P(69, 57)); letra.lineTo(...P(120, 57));
  letra.absarc(cx, cy, 56 * s, Math.PI / 2, -Math.PI / 2, true);
  letra.lineTo(...P(69, 169)); letra.lineTo(...P(69, 57));
  const miolo = new Path();
  miolo.moveTo(...P(83, 70)); miolo.lineTo(...P(120, 70));
  miolo.absarc(cx, cy, 43 * s, Math.PI / 2, -Math.PI / 2, true);
  miolo.lineTo(...P(83, 156)); miolo.lineTo(...P(83, 70));
  letra.holes.push(miolo);
  return { quadro, letra };
}

function texturaPonto() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

function texturaSombra() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/**
 * Liga a cena no <canvas>. Lança erro se o aparelho não tiver WebGL.
 * @returns {{ sair: () => Promise<void>, destruir: () => void, tema: (escuro:boolean) => void }}
 */
export function iniciarLoader3D(canvas, { escuro = false, rapido = false } = {}) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.6 : 2));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new PerspectiveCamera(34, 1, 0.1, 100);
  const alvoCamera = { y: 0.75 };
  camera.position.set(0, 1.5, 9.4);

  let pal = escuro ? PALETAS.escuro : PALETAS.claro;

  // Luzes
  const luzChave = new DirectionalLight(pal.luz, 2.4); luzChave.position.set(3.5, 5, 6); cena.add(luzChave);
  const luzContra = new PointLight(pal.varredura, 18, 12, 2); luzContra.position.set(-2.6, 1.2, -2.2); cena.add(luzContra);
  cena.add(new AmbientLight('#ffffff', 0.35));

  // Monograma
  const { quadro, letra } = formasDoMonograma(2.3);
  const matFrente = new MeshPhysicalMaterial({ color: pal.frente, metalness: 0.62, roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.18, transparent: true, opacity: 0 });
  const matLado = new MeshPhysicalMaterial({ color: pal.lado, metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0 });
  const extr = { curveSegments: 40, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.026, bevelSegments: 5 };
  const geoQuadro = new ExtrudeGeometry(quadro, { ...extr, depth: 0.26 }); geoQuadro.translate(0, 0, -0.13);
  const geoLetra = new ExtrudeGeometry(letra, { ...extr, depth: 0.42 }); geoLetra.translate(0, 0, -0.16);
  const monograma = new Group();
  monograma.add(new Mesh(geoQuadro, [matFrente, matLado]));
  monograma.add(new Mesh(geoLetra, [matFrente, matLado]));
  monograma.position.y = -0.4;
  cena.add(monograma);

  // Sombra no chão
  const chaoY = -1.75;
  const sombra = new Mesh(new PlaneGeometry(3.6, 3.6), new MeshBasicMaterial({ map: texturaSombra(), transparent: true, opacity: 0, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2; sombra.position.y = chaoY + 0.002; cena.add(sombra);

  // Radar no chão
  const radar = new Group(); radar.position.y = chaoY; cena.add(radar);
  const raios = [1.25, 2.05, 2.85, 3.65];
  const aneis = raios.map((r, i) => {
    const m = new Mesh(new RingGeometry(r - 0.012, r + 0.012, 160), new MeshBasicMaterial({ color: pal.anel, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.scale.setScalar(0.001); m.userData.atraso = 0.25 + i * 0.14; radar.add(m); return m;
  });
  const zona = new Mesh(new CircleGeometry(raios[0], 96), new MeshBasicMaterial({ color: pal.varredura, transparent: true, opacity: 0, depthWrite: false }));
  zona.rotation.x = -Math.PI / 2; zona.position.y = 0.001; radar.add(zona);

  const matVarredura = new ShaderMaterial({
    transparent: true, depthWrite: false, blending: AdditiveBlending, side: DoubleSide,
    uniforms: { uAngulo: { value: 0 }, uCor: { value: new Color(pal.varredura) }, uForca: { value: 0 } },
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      varying vec2 vP; uniform float uAngulo; uniform vec3 uCor; uniform float uForca;
      void main(){
        float r = length(vP) / ${raios[3].toFixed(2)};
        if (r > 1.0) discard;
        float a = atan(vP.y, vP.x);
        float d = mod(uAngulo - a, 6.2831853);
        float rastro = pow(1.0 - d / 6.2831853, 7.0);
        float braco = smoothstep(0.035, 0.0, d) * 0.9;
        float borda = smoothstep(1.0, 0.86, r);
        float alpha = (rastro * 0.55 + braco) * borda * uForca;
        gl_FragColor = vec4(uCor, alpha);
      }`
  });
  const varredura = new Mesh(new CircleGeometry(raios[3], 160), matVarredura);
  varredura.rotation.x = -Math.PI / 2; varredura.position.y = 0.003; radar.add(varredura);

  // Pontos (audiências) no radar
  const blips = [[0.85, 0.7], [1.6, 2.2], [2.4, 3.7], [1.15, 4.6], [3.1, 5.4], [2.7, 1.3], [0.55, 3.1]].map(([r, a]) => {
    const m = new Mesh(new SphereGeometry(0.055, 16, 12), new MeshBasicMaterial({ color: pal.blip, transparent: true, opacity: 0 }));
    m.position.set(Math.cos(a) * r, 0.05, -Math.sin(a) * r);
    m.userData.angulo = a; radar.add(m); return m;
  });

  // Poeira dourada
  const N = window.innerWidth < 700 ? 140 : 260;
  const pos = new Float32Array(N * 3), vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = MathUtils.randFloatSpread(11); pos[i * 3 + 1] = MathUtils.randFloat(-2, 4.5); pos[i * 3 + 2] = MathUtils.randFloat(-5, 3);
    vel[i] = MathUtils.randFloat(0.05, 0.22);
  }
  const geoPoeira = new BufferGeometry(); geoPoeira.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const matPoeira = new PointsMaterial({ color: pal.poeira, size: 0.06, map: texturaPonto(), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
  const poeira = new Points(geoPoeira, matPoeira); cena.add(poeira);

  // Interação: o monograma acompanha o ponteiro
  const ponteiro = new Vector2(0, 0), suave = new Vector2(0, 0);
  const aoMover = e => {
    const x = (e.touches ? e.touches[0].clientX : e.clientX) / window.innerWidth;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) / window.innerHeight;
    ponteiro.set(x * 2 - 1, y * 2 - 1);
  };
  window.addEventListener('pointermove', aoMover, { passive: true });

  const ajustar = () => {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 46 : 34;
    camera.updateProjectionMatrix();
  };
  ajustar();
  window.addEventListener('resize', ajustar);

  const inicio = performance.now();
  const duracaoIntro = rapido ? 0.9 : 1.9;
  let saida = null, vivo = true, quadroId = 0;

  const loop = agoraMs => {
    if (!vivo) return;
    quadroId = requestAnimationFrame(loop);
    const t = (agoraMs - inicio) / 1000;
    const ti = Math.min(1, t / duracaoIntro), ei = easeOutCubic(ti);

    suave.lerp(ponteiro, 0.05);
    const op = Math.min(1, t / 0.6);
    matFrente.opacity = matLado.opacity = op;
    if (op >= 1 && matFrente.transparent) { matFrente.transparent = matLado.transparent = false; matFrente.needsUpdate = matLado.needsUpdate = true; }

    monograma.rotation.y = -Math.PI * 2.25 * (1 - ei) + Math.sin(t * 0.7) * 0.16 * ei + suave.x * 0.38;
    monograma.rotation.x = -0.08 + suave.y * 0.14 + (1 - ei) * 0.35;
    monograma.position.y = MathUtils.lerp(-0.2, 1.15, ei) + Math.sin(t * 1.25) * 0.06 * ei;
    monograma.scale.setScalar(MathUtils.lerp(0.62, 1, easeOutBack(ti)));

    sombra.material.opacity = 0.32 * ei * (1 - Math.sin(t * 1.25) * 0.12);
    sombra.scale.setScalar(1 - Math.sin(t * 1.25) * 0.05);

    aneis.forEach(m => {
      const k = MathUtils.clamp((t - m.userData.atraso) / 0.7, 0, 1);
      m.scale.setScalar(Math.max(0.001, easeOutBack(k)));
      m.material.opacity = 0.42 * k;
    });
    zona.material.opacity = 0.09 * MathUtils.clamp((t - 0.6) / 0.6, 0, 1);

    const angulo = t * 1.7;
    matVarredura.uniforms.uAngulo.value = angulo;
    matVarredura.uniforms.uForca.value = MathUtils.clamp((t - 0.55) / 0.5, 0, 1);
    blips.forEach(b => {
      const d = ((angulo - b.userData.angulo) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const brilho = Math.pow(1 - d / (Math.PI * 2), 5);
      b.material.opacity = t < 0.9 ? 0 : 0.18 + brilho * 0.82;
      b.scale.setScalar(1 + brilho * 0.9);
    });

    const p = geoPoeira.attributes.position.array;
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] += vel[i] * 0.012;
      if (p[i * 3 + 1] > 4.6) p[i * 3 + 1] = -2;
    }
    geoPoeira.attributes.position.needsUpdate = true;
    matPoeira.opacity = 0.55 * Math.min(1, t / 1.2);

    // câmera: leve órbita e, na saída, mergulho no monograma
    let z = 9.4, y = 1.5, x = Math.sin(t * 0.25) * 0.25 + suave.x * 0.35;
    if (saida) {
      const ks = Math.min(1, (agoraMs - saida.inicio) / saida.duracao), es = easeInOutCubic(ks);
      z = MathUtils.lerp(9.4, 3.4, es); y = MathUtils.lerp(1.5, 1.2, es);
      monograma.rotation.y += es * Math.PI * 0.5;
      if (ks >= 1 && !saida.feito) { saida.feito = true; saida.resolver(); }
    }
    camera.position.set(x, y, z);
    camera.lookAt(0, alvoCamera.y, 0);
    renderer.render(cena, camera);
  };
  quadroId = requestAnimationFrame(loop);

  return {
    sair(duracao = 900) {
      return new Promise(resolver => { saida = { inicio: performance.now(), duracao, resolver, feito: false }; });
    },
    tema(escuroAgora) {
      pal = escuroAgora ? PALETAS.escuro : PALETAS.claro;
      matFrente.color.set(pal.frente); matLado.color.set(pal.lado);
      aneis.forEach(m => m.material.color.set(pal.anel));
      zona.material.color.set(pal.varredura); matVarredura.uniforms.uCor.value.set(pal.varredura);
      blips.forEach(b => b.material.color.set(pal.blip)); matPoeira.color.set(pal.poeira);
      luzChave.color.set(pal.luz); luzContra.color.set(pal.varredura);
    },
    destruir() {
      vivo = false; cancelAnimationFrame(quadroId);
      window.removeEventListener('resize', ajustar); window.removeEventListener('pointermove', aoMover);
      cena.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { if (x.map) x.map.dispose(); x.dispose(); }); });
      pmrem.dispose(); renderer.dispose();
    }
  };
}
