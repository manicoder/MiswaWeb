using Microsoft.EntityFrameworkCore;
using Mlt.Admin.Api.Data;
using MltAdminApi.Models;
using MltAdminApi.Models.DTOs;

namespace MltAdminApi.Services
{
    public class WarehouseService : IWarehouseService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<WarehouseService> _logger;

        public WarehouseService(ApplicationDbContext context, ILogger<WarehouseService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<WarehouseListResponse> GetWarehousesAsync()
        {
            try
            {
                var warehouses = await _context.Warehouses
                    .OrderByDescending(w => w.IsDefaultSource)
                    .ThenBy(w => w.Name)
                    .ToListAsync();

                var warehouseResponses = new List<WarehouseResponse>();

                foreach (var warehouse in warehouses)
                {
                    warehouseResponses.Add(await MapWarehouseToResponseAsync(warehouse));
                }

                return new WarehouseListResponse
                {
                    Warehouses = warehouseResponses,
                    TotalCount = warehouseResponses.Count
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouses");
                throw;
            }
        }

        public async Task<WarehouseResponse?> GetWarehouseByIdAsync(int id)
        {
            try
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == id);

                return warehouse == null ? null : await MapWarehouseToResponseAsync(warehouse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse with ID {WarehouseId}", id);
                throw;
            }
        }

        public async Task<WarehouseResponse?> GetWarehouseByCodeAsync(string code)
        {
            try
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Code == code);

                return warehouse == null ? null : await MapWarehouseToResponseAsync(warehouse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse with code {WarehouseCode}", code);
                throw;
            }
        }

        public async Task<WarehouseResponse> CreateWarehouseAsync(CreateWarehouseRequest request, string createdBy)
        {
            try
            {
                // Check if warehouse code already exists
                var existingWarehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Code == request.Code);

                if (existingWarehouse != null)
                {
                    throw new InvalidOperationException($"Warehouse with code '{request.Code}' already exists");
                }

                var warehouse = new Warehouse
                {
                    Name = request.Name,
                    Code = request.Code,
                    Description = request.Description,
                    Address = request.Address,
                    City = request.City,
                    State = request.State,
                    Country = request.Country,
                    PostalCode = request.PostalCode,
                    ContactPerson = request.ContactPerson,
                    ContactPhone = request.ContactPhone,
                    ContactEmail = request.ContactEmail,
                    IsActive = request.IsActive,
                    IsDefaultSource = request.IsDefaultSource,
                    CreatedBy = createdBy
                };

                // If this is set as default source, remove default from others
                if (request.IsDefaultSource)
                {
                    await ClearDefaultSourceAsync();
                }

                _context.Warehouses.Add(warehouse);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created warehouse {WarehouseName} with code {WarehouseCode}", 
                    warehouse.Name, warehouse.Code);

                return await MapWarehouseToResponseAsync(warehouse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating warehouse");
                throw;
            }
        }

        public async Task<WarehouseResponse?> UpdateWarehouseAsync(int id, UpdateWarehouseRequest request)
        {
            try
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == id);

                if (warehouse == null)
                    return null;

                // Update fields if provided
                if (!string.IsNullOrEmpty(request.Name))
                    warehouse.Name = request.Name;
                if (!string.IsNullOrEmpty(request.Code))
                    warehouse.Code = request.Code;
                if (request.Description != null)
                    warehouse.Description = request.Description;
                if (!string.IsNullOrEmpty(request.Address))
                    warehouse.Address = request.Address;
                if (request.City != null)
                    warehouse.City = request.City;
                if (request.State != null)
                    warehouse.State = request.State;
                if (request.Country != null)
                    warehouse.Country = request.Country;
                if (request.PostalCode != null)
                    warehouse.PostalCode = request.PostalCode;
                if (request.ContactPerson != null)
                    warehouse.ContactPerson = request.ContactPerson;
                if (request.ContactPhone != null)
                    warehouse.ContactPhone = request.ContactPhone;
                if (request.ContactEmail != null)
                    warehouse.ContactEmail = request.ContactEmail;
                if (request.IsActive.HasValue)
                    warehouse.IsActive = request.IsActive.Value;

                // Handle default source change
                if (request.IsDefaultSource.HasValue && request.IsDefaultSource.Value && !warehouse.IsDefaultSource)
                {
                    await ClearDefaultSourceAsync();
                    warehouse.IsDefaultSource = true;
                }
                else if (request.IsDefaultSource.HasValue && !request.IsDefaultSource.Value)
                {
                    warehouse.IsDefaultSource = false;
                }

                await _context.SaveChangesAsync();
                return await MapWarehouseToResponseAsync(warehouse);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating warehouse {WarehouseId}", id);
                throw;
            }
        }

        public async Task<bool> DeleteWarehouseAsync(int id)
        {
            try
            {
                var warehouse = await _context.Warehouses
                    .Include(w => w.SourceShipments)
                    .Include(w => w.DestinationShipments)
                    .FirstOrDefaultAsync(w => w.Id == id);

                if (warehouse == null)
                    return false;

                // Check if warehouse has any shipments
                if (warehouse.SourceShipments.Any() || warehouse.DestinationShipments.Any())
                {
                    throw new InvalidOperationException("Cannot delete warehouse that has shipments associated with it");
                }

                _context.Warehouses.Remove(warehouse);
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting warehouse {WarehouseId}", id);
                throw;
            }
        }

        public async Task<bool> SetDefaultSourceWarehouseAsync(int id)
        {
            try
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == id);

                if (warehouse == null || !warehouse.IsActive)
                    return false;

                await ClearDefaultSourceAsync();
                warehouse.IsDefaultSource = true;
                await _context.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting default source warehouse {WarehouseId}", id);
                throw;
            }
        }

        public async Task<WarehouseResponse?> GetWarehouseWithStatsAsync(int id)
        {
            return await GetWarehouseByIdAsync(id);
        }

        public async Task<List<WarehouseResponse>> GetActiveWarehousesAsync()
        {
            try
            {
                var warehouses = await _context.Warehouses
                    .Where(w => w.IsActive)
                    .OrderByDescending(w => w.IsDefaultSource)
                    .ThenBy(w => w.Name)
                    .ToListAsync();

                var responses = new List<WarehouseResponse>();
                foreach (var warehouse in warehouses)
                {
                    responses.Add(await MapWarehouseToResponseAsync(warehouse));
                }

                return responses;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active warehouses");
                throw;
            }
        }

        public async Task<bool> ValidateWarehouseTransferAsync(int sourceWarehouseId, int destinationWarehouseId)
        {
            try
            {
                if (sourceWarehouseId == destinationWarehouseId)
                    return false;

                var sourceWarehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == sourceWarehouseId && w.IsActive);

                var destinationWarehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.Id == destinationWarehouseId && w.IsActive);

                return sourceWarehouse != null && destinationWarehouse != null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating warehouse transfer");
                throw;
            }
        }

        public async Task<List<WarehouseTransferReportResponse>> GetWarehouseTransferReportsAsync(
            int? sourceWarehouseId = null, 
            int? destinationWarehouseId = null, 
            DateTime? startDate = null, 
            DateTime? endDate = null)
        {
            try
            {
                var query = _context.WarehouseShipments
                    .Include(s => s.SourceWarehouse)
                    .Include(s => s.DestinationWarehouse)
                    .Include(s => s.Items)
                    .AsQueryable();

                if (sourceWarehouseId.HasValue)
                    query = query.Where(s => s.SourceWarehouseId == sourceWarehouseId.Value);

                if (destinationWarehouseId.HasValue)
                    query = query.Where(s => s.DestinationWarehouseId == destinationWarehouseId.Value);

                if (startDate.HasValue)
                    query = query.Where(s => s.CreatedAt >= startDate.Value);

                if (endDate.HasValue)
                    query = query.Where(s => s.CreatedAt <= endDate.Value);

                var shipments = await query
                    .OrderByDescending(s => s.CreatedAt)
                    .ToListAsync();

                var reports = new List<WarehouseTransferReportResponse>();

                foreach (var shipment in shipments)
                {
                    var report = new WarehouseTransferReportResponse
                    {
                        ShipmentId = shipment.Id,
                        ShipmentNumber = shipment.ShipmentNumber,
                                            SourceWarehouseName = shipment.SourceWarehouse?.Name ?? "Unknown",
                    DestinationWarehouseName = shipment.DestinationWarehouse?.Name ?? "Unknown",
                        Status = shipment.Status,
                        CreatedAt = shipment.CreatedAt,
                        DispatchedAt = shipment.DispatchedAt,
                        ReceivedAt = shipment.ReceivedAt,
                        TotalItemsPlanned = shipment.Items.Sum(i => i.QuantityPlanned),
                        TotalItemsDispatched = shipment.Items.Sum(i => i.QuantityDispatched),
                        TotalItemsReceived = shipment.Items.Sum(i => i.QuantityReceived),
                        TotalValue = shipment.Items.Sum(i => i.QuantityPlanned * i.UnitPrice),
                        ItemVariances = shipment.Items.Select(i => new TransferItemVariance
                        {
                            ProductBarcode = i.ProductBarcode,
                            ProductTitle = i.ProductTitle,
                            Sku = i.Sku,
                            QuantityPlanned = i.QuantityPlanned,
                            QuantityDispatched = i.QuantityDispatched,
                            QuantityReceived = i.QuantityReceived,
                            DispatchVariance = i.QuantityPlanned - i.QuantityDispatched,
                            ReceiveVariance = i.QuantityDispatched - i.QuantityReceived
                        }).ToList()
                    };

                    report.VarianceCount = report.ItemVariances.Count(v => v.DispatchVariance != 0 || v.ReceiveVariance != 0);
                    reports.Add(report);
                }

                return reports;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving warehouse transfer reports");
                throw;
            }
        }

        private async Task<WarehouseResponse> MapWarehouseToResponseAsync(Warehouse warehouse)
        {
            // Get statistics for this warehouse
            var outgoingShipments = await _context.WarehouseShipments
                .CountAsync(s => s.SourceWarehouseId == warehouse.Id);

            var incomingShipments = await _context.WarehouseShipments
                .CountAsync(s => s.DestinationWarehouseId == warehouse.Id);

            var pendingDispatch = await _context.WarehouseShipments
                .CountAsync(s => s.SourceWarehouseId == warehouse.Id && s.Status == "created");

            var pendingReceive = await _context.WarehouseShipments
                .CountAsync(s => s.DestinationWarehouseId == warehouse.Id && s.Status == "dispatched");

            return new WarehouseResponse
            {
                Id = warehouse.Id,
                Name = warehouse.Name,
                Code = warehouse.Code,
                Description = warehouse.Description,
                Address = warehouse.Address,
                City = warehouse.City,
                State = warehouse.State,
                Country = warehouse.Country,
                PostalCode = warehouse.PostalCode,
                ContactPerson = warehouse.ContactPerson,
                ContactPhone = warehouse.ContactPhone,
                ContactEmail = warehouse.ContactEmail,
                IsActive = warehouse.IsActive,
                IsDefaultSource = warehouse.IsDefaultSource,
                CreatedAt = warehouse.CreatedAt,
                UpdatedAt = warehouse.UpdatedAt,
                CreatedBy = warehouse.CreatedBy,
                TotalOutgoingShipments = outgoingShipments,
                TotalIncomingShipments = incomingShipments,
                PendingDispatchShipments = pendingDispatch,
                PendingReceiveShipments = pendingReceive
            };
        }

        private async Task ClearDefaultSourceAsync()
        {
            var currentDefault = await _context.Warehouses
                .FirstOrDefaultAsync(w => w.IsDefaultSource);

            if (currentDefault != null)
            {
                currentDefault.IsDefaultSource = false;
            }
        }
    }
} 