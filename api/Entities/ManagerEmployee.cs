#nullable disable

namespace api.Entities
{
    public partial class ManagerEmployee
    {
        public long Id { get; set; }
        public int ManagerId { get; set; }
        public int EmployeeId { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual Employee Manager { get; set; }
    }
}
