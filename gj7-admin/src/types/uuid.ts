// types/uuid.ts

import { v4 as uuidv4 } from 'uuid';

// Uuid type that mimics the Rust UUID behavior
export type Uuid = string;

export class UuidUtils {
  /**
   * Generate a new v4 UUID
   * @returns {Uuid} A new UUID as a string
   */
  static generateV4(): Uuid {
    return uuidv4();
  }

  /**
   * Parse a UUID string, validating its format
   * @param {string} uuidString - The UUID string to parse
   * @returns {Uuid | null} Parsed UUID or null if invalid
   */
  static parse(uuidString: string): Uuid | null {
    // Basic UUID v4 regex validation
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (uuidV4Regex.test(uuidString)) {
      return uuidString;
    }
    
    return null;
  }

  /**
   * Check if a string is a valid UUID
   * @param {string} uuidString - The string to validate
   * @returns {boolean} Whether the string is a valid UUID
   */
  static isValid(uuidString: string): boolean {
    return this.parse(uuidString) !== null;
  }

  /**
   * Convert a Uuid to a string representation
   * @param {Uuid} uuid - The UUID to convert
   * @returns {string} String representation of the UUID
   */
  static toString(uuid: Uuid): string {
    return uuid;
  }
}

// Optional: Type guard for Uuid
export function isUuid(value: any): value is Uuid {
  return typeof value === 'string' && UuidUtils.isValid(value);
}