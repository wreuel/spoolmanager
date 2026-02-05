namespace SpoolManager.Server.Domain.Dto
{
    public class FilamentCreate
    {
        public int BrandId { get; set; }
        public string Name { get; set; } = null!;
        public string Material { get; set; } = null!;
        public decimal Price { get; set; }
        public double Density { get; set; }
        public double Diameter { get; set; }
        public decimal WeightGrams { get; set; }
        public decimal SpoolWeightGrams { get; set; }
        public string SpoolType { get; set; } = string.Empty;
        public string Comment { get; set; } = string.Empty;
        public List<int> SettingsExtruderTemp { get; set; } = new();
        public List<int> SettingsBedTemp { get; set; } = new();
        public string ColorHex { get; set; } = null!;
        public string ExternalId { get; set; } = string.Empty;
        public string MultiColorHexes { get; set; } = string.Empty;
        public string MultiColorDirection { get; set; } = string.Empty;
        public decimal Cost { get; set; }
        public string Finish { get; set; } = string.Empty;
    }
}
