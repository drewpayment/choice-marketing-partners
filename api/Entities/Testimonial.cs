#nullable disable

namespace api.Entities
{
    public partial class Testimonial
    {
        public int Id { get; set; }
        public string Content { get; set; }
        public string Location { get; set; }
        public int TestimonialType { get; set; }
    }
}
