using api.Models;

namespace api.Interfaces;

public interface IUserService
{
  Task<UserDto> GetUserByEmployeeId(int userId);
}
