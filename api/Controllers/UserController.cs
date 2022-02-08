using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[Route("api/users")]
[ApiController]
public class UserController : ControllerBase
{
  private readonly IUserService _userService;

  public UserController(IUserService userService)
  {
    _userService = userService;
  }

  [Route("{uid:int}")]
  [HttpGet]
  public async Task<ActionResult<UserDto>> GetUser(int uid)
  {
    var user = await _userService.GetUser(uid);

    if (user != null) return user;

    return BadRequest("User not found!");
  }

}
