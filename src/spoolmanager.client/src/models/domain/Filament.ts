import { Brand } from './Brand';

export interface Filament {
  id: number;
  brandId: number;
  brand?: Brand;
  registered: string;
  name: string;
  material: string;
  price: number;
  density: number;
  diameter: number;
  weightGrams: number;
  spoolWeightGrams: number;
  spoolType: string;
  comment: string;
  settingsExtruderTemp: number[];
  settingsBedTemp: number[];
  colorHex: string;
  externalId: string;
  multiColorHexes: string;
  multiColorDirection: string;
  cost: number;
  finish: string;
}
