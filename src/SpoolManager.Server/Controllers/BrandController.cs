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
    public class BrandController : ControllerBase
    {
        private readonly SpoolManagerDbContext _context;
        private readonly ILogger<BrandController> _logger;

        public BrandController(
            SpoolManagerDbContext context,
            ILogger<BrandController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> Create(BrandCreate brandCreate)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(brandCreate.Name))
                {
                    return BadRequest(new { error = "Brand name is required" });
                }

                _logger.LogInformation("Creating brand with name: {BrandName}", brandCreate.Name);

                // Check if brand already exists
                var existingBrand = await _context.Brands
                    .FirstOrDefaultAsync(b => b.Name == brandCreate.Name);

                if (existingBrand != null)
                {
                    _logger.LogWarning("Brand with name {BrandName} already exists", brandCreate.Name);
                    return Conflict(new { error = $"Brand with name '{brandCreate.Name}' already exists" });
                }

                var brand = new Brand
                {
                    Name = brandCreate.Name
                };

                _context.Brands.Add(brand);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created brand with Id: {BrandId}", brand.Id);

                return CreatedAtAction(nameof(GetById), new { id = brand.Id }, brand);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating brand");
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
                _logger.LogInformation("Fetching all brands");

                var brands = await _context.Brands
                    .Include(b => b.Filaments)
                    .OrderBy(b => b.Name)
                    .ToListAsync();

                _logger.LogInformation("Successfully fetched {Count} brands", brands.Count);

                return Ok(brands);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching brands");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching brands",
                    message = ex.Message
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                _logger.LogInformation("Fetching brand with Id: {BrandId}", id);

                var brand = await _context.Brands
                    .Include(b => b.Filaments)
                    .FirstOrDefaultAsync(b => b.Id == id);

                if (brand == null)
                {
                    _logger.LogWarning("Brand with Id {BrandId} not found", id);
                    return NotFound(new { error = $"Brand with Id {id} not found" });
                }

                _logger.LogInformation("Successfully fetched brand with Id: {BrandId}", id);

                return Ok(brand);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching brand with Id: {BrandId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching brand",
                    message = ex.Message
                });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Edit(int id, BrandEdit brandEdit)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(brandEdit.Name))
                {
                    return BadRequest(new { error = "Brand name is required" });
                }

                _logger.LogInformation("Editing brand with Id: {BrandId}", id);

                var brand = await _context.Brands.FindAsync(id);

                if (brand == null)
                {
                    _logger.LogWarning("Brand with Id {BrandId} not found", id);
                    return NotFound(new { error = $"Brand with Id {id} not found" });
                }

                // Check if another brand with the same name exists
                var existingBrand = await _context.Brands
                    .FirstOrDefaultAsync(b => b.Name == brandEdit.Name && b.Id != id);

                if (existingBrand != null)
                {
                    _logger.LogWarning("Another brand with name {BrandName} already exists", brandEdit.Name);
                    return Conflict(new { error = $"Another brand with name '{brandEdit.Name}' already exists" });
                }

                brand.Name = brandEdit.Name;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully updated brand with Id: {BrandId}", id);

                return Ok(brand);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while editing brand with Id: {BrandId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while editing brand",
                    message = ex.Message
                });
            }
        }
    }
}
