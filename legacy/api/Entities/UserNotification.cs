#nullable disable

namespace api.Entities
{
    public partial class UserNotification
    {
        public long Id { get; set; }
        public int UserId { get; set; }
        public int EmployeeId { get; set; }
        public bool HasPaystubNotifier { get; set; }
        public byte? PaystubNotifierType { get; set; }
        public string NotifierDestination { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual User User { get; set; }
    }
}
