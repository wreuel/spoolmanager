using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using SpoolManager.Server.External.Configuration;
using SpoolManager.Server.External.Data;
using SpoolManager.Server.External.Interfaces;
using System.Text.Json;

namespace SpoolManager.Server.External.Implementations
{
    public class SpoolManDbClient : ISpoolManDbClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SpoolManDbClient> _logger;
        private readonly SpoolManDbOptions _options;
        private readonly IMemoryCache _memoryCache;
        public SpoolManDbClient(
            HttpClient httpClient,
            IOptions<SpoolManDbOptions> options,
            ILogger<SpoolManDbClient> logger, IMemoryCache memoryCache)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
            _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
        }

        public async Task<ICollection<FilamentData>> GetFilamentsAsync()
        {
            const string cacheKey = "filaments_cache";

            // Check if cached
            if (_memoryCache.TryGetValue(cacheKey, out ICollection<FilamentData> cachedFilaments))
            {
                _logger.LogInformation("Returning filaments from cache");
                return cachedFilaments;
            }

            try
            {
                _logger.LogInformation("Fetching filaments from SpoolmanDB");

                var response = await _httpClient.GetAsync("filaments.json");
                response.EnsureSuccessStatusCode();


                var filaments = await response.Content.ReadFromJsonAsync<List<FilamentData>>(new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                    PropertyNameCaseInsensitive = true
                });

                _logger.LogInformation("Successfully fetched {Count} filaments from SpoolmanDB", filaments?.Count ?? 0);

                // Save to cache with 24-hour expiration
                _memoryCache.Set(cacheKey, filaments, new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
                });


                return filaments ?? new List<FilamentData>();
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "HTTP request error while fetching filaments from SpoolmanDB");
                throw new InvalidOperationException("Failed to fetch filaments from SpoolmanDB", ex);
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON deserialization error while parsing filaments from SpoolmanDB");
                throw new InvalidOperationException("Failed to parse filaments data from SpoolmanDB", ex);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching filaments from SpoolmanDB");
                throw;
            }
        }
    }
}
