#nullable disable

namespace api.Entities
{
    public partial class EmployeeUser
    {
        public int EmployeeId { get; set; }
        public int UserId { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual User User { get; set; }
    }
}
