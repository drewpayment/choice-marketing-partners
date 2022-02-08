#nullable disable

namespace api.Entities
{
    public partial class CompanyOption
    {
        public long Id { get; set; }
        public bool HasPaystubNotifications { get; set; }
    }
}
