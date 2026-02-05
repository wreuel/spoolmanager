namespace SpoolManager.Server.Domain.Dto
{
    public class SpoolEdit
    {
        public DateTimeOffset FirstUsed { get; set; }
        public DateTimeOffset LastUsed { get; set; }
        public decimal Price { get; set; }
        public decimal InitialWeight { get; set; }
        public string LotNumber { get; set; } = string.Empty;
        public string? Location { get; set; } = string.Empty;
        public string? Comment { get; set; } = string.Empty;
    }
}
