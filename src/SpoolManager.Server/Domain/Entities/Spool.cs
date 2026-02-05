namespace SpoolManager.Server.Domain.Entities
{
    public class Spool
    {
        public int Id { get; set; }
        public string Comment { get; set; }
        public int FilamentId { get; set; }
        public DateTimeOffset? FirstUsed { get; set; }
        public decimal InitialWeight { get; set; }
        public decimal UsedWeight { get; set; }
        public DateTimeOffset? LastUsed { get; set; }
        public string Location { get; set; }
        public string LotNumber { get; set; }
        public decimal Price { get; set; }
        public DateTimeOffset Registered { get; set; }
        public decimal SpoolWeight { get; set; }
        public Filament Filament { get; set; }

        public decimal CostPerGram => Price / InitialWeight;

        public decimal RemainingGrams => InitialWeight - PrintJobSpools.Sum(pjf => pjf.GramsUsed);

        public string ShowName => $"{Filament.Brand.Name} - {Filament.Material} -  {Filament.Name}";
        public ICollection<PrintJobSpool> PrintJobSpools { get; set; } = new List<PrintJobSpool>();
    }
}
