#nullable disable

namespace api.Entities
{
    public partial class Comment
    {
        public int Id { get; set; }
        public int OnPost { get; set; }
        public int FromUser { get; set; }
        public string Body { get; set; }
        public bool Active { get; set; }

        public virtual User FromUserNavigation { get; set; }
        public virtual Post OnPostNavigation { get; set; }
    }
}
