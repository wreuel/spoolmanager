using Microsoft.AspNetCore.Authorization;
using SpoolManager.Server.Authorizations.AdminByPass;
using SpoolManager.Server.Authorizations.User;

namespace SpoolManager.Server.Authorizations
{
    public static class AuthorizationHandlerExtensions
    {
        public static AuthorizationBuilder AddAdminByPassClaims(this AuthorizationBuilder builder)
        {
            builder.Services.AddScoped<IAuthorizationHandler, AdminBypassClaimsHandler>();
            return builder;
        }

        public static AuthorizationBuilder AddAdminByPassRoles(this AuthorizationBuilder builder)
        {
            builder.Services.AddScoped<IAuthorizationHandler, AdminByPassRolesHandler>();
            return builder;
        }

        //public static AuthorizationBuilder AddRoleOrClaim(this AuthorizationBuilder builder)
        //{
        //    builder.Services.AddScoped<IAuthorizationHandler, RoleOrClaimAuthHandler>();
        //    return builder;
        //}

        public static AuthorizationBuilder AddCurrentUserHandler(this AuthorizationBuilder builder)
        {
            builder.Services.AddScoped<IAuthorizationHandler, CheckCurrentUserAuthHandler>();
            return builder;
        }
    }
}
