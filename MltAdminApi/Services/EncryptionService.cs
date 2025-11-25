using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Mlt.Admin.Api.Constants;

namespace Mlt.Admin.Api.Services;

/// <summary>
/// Centralized encryption service for consistent encryption/decryption across the application
/// </summary>
public interface IEncryptionService
{
    string EncryptString(string plainText);
    string DecryptString(string cipherText);
    Dictionary<string, string> DecryptCredentials(string encryptedCredentials);
    string EncryptCredentials(Dictionary<string, string> credentials);
}

public class EncryptionService : IEncryptionService
{
    private readonly string _encryptionKey;
    private readonly ILogger<EncryptionService> _logger;

    public EncryptionService(IConfiguration configuration, ILogger<EncryptionService> logger)
    {
        _logger = logger;
        _encryptionKey = ResolveEncryptionKey(configuration);
        
        // Log the key source for debugging (without exposing the actual key)
        var keySource = GetKeySource(configuration);
        _logger.LogInformation("Encryption service initialized with key from: {KeySource}", keySource);
    }

    private static string ResolveEncryptionKey(IConfiguration configuration)
    {
        // Priority order: Environment Variable > Configuration > Default
        
        // 1. Check environment variable first (most secure)
        var envKey = Environment.GetEnvironmentVariable(SecurityConstants.EncryptionKeyEnvironmentVariable);
        if (!string.IsNullOrEmpty(envKey))
        {
            return ValidateAndNormalizeKey(envKey);
        }
        
        // 2. Check configuration (appsettings.json, user secrets)
        var configKey = configuration[SecurityConstants.EncryptionKeyConfigPath];
        if (!string.IsNullOrEmpty(configKey))
        {
            return ValidateAndNormalizeKey(configKey);
        }
        
        // 3. Fall back to default (for development)
        return ValidateAndNormalizeKey(SecurityConstants.DefaultEncryptionKey);
    }

    private static string GetKeySource(IConfiguration configuration)
    {
        var envKey = Environment.GetEnvironmentVariable(SecurityConstants.EncryptionKeyEnvironmentVariable);
        if (!string.IsNullOrEmpty(envKey))
            return "Environment Variable";
            
        var configKey = configuration[SecurityConstants.EncryptionKeyConfigPath];
        if (!string.IsNullOrEmpty(configKey))
            return "Configuration";
            
        return "Default Constant";
    }

    private static string ValidateAndNormalizeKey(string key)
    {
        if (string.IsNullOrEmpty(key))
            throw new InvalidOperationException("Encryption key cannot be null or empty");
            
        // Ensure key is exactly 32 characters for AES-256
        return key.PadRight(SecurityConstants.MinimumKeyLength).Substring(0, SecurityConstants.MinimumKeyLength);
    }

    public string EncryptString(string plainText)
    {
        try
        {
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);
            aes.IV = new byte[SecurityConstants.AesBlockSize]; // Use zero IV for simplicity

            using var encryptor = aes.CreateEncryptor();
            using var ms = new MemoryStream();
            using var cs = new CryptoStream(ms, encryptor, CryptoStreamMode.Write);
            using var writer = new StreamWriter(cs);
            
            writer.Write(plainText);
            writer.Close();
            
            return Convert.ToBase64String(ms.ToArray());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error encrypting string");
            throw;
        }
    }

    public string DecryptString(string cipherText)
    {
        try
        {
            using var aes = Aes.Create();
            aes.Key = Encoding.UTF8.GetBytes(_encryptionKey);
            aes.IV = new byte[SecurityConstants.AesBlockSize]; // Use zero IV for simplicity

            using var decryptor = aes.CreateDecryptor();
            using var ms = new MemoryStream(Convert.FromBase64String(cipherText));
            using var cs = new CryptoStream(ms, decryptor, CryptoStreamMode.Read);
            using var reader = new StreamReader(cs);
            
            return reader.ReadToEnd();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decrypting string");
            throw;
        }
    }

    public Dictionary<string, string> DecryptCredentials(string encryptedCredentials)
    {
        try
        {
            var decryptedJson = DecryptString(encryptedCredentials);
            return JsonSerializer.Deserialize<Dictionary<string, string>>(decryptedJson) ?? new Dictionary<string, string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error decrypting credentials");
            return new Dictionary<string, string>();
        }
    }

    public string EncryptCredentials(Dictionary<string, string> credentials)
    {
        try
        {
            var credentialsJson = JsonSerializer.Serialize(credentials);
            return EncryptString(credentialsJson);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error encrypting credentials");
            throw;
        }
    }
} 