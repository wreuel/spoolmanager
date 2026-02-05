using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SpoolManager.Server.Domain;
using SpoolManager.Server.Domain.Dto;
using SpoolManager.Server.Domain.Entities;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class FilamentController : ControllerBase
    {
        private readonly SpoolManagerDbContext _context;
        private readonly ILogger<FilamentController> _logger;

        public FilamentController(
            SpoolManagerDbContext context,
            ILogger<FilamentController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Create(FilamentCreate filamentCreate)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filamentCreate.Name))
                {
                    return BadRequest(new { error = "Filament name is required" });
                }

                if (string.IsNullOrWhiteSpace(filamentCreate.Material))
                {
                    return BadRequest(new { error = "Material is required" });
                }

                _logger.LogInformation("Creating filament with name: {FilamentName}", filamentCreate.Name);

                // Check if brand exists
                var brand = await _context.Brands.FindAsync(filamentCreate.BrandId);
                if (brand == null)
                {
                    _logger.LogWarning("Brand with Id {BrandId} not found", filamentCreate.BrandId);
                    return NotFound(new { error = $"Brand with Id {filamentCreate.BrandId} not found" });
                }

                var filament = new Filament
                {
                    Registered = DateTimeOffset.UtcNow,
                    BrandId = filamentCreate.BrandId,
                    Name = filamentCreate.Name,
                    Material = filamentCreate.Material,
                    Price = filamentCreate.Price,
                    Density = filamentCreate.Density,
                    Diameter = filamentCreate.Diameter,
                    WeightGrams = filamentCreate.WeightGrams,
                    SpoolWeightGrams = filamentCreate.SpoolWeightGrams,
                    SpoolType = filamentCreate.SpoolType,
                    Comment = filamentCreate.Comment,
                    SettingsExtruderTemp = filamentCreate.SettingsExtruderTemp,
                    SettingsBedTemp = filamentCreate.SettingsBedTemp,
                    ColorHex = filamentCreate.ColorHex,
                    ExternalId = filamentCreate.ExternalId,
                    MultiColorHexes = filamentCreate.MultiColorHexes,
                    MultiColorDirection = filamentCreate.MultiColorDirection,
                    Cost = filamentCreate.Cost,
                    Finish = filamentCreate.Finish
                };

                _context.Filaments.Add(filament);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created filament with Id: {FilamentId}", filament.Id);

                return CreatedAtAction(nameof(GetById), new { id = filament.Id }, filament);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating filament");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred",
                    message = ex.Message
                });
            }
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetList()
        {
            try
            {
                _logger.LogInformation("Fetching all filaments");

                var filaments = await _context.Filaments
                    .Include(f => f.Brand)
                    .OrderBy(f => f.Brand.Name)
                        .ThenBy(f => f.Name)
                    .ToListAsync();

                _logger.LogInformation("Successfully fetched {Count} filaments", filaments.Count);

                return Ok(filaments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching filaments");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching filaments",
                    message = ex.Message
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                _logger.LogInformation("Fetching filament with Id: {FilamentId}", id);

                var filament = await _context.Filaments
                    .Include(f => f.Brand)
                    .FirstOrDefaultAsync(f => f.Id == id);

                if (filament == null)
                {
                    _logger.LogWarning("Filament with Id {FilamentId} not found", id);
                    return NotFound(new { error = $"Filament with Id {id} not found" });
                }

                _logger.LogInformation("Successfully fetched filament with Id: {FilamentId}", id);

                return Ok(filament);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching filament with Id: {FilamentId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching filament",
                    message = ex.Message
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Edit(int id, FilamentEdit filamentEdit)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(filamentEdit.Name))
                {
                    return BadRequest(new { error = "Filament name is required" });
                }

                if (string.IsNullOrWhiteSpace(filamentEdit.Material))
                {
                    return BadRequest(new { error = "Material is required" });
                }

                _logger.LogInformation("Editing filament with Id: {FilamentId}", id);

                var filament = await _context.Filaments.FindAsync(id);

                if (filament == null)
                {
                    _logger.LogWarning("Filament with Id {FilamentId} not found", id);
                    return NotFound(new { error = $"Filament with Id {id} not found" });
                }

                // Check if brand exists
                var brand = await _context.Brands.FindAsync(filamentEdit.BrandId);
                if (brand == null)
                {
                    _logger.LogWarning("Brand with Id {BrandId} not found", filamentEdit.BrandId);
                    return NotFound(new { error = $"Brand with Id {filamentEdit.BrandId} not found" });
                }

                filament.BrandId = filamentEdit.BrandId;
                filament.Name = filamentEdit.Name;
                filament.Material = filamentEdit.Material;
                filament.Price = filamentEdit.Price;
                filament.Density = filamentEdit.Density;
                filament.Diameter = filamentEdit.Diameter;
                filament.WeightGrams = filamentEdit.WeightGrams;
                filament.SpoolWeightGrams = filamentEdit.SpoolWeightGrams;
                filament.SpoolType = filamentEdit.SpoolType;
                filament.Comment = filamentEdit.Comment;
                filament.SettingsExtruderTemp = filamentEdit.SettingsExtruderTemp;
                filament.SettingsBedTemp = filamentEdit.SettingsBedTemp;
                filament.ColorHex = filamentEdit.ColorHex;
                filament.ExternalId = filamentEdit.ExternalId;
                filament.MultiColorHexes = filamentEdit.MultiColorHexes;
                filament.MultiColorDirection = filamentEdit.MultiColorDirection;
                filament.Cost = filamentEdit.Cost;
                filament.Finish = filamentEdit.Finish;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated filament with Id: {FilamentId}", id);

                // Load brand for response
                await _context.Entry(filament)
                    .Reference(f => f.Brand)
                    .LoadAsync();

                return Ok(filament);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while editing filament with Id: {FilamentId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while editing filament",
                    message = ex.Message
                });
            }
        }
    }
}
