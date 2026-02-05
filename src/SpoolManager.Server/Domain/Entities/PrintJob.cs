namespace SpoolManager.Server.Domain.Entities
{
    public class PrintJob
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public DateTimeOffset PrintDate { get; set; }
        public TimeSpan duration { get; set; }
        public string? FileLink { get; set; }
        // Navigation
        public ICollection<PrintJobSpool> PrintJobSpool { get; set; } = new List<PrintJobSpool>();

        // Optional energy tracking
        public decimal? EnergyKwh { get; set; }
        public decimal? EnergyCost { get; set; }

        // Computed property for total filament cost
        public decimal TotalFilamentCost => PrintJobSpool.Sum(pjf => pjf.GramsUsed * pjf.Spool.CostPerGram);

        // Computed total cost including energy
        public decimal TotalCost => TotalFilamentCost + (EnergyCost ?? 0);
    }
}