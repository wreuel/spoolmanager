export interface SpoolmanFilament {
  id: string;
  manufacturer: string;
  name: string;
  material: string;
  density: number;
  weight: number;
  spoolWeight: number;
  spoolType: string;
  diameter: number;
  colorHex: string | null;
  colorHexes: string[] | null;
  extruderTemp: number;
  extruderTempRange: number[] | null;
  bedTemp: number;
  bedTempRange: number[] | null;
  finish: string | null;
  multiColorDirection: string | null;
  pattern: string | null;
  translucent: boolean;
  glow: boolean;
  fullName: string;
}
