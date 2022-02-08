namespace api.Models;

public class UserDto
{
  public int Uid { get; set; }
  public int Id { get; set; }
  public string Name { get; set; }
  public string Email { get; set; }
  public string Password { get; set; }
  public string RememberToken { get; set; }
  public string Role { get; set; }

  // relationships

}
