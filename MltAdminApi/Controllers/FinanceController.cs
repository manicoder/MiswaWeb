using Microsoft.AspNetCore.Mvc;
using Mlt.Admin.Api.Services;
using Mlt.Admin.Api.Models.DTOs;
using Mlt.Admin.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace Mlt.Admin.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FinanceController : ControllerBase
{
    private readonly IFinanceService _financeService;
    private readonly ILogger<FinanceController> _logger;

    public FinanceController(IFinanceService financeService, ILogger<FinanceController> logger)
    {
        _financeService = financeService;
        _logger = logger;
    }

    #region Dashboard & Analytics

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardData([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            // Convert dates to UTC if they are provided
            DateTime? startDateUtc = null;
            DateTime? endDateUtc = null;

            if (startDate.HasValue)
            {
                startDateUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            }

            if (endDate.HasValue)
            {
                // Set end date to end of day in UTC
                endDateUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            }

            var dashboardData = await _financeService.GetDashboardDataAsync(startDateUtc, endDateUtc);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = dashboardData
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching dashboard data");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch dashboard data",
                Error = ex.Message
            });
        }
    }

    [HttpGet("sales-analytics")]
    public async Task<IActionResult> GetSalesAnalytics([FromQuery] string? startDate, [FromQuery] string? endDate, [FromQuery] string? currency)
    {
        try
        {
            // Convert string dates to UTC DateTime objects
            DateTime? startDateTime = null;
            DateTime? endDateTime = null;

            if (!string.IsNullOrEmpty(startDate))
            {
                if (DateTime.TryParse(startDate, out var parsedStartDate))
                {
                    startDateTime = DateTime.SpecifyKind(parsedStartDate, DateTimeKind.Utc);
                }
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                if (DateTime.TryParse(endDate, out var parsedEndDate))
                {
                    // Set end date to end of day in UTC
                    endDateTime = DateTime.SpecifyKind(parsedEndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var analytics = await _financeService.GetSalesAnalyticsAsync(startDateTime, endDateTime, currency);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = analytics
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sales analytics");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch sales analytics",
                Error = ex.Message
            });
        }
    }

    [HttpGet("product-analytics")]
    public async Task<IActionResult> GetProductAnalytics([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string? currency)
    {
        try
        {
            var analytics = await _financeService.GetProductAnalyticsAsync(startDate, endDate, currency);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = analytics
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product analytics");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch product analytics",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Sales Orders

    [HttpGet("sales/orders")]
    public async Task<IActionResult> GetSalesOrders(
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        [FromQuery] string? status,
        [FromQuery] string? fulfillmentStatus,
        [FromQuery] string? search,
        [FromQuery] decimal? minAmount,
        [FromQuery] decimal? maxAmount,
        [FromQuery] string? currency,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            // Convert string dates to UTC DateTime objects
            DateTime? startDateTime = null;
            DateTime? endDateTime = null;

            if (!string.IsNullOrEmpty(startDate))
            {
                if (DateTime.TryParse(startDate, out var parsedStartDate))
                {
                    startDateTime = DateTime.SpecifyKind(parsedStartDate, DateTimeKind.Utc);
                }
            }

            if (!string.IsNullOrEmpty(endDate))
            {
                if (DateTime.TryParse(endDate, out var parsedEndDate))
                {
                    // Set end date to end of day in UTC
                    endDateTime = DateTime.SpecifyKind(parsedEndDate.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                }
            }

            var result = await _financeService.GetSalesOrdersAsync(
                startDateTime, endDateTime, status, fulfillmentStatus, search, minAmount, maxAmount, currency, page, limit);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sales orders");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch sales orders",
                Error = ex.Message
            });
        }
    }

    [HttpGet("sales/orders/{id}")]
    public async Task<IActionResult> GetSalesOrder(string id)
    {
        try
        {
            var order = await _financeService.GetSalesOrderAsync(id);
            if (order == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Sales order not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = order
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sales order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch sales order",
                Error = ex.Message
            });
        }
    }

    [HttpGet("sales/summary")]
    public async Task<IActionResult> GetSalesSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? currency)
    {
        try
        {
            var summary = await _financeService.GetSalesSummaryAsync(startDate, endDate, currency);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching sales summary");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch sales summary",
                Error = ex.Message
            });
        }
    }

    [HttpGet("cogs/summary")]
    public async Task<IActionResult> GetCOGSSummary(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? currency)
    {
        try
        {
            // Convert dates to UTC if they are provided
            DateTime? startDateUtc = null;
            DateTime? endDateUtc = null;

            if (startDate.HasValue)
            {
                startDateUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            }

            if (endDate.HasValue)
            {
                // Set end date to end of day in UTC
                endDateUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            }

            var summary = await _financeService.GetCOGSSummaryAsync(startDateUtc, endDateUtc, currency);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching COGS summary");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch COGS summary",
                Error = ex.Message
            });
        }
    }

    [HttpGet("cogs/analytics")]
    public async Task<IActionResult> GetCOGSAnalytics(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? currency,
        [FromQuery] string? platform)
    {
        try
        {
            // Convert dates to UTC if they are provided
            DateTime? startDateUtc = null;
            DateTime? endDateUtc = null;

            if (startDate.HasValue)
            {
                startDateUtc = DateTime.SpecifyKind(startDate.Value, DateTimeKind.Utc);
            }

            if (endDate.HasValue)
            {
                // Set end date to end of day in UTC
                endDateUtc = DateTime.SpecifyKind(endDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
            }

            var analytics = await _financeService.GetCOGSAnalyticsAsync(startDateUtc, endDateUtc, currency, platform);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = analytics
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching COGS analytics");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch COGS analytics",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Expenses

    [HttpGet("expenses")]
    public async Task<IActionResult> GetExpenses(
        [FromQuery] DateTime? startDate, 
        [FromQuery] DateTime? endDate, 
        [FromQuery] string? type, 
        [FromQuery] string? category,
        [FromQuery] string? status,
        [FromQuery] decimal? minAmount,
        [FromQuery] decimal? maxAmount,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var result = await _financeService.GetExpensesPaginatedAsync(
                startDate, endDate, type, category, status, minAmount, maxAmount, search, page, limit);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching expenses");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch expenses",
                Error = ex.Message
            });
        }
    }

    [HttpGet("expenses/{id}")]
    public async Task<IActionResult> GetExpense(string id)
    {
        try
        {
            var expense = await _financeService.GetExpenseAsync(id);
            if (expense == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Expense not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = expense
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching expense {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch expense",
                Error = ex.Message
            });
        }
    }

    [HttpPost("expenses")]
    public async Task<IActionResult> CreateExpense([FromBody] CreateExpenseDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var expense = await _financeService.CreateExpenseAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Expense created successfully",
                Data = expense
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating expense");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create expense",
                Error = ex.Message
            });
        }
    }

    [HttpPut("expenses/{id}")]
    public async Task<IActionResult> UpdateExpense(string id, [FromBody] UpdateExpenseDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var expense = await _financeService.UpdateExpenseAsync(id, request);
            if (expense == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Expense not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Expense updated successfully",
                Data = expense
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating expense {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update expense",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("expenses/{id}")]
    public async Task<IActionResult> DeleteExpense(string id)
    {
        try
        {
            var result = await _financeService.DeleteExpenseAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Expense not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Expense deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting expense {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete expense",
                Error = ex.Message
            });
        }
    }

    [HttpGet("expense-categories")]
    public async Task<IActionResult> GetExpenseCategories()
    {
        try
        {
            var categories = await _financeService.GetExpenseCategoriesAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = categories
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching expense categories");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch expense categories",
                Error = ex.Message
            });
        }
    }

    [HttpGet("payment-modes")]
    public async Task<IActionResult> GetPaymentModes()
    {
        try
        {
            var paymentModes = await _financeService.GetPaymentModesAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = paymentModes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching payment modes");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch payment modes",
                Error = ex.Message
            });
        }
    }

    [HttpGet("expense-tags")]
    public async Task<IActionResult> GetExpenseTags()
    {
        try
        {
            var expenseTags = await _financeService.GetExpenseTagsAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = expenseTags
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching expense tags");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch expense tags",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Chart of Accounts

    [HttpGet("chart-of-accounts")]
    public async Task<IActionResult> GetChartOfAccounts()
    {
        try
        {
            var accounts = await _financeService.GetChartOfAccountsAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = accounts
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching chart of accounts");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch chart of accounts",
                Error = ex.Message
            });
        }
    }

    [HttpGet("chart-of-accounts/{code}")]
    public async Task<IActionResult> GetChartOfAccount(string code)
    {
        try
        {
            var account = await _financeService.GetChartOfAccountAsync(code);
            if (account == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Chart of account not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = account
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching chart of account {Code}", code);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch chart of account",
                Error = ex.Message
            });
        }
    }

    [HttpPost("chart-of-accounts")]
    public async Task<IActionResult> CreateChartOfAccount([FromBody] CreateChartOfAccountDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var account = await _financeService.CreateChartOfAccountAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Chart of account created successfully",
                Data = account
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating chart of account");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create chart of account",
                Error = ex.Message
            });
        }
    }

    [HttpPut("chart-of-accounts/{code}")]
    public async Task<IActionResult> UpdateChartOfAccount(string code, [FromBody] UpdateChartOfAccountDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var account = await _financeService.UpdateChartOfAccountAsync(code, request);
            if (account == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Chart of account not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Chart of account updated successfully",
                Data = account
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating chart of account {Code}", code);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update chart of account",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("chart-of-accounts/{code}")]
    public async Task<IActionResult> DeleteChartOfAccount(string code)
    {
        try
        {
            var result = await _financeService.DeleteChartOfAccountAsync(code);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Chart of account not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Chart of account deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting chart of account {Code}", code);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete chart of account",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Product Costs

    [HttpGet("product-costs")]
    public async Task<IActionResult> GetProductCosts([FromQuery] string? productId, [FromQuery] string? sku)
    {
        try
        {
            var costs = await _financeService.GetProductCostsAsync(productId, sku);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = costs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product costs");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch product costs",
                Error = ex.Message
            });
        }
    }

    [HttpGet("product-costs/{id}")]
    public async Task<IActionResult> GetProductCost(int id)
    {
        try
        {
            var cost = await _financeService.GetProductCostAsync(id);
            if (cost == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Product cost not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = cost
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching product cost {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch product cost",
                Error = ex.Message
            });
        }
    }

    [HttpPost("product-costs")]
    public async Task<IActionResult> CreateProductCost([FromBody] CreateProductCostDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var cost = await _financeService.CreateProductCostAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Product cost created successfully",
                Data = cost
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating product cost");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create product cost",
                Error = ex.Message
            });
        }
    }

    [HttpPut("product-costs/{id}")]
    public async Task<IActionResult> UpdateProductCost(int id, [FromBody] UpdateProductCostDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var cost = await _financeService.UpdateProductCostAsync(id, request);
            if (cost == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Product cost not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Product cost updated successfully",
                Data = cost
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating product cost {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update product cost",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Payouts

    [HttpGet("payouts")]
    public async Task<IActionResult> GetPayouts([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string? status)
    {
        try
        {
            var payouts = await _financeService.GetPayoutsAsync(startDate, endDate, status);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = payouts
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching payouts");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch payouts",
                Error = ex.Message
            });
        }
    }

    [HttpGet("payouts/{id}")]
    public async Task<IActionResult> GetPayout(int id)
    {
        try
        {
            var payout = await _financeService.GetPayoutAsync(id);
            if (payout == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Payout not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = payout
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching payout {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch payout",
                Error = ex.Message
            });
        }
    }

    [HttpPost("payouts")]
    public async Task<IActionResult> CreatePayout([FromBody] CreatePayoutDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var payout = await _financeService.CreatePayoutAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Payout created successfully",
                Data = payout
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payout");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create payout",
                Error = ex.Message
            });
        }
    }

    [HttpPost("payouts/{id}/reconcile")]
    public async Task<IActionResult> ReconcilePayout(int id, [FromBody] ReconcilePayoutDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var reconciliation = await _financeService.ReconcilePayoutAsync(id, request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Payout reconciled successfully",
                Data = reconciliation
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconciling payout {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to reconcile payout",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Tax Records

    [HttpGet("tax-records")]
    public async Task<IActionResult> GetTaxRecords([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate, [FromQuery] string? country, [FromQuery] string? taxType)
    {
        try
        {
            var taxRecords = await _financeService.GetTaxRecordsAsync(startDate, endDate, country, taxType);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = taxRecords
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching tax records");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch tax records",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Reports

    [HttpGet("reports")]
    public async Task<IActionResult> GetReports([FromQuery] string? type, [FromQuery] string? format)
    {
        try
        {
            var reports = await _financeService.GetReportsAsync(type, format);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = reports
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching reports");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch reports",
                Error = ex.Message
            });
        }
    }

    [HttpPost("reports/generate")]
    public async Task<IActionResult> GenerateReport([FromBody] ReportRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var report = await _financeService.GenerateReportAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Report generated successfully",
                Data = report
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to generate report",
                Error = ex.Message
            });
        }
    }

    [HttpGet("reports/{id}/download")]
    public async Task<IActionResult> DownloadReport(int id)
    {
        try
        {
            var report = await _financeService.GetReportAsync(id);
            if (report == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Report not found"
                });
            }

            var fileBytes = await _financeService.DownloadReportAsync(id);
            
            // Cast the report to access its properties
            if (report is Report reportObj)
            {
                return File(fileBytes, "application/octet-stream", reportObj.FileName);
            }
            
            return File(fileBytes, "application/octet-stream", $"report_{id}.pdf");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading report {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to download report",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Suppliers

    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers([FromQuery] string? search, [FromQuery] bool? isActive)
    {
        try
        {
            var suppliers = await _financeService.GetSuppliersAsync(search, isActive);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = suppliers
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching suppliers");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch suppliers",
                Error = ex.Message
            });
        }
    }

    [HttpGet("suppliers/{id}")]
    public async Task<IActionResult> GetSupplier(string id)
    {
        try
        {
            var supplier = await _financeService.GetSupplierAsync(id);
            if (supplier == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = supplier
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching supplier {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch supplier",
                Error = ex.Message
            });
        }
    }

    [HttpPost("suppliers")]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var supplier = await _financeService.CreateSupplierAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier created successfully",
                Data = supplier
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating supplier");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create supplier",
                Error = ex.Message
            });
        }
    }

    [HttpPut("suppliers/{id}")]
    public async Task<IActionResult> UpdateSupplier(string id, [FromBody] UpdateSupplierDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var supplier = await _financeService.UpdateSupplierAsync(id, request);
            if (supplier == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier updated successfully",
                Data = supplier
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating supplier {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update supplier",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("suppliers/{id}")]
    public async Task<IActionResult> DeleteSupplier(string id)
    {
        try
        {
            var success = await _financeService.DeleteSupplierAsync(id);
            if (!success)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting supplier {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete supplier",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Purchase Orders

    [HttpGet("purchase-orders")]
    public async Task<IActionResult> GetPurchaseOrders(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? supplierId,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] decimal? minAmount,
        [FromQuery] decimal? maxAmount,
        [FromQuery] bool? isReceived,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var result = await _financeService.GetPurchaseOrdersAsync(
                startDate, endDate, supplierId, status, search, minAmount, maxAmount, isReceived, page, limit);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching purchase orders");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch purchase orders",
                Error = ex.Message
            });
        }
    }

    [HttpGet("purchase-orders/{id}")]
    public async Task<IActionResult> GetPurchaseOrder(string id)
    {
        try
        {
            var purchaseOrder = await _financeService.GetPurchaseOrderAsync(id);
            if (purchaseOrder == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Purchase order not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = purchaseOrder
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching purchase order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch purchase order",
                Error = ex.Message
            });
        }
    }

    [HttpPost("purchase-orders")]
    public async Task<IActionResult> CreatePurchaseOrder([FromBody] CreatePurchaseOrderDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var purchaseOrder = await _financeService.CreatePurchaseOrderAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Purchase order created successfully",
                Data = purchaseOrder
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating purchase order");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create purchase order",
                Error = ex.Message
            });
        }
    }

    [HttpPut("purchase-orders/{id}")]
    public async Task<IActionResult> UpdatePurchaseOrder(string id, [FromBody] UpdatePurchaseOrderDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var purchaseOrder = await _financeService.UpdatePurchaseOrderAsync(id, request);
            if (purchaseOrder == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Purchase order not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Purchase order updated successfully",
                Data = purchaseOrder
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating purchase order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update purchase order",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("purchase-orders/{id}")]
    public async Task<IActionResult> DeletePurchaseOrder(string id)
    {
        try
        {
            var success = await _financeService.DeletePurchaseOrderAsync(id);
            if (!success)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Purchase order not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Purchase order deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting purchase order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete purchase order",
                Error = ex.Message
            });
        }
    }

    [HttpPost("purchase-orders/{id}/receive")]
    public async Task<IActionResult> ReceivePurchaseOrder(string id, [FromBody] ReceivePurchaseOrderDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var purchaseOrder = await _financeService.ReceivePurchaseOrderAsync(id, request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Purchase order received successfully",
                Data = purchaseOrder
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error receiving purchase order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to receive purchase order",
                Error = ex.Message
            });
        }
    }

    [HttpGet("purchase-orders/summary")]
    public async Task<IActionResult> GetPurchaseOrderSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        try
        {
            var summary = await _financeService.GetPurchaseOrderSummaryAsync(startDate, endDate);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching purchase order summary");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch purchase order summary",
                Error = ex.Message
            });
        }
    }

    // ===== PURCHASE ORDER JOURNEY WORKFLOW ENDPOINTS =====

    [HttpGet("purchase-orders/{id}/workflow")]
    public async Task<IActionResult> GetPurchaseOrderWorkflow(string id)
    {
        try
        {
            var workflow = await _financeService.GetPurchaseOrderWorkflowAsync(id);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = workflow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching purchase order workflow {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch purchase order workflow",
                Error = ex.Message
            });
        }
    }

    [HttpPut("purchase-orders/{id}/status")]
    public async Task<IActionResult> UpdatePurchaseOrderStatus(string id, [FromBody] UpdatePurchaseOrderStatusDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var purchaseOrder = await _financeService.UpdatePurchaseOrderStatusAsync(id, request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Purchase order status updated successfully",
                Data = purchaseOrder
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Invalid status transition",
                Error = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating purchase order status {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update purchase order status",
                Error = ex.Message
            });
        }
    }

    [HttpGet("purchase-orders/{id}/transitions")]
    public async Task<IActionResult> GetAvailableStatusTransitions(string id)
    {
        try
        {
            var transitions = await _financeService.GetAvailableStatusTransitionsAsync(id);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = transitions
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching available status transitions for purchase order {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch available status transitions",
                Error = ex.Message
            });
        }
    }

    [HttpGet("purchase-orders/{id}/journey")]
    public async Task<IActionResult> GetPurchaseOrderJourney(string id)
    {
        try
        {
            var journey = await _financeService.GetPurchaseOrderJourneyAsync(id);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = journey
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching purchase order journey {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch purchase order journey",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Supplier Payments

    [HttpGet("supplier-payments")]
    public async Task<IActionResult> GetSupplierPayments(
        [FromQuery] string? purchaseOrderId,
        [FromQuery] string? supplierId,
        [FromQuery] string? status,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var result = await _financeService.GetSupplierPaymentsAsync(
                purchaseOrderId, supplierId, status, startDate, endDate, page, limit);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching supplier payments");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch supplier payments",
                Error = ex.Message
            });
        }
    }

    [HttpGet("supplier-payments/{id}")]
    public async Task<IActionResult> GetSupplierPayment(string id)
    {
        try
        {
            var payment = await _financeService.GetSupplierPaymentAsync(id);
            if (payment == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier payment not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = payment
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching supplier payment {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch supplier payment",
                Error = ex.Message
            });
        }
    }

    [HttpPost("supplier-payments")]
    public async Task<IActionResult> CreateSupplierPayment([FromBody] CreateSupplierPaymentDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var payment = await _financeService.CreateSupplierPaymentAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier payment created successfully",
                Data = payment
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating supplier payment");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create supplier payment",
                Error = ex.Message
            });
        }
    }

    [HttpPut("supplier-payments/{id}")]
    public async Task<IActionResult> UpdateSupplierPayment(string id, [FromBody] UpdateSupplierPaymentDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors.Select(e => e.ErrorMessage)))
                });
            }

            var payment = await _financeService.UpdateSupplierPaymentAsync(id, request);
            if (payment == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier payment not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier payment updated successfully",
                Data = payment
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating supplier payment {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update supplier payment",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("supplier-payments/{id}")]
    public async Task<IActionResult> DeleteSupplierPayment(string id)
    {
        try
        {
            var success = await _financeService.DeleteSupplierPaymentAsync(id);
            if (!success)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Supplier payment not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Supplier payment deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting supplier payment {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete supplier payment",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Accounting System

    [HttpGet("account-groups")]
    public async Task<IActionResult> GetAccountGroups([FromQuery] AccountGroupFilterDto? filter)
    {
        try
        {
            var result = await _financeService.GetAccountGroupsAsync(filter);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching account groups");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch account groups",
                Error = ex.Message
            });
        }
    }

    [HttpGet("account-groups/{id}")]
    public async Task<IActionResult> GetAccountGroup(string id)
    {
        try
        {
            var result = await _financeService.GetAccountGroupAsync(id);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Account group not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching account group {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch account group",
                Error = ex.Message
            });
        }
    }

    [HttpPost("account-groups")]
    public async Task<IActionResult> CreateAccountGroup([FromBody] CreateAccountGroupDto request)
    {
        try
        {
            var result = await _financeService.CreateAccountGroupAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating account group");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create account group",
                Error = ex.Message
            });
        }
    }

    [HttpPut("account-groups/{id}")]
    public async Task<IActionResult> UpdateAccountGroup(string id, [FromBody] UpdateAccountGroupDto request)
    {
        try
        {
            var result = await _financeService.UpdateAccountGroupAsync(id, request);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Account group not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating account group {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update account group",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("account-groups/{id}")]
    public async Task<IActionResult> DeleteAccountGroup(string id)
    {
        try
        {
            var result = await _financeService.DeleteAccountGroupAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Account group not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Account group deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account group {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete account group",
                Error = ex.Message
            });
        }
    }

    [HttpGet("ledgers")]
    public async Task<IActionResult> GetLedgers([FromQuery] LedgerFilterDto? filter)
    {
        try
        {
            var result = await _financeService.GetLedgersAsync(filter);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ledgers");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch ledgers",
                Error = ex.Message
            });
        }
    }

    [HttpGet("ledgers/{id}")]
    public async Task<IActionResult> GetLedger(string id)
    {
        try
        {
            var result = await _financeService.GetLedgerAsync(id);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Ledger not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ledger {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch ledger",
                Error = ex.Message
            });
        }
    }

    [HttpPost("ledgers")]
    public async Task<IActionResult> CreateLedger([FromBody] CreateLedgerDto request)
    {
        try
        {
            var result = await _financeService.CreateLedgerAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating ledger");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create ledger",
                Error = ex.Message
            });
        }
    }

    [HttpPut("ledgers/{id}")]
    public async Task<IActionResult> UpdateLedger(string id, [FromBody] UpdateLedgerDto request)
    {
        try
        {
            var result = await _financeService.UpdateLedgerAsync(id, request);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Ledger not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating ledger {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update ledger",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("ledgers/{id}")]
    public async Task<IActionResult> DeleteLedger(string id)
    {
        try
        {
            var result = await _financeService.DeleteLedgerAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Ledger not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Ledger deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting ledger {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete ledger",
                Error = ex.Message
            });
        }
    }

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions([FromQuery] TransactionFilterDto? filter)
    {
        try
        {
            var result = await _financeService.GetTransactionsAsync(filter);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching transactions");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch transactions",
                Error = ex.Message
            });
        }
    }

    [HttpGet("transactions/{id}")]
    public async Task<IActionResult> GetTransaction(string id)
    {
        try
        {
            var result = await _financeService.GetTransactionAsync(id);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Transaction not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching transaction {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch transaction",
                Error = ex.Message
            });
        }
    }

    [HttpPost("transactions")]
    public async Task<IActionResult> CreateTransaction([FromBody] CreateTransactionDto request)
    {
        try
        {
            var result = await _financeService.CreateTransactionAsync(request);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating transaction");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create transaction",
                Error = ex.Message
            });
        }
    }

    [HttpPut("transactions/{id}")]
    public async Task<IActionResult> UpdateTransaction(string id, [FromBody] UpdateTransactionDto request)
    {
        try
        {
            var result = await _financeService.UpdateTransactionAsync(id, request);
            if (result == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Transaction not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating transaction {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update transaction",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("transactions/{id}")]
    public async Task<IActionResult> DeleteTransaction(string id)
    {
        try
        {
            var result = await _financeService.DeleteTransactionAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Transaction not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Transaction deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting transaction {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete transaction",
                Error = ex.Message
            });
        }
    }

    [HttpPatch("transactions/{id}/approve")]
    public async Task<IActionResult> ApproveTransaction(string id)
    {
        try
        {
            var result = await _financeService.ApproveTransactionAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Transaction not found or cannot be approved"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Transaction approved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving transaction {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to approve transaction",
                Error = ex.Message
            });
        }
    }

    [HttpPatch("transactions/{id}/reject")]
    public async Task<IActionResult> RejectTransaction(string id)
    {
        try
        {
            var result = await _financeService.RejectTransactionAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Transaction not found or cannot be rejected"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Transaction rejected successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting transaction {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to reject transaction",
                Error = ex.Message
            });
        }
    }

    [HttpGet("trial-balance")]
    public async Task<IActionResult> GetTrialBalance([FromQuery] DateTime asOfDate)
    {
        try
        {
            var result = await _financeService.GetTrialBalanceAsync(asOfDate);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching trial balance");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch trial balance",
                Error = ex.Message
            });
        }
    }

    [HttpGet("ledgers/{id}/balance")]
    public async Task<IActionResult> GetLedgerBalance(string id)
    {
        try
        {
            var result = await _financeService.GetLedgerBalanceAsync(id);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ledger balance {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch ledger balance",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Accounting Reports

    [HttpGet("reports/daybook")]
    public async Task<IActionResult> GetDayBookReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string? type = null,
        [FromQuery] string? ledgerId = null)
    {
        try
        {
            var result = await _financeService.GetDayBookReportAsync(startDate, endDate, type, ledgerId);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching day book report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch day book report",
                Error = ex.Message
            });
        }
    }

    [HttpGet("reports/ledger")]
    public async Task<IActionResult> GetLedgerReport(
        [FromQuery] string ledgerId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var result = await _financeService.GetLedgerReportAsync(ledgerId, startDate, endDate);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching ledger report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch ledger report",
                Error = ex.Message
            });
        }
    }

    [HttpGet("reports/profit-loss")]
    public async Task<IActionResult> GetProfitLossReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var result = await _financeService.GetProfitLossReportAsync(startDate, endDate);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching profit & loss report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch profit & loss report",
                Error = ex.Message
            });
        }
    }

    [HttpGet("reports/balance-sheet")]
    public async Task<IActionResult> GetBalanceSheetReport([FromQuery] DateTime asOfDate)
    {
        try
        {
            // Convert DateTime to UTC to avoid PostgreSQL issues
            var asOfDateUtc = DateTime.SpecifyKind(asOfDate, DateTimeKind.Utc);
            var result = await _financeService.GetBalanceSheetReportAsync(asOfDateUtc);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching balance sheet report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch balance sheet report",
                Error = ex.Message
            });
        }
    }

    [HttpGet("reports/expenses")]
    public async Task<IActionResult> GetExpensesReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string? type = null,
        [FromQuery] string? status = null,
        [FromQuery] string? paymentMode = null)
    {
        try
        {
            var result = await _financeService.GetExpensesReportAsync(startDate, endDate, type, status, paymentMode);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching expenses report");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch expenses report",
                Error = ex.Message
            });
        }
    }

    #endregion

    #region Inventory Assets

    [HttpGet("inventory-assets")]
    public async Task<IActionResult> GetInventoryAssets(
        [FromQuery] string? sku,
        [FromQuery] string? supplier,
        [FromQuery] string? ledgerId)
    {
        try
        {
            var assets = await _financeService.GetInventoryAssetsAsync(sku, supplier, ledgerId);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = assets
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory assets");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch inventory assets",
                Error = ex.Message
            });
        }
    }

    [HttpGet("inventory-assets/{id}")]
    public async Task<IActionResult> GetInventoryAsset(string id)
    {
        try
        {
            var asset = await _financeService.GetInventoryAssetAsync(id);
            if (asset == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Inventory asset not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = asset
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory asset {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch inventory asset",
                Error = ex.Message
            });
        }
    }

    [HttpPost("inventory-assets")]
    public async Task<IActionResult> CreateInventoryAsset([FromBody] CreateInventoryAssetDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage))
                });
            }

            var asset = await _financeService.CreateInventoryAssetAsync(request);
            return CreatedAtAction(nameof(GetInventoryAsset), new { id = ((InventoryAsset)asset).Id }, new ApiResponse<object>
            {
                Success = true,
                Data = asset,
                Message = "Inventory asset created successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating inventory asset");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to create inventory asset",
                Error = ex.Message
            });
        }
    }

    [HttpPut("inventory-assets/{id}")]
    public async Task<IActionResult> UpdateInventoryAsset(string id, [FromBody] UpdateInventoryAssetDto request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid request data",
                    Error = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage))
                });
            }

            var asset = await _financeService.UpdateInventoryAssetAsync(id, request);
            if (asset == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Inventory asset not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = asset,
                Message = "Inventory asset updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating inventory asset {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to update inventory asset",
                Error = ex.Message
            });
        }
    }

    [HttpDelete("inventory-assets/{id}")]
    public async Task<IActionResult> DeleteInventoryAsset(string id)
    {
        try
        {
            var result = await _financeService.DeleteInventoryAssetAsync(id);
            if (!result)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Inventory asset not found"
                });
            }

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Inventory asset deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting inventory asset {Id}", id);
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to delete inventory asset",
                Error = ex.Message
            });
        }
    }

    [HttpGet("inventory-assets/summary")]
    public async Task<IActionResult> GetInventoryAssetSummary()
    {
        try
        {
            var summary = await _financeService.GetInventoryAssetSummaryAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory asset summary");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to fetch inventory asset summary",
                Error = ex.Message
            });
        }
    }

    [HttpPost("inventory-assets/sync")]
    public async Task<IActionResult> SyncInventoryFromProducts([FromBody] SyncInventoryRequestDto request)
    {
        try
        {
            var result = await _financeService.SyncInventoryFromProductsAsync(request.CreatedBy);
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result,
                Message = "Inventory sync completed successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing inventory from products");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to sync inventory from products",
                Error = ex.Message
            });
        }
    }

    [HttpPost("inventory-assets/calculate-value")]
    public async Task<IActionResult> CalculateInventoryValue()
    {
        try
        {
            var result = await _financeService.CalculateInventoryValueAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result,
                Message = "Inventory value calculated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating inventory value");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to calculate inventory value",
                Error = ex.Message
            });
        }
    }

    [HttpGet("inventory-assets/realtime-calculation")]
    public async Task<IActionResult> GetRealTimeInventoryCalculation()
    {
        try
        {
            var result = await _financeService.GetRealTimeInventoryCalculationAsync();
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Data = result,
                Message = "Real-time inventory calculation completed successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating real-time inventory");
            return StatusCode(500, new ApiResponse<object>
            {
                Success = false,
                Message = "Failed to calculate real-time inventory",
                Error = ex.Message
            });
        }
    }

    #endregion

    public class ApiResponse<T>
    {
        public bool Success { get; set; }
        public T? Data { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }
} 