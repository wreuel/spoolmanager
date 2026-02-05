namespace SpoolManager.Server.External.Data
{
    public class FilamentData
    {
        public string Id { get; set; }
        public string Manufacturer { get; set; }
        public string Name { get; set; }
        public string Material { get; set; }
        public double Density { get; set; }
        public decimal Weight { get; set; }
        public int WeightKg => (int)(Weight / 1000);
        public decimal? SpoolWeight { get; set; }
        public string SpoolType { get; set; }
        public double Diameter { get; set; }
        public string ColorHex { get; set; }
        public List<string> ColorHexes { get; set; }
        public int? ExtruderTemp { get; set; }
        public List<int> ExtruderTempRange { get; set; }
        public int? BedTemp { get; set; }
        public List<int> BedTempRange { get; set; }
        public string Finish { get; set; }
        public string MultiColorDirection { get; set; }
        public string Pattern { get; set; }
        public bool Translucent { get; set; }
        public bool Glow { get; set; }

        public string FullName => $"{Manufacturer} - {Name} ({Material},{Diameter},{WeightKg}Kg)";
    }
}
