#nullable disable

namespace api.Entities
{
    public partial class TaggingTagGroup
    {
        public TaggingTagGroup()
        {
            TaggingTags = new HashSet<TaggingTag>();
        }

        public int Id { get; set; }
        public string Slug { get; set; }
        public string Name { get; set; }

        public virtual ICollection<TaggingTag> TaggingTags { get; set; }
    }
}
