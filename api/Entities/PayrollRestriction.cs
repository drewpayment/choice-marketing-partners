#nullable disable

namespace api.Entities
{
    public partial class PayrollRestriction
    {
        public int Id { get; set; }
        public int Hour { get; set; }
        public int Minute { get; set; }
        public int ModifiedBy { get; set; }
    }
}
