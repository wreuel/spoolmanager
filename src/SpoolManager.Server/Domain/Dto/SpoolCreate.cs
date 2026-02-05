using TypeGen.Core.TypeAnnotations;

namespace SpoolManager.Server.Domain.Dto
{
    public class SpoolCreate
    {
        [TsOptional]
        public int? FilamentId { get; set; }
        [TsOptional]
        public DateTimeOffset? FirstUsed { get; set; }

        [TsOptional]
        public DateTimeOffset? LastUsed { get; set; }
        public decimal Price { get; set; }
        public decimal InitialWeight { get; set; }
        public decimal UsedWeight { get; set; }
        public string LotNumber { get; set; } = string.Empty;
        public string? Location { get; set; } = string.Empty;
        public string? Comment { get; set; } = string.Empty;
        public int Qty { get; set; }
        //public string Brand { get; set; }
        //public string Material { get; set; }
        //public decimal Price { get; set; }
        //public decimal Density { get; set; }
        //public decimal Diameter { get; set; }
        //public decimal WeightGrams { get; set; }
        //public decimal SpoolWeightGrams { get; set; }
        //public string SpoolType { get; set; }
        //public List<int> SettingsExtruderTemp { get; set; }
        //public List<int> SettingsBedTemp { get; set; }
        //public string ColorHex { get; set; } = null!;
        //public string MultiColorHexes { get; set; }
        //public string MultiColorDirection { get; set; }
        //public string Finish { get; set; }
        [TsOptional]
        public string? ExternalId { get; set; }

    }
}
