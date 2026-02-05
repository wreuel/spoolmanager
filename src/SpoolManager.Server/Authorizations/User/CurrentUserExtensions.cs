using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using SpoolManager.Server.Domain.Entities;
using System.Security.Claims;

namespace SpoolManager.Server.Authorizations.User
{
    public static class CurrentUserExtensions
    {
        public static IServiceCollection AddCurrentUser(this IServiceCollection services)
        {
            services.AddScoped<CurrentUser>();
            services.AddScoped<IClaimsTransformation, ClaimsTransformation>();
            return services;
        }

        private sealed class ClaimsTransformation(CurrentUser currentUser, UserManager<ApplicationUser> userManager) : IClaimsTransformation
        {
            public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
            {
                currentUser.Principal = principal;

                if (principal.FindFirstValue(ClaimTypes.NameIdentifier) is { Length: > 0 } id)
                {
                    currentUser.User = await userManager.FindByIdAsync(id);
                }

                return principal;
            }
        }
    }
}
