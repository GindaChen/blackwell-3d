// Shared PBR material library. Values are tuned against the reference photography:
// champagne-anodized NVIDIA front panels, nickel-plated IHS lids, dark taupe solder mask,
// bare silicon with thin-film iridescence, copper cold plates, galvanized chassis steel.
import * as THREE from 'three';
import { brushedRoughness, galvanized, pcbEdge, mlccTexture } from '../textures/surfaces.js';

let M = null;

export function materials() {
  if (M) return M;
  const brushed = brushedRoughness(0.3, 0.1);
  const galv = galvanized();

  const phys = (p) => new THREE.MeshPhysicalMaterial(p);
  const std = (p) => new THREE.MeshStandardMaterial(p);

  M = {
    // ---------- metals ----------
    champagne: phys({ color: '#d2bd94', metalness: 0.75, roughness: 0.36, roughnessMap: brushed, clearcoat: 0.2, clearcoatRoughness: 0.3 }),
    champagneDark: phys({ color: '#a8946c', metalness: 1, roughness: 0.42 }),
    stiffenerGold: phys({ color: '#d7c7a2', metalness: 1, roughness: 0.28, roughnessMap: brushed }),
    nickel: phys({ color: '#d9d6d0', metalness: 1, roughness: 0.3, roughnessMap: brushed }),
    nickelMatte: std({ color: '#bdbab4', metalness: 1, roughness: 0.48 }),
    steel: std({ color: '#c3c6c9', metalness: 0.6, roughness: 0.42, map: galv.map, roughnessMap: galv.rm, metalnessMap: galv.rm }),
    steelDark: std({ color: '#8d9196', metalness: 1, roughness: 0.38, roughnessMap: brushed }),
    aluminum: phys({ color: '#d4d7da', metalness: 0.8, roughness: 0.34, roughnessMap: brushed }),
    copper: phys({ color: '#e0895a', metalness: 1, roughness: 0.24, roughnessMap: brushed, clearcoat: 0.15 }),
    copperDark: std({ color: '#a8603a', metalness: 1, roughness: 0.35 }),
    gold: std({ color: '#f2c46d', metalness: 1, roughness: 0.22 }),
    goldPad: std({ color: '#d9b26a', metalness: 1, roughness: 0.3 }),
    screw: std({ color: '#b7b9bb', metalness: 1, roughness: 0.28 }),
    screwBlack: std({ color: '#1b1b1c', metalness: 0.7, roughness: 0.4 }),
    blackAnodized: phys({ color: '#151618', metalness: 0.65, roughness: 0.46, roughnessMap: brushed, clearcoat: 0.1 }),
    blackPowder: std({ color: '#121314', metalness: 0.1, roughness: 0.72 }),

    // ---------- plastics / composites ----------
    lcpBlack: phys({ color: '#0f0f10', metalness: 0, roughness: 0.52, clearcoat: 0.15, clearcoatRoughness: 0.5 }),
    nylonWhite: std({ color: '#e9e4d6', metalness: 0, roughness: 0.6 }),
    rubberBlack: std({ color: '#0b0b0b', metalness: 0, roughness: 0.85 }),
    thermalPad: std({ color: '#2a2b2e', metalness: 0, roughness: 0.92 }),
    thermalPadGrey: std({ color: '#6d6f73', metalness: 0, roughness: 0.9 }),
    moldBlack: std({ color: '#161616', metalness: 0, roughness: 0.68 }),
    ferrite: std({ color: '#5d5e60', metalness: 0.15, roughness: 0.7 }),
    powerStage: phys({ color: '#7d7e7b', metalness: 0.05, roughness: 0.62, clearcoat: 0.12, clearcoatRoughness: 0.5 }),
    tantalum: std({ color: '#2d2c2a', metalness: 0, roughness: 0.6 }),

    // ---------- PCB edges / substrates ----------
    pcbEdge: std({ map: pcbEdge(), roughness: 0.8, metalness: 0 }),
    substrateDark: phys({ color: '#1d1f1e', metalness: 0.05, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 }),
    substrateTeal: phys({ color: '#0d6b68', metalness: 0.05, roughness: 0.4, clearcoat: 0.45, clearcoatRoughness: 0.25 }),
    interposer: phys({ color: '#2a2c30', metalness: 0.6, roughness: 0.25 }),
    underfill: std({ color: '#3a3833', metalness: 0, roughness: 0.6 }),
    socammPcb: phys({ color: '#1a1c1a', metalness: 0, roughness: 0.5, clearcoat: 0.3 }),

    // ---------- silicon ----------
    hbm: phys({ color: '#cfcabe', metalness: 0.15, roughness: 0.33, clearcoat: 0.2 }),
    // dies are created per-instance with their own floorplan textures (see parts/chips.js)

    // ---------- glow ----------
    ledGreen: std({ color: '#2a2a2a', emissive: '#76b900', emissiveIntensity: 3 }),
    ledAmber: std({ color: '#2a2a2a', emissive: '#ffae2a', emissiveIntensity: 2 }),
    portDark: std({ color: '#050505', metalness: 0.2, roughness: 0.8 }),
  };

  const mlcc = mlccTexture('#8a7656');
  M.mlcc = std({ map: mlcc.map, roughnessMap: mlcc.rm, metalnessMap: mlcc.rm, metalness: 1, roughness: 1 });
  const mlccG = mlccTexture('#6f6a5e');
  M.mlccGrey = std({ map: mlccG.map, roughnessMap: mlccG.rm, metalnessMap: mlccG.rm, metalness: 1, roughness: 1 });
  return M;
}
