using api.Interfaces;
using api.Models;
using Microsoft.AspNetCore.Mvc;

namespace api.Controllers;

[Route("api/v2/payrolls")]
[ApiController]
public class PayrollController : ControllerBase
{

  private readonly IPayrollService _service;

  public PayrollController(IPayrollService service)
  {
    _service = service;
  }

  [Route("search")]
  [HttpPost]
  public async Task<ActionResult<IEnumerable<PayrollDto>>> GetPayrolls([FromBody] PayrollRequestDto requestDto)
  {
    var payrolls = await _service.GetPayrolls(requestDto);

    return Ok(payrolls);
  }

}
