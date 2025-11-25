namespace Mlt.Admin.Api.Constants
{
    public static class ErrorMessages
    {
        // Authentication & Authorization Errors
        public const string NoShopifyStoreConnected = "No Shopify store connected. Please connect your store first.";
        public const string NoShopifyStoreConnectionFound = "No Shopify store connection found for this user";
        public const string InvalidCredentials = "Invalid credentials provided";
        public const string AuthenticationFailed = "Authentication failed";
        public const string AuthorizationFailed = "Authorization failed";
        
        // GraphQL & API Errors
        public const string GraphQLServiceReturnedNull = "GraphQL service returned null result";
        public const string EmptyJsonResponseFromShopify = "Empty JSON response from Shopify";
        public const string JsonProcessingError = "JSON processing error: {0}";
        public const string GraphQLQueryExecutionFailed = "GraphQL query execution failed";
        
        // Search & Query Errors
        public const string SearchQueryRequired = "Search query is required";
        public const string SearchQueryParameterRequired = "Search query parameter 'q' is required";
        public const string InvalidQueryParameters = "Invalid query parameters provided";
        
        // Connection Errors
        public const string ConnectionVerificationFailed = "Connection verification failed";
        public const string ConnectionHealthCheckFailed = "Health check failed";
        public const string FailedToCheckConnectionStatus = "Failed to check connection status";
        public const string StoreDisconnectionFailed = "Error disconnecting store";
        
        // Product Errors
        public const string ProductFetchFailed = "Error fetching products";
        public const string ProductNotFound = "Product not found";
        public const string ProductSyncFailed = "Product sync failed";
        
        // Order Errors
        public const string OrderFetchFailed = "Error fetching orders";
        public const string OrderSearchFailed = "Error searching orders with query: {0}";
        public const string OrderNotFound = "Order not found";
        public const string OrderProcessingFailed = "Order processing failed";
        
        // Customer Errors
        public const string CustomerFetchFailed = "Error fetching customers";
        public const string CustomerSearchFailed = "Error searching customers with query: {0}";
        public const string CustomerNotFound = "Customer not found";
        public const string CustomerProcessingFailed = "Customer processing failed";
        
        // General Errors
        public const string InternalServerError = "An internal server error occurred";
        public const string UnexpectedError = "An unexpected error occurred";
        public const string UnexpectedErrorOccurred = "An unexpected error occurred";
        public const string InvalidRequest = "Invalid request";
        public const string BadRequest = "Bad request";
        public const string ServiceUnavailable = "Service temporarily unavailable";
        
        // Validation Errors
        public const string RequiredFieldMissing = "Required field is missing: {0}";
        public const string InvalidFieldValue = "Invalid value for field: {0}";
        public const string InvalidEmailFormat = "Invalid email format";
        public const string InvalidDateFormat = "Invalid date format";
        
        // Database Errors
        public const string DatabaseConnectionFailed = "Database connection failed";
        public const string DatabaseQueryFailed = "Database query failed";
        public const string DataNotFound = "Requested data not found";
        public const string DataSaveFailed = "Failed to save data";
    }

    public static class LogMessages
    {
        // Authentication & Authorization Logs
        public const string UserLoginAttempt = "User login attempt for email: {0}";
        public const string UserLoginSuccess = "User {0} logged in successfully";
        public const string UserLoginFailed = "Login failed for email: {0}";
        public const string JwtTokenGenerated = "Generated JWT token for user {0} ({1})";
        public const string InvalidTokenProvided = "Invalid token provided";
        
        // GraphQL & API Logs
        public const string ExecutingGraphQLQuery = "Executing GraphQL query to: {0}";
        public const string GraphQLQueryCompleted = "GraphQL query completed successfully";
        public const string GraphQLQueryFailed = "GraphQL query failed: {0}";
        public const string ApiRequestStarted = "Request {0}: {1} {2} started";
        public const string ApiRequestCompleted = "Request {0}: {1} {2} completed in {3}ms with status {4}";
        
        // Product Logs
        public const string FetchingProducts = "Fetching products with limit: {0}";
        public const string ProductsFetched = "Successfully fetched {0} products";
        public const string FetchingProduct = "Fetching product with ID: {0}";
        public const string ProductFetched = "Successfully fetched product: {0}";
        public const string ProductSyncStarted = "Product sync started";
        public const string ProductSyncCompleted = "Product sync completed: {0} products synced";
        
        // Order Logs
        public const string FetchingOrders = "Fetching orders using GraphQL - orderType: {0}, limit: {1}";
        public const string OrdersFetched = "Successfully fetched {0} orders using GraphQL ({1} orders)";
        public const string SearchingOrders = "Using GraphQL search query: {0}";
        public const string OrdersSearchCompleted = "Order search completed for query: {0}";
        public const string OrdersFetchFailed = "Failed to fetch orders: {0}";
        
        // Customer Logs
        public const string FetchingCustomers = "Fetching customers using GraphQL - limit: {0}";
        public const string CustomersFetched = "Successfully fetched {0} customers using GraphQL";
        public const string SearchingCustomers = "Using GraphQL search query for customers: {0}";
        public const string CustomersSearchCompleted = "Customer search completed for query: {0}";
        public const string CustomersFetchFailed = "Failed to fetch customers: {0}";
        public const string CustomerSearchFailed = "Failed to search customers with query '{0}': {1}";
        
        // Connection Logs
        public const string CredentialsValidated = "Credentials validated successfully for store: {0}";
        public const string CredentialsValidationFailed = "Credentials validation failed for store: {0}";
        public const string ConnectionStatusChecked = "Connection status checked for store: {0}";
        public const string StoreConnected = "Store connected successfully: {0}";
        public const string StoreDisconnected = "Store disconnected successfully: {0}";
        
        // System Logs
        public const string ServerStarted = "🚀 MLT Admin .NET API Server Started";
        public const string ServerEnvironment = "📍 Environment: {0}";
        public const string HealthCheckEndpoint = "📊 Health Check: {0}";
        public const string EmailServiceInitialized = "📧 Email service initialized with provider: {0}";
        public const string DatabaseMigrationCompleted = "Database migrations completed successfully";
        public const string DataSeedingStarted = "Starting database seeding...";
        public const string DataSeedingCompleted = "Database seeding completed successfully";
        
        // Performance Logs
        public const string SlowQueryDetected = "Slow query detected: {0}ms for {1}";
        public const string HighMemoryUsage = "High memory usage detected: {0}MB";
        public const string CacheHit = "Cache hit for key: {0}";
        public const string CacheMiss = "Cache miss for key: {0}";
        
        // Security Logs
        public const string UnauthorizedAccess = "Unauthorized access attempt from IP: {0}";
        public const string SuspiciousActivity = "Suspicious activity detected: {0}";
        public const string RateLimitExceeded = "Rate limit exceeded for IP: {0}";
        
        // Debug Logs
        public const string ProcessingRequest = "Processing request: {0}";
        public const string ValidatingInput = "Validating input parameters";
        public const string ParsingResponse = "Parsing response from external service";
        public const string TransformingData = "Transforming data for response";
    }

    public static class SuccessMessages
    {
        // Authentication & Authorization
        public const string LoginSuccessful = "Login successful";
        public const string LogoutSuccessful = "Logout successful";
        public const string TokenRefreshed = "Token refreshed successfully";
        
        // Connection
        public const string ConnectionVerified = "Connection verified";
        public const string ConnectionHealthy = "Connection healthy";
        public const string StoreConnectedSuccessfully = "Store connected successfully";
        public const string StoreDisconnectedSuccessfully = "Store disconnected successfully";
        
        // Products
        public const string ProductsFetchedSuccessfully = "Successfully fetched {0} products";
        public const string ProductFetchedSuccessfully = "Product fetched successfully";
        public const string ProductSyncCompleted = "Product sync completed";
        
        // Orders
        public const string OrdersFetchedSuccessfully = "Successfully fetched {0} orders using GraphQL ({1} orders)";
        public const string OrdersSearchCompleted = "Order search completed successfully";
        
        // Customers
        public const string CustomersFetchedSuccessfully = "Successfully fetched {0} customers";
        public const string CustomerSearchSuccessful = "Customer search completed successfully: {0} customers found for query '{1}'";
        public const string CustomerFetchedSuccessfully = "Customer fetched successfully";
        
        // General
        public const string OperationCompleted = "Operation completed successfully";
        public const string DataSaved = "Data saved successfully";
        public const string DataUpdated = "Data updated successfully";
        public const string DataDeleted = "Data deleted successfully";
    }
} 