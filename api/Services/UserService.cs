using api.Data;
using api.Interfaces;
using api.Models;
using Microsoft.EntityFrameworkCore;

namespace api.Services;

public class UserService : IUserService
{

  async Task<UserDto> IUserService.GetUser(int userId)
  {
    await using var context = new DataContext();

    var user = await context.Users.AsNoTracking()
      .Where(x => x.Uid == userId)
      .Select(x => new UserDto
      {
        Uid = x.Uid,
        Id = x.Id,
        Name = x.Name,
        Email = x.Email,
        Password = x.Password,
        RememberToken = x.RememberToken,
        Role = x.Role
      })
      .FirstOrDefaultAsync();

    return user;
  }

}
