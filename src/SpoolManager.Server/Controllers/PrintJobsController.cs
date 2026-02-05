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
    public class PrintJobsController : ControllerBase
    {
        private readonly SpoolManagerDbContext _context;
        private readonly ILogger<PrintJobsController> _logger;

        public PrintJobsController(
            SpoolManagerDbContext context,
            ILogger<PrintJobsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetAll()
        {
            var printJobs = await _context.PrintJobs
                .Include(pj => pj.PrintJobSpool)
                    .ThenInclude(pjs => pjs.Spool)
                        .ThenInclude(s => s.Filament)
                            .ThenInclude(f => f.Brand)
                .OrderByDescending(pj => pj.PrintDate)
                .ToListAsync();
            return Ok(printJobs);
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] PrintJobCreate printJob)
        {
            try
            {
                _logger.LogInformation("Creating print job: {PrintJobName}", printJob.Name);

                // Validate spool references
                if (printJob.PrintJobSpool == null || !printJob.PrintJobSpool.Any())
                {
                    _logger.LogWarning("Print job creation failed: No spools specified");
                    return BadRequest(new { error = "At least one spool must be specified" });
                }

                // Verify all spools exist and load them for update
                var spoolIds = printJob.PrintJobSpool.Select(pjs => pjs.SpoolId).ToList();
                var existingSpools = await _context.Spools
                    .Where(s => spoolIds.Contains(s.Id))
                    .ToListAsync();

                var missingSpoolIds = spoolIds.Except(existingSpools.Select(s => s.Id)).ToList();
                if (missingSpoolIds.Any())
                {
                    _logger.LogWarning("Print job creation failed: Spools not found: {MissingSpoolIds}", string.Join(", ", missingSpoolIds));
                    return NotFound(new { error = $"Spools not found: {string.Join(", ", missingSpoolIds)}" });
                }

                // Create PrintJob entity
                var newPrintJob = new PrintJob
                {
                    Name = printJob.Name,
                    PrintDate = printJob.PrintDate,
                    duration = new TimeSpan(printJob.HoursDuration, printJob.MinutesDuration, 0),
                    FileLink = printJob.FileLink,
                    EnergyKwh = printJob.EnergyKwh,
                    EnergyCost = printJob.EnergyCost,
                    PrintJobSpool = printJob.PrintJobSpool.Select(pjs => new PrintJobSpool
                    {
                        SpoolId = pjs.SpoolId,
                        GramsUsed = pjs.GramsUsed
                    }).ToList()
                };

                _context.PrintJobs.Add(newPrintJob);

                // Update spool usage information
                foreach (var printJobSpool in printJob.PrintJobSpool)
                {
                    var spool = existingSpools.First(s => s.Id == printJobSpool.SpoolId);

                    // Update used weight
                    spool.UsedWeight += printJobSpool.GramsUsed;

                    // Update FirstUsed if this is the first time using the spool
                    if (!spool.FirstUsed.HasValue)
                    {
                        spool.FirstUsed = printJob.PrintDate;
                        _logger.LogInformation("Setting FirstUsed for spool {SpoolId} to {PrintDate}", spool.Id, printJob.PrintDate);
                    }

                    // Always update LastUsed to the print date
                    spool.LastUsed = printJob.PrintDate;

                    _logger.LogInformation("Updated spool {SpoolId}: UsedWeight += {GramsUsed}, LastUsed = {PrintDate}",
                        spool.Id, printJobSpool.GramsUsed, printJob.PrintDate);
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully created print job with Id: {PrintJobId}", newPrintJob.Id);

                return CreatedAtAction(nameof(GetById), new { id = newPrintJob.Id }, newPrintJob);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while creating print job");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while creating print job",
                    message = ex.Message
                });
            }
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                _logger.LogInformation("Fetching print job with Id: {PrintJobId}", id);

                var printJob = await _context.PrintJobs
                    .Include(pj => pj.PrintJobSpool)
                        .ThenInclude(pjs => pjs.Spool)
                            .ThenInclude(s => s.Filament)
                                .ThenInclude(f => f.Brand)
                    .FirstOrDefaultAsync(pj => pj.Id == id);

                if (printJob == null)
                {
                    _logger.LogWarning("Print job with Id {PrintJobId} not found", id);
                    return NotFound(new { error = $"Print job with Id {id} not found" });
                }

                _logger.LogInformation("Successfully fetched print job with Id: {PrintJobId}", id);

                return Ok(printJob);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while fetching print job with Id: {PrintJobId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while fetching print job",
                    message = ex.Message
                });
            }
        }
    }
}
