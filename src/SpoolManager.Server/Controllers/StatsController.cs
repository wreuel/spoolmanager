using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SpoolManager.Server.Domain;
using SpoolManager.Server.Domain.Dto;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class StatsController : ControllerBase
    {
        private readonly SpoolManagerDbContext _context;
        private readonly ILogger<StatsController> _logger;

        public StatsController(SpoolManagerDbContext context, ILogger<StatsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            try
            {
                _logger.LogInformation("Fetching stats summary");

                var summary = new StatsSummary
                {
                    BrandCount = await _context.Brands.CountAsync(),
                    FilamentCount = await _context.Filaments.CountAsync(),
                    SpoolCount = await _context.Spools.CountAsync(),
                    PrintJobCount = await _context.PrintJobs.CountAsync()
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching stats summary");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching stats",
                    message = ex.Message
                });
            }
        }
    }
}
