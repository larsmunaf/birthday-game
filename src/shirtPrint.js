// "OCCUPY MARS" shirt print, drawn onto a canvas and wrapped around the torso capsule.
// The texture spans the whole circumference; the front of the torso is the middle of the canvas
// (the torso material uses a 0.5 u-offset). v is proportional to height: top of canvas = shoulders.
import * as THREE from 'three';

const W = 1024, H = 512;

export function createOccupyMarsTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  g.fillStyle = '#25222a'; // black shirt
  g.fillRect(0, 0, W, H);

  const cx = W / 2;
  const ink = '#1d1b22';
  const text = '#f4f1ea'; // white lettering

  // little Mars, slightly wonky like a hand drawing
  const my = H * 0.25;
  g.fillStyle = '#d9542c';
  g.beginPath();
  g.arc(cx, my, 22, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#a8381c'; // craters
  for (const [x, y, r] of [[-8, -5, 5], [7, 4, 6], [-3, 11, 3]]) {
    g.beginPath();
    g.arc(cx + x, my + y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = ink;
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, my, 22, 0, Math.PI * 2);
  g.stroke();

  // wide-spaced lettering
  g.fillStyle = text;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const font = '"Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';
  const spaced = (text, y, size, spacing) => {
    g.font = `900 ${size}px ${font}`;
    const widths = [...text].map((ch) => g.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = cx - total / 2;
    [...text].forEach((ch, i) => {
      g.fillText(ch, x + widths[i] / 2, y);
      x += widths[i] + spacing;
    });
  };
  spaced('OCCUPY', H * 0.36, 44, 7);
  spaced('MARS', H * 0.46, 56, 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}
