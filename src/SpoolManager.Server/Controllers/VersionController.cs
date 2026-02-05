using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VersionController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get()
        {
            var assembly = typeof(VersionController).Assembly;
            var fileVersionInfo = FileVersionInfo.GetVersionInfo(assembly.Location);
            return Ok($"{fileVersionInfo.ProductName} - {fileVersionInfo.FileVersion} - {fileVersionInfo.ProductVersion}");
        }
    }
}
