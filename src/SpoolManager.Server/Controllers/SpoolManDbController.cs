using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SpoolManager.Server.External.Interfaces;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    public class SpoolManDbController : ControllerBase
    {
        private readonly ISpoolManDbClient _spoolManDbClient;
        private readonly ILogger<SpoolManDbController> _logger;

        public SpoolManDbController(
            ISpoolManDbClient spoolManDbClient,
            ILogger<SpoolManDbController> logger)
        {
            _spoolManDbClient = spoolManDbClient;
            _logger = logger;
        }

        [HttpGet("filaments")]
        public async Task<IActionResult> GetFilaments()
        {
            try
            {
                var filaments = await _spoolManDbClient.GetFilamentsAsync();
                return Ok(filaments);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Failed to fetch filaments from SpoolmanDB");
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    error = "Failed to fetch filaments from external source",
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while getting filaments");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred",
                    message = ex.Message
                });
            }
        }
    }
}
