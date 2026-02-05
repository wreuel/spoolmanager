namespace SpoolManager.Server.Domain.Entities
{
    public class Brand
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        //public DateTimeOffset Registered { get; set; }

        // Navigation
        public ICollection<Filament> Filaments { get; set; } = new List<Filament>();
    }

}
