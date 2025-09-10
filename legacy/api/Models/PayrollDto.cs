namespace api.Models;

public class PayrollDto
{
  public int Id { get; set; }
  public int AgentId { get; set; }
  public string AgentName { get; set; }
  public decimal Amount { get; set; }
  public int VendorId { get; set; }
  public string VendorName { get; set; }
  public int ModifiedBy { get; set; }
  public DateTime IssueDate { get; set; }
  public DateTime WeekendDate { get; set; }
}

public class PayrollRequestDto
{
  public DateTime StartDate { get; set; }
  public DateTime EndDate { get; set; }
  public int[] Employees { get; set; }
  public int[] Vendors { get; set; }
}
