using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SpoolManager.Server.Domain;
using SpoolManager.Server.Domain.Dto;
using SpoolManager.Server.Domain.Entities;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SpoolManager.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IConfiguration _config;
        private readonly SpoolManagerDbContext _db;
        private readonly ILogger<UserController> _logger;

        public UserController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IConfiguration configuration,
            SpoolManagerDbContext db,
            ILogger<UserController> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _signInManager = signInManager ?? throw new ArgumentNullException(nameof(signInManager));
            _config = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register(CreateUserRequest createUserRequest)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(createUserRequest.Username) || string.IsNullOrWhiteSpace(createUserRequest.Password))
                {
                    return BadRequest(new { error = "Username and password are required" });
                }

                _logger.LogInformation("Attempting to register user: {Username}", createUserRequest.Username);

                var user = new ApplicationUser
                {
                    UserName = createUserRequest.Username,
                    Email = createUserRequest.Username
                };

                var result = await _userManager.CreateAsync(user, createUserRequest.Password);

                if (result.Succeeded)
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                    _logger.LogInformation("Successfully registered user: {Username}", createUserRequest.Username);

                    return Ok(new { message = "User registered successfully", userId = user.Id });
                }

                _logger.LogWarning("Failed to register user: {Username}. Errors: {Errors}",
                    createUserRequest.Username,
                    string.Join(", ", result.Errors.Select(e => e.Description)));

                return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while registering user: {Username}", createUserRequest.Username);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while registering user",
                    message = ex.Message
                });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest loginRequest)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(loginRequest.Username) || string.IsNullOrWhiteSpace(loginRequest.Password))
                {
                    return BadRequest(new { error = "Username and password are required" });
                }

                _logger.LogInformation("Login attempt for user: {Username}", loginRequest.Username);

                var user = await _userManager.FindByNameAsync(loginRequest.Username);
                if (user == null)
                {
                    _logger.LogWarning("Login failed: User not found: {Username}", loginRequest.Username);
                    return Unauthorized(new { error = "Invalid username or password" });
                }

                var result = await _signInManager.PasswordSignInAsync(user, loginRequest.Password, false, false);
                if (result.Succeeded)
                {
                    List<Claim> claims = await GetRolesAndClaims(_userManager, user);

                    var token = GenerateJwtToken(user, claims, _config);
                    var refreshToken = await GenerateRefreshTokenAsync(user.Id, _db);

                    var expiresIn = (int)(DateTime.UtcNow.AddMinutes(30) - DateTime.UtcNow).TotalSeconds;

                    _logger.LogInformation("Login successful for user: {Username}", loginRequest.Username);

                    return Ok(new LoginResponse
                    {
                        Token = token,
                        RefreshToken = refreshToken.Token,
                        ExpiresIn = expiresIn
                    });
                }

                _logger.LogWarning("Login failed: Invalid password for user: {Username}", loginRequest.Username);
                return Unauthorized(new { error = "Invalid username or password" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while logging in user: {Username}", loginRequest.Username);
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while logging in",
                    message = ex.Message
                });
            }
        }

        [HttpPost("refresh")]
        public async Task<IActionResult> RefreshToken(RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    return BadRequest(new { error = "Refresh token is required" });
                }

                _logger.LogInformation("Attempting to refresh token");

                var refreshToken = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Token == request.Token);
                if (refreshToken == null || refreshToken.ValidTo < DateTimeOffset.UtcNow)
                {
                    _logger.LogWarning("Invalid or expired refresh token");
                    return Unauthorized(new { error = "Invalid or expired refresh token" });
                }

                var user = await _userManager.FindByIdAsync(refreshToken.UserId);
                if (user == null)
                {
                    _logger.LogWarning("User not found for refresh token");
                    return Unauthorized(new { error = "User not found" });
                }

                List<Claim> claims = await GetRolesAndClaims(_userManager, user);
                var token = GenerateJwtToken(user, claims, _config);

                var refreshTokenExpiration = (int)(refreshToken.ValidTo - DateTimeOffset.UtcNow).TotalSeconds;

                if (refreshTokenExpiration < 300)
                {
                    _logger.LogInformation("Refresh token is about to expire, generating new one");
                    _db.RefreshTokens.Remove(refreshToken);
                    await _db.SaveChangesAsync();
                    refreshToken = await GenerateRefreshTokenAsync(user.Id, _db);
                }

                _logger.LogInformation("Token refreshed successfully for user: {UserId}", user.Id);

                return Ok(new RefreshTokenResponse
                {
                    Token = token,
                    RefreshToken = refreshToken.Token
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while refreshing token");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while refreshing token",
                    message = ex.Message
                });
            }
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout(RefreshTokenRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    return BadRequest(new { error = "Refresh token is required" });
                }

                _logger.LogInformation("Attempting to logout user for provided refresh token");

                var refreshToken = await _db.RefreshTokens.FirstOrDefaultAsync(x => x.Token == request.Token);
                if (refreshToken != null)
                {
                    _db.RefreshTokens.Remove(refreshToken);
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("Refresh token removed successfully for user {UserId}", refreshToken.UserId);
                }
                else
                {
                    _logger.LogWarning("Refresh token not found during logout attempt");
                }

                await _signInManager.SignOutAsync();

                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error while logging out user");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "An unexpected error occurred while logging out",
                    message = ex.Message
                });
            }
        }

        private static async Task<List<Claim>> GetRolesAndClaims(UserManager<ApplicationUser> userManager, ApplicationUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            List<Claim> claims = [];
            claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

            var claimsAssigned = await userManager.GetClaimsAsync(user);
            claims.AddRange(claimsAssigned);

            return claims;
        }

        static string GenerateJwtToken(ApplicationUser user, List<Claim> claims, IConfiguration config)
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            claims.Add(new Claim(ClaimTypes.Name, user.UserName!));
            claims.Add(new Claim(ClaimTypes.NameIdentifier, user.Id));

            var token = new JwtSecurityToken(
                claims: claims,
                issuer: config["Jwt:Issuer"],
                audience: config["Jwt:Audience"],
                expires: DateTime.UtcNow.AddMinutes(30),
                signingCredentials: creds);

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        static async Task<RefreshToken> GenerateRefreshTokenAsync(string userId, SpoolManagerDbContext db)
        {
            var randomNumber = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            string refreshToken = Convert.ToBase64String(randomNumber);

            RefreshToken refresh = new RefreshToken
            {
                Id = Guid.NewGuid(),
                Token = refreshToken,
                ValidTo = DateTimeOffset.UtcNow.AddHours(1),
                UserId = userId
            };

            db.RefreshTokens.Add(refresh);
            await db.SaveChangesAsync();

            return refresh;
        }
    }
}
