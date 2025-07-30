// Simple encryption utility for messages
// In production, you should use a more robust encryption library

// Use a shared encryption key for all users so they can decrypt each other's messages
const SHARED_ENCRYPTION_KEY = 'joy-sync-shared-key-2024';

// Initialize or get encryption key
const getEncryptionKey = (): string => {
  return SHARED_ENCRYPTION_KEY;
};

// Simple encryption using btoa/atob (not secure for production)
export const encrypt = async (message: string): Promise<string> => {
  try {
    const key = getEncryptionKey();
    const encrypted = btoa(unescape(encodeURIComponent(message + '|' + key.substring(0, 8))));
    return JSON.stringify({ 
      encrypted: encrypted,
      iv: key.substring(0, 16),
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Return original message if encryption fails
  }
};

// Completely rewritten decryption function to handle all formats properly
export const decrypt = (encryptedData: string): string => {
  try {
    console.log('🔓 Attempting to decrypt:', encryptedData.substring(0, 100) + '...');
    
    // Handle old format: "message|key" (like "Ok |MjA1NDFv")
    if (encryptedData.includes('|')) {
      console.log('🔐 Found old format message, decrypting...');
      try {
        const parts = encryptedData.split('|');
        if (parts.length === 2) {
          const messagePart = parts[0].trim();
          const keyPart = parts[1].trim();
          
          // If the message part looks like base64, try to decode it
          if (keyPart.length > 5) {
            try {
              const decoded = decodeURIComponent(escape(atob(messagePart)));
              console.log('✅ Successfully decrypted old format:', decoded);
              return decoded;
            } catch (decodeError) {
              console.log('❌ Base64 decode failed, returning message part');
              return messagePart;
            }
          } else {
            // If key part is short, it might just be the message
            console.log('✅ Returning message part directly:', messagePart);
            return messagePart;
          }
        }
      } catch (oldDecryptError) {
        console.error('❌ Old format decryption failed:', oldDecryptError);
      }
    }
    
    // Handle new JSON format
    try {
      const parsed = JSON.parse(encryptedData);
      if (parsed.encrypted && parsed.iv) {
        console.log('🔐 Found new JSON format, decrypting...');
        const key = getEncryptionKey();
        
        try {
          const decrypted = decodeURIComponent(escape(atob(parsed.encrypted)));
          const keyPart = '|' + key.substring(0, 8);
          
          if (decrypted.endsWith(keyPart)) {
            const originalMessage = decrypted.replace(keyPart, '');
            console.log('✅ Successfully decrypted new format:', originalMessage);
            return originalMessage;
          } else {
            console.log('✅ Alternative decryption successful:', decrypted);
            return decrypted;
          }
        } catch (decryptError) {
          console.error('❌ New format decryption failed:', decryptError);
          return 'Message content unavailable';
        }
      }
    } catch (jsonError) {
      // Not JSON format
    }
    
    // If it's not encrypted, return as is
    console.log('📝 Plain text message');
    return encryptedData;
  } catch (error) {
    console.error('💥 Unexpected decryption error:', error);
    return encryptedData;
  }
};

// Check if a message looks encrypted
export const isEncrypted = (content: string): boolean => {
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.encrypted && parsed.iv);
  } catch {
    // Check for old format
    return content.includes('|') && content.length > 5;
  }
};

// Legacy class for backward compatibility
export class MessageEncryption {
  static async encryptMessage(message: string, key?: string): Promise<{ encrypted: string; iv: string; key: string }> {
    const encryptionKey = key || getEncryptionKey();
    const encrypted = btoa(unescape(encodeURIComponent(message)));
    return {
      encrypted: encrypted,
      iv: encryptionKey.substring(0, 16),
      key: encryptionKey
    };
  }

  static async decryptMessage(encrypted: string, key: string, iv: string): Promise<string> {
    try {
      return decodeURIComponent(escape(atob(encrypted)));
    } catch (error) {
      return encrypted;
    }
  }
}