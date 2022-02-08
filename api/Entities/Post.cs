#nullable disable

namespace api.Entities
{
    public partial class Post
    {
        public Post()
        {
            Comments = new HashSet<Comment>();
        }

        public int Id { get; set; }
        public int AuthorId { get; set; }
        public string Title { get; set; }
        public string Body { get; set; }
        public string Slug { get; set; }
        public bool Active { get; set; }

        public virtual User Author { get; set; }
        public virtual ICollection<Comment> Comments { get; set; }
    }
}
