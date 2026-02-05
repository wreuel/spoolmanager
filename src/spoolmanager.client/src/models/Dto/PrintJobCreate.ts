import { PrintJobSpoolCreate } from "./PrintJobSpoolCreate";

export interface PrintJobCreate {
    name: string;
    printDate: string;
    hoursDuration: number | null | undefined;
    minutesDuration: number | null | undefined;
    fileLink: string;
    printJobSpool: PrintJobSpoolCreate[];
    energyKwh: number | null | undefined;
    energyCost: number | null | undefined;
}
