/**
 * NHTSA VIN Decoder Utility
 * Uses the National Highway Traffic Safety Administration (NHTSA) API
 * to decode and validate Vehicle Identification Numbers (VINs)
 */

export interface VINDecodeResult {
  success: boolean;
  valid: boolean;
  year?: string;
  make?: string;
  model?: string;
  trim?: string;
  bodyClass?: string;
  engineCylinders?: string;
  engineDisplacement?: string;
  fuelType?: string;
  manufacturer?: string;
  plantCity?: string;
  plantCountry?: string;
  vehicleType?: string;
  errorCode?: string;
  errorText?: string;
  possibleValues?: string;
  additionalErrorText?: string;
}

/**
 * Validates VIN format (17 characters, no I, O, or Q)
 */
export function isValidVINFormat(vin: string): boolean {
  if (!vin || vin.length !== 17) {
    return false;
  }
  
  // VINs cannot contain I, O, or Q to avoid confusion with 1 and 0
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/**
 * Decodes a VIN using the NHTSA API
 * @param vin - The 17-character VIN to decode
 * @returns Promise with decoded vehicle information
 */
export async function decodeVIN(vin: string): Promise<VINDecodeResult> {
  try {
    // Validate VIN format first
    if (!isValidVINFormat(vin)) {
      return {
        success: false,
        valid: false,
        errorText: 'Invalid VIN format. Must be exactly 17 characters (A-Z, 0-9, excluding I, O, Q)',
      };
    }

    // Call NHTSA API
    const response = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/${vin}?format=json`
    );

    if (!response.ok) {
      return {
        success: false,
        valid: false,
        errorText: 'Failed to connect to VIN decoder service',
      };
    }

    const data = await response.json();

    // NHTSA API returns data in Results array
    if (!data.Results || data.Results.length === 0) {
      return {
        success: false,
        valid: false,
        errorText: 'No results returned from VIN decoder',
      };
    }

    const result = data.Results[0];

    // Check for errors in the response
    if (result.ErrorCode && result.ErrorCode !== '0') {
      return {
        success: false,
        valid: false,
        errorCode: result.ErrorCode,
        errorText: result.ErrorText || 'Unknown error from VIN decoder',
        possibleValues: result.PossibleValues,
        additionalErrorText: result.AdditionalErrorText,
      };
    }

    // Extract vehicle information
    const year = result.ModelYear || '';
    const make = result.Make || '';
    const model = result.Model || '';

    // Check if we got meaningful data
    if (!year || !make || !model) {
      return {
        success: false,
        valid: false,
        errorText: 'VIN decoded but vehicle information is incomplete. Please verify the VIN.',
      };
    }

    return {
      success: true,
      valid: true,
      year,
      make,
      model,
      trim: result.Trim || '',
      bodyClass: result.BodyClass || '',
      engineCylinders: result.EngineCylinders || '',
      engineDisplacement: result.DisplacementL || result.DisplacementCC || '',
      fuelType: result.FuelTypePrimary || '',
      manufacturer: result.Manufacturer || '',
      plantCity: result.PlantCity || '',
      plantCountry: result.PlantCountry || '',
      vehicleType: result.VehicleType || '',
    };
  } catch (error) {
    console.error('Error decoding VIN:', error);
    return {
      success: false,
      valid: false,
      errorText: error instanceof Error ? error.message : 'Failed to decode VIN',
    };
  }
}

/**
 * Formats vehicle information for display
 */
export function formatVehicleInfo(result: VINDecodeResult): string {
  if (!result.success || !result.valid) {
    return '';
  }

  const parts = [result.year, result.make, result.model, result.trim]
    .filter(Boolean)
    .join(' ');

  return parts;
}
