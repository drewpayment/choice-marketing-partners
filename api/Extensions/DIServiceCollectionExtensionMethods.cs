using api.Interfaces;
using api.Services;

namespace api.Extensions;

public static class DIServiceCollectionExtensionMethods
{

  public static void AddServiceDependencies(this IServiceCollection services)
  {
    services.AddScoped<IUserService, UserService>();
  }

}
