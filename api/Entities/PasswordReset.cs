#nullable disable

namespace api.Entities
{
    public partial class PasswordReset
    {
        public string Email { get; set; }
        public string Token { get; set; }
    }
}
