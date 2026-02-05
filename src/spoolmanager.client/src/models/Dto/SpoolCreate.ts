export interface SpoolCreate {
    filamentId: number | null | undefined;
    firstUsed: string;
    lastUsed: string;
    price: number | null | undefined;
    initialWeight: number | null | undefined;
    usedWeight: number | null | undefined;
    lotNumber: string;
    location: string;
    comment: string;
    qty: number | null | undefined;
    externalId: string;
}
