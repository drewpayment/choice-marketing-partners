#nullable disable

namespace api.Entities
{
    public partial class Document
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string FilePath { get; set; }
        public string MimeType { get; set; }
        public string UploadedBy { get; set; }
    }
}
