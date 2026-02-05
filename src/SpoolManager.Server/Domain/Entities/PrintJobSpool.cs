namespace SpoolManager.Server.Domain.Entities
{
    public class PrintJobSpool
    {
        public int Id { get; set; }
        public int PrintJobId { get; set; }
        public int SpoolId { get; set; }

        public decimal GramsUsed { get; set; }

        // Navigation
        public PrintJob PrintJob { get; set; } = null!;
        public Spool Spool { get; set; } = null!;
    }
}
