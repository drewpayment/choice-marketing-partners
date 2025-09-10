#nullable disable

namespace api.Entities
{
    public partial class Payroll
    {
        public int Id { get; set; }
        public int AgentId { get; set; }
        public string AgentName { get; set; }
        public decimal Amount { get; set; }
        public bool IsPaid { get; set; }
        public int VendorId { get; set; }
        public DateTime PayDate { get; set; }
    }
}
