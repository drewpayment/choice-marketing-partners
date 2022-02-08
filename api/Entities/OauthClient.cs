#nullable disable

namespace api.Entities
{
    public partial class OauthClient
    {
        public int Id { get; set; }
        public long? UserId { get; set; }
        public string Name { get; set; }
        public string Secret { get; set; }
        public string Redirect { get; set; }
        public bool PersonalAccessClient { get; set; }
        public bool PasswordClient { get; set; }
        public bool Revoked { get; set; }
    }
}
