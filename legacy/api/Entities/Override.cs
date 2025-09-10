#nullable disable

namespace api.Entities
{
    public partial class Override
    {
        public int Ovrid { get; set; }
        public int VendorId { get; set; }
        public string Name { get; set; }
        public int Sales { get; set; }
        public decimal Commission { get; set; }
        public decimal Total { get; set; }
        public int Agentid { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime Wkending { get; set; }
    }
}
