using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Infrastructure;
using SpoolManager.Server.Authorizations.User;

namespace SpoolManager.Server.Authorizations.AdminByPass
{
    public class AdminByPassRolesHandler(CurrentUser currentUser) : AuthorizationHandler<RolesAuthorizationRequirement>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, RolesAuthorizationRequirement requirement)
        {
            if (currentUser.User is not null)
            {
                if (currentUser.IsAdmin)
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }

                if (requirement.AllowedRoles.Any(x => context.User.IsInRole(x.ToString())))
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }
            }

            return Task.CompletedTask;
        }
    }
}
