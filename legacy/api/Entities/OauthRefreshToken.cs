#nullable disable

namespace api.Entities
{
    public partial class OauthRefreshToken
    {
        public string Id { get; set; }
        public string AccessTokenId { get; set; }
        public bool Revoked { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }
}
