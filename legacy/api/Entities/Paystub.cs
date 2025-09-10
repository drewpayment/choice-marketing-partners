#nullable disable

namespace api.Entities
{
    public partial class Paystub
    {
        public int Id { get; set; }
        public int AgentId { get; set; }
        public string AgentName { get; set; }
        public int VendorId { get; set; }
        public string VendorName { get; set; }
        public decimal Amount { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime WeekendDate { get; set; }
        public int ModifiedBy { get; set; }
    }
}
