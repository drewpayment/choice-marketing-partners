#nullable disable

namespace api.Entities
{
    public partial class PersonalAccessToken
    {
        public long Id { get; set; }
        public string TokenableType { get; set; }
        public long TokenableId { get; set; }
        public string Name { get; set; }
        public string Token { get; set; }
        public string Abilities { get; set; }
    }
}
