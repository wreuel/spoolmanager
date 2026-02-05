import { Spool } from './Spool';

export interface PrintJobSpoolUsage {
  id: number;
  printJobId: number;
  spoolId: number;
  gramsUsed: number;
  spool?: Spool;
}

export interface PrintJob {
  id: number;
  name: string;
  printDate: string;
  duration: string;
  fileLink?: string | null;
  energyKwh?: number | null;
  energyCost?: number | null;
  totalFilamentCost?: number | null;
  totalCost?: number | null;
  printJobSpool?: PrintJobSpoolUsage[];
}
