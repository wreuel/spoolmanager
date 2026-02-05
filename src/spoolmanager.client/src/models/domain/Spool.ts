import { Filament } from './Filament';

export interface PrintJobSpool {
  id: number;
  printJobId: number;
  gramsUsed: number;
}

export interface Spool {
  id: number;
  filamentId: number;
  filament?: Filament;
  firstUsed: string | null;
  lastUsed: string | null;
  initialWeight: number;
  usedWeight: number;
  lotNumber: string;
  price: number;
  registered: string;
  spoolWeight: number;
  location: string;
  comment: string;
  costPerGram?: number;
  remainingGrams?: number;
  showName?: string;
  printJobSpools?: PrintJobSpool[];
}
