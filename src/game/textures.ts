import * as THREE from 'three';

export interface ProceduralTextureSet {
  trackBed: THREE.CanvasTexture;
  persianTile: THREE.CanvasTexture;
  bazaarBrick: THREE.CanvasTexture;
  persianCarpet: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  metroLivery: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  isColor: boolean,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Track bed (3-lane gravel ballast + wooden sleepers)
  const [tbCanvas, tbCtx] = makeCanvas(512, 512);
  tbCtx.fillStyle = '#3c3936';
  tbCtx.fillRect(0, 0, 512, 512);

  // Subtle gravel speckles
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const v = 45 + Math.floor(Math.random() * 45);
    tbCtx.fillStyle = `rgb(${v + 4}, ${v}, ${v - 4})`;
    tbCtx.fillRect(x, y, 2.5, 2.5);
  }

  // Three lane rail beds (darker crushed stone bands)
  const laneCenters = [108, 256, 404];
  for (const cx of laneCenters) {
    tbCtx.fillStyle = 'rgba(20, 18, 16, 0.45)';
    tbCtx.fillRect(cx - 52, 0, 104, 512);
  }

  // Wooden/concrete sleepers every 64px vertically
  for (let y = 0; y < 512; y += 64) {
    for (const cx of laneCenters) {
      tbCtx.fillStyle = '#5c4033';
      tbCtx.fillRect(cx - 46, y + 10, 92, 16);
      tbCtx.fillStyle = 'rgba(0,0,0,0.28)';
      tbCtx.fillRect(cx - 46, y + 26, 92, 4);
      // Fastener plates
      tbCtx.fillStyle = '#78716c';
      tbCtx.fillRect(cx - 34, y + 12, 8, 12);
      tbCtx.fillRect(cx + 26, y + 12, 8, 12);
    }
  }
  const trackBed = finalizeTexture(tbCanvas, maxAnisotropy, true, 1, 6);

  // 2. Persian Girih / Turquoise-Cobalt Tile Pattern
  const [tileCanvas, tileCtx] = makeCanvas(256, 256);
  tileCtx.fillStyle = '#0f3460'; // Cobalt base
  tileCtx.fillRect(0, 0, 256, 256);

  // Diamond turquoise & gold lattice
  const step = 64;
  for (let gy = 0; gy < 256; gy += step) {
    for (let gx = 0; gx < 256; gx += step) {
      const cx = gx + step / 2;
      const cy = gy + step / 2;

      // Turquoise outer star
      tileCtx.fillStyle = '#0891b2';
      tileCtx.beginPath();
      tileCtx.moveTo(cx, gy + 4);
      tileCtx.lineTo(gx + step - 4, cy);
      tileCtx.lineTo(cx, gy + step - 4);
      tileCtx.lineTo(gx + 4, cy);
      tileCtx.closePath();
      tileCtx.fill();

      // Cream inner rosette
      tileCtx.fillStyle = '#fef3c7';
      tileCtx.beginPath();
      tileCtx.arc(cx, cy, 13, 0, Math.PI * 2);
      tileCtx.fill();

      // Saffron gold core
      tileCtx.fillStyle = '#d97706';
      tileCtx.beginPath();
      tileCtx.arc(cx, cy, 6, 0, Math.PI * 2);
      tileCtx.fill();

      // Tile grout border
      tileCtx.strokeStyle = '#0c2340';
      tileCtx.lineWidth = 2;
      tileCtx.strokeRect(gx, gy, step, step);
    }
  }
  const persianTile = finalizeTexture(tileCanvas, maxAnisotropy, true, 2, 2);

  // 3. Tehran Warm Ochre Brick & Plaster Texture
  const [brickCanvas, brickCtx] = makeCanvas(256, 256);
  brickCtx.fillStyle = '#c89d6c';
  brickCtx.fillRect(0, 0, 256, 256);
  const bh = 16;
  const bw = 42;
  for (let row = 0; row < 256 / bh; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col < 256 / bw + 1; col++) {
      const shade = 175 + Math.floor(Math.random() * 35);
      brickCtx.fillStyle = `rgb(${shade}, ${Math.floor(shade * 0.72)}, ${Math.floor(shade * 0.48)})`;
      brickCtx.fillRect(col * bw + offset + 1, row * bh + 1, bw - 2, bh - 2);
    }
  }
  const bazaarBrick = finalizeTexture(brickCanvas, maxAnisotropy, true, 2, 3);

  // 4. Persian Woven Carpet (for Flying Carpet & Train Ramps)
  const [rugCanvas, rugCtx] = makeCanvas(256, 512);
  rugCtx.fillStyle = '#881337'; // Rich pomegranate crimson
  rugCtx.fillRect(0, 0, 256, 512);

  // Outer gold & cobalt borders
  rugCtx.strokeStyle = '#f59e0b';
  rugCtx.lineWidth = 14;
  rugCtx.strokeRect(12, 16, 232, 480);
  rugCtx.strokeStyle = '#0e7490';
  rugCtx.lineWidth = 8;
  rugCtx.strokeRect(26, 30, 204, 452);
  rugCtx.strokeStyle = '#fef3c7';
  rugCtx.lineWidth = 3;
  rugCtx.strokeRect(36, 40, 184, 432);

  // Central Toranj medallion
  rugCtx.fillStyle = '#0c4a6e';
  rugCtx.beginPath();
  rugCtx.moveTo(128, 120);
  rugCtx.lineTo(192, 256);
  rugCtx.lineTo(128, 392);
  rugCtx.lineTo(64, 256);
  rugCtx.closePath();
  rugCtx.fill();

  rugCtx.fillStyle = '#f59e0b';
  rugCtx.beginPath();
  rugCtx.moveTo(128, 165);
  rugCtx.lineTo(168, 256);
  rugCtx.lineTo(128, 347);
  rugCtx.lineTo(88, 256);
  rugCtx.closePath();
  rugCtx.fill();

  rugCtx.fillStyle = '#fef3c7';
  rugCtx.beginPath();
  rugCtx.arc(128, 256, 20, 0, Math.PI * 2);
  rugCtx.fill();

  // Corner floral accents
  const corners = [
    [54, 62],
    [202, 62],
    [54, 450],
    [202, 450],
  ];
  for (const [cx, cy] of corners) {
    rugCtx.fillStyle = '#f59e0b';
    rugCtx.beginPath();
    rugCtx.arc(cx, cy, 12, 0, Math.PI * 2);
    rugCtx.fill();
  }
  const persianCarpet = finalizeTexture(rugCanvas, maxAnisotropy, true, 1, 1);

  // 5. Municipal Hazard Stripes (Orange & Cream)
  const [hazCanvas, hazCtx] = makeCanvas(256, 64);
  hazCtx.fillStyle = '#f8fafc';
  hazCtx.fillRect(0, 0, 256, 64);
  hazCtx.fillStyle = '#ea580c';
  for (let x = -64; x < 320; x += 48) {
    hazCtx.beginPath();
    hazCtx.moveTo(x, 64);
    hazCtx.lineTo(x + 24, 64);
    hazCtx.lineTo(x + 56, 0);
    hazCtx.lineTo(x + 32, 0);
    hazCtx.closePath();
    hazCtx.fill();
  }
  const hazardStripe = finalizeTexture(hazCanvas, maxAnisotropy, true, 1, 1);

  // 6. Tehran Metro Car Side Livery (White/Silver + Turquoise/Cobalt stripe)
  const [metCanvas, metCtx] = makeCanvas(512, 128);
  metCtx.fillStyle = '#e2e8f0';
  metCtx.fillRect(0, 0, 512, 128);
  metCtx.fillStyle = '#0891b2';
  metCtx.fillRect(0, 74, 512, 22);
  metCtx.fillStyle = '#0f172a';
  metCtx.fillRect(0, 96, 512, 8);
  metCtx.fillStyle = '#f59e0b';
  metCtx.fillRect(0, 70, 512, 4);
  // Subtle panel lines
  metCtx.strokeStyle = 'rgba(15, 23, 42, 0.16)';
  metCtx.lineWidth = 2;
  for (let x = 64; x < 512; x += 64) {
    metCtx.beginPath();
    metCtx.moveTo(x, 0);
    metCtx.lineTo(x, 128);
    metCtx.stroke();
  }
  const metroLivery = finalizeTexture(metCanvas, maxAnisotropy, true, 1, 1);

  // 7. Soft Radial Contact Shadow
  const [shadCanvas, shadCtx] = makeCanvas(128, 128);
  const grad = shadCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 8, 6, 0.58)');
  grad.addColorStop(0.55, 'rgba(10, 8, 6, 0.24)');
  grad.addColorStop(1, 'rgba(10, 8, 6, 0.0)');
  shadCtx.fillStyle = grad;
  shadCtx.fillRect(0, 0, 128, 128);
  const contactShadow = finalizeTexture(shadCanvas, maxAnisotropy, true, 1, 1);
  contactShadow.wrapS = THREE.ClampToEdgeWrapping;
  contactShadow.wrapT = THREE.ClampToEdgeWrapping;

  return {
    trackBed,
    persianTile,
    bazaarBrick,
    persianCarpet,
    hazardStripe,
    metroLivery,
    contactShadow,
    dispose: () => {
      trackBed.dispose();
      persianTile.dispose();
      bazaarBrick.dispose();
      persianCarpet.dispose();
      hazardStripe.dispose();
      metroLivery.dispose();
      contactShadow.dispose();
    },
  };
}
