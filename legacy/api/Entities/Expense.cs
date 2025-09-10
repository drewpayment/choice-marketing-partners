#nullable disable

namespace api.Entities
{
    public partial class Expense
    {
        public int Expid { get; set; }
        public int VendorId { get; set; }
        public string Type { get; set; }
        public decimal Amount { get; set; }
        public string Notes { get; set; }
        public int Agentid { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime Wkending { get; set; }
    }
}
