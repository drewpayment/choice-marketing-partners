#nullable disable

namespace api.Entities
{
    public partial class Permission
    {
        public Permission()
        {
            EmployeePermissions = new HashSet<EmployeePermission>();
        }

        public int Id { get; set; }
        public int EmpId { get; set; }
        public bool IsActive { get; set; }

        public virtual ICollection<EmployeePermission> EmployeePermissions { get; set; }
    }
}
