#nullable disable

namespace api.Entities
{
    public partial class Employee
    {
        public Employee()
        {
            EmployeeInvoices = new HashSet<EmployeeInvoice>();
            EmployeePermissions = new HashSet<EmployeePermission>();
            EmployeeUsers = new HashSet<EmployeeUser>();
            ManagerEmployeeEmployees = new HashSet<ManagerEmployee>();
            ManagerEmployeeManagers = new HashSet<ManagerEmployee>();
            UserNotifications = new HashSet<UserNotification>();
        }

        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string PhoneNo { get; set; }
        public string Address { get; set; }
        public string Address2 { get; set; }
        public string City { get; set; }
        public string State { get; set; }
        public string PostalCode { get; set; }
        public string Country { get; set; }
        public bool IsActive { get; set; }
        public bool IsAdmin { get; set; }
        public bool IsMgr { get; set; }
        public string SalesId1 { get; set; }
        public string SalesId2 { get; set; }
        public string SalesId3 { get; set; }
        public bool HiddenPayroll { get; set; }

        public virtual ICollection<EmployeeInvoice> EmployeeInvoices { get; set; }
        public virtual ICollection<EmployeePermission> EmployeePermissions { get; set; }
        public virtual ICollection<EmployeeUser> EmployeeUsers { get; set; }
        public virtual ICollection<ManagerEmployee> ManagerEmployeeEmployees { get; set; }
        public virtual ICollection<ManagerEmployee> ManagerEmployeeManagers { get; set; }
        public virtual ICollection<UserNotification> UserNotifications { get; set; }
    }
}
