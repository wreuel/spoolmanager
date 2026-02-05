namespace SpoolManager.Server.Domain.Dto
{
    public class PrintJobCreate
    {
        public string Name { get; set; } = null!;
        public DateTimeOffset PrintDate { get; set; }
        public int HoursDuration { get; set; }
        public int MinutesDuration { get; set; }
        public string? FileLink { get; set; }
        // Navigation
        public ICollection<PrintJobSpoolCreate> PrintJobSpool { get; set; } = new List<PrintJobSpoolCreate>();

        // Optional energy tracking
        public decimal? EnergyKwh { get; set; }
        public decimal? EnergyCost { get; set; }
    }
}
