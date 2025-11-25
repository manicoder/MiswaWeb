namespace Mlt.Admin.Api.Constants;

/// <summary>
/// Security-related constants used throughout the application
/// </summary>
public static class SecurityConstants
{
    /// <summary>
    /// Default encryption key used as fallback when no configuration is provided.
    /// In production, this should be overridden via environment variables or secure configuration.
    /// </summary>
    public const string DefaultEncryptionKey = "MLT-Admin-Default-Key-32-Characters!";
    
    /// <summary>
    /// Configuration key path for the encryption key
    /// </summary>
    public const string EncryptionKeyConfigPath = "Encryption:Key";
    
    /// <summary>
    /// Environment variable name for the encryption key
    /// </summary>
    public const string EncryptionKeyEnvironmentVariable = "MLT_ENCRYPTION_KEY";
    
    /// <summary>
    /// Minimum required length for encryption keys
    /// </summary>
    public const int MinimumKeyLength = 32;
    
    /// <summary>
    /// AES block size for IV
    /// </summary>
    public const int AesBlockSize = 16;
} 