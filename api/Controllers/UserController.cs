using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[Route("api/v2/users")]
[ApiController]
public class UserController : ControllerBase
{
  private readonly IUserService _userService;

  public UserController(IUserService userService)
  {
    _userService = userService;
  }

  [Route("{id:int}")]
  [HttpGet]
  public async Task<ActionResult<UserDto>> GetUser(int id)
  {
    var user = await _userService.GetUserByEmployeeId(id);

    if (user != null) return user;

    return BadRequest("User not found!");
  }

}
