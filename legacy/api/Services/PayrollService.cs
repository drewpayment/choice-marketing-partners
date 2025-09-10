using api.Data;
using api.Interfaces;
using api.Models;
using Microsoft.EntityFrameworkCore;
using MySql.EntityFrameworkCore.Extensions;

namespace api.Services;

public class PayrollService : IPayrollService
{

  async Task<IEnumerable<PayrollDto>> IPayrollService.GetPayrolls(PayrollRequestDto requestParams)
  {
    await using var context = new DataContext();

    var qry = context.Paystubs.AsNoTracking();

    if (requestParams.Employees is {Length: > 0})
    {
      if (requestParams.Employees.Length < 2)
      {
        var employeeId = requestParams.Employees[0];

        if (employeeId != -1)
        {
          qry = qry.Where(x => x.AgentId == employeeId);
        }
      }
      else
      {
        qry = qry.Where(x => requestParams.Employees.Contains(x.AgentId));
      }
    }

    if (requestParams.Vendors is {Length: > 0})
    {
      if (requestParams.Vendors.Length < 2)
      {
        var vendorId = requestParams.Vendors[0];

        if (vendorId != -1)
        {
          qry = qry.Where(x => x.VendorId == vendorId);
        }
      }
      else
      {
        qry = qry.Where(x => requestParams.Vendors.Contains(x.VendorId));
      }
    }

    var dbf = EF.Functions;
    qry = qry.Where(x => x.IssueDate.Date >= requestParams.StartDate.Date
                         && x.IssueDate.Date <= requestParams.EndDate.Date);
    // qry = qry.Where(x =>
    //   dbf.DateDiffDay(x.IssueDate.Date, requestParams.StartDate.Date) > -1
    //   && dbf.DateDiffDay(x.IssueDate.Date, requestParams.EndDate.Date) < 1);

    var payrolls = await qry.Select(x => new PayrollDto
    {
      Id = x.Id,
      AgentId = x.AgentId,
      AgentName = x.AgentName,
      Amount = x.Amount,
      VendorId = x.VendorId,
      VendorName = x.VendorName,
      ModifiedBy = x.ModifiedBy,
      IssueDate = x.IssueDate,
      WeekendDate = x.WeekendDate
    }).ToListAsync();

    return payrolls;
  }

}
