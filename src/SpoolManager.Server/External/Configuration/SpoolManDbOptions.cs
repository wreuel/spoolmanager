namespace SpoolManager.Server.External.Configuration
{
    public class SpoolManDbOptions
    {
        public const string SectionName = "SpoolManDb";

        public string BaseUrl { get; set; } = string.Empty;
        public int TimeoutSeconds { get; set; } = 30;
    }
}
