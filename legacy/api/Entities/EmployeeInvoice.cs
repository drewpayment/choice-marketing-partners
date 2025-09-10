#nullable disable

namespace api.Entities
{
    public partial class EmployeeInvoice
    {
        public int EmployeeId { get; set; }
        public int InvoiceId { get; set; }

        public virtual Employee Employee { get; set; }
        public virtual Invoice Invoice { get; set; }
    }
}
