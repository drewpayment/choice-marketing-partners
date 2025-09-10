#nullable disable

namespace api.Entities
{
    public partial class TaggingTag
    {
        public int Id { get; set; }
        public int? TagGroupId { get; set; }
        public string Slug { get; set; }
        public string Name { get; set; }
        public bool Suggest { get; set; }
        public int Count { get; set; }

        public virtual TaggingTagGroup TagGroup { get; set; }
    }
}
