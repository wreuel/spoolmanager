using SpoolManager.Server.External.Data;

namespace SpoolManager.Server.External.Interfaces
{
    public interface ISpoolManDbClient
    {
        Task<ICollection<FilamentData>> GetFilamentsAsync();
    }
}
