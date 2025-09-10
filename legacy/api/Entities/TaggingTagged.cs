#nullable disable

namespace api.Entities
{
    public partial class TaggingTagged
    {
        public int Id { get; set; }
        public int TaggableId { get; set; }
        public string TaggableType { get; set; }
        public string TagName { get; set; }
        public string TagSlug { get; set; }
    }
}
