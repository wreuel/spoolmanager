using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SpoolManager.Server.Domain;
using SpoolManager.Server.Domain.Dto;
using SpoolManager.Server.Domain.Entities;
using SpoolManager.Server.External.Interfaces;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class SpoolController : ControllerBase
    {
        private readonly SpoolManagerDbContext _context;
        private readonly ISpoolManDbClient _spoolManDbClient;
        private readonly ILogger<SpoolController> _logger;

        public SpoolController(
            SpoolManagerDbContext context,
            ISpoolManDbClient spoolManDbClient,
            ILogger<SpoolController> logger)
        {
            _context = context;
            _spoolManDbClient = spoolManDbClient;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> CreateSpool(SpoolCreate spoolCreate)
        {
            try
            {
                if (!spoolCreate.FilamentId.HasValue && string.IsNullOrWhiteSpace(spoolCreate.ExternalId))
                {
                    return BadRequest(new { error = "Filament selection is required" });
                }

                Filament? filament = null;

                if (spoolCreate.FilamentId.HasValue)
                {
                    _logger.LogInformation("Creating spool using existing filament Id: {FilamentId}", spoolCreate.FilamentId);

                    filament = await _context.Filaments
                        .Include(f => f.Brand)
                        .FirstOrDefaultAsync(f => f.Id == spoolCreate.FilamentId.Value);

                    if (filament == null)
                    {
                        _logger.LogWarning("Filament with Id {FilamentId} not found", spoolCreate.FilamentId);
                        return NotFound(new { error = $"Filament with Id '{spoolCreate.FilamentId}' not found" });
                    }
                }
                else
                {
                    var externalId = spoolCreate.ExternalId?.Trim();
                    if (string.IsNullOrWhiteSpace(externalId))
                    {
                        return BadRequest(new { error = "ExternalId is required when FilamentId is not provided" });
                    }

                    _logger.LogInformation("Creating spool with ExternalId: {ExternalId}", externalId);

                    // Fetch filament data from SpoolManDB
                    var externalFilaments = await _spoolManDbClient.GetFilamentsAsync();
                    var externalFilament = externalFilaments.FirstOrDefault(f => f.Id == externalId);

                    if (externalFilament == null)
                    {
                        _logger.LogWarning("ExternalId {ExternalId} not found in SpoolManDB", externalId);
                        return NotFound(new { error = $"Filament with ExternalId '{externalId}' not found in SpoolManDB" });
                    }

                    // Get or create Brand
                    var brand = await _context.Brands
                        .FirstOrDefaultAsync(b => b.Name == externalFilament.Manufacturer);

                    if (brand == null)
                    {
                        _logger.LogInformation("Creating new brand: {BrandName}", externalFilament.Manufacturer);
                        brand = new Brand
                        {
                            Name = externalFilament.Manufacturer
                        };
                        _context.Brands.Add(brand);
                    }

                    // Get or create Filament
                    filament = await _context.Filaments
                        .FirstOrDefaultAsync(f => f.ExternalId == externalId);

                    if (filament == null)
                    {
                        _logger.LogInformation("Creating new filament from ExternalId: {ExternalId}", externalId);
                        filament = new Filament
                        {
                            Registered = DateTimeOffset.UtcNow,
                            Brand = brand,
                            Name = externalFilament.Name,
                            Material = externalFilament.Material,
                            Price = spoolCreate.Price,
                            Density = externalFilament.Density,
                            Diameter = externalFilament.Diameter,
                            WeightGrams = externalFilament.Weight,
                            SpoolWeightGrams = externalFilament.SpoolWeight ?? 0,
                            SpoolType = externalFilament.SpoolType ?? string.Empty,
                            Comment = string.Empty,
                            SettingsExtruderTemp = externalFilament.ExtruderTempRange ?? new List<int>() { externalFilament.ExtruderTemp ?? 0 },
                            SettingsBedTemp = externalFilament.BedTempRange ?? new List<int>() { externalFilament.BedTemp ?? 0 },
                            ColorHex = externalFilament.ColorHex ?? string.Empty,
                            ExternalId = externalFilament.Id,
                            MultiColorHexes = externalFilament.ColorHexes != null ? string.Join(",", externalFilament.ColorHexes) : string.Empty,
                            MultiColorDirection = externalFilament.MultiColorDirection ?? string.Empty,
                            Cost = spoolCreate.Price,
                            Finish = externalFilament.Finish ?? string.Empty
                        };
                        _context.Filaments.Add(filament);



                    }
                    else
                    {
                        _logger.LogInformation("Using existing filament with ExternalId: {ExternalId}", externalId);
                    }
                }

                // Create Spool
                var spoolsToAdd = new List<Spool>();

                for (int i = 0; i < spoolCreate.Qty; i++)
                {
                    var spool = new Spool
                    {
                        Filament = filament!,
                        FirstUsed = spoolCreate.FirstUsed,
                        InitialWeight = spoolCreate.InitialWeight,
                        UsedWeight = spoolCreate.UsedWeight,
                        LastUsed = spoolCreate.LastUsed,
                        LotNumber = spoolCreate.LotNumber ?? string.Empty,
                        Price = spoolCreate.Price,
                        Registered = DateTimeOffset.UtcNow,
                        SpoolWeight = filament!.SpoolWeightGrams,
                        Comment = spoolCreate.Comment ?? string.Empty,
                        Location = spoolCreate.Location ?? string.Empty,
                    };

                    spoolsToAdd.Add(spool);
                }

                _context.Spools.AddRange(spoolsToAdd);

                // Single atomic save - all or nothing
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created spool with Id: {SpoolId}", spoolsToAdd.Select(s => s.Id).ToArray());

                return CreatedAtAction(nameof(GetManyByIds), new { ids = spoolsToAdd.Select(s => s.Id).ToArray() }, spoolsToAdd);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Failed to fetch data from SpoolManDB");
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    error = "Failed to fetch data from external source",
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating spool");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred",
                    message = ex.Message
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, SpoolEdit spoolEdit)
        {
            try
            {
                _logger.LogInformation("Updating spool with Id: {SpoolId}", id);

                var spool = await _context.Spools.FirstOrDefaultAsync(s => s.Id == id);

                if (spool == null)
                {
                    _logger.LogWarning("Spool with Id {SpoolId} not found for update", id);
                    return NotFound(new { error = $"Spool with Id {id} not found" });
                }

                spool.FirstUsed = spoolEdit.FirstUsed;
                spool.LastUsed = spoolEdit.LastUsed;
                spool.Price = spoolEdit.Price;
                spool.InitialWeight = spoolEdit.InitialWeight;
                spool.LotNumber = spoolEdit.LotNumber ?? string.Empty;
                spool.Location = spoolEdit.Location ?? string.Empty;
                spool.Comment = spoolEdit.Comment ?? string.Empty;

                await _context.SaveChangesAsync();

                var updated = await _context.Spools
                    .Include(s => s.Filament)
                        .ThenInclude(f => f.Brand)
                    .Include(s => s.PrintJobSpools)
                    .FirstOrDefaultAsync(s => s.Id == id);

                _logger.LogInformation("Successfully updated spool with Id: {SpoolId}", id);

                return Ok(updated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while updating spool with Id: {SpoolId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while updating spool",
                    message = ex.Message
                });
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> List()
        {
            try
            {
                _logger.LogInformation("Fetching all spools");

                var spools = await _context.Spools
                    .Include(s => s.Filament)
                        .ThenInclude(f => f.Brand)
                    .Include(s => s.PrintJobSpools)
                    .OrderBy(s => s.Id)
                    .ToListAsync();

                _logger.LogInformation("Successfully fetched {Count} spools", spools.Count);

                return Ok(spools);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching spools");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching spools",
                    message = ex.Message
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                _logger.LogInformation("Fetching spool with Id: {SpoolId}", id);

                var spool = await _context.Spools
                    .Include(s => s.Filament)
                        .ThenInclude(f => f.Brand)
                    .Include(s => s.PrintJobSpools)
                    .FirstOrDefaultAsync(s => s.Id == id);

                if (spool == null)
                {
                    _logger.LogWarning("Spool with Id {SpoolId} not found", id);
                    return NotFound(new { error = $"Spool with Id {id} not found" });
                }

                _logger.LogInformation("Successfully fetched spool with Id: {SpoolId}", id);

                return Ok(spool);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching spool with Id: {SpoolId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching spool",
                    message = ex.Message
                });
            }
        }

        [HttpGet("batch")]
        public async Task<IActionResult> GetManyByIds([FromQuery] int[] ids)
        {
            var spools = await _context.Spools.Where(s => ids.Contains(s.Id)).ToListAsync();
            return Ok(spools);
        }
    }
}
