#nullable disable

namespace api.Entities
{
    public partial class Vendor
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public byte IsActive { get; set; }
    }
}
