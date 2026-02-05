using Microsoft.AspNetCore.Authorization;

namespace SpoolManager.Server.Authorizations.User
{
    public class CheckCurrentUserRequirement : IAuthorizationRequirement { }
    public class CheckCurrentUserAuthHandler(CurrentUser currentUser) : AuthorizationHandler<CheckCurrentUserRequirement>
    {
        protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, CheckCurrentUserRequirement requirement)
        {
            if (currentUser.User is not null)
            {
                if (currentUser.IsAdmin)
                {
                    context.Succeed(requirement);
                    return Task.CompletedTask;
                }

                context.Succeed(requirement);
            }

            return Task.CompletedTask;
        }
    }
}
