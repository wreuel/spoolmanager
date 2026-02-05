namespace SpoolManager.Server.Domain.Entities
{
    public class Filament
    {
        public int Id { get; set; }
        public DateTimeOffset Registered { get; set; }
        public int BrandId { get; set; }
        public string Name { get; set; }
        public string Material { get; set; } = null!;
        public decimal Price { get; set; }
        public double Density { get; set; }
        public double Diameter { get; set; }
        public decimal WeightGrams { get; set; }
        public decimal SpoolWeightGrams { get; set; }
        public string SpoolType { get; set; }
        public string Comment { get; set; }
        public List<int> SettingsExtruderTemp { get; set; }
        public List<int> SettingsBedTemp { get; set; }
        public string ColorHex { get; set; } = null!;
        public string ExternalId { get; set; }
        public string MultiColorHexes { get; set; }
        public string MultiColorDirection { get; set; }
        public decimal Cost { get; set; }
        public string Finish { get; set; }
        // Navigation
        public Brand Brand { get; set; } = null!;

        public string FullName => $"{Brand.Name} - {Name} ({Material},{Diameter},{WeightGrams / 1000}g)";
    }
}
