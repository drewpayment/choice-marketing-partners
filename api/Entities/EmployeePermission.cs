#nullable disable

namespace api.Entities
{
    public partial class EmployeePermission
    {
        public int EmployeeId { get; set; }
        public int PermissionId { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual Permission Permission { get; set; }
    }
}
