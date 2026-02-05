export interface FilamentEdit {
    brandId: number | null | undefined;
    name: string;
    material: string;
    price: number | null | undefined;
    density: number | null | undefined;
    diameter: number | null | undefined;
    weightGrams: number | null | undefined;
    spoolWeightGrams: number | null | undefined;
    spoolType: string;
    comment: string;
    settingsExtruderTemp: number[];
    settingsBedTemp: number[];
    colorHex: string;
    externalId: string;
    multiColorHexes: string;
    multiColorDirection: string;
    cost: number | null | undefined;
    finish: string;
}
