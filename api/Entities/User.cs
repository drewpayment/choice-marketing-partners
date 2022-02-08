#nullable disable

namespace api.Entities
{
    public partial class User
    {
        public User()
        {
            Comments = new HashSet<Comment>();
            EmployeeUsers = new HashSet<EmployeeUser>();
            Posts = new HashSet<Post>();
            UserNotifications = new HashSet<UserNotification>();
        }

        public int Uid { get; set; }
        public int Id { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public string Password { get; set; }
        public string RememberToken { get; set; }
        public string Role { get; set; }

        public virtual ICollection<Comment> Comments { get; set; }
        public virtual ICollection<EmployeeUser> EmployeeUsers { get; set; }
        public virtual ICollection<Post> Posts { get; set; }
        public virtual ICollection<UserNotification> UserNotifications { get; set; }
    }
}
