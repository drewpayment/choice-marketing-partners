#nullable disable

namespace api.Entities
{
    public partial class Invoice
    {
        public Invoice()
        {
            EmployeeInvoices = new HashSet<EmployeeInvoice>();
        }

        public int InvoiceId { get; set; }
        public string Vendor { get; set; }
        public DateTime SaleDate { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string Address { get; set; }
        public string City { get; set; }
        public string Status { get; set; }
        public string Amount { get; set; }
        public int Agentid { get; set; }
        public DateTime IssueDate { get; set; }
        public DateTime Wkending { get; set; }

        public virtual ICollection<EmployeeInvoice> EmployeeInvoices { get; set; }
    }
}
