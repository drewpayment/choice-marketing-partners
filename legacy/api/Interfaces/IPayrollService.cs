using api.Models;

namespace api.Interfaces;

public interface IPayrollService
{
  Task<IEnumerable<PayrollDto>> GetPayrolls(PayrollRequestDto requestParams);
}
