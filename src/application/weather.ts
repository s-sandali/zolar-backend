import { SolarUnit } from "../infrastructure/entities/SolarUnit";
import { NotFoundError, ValidationError } from "../domain/errors/errors";
import { Request, Response, NextFunction } from "express";
import { WeatherSolarUnitParamDto } from "../domain/dtos/weather.dto";

/**
 * Validator for solar unit ID in weather URL params
 */
export const weatherSolarUnitParamValidator = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const result = WeatherSolarUnitParamDto.safeParse(req.params);
  if (!result.success) {
    throw new ValidationError(result.error.message);
  }
  next();
};

// Types for Open-Meteo API response
interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    precipitation: number;
    cloud_cover: number;
    wind_speed_10m: number;
    shortwave_radiation: number;
    is_day: number; // 0 = night, 1 = day
  };
  current_units: {
    temperature_2m: string;
    precipitation: string;
    cloud_cover: string;
    wind_speed_10m: string;
    shortwave_radiation: string;
  };
}

// Weather condition type
type WeatherCondition = "clear" | "partly_cloudy" | "overcast" | "rain";

// Solar impact rating
type SolarRating = "Excellent" | "Moderate" | "Poor";

// Solar impact breakdown
interface SolarImpactBreakdown {
  cloudImpact: number;
  rainImpact: number;
  irradianceBoost: number;
  tempImpact: number;
  windBoost: number;
}

// Main weather response structure
export interface WeatherData {
  current: {
    cloudCover: number;
    precipitation: number;
    solarIrradiance: number;
    temperature: number;
    windSpeed: number;
    condition: WeatherCondition;
    isDay: boolean;
  };
  solarImpact: {
    score: number;
    rating: SolarRating;
    insight: string;
    breakdown: SolarImpactBreakdown;
  };
  location: {
    city: string;
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

/**
 * Calculate solar impact score based on weather conditions
 */
export function calculateSolarImpact(
  cloudCover: number,
  precipitation: number,
  solarIrradiance: number,
  temperature: number,
  windSpeed: number
): { score: number; breakdown: SolarImpactBreakdown } {
  let score = 100;
  const breakdown: SolarImpactBreakdown = {
    cloudImpact: 0,
    rainImpact: 0,
    irradianceBoost: 0,
    tempImpact: 0,
    windBoost: 0,
  };

  
  // Clouds directly reduce solar irradiance
  if (cloudCover >= 0 && cloudCover <= 20) {
    // Clear skies - no penalty
    breakdown.cloudImpact = 0;
  } else if (cloudCover <= 50) {
    // Partly cloudy
    breakdown.cloudImpact = -20;
    score -= 20;
  } else if (cloudCover <= 80) {
    // Mostly cloudy
    breakdown.cloudImpact = -40;
    score -= 40;
  } else {
    // Overcast
    breakdown.cloudImpact = -60;
    score -= 60;
  }

  // Precipitation Impact
  // Rain = sharp production drop
  if (precipitation > 0) {
    breakdown.rainImpact = -30;
    score -= 30;
  }

  // Solar Irradiance Boost
  // This is the actual solar energy hitting the panels
  if (solarIrradiance > 800) {
    // Excellent conditions
    breakdown.irradianceBoost = 20;
    score += 20;
  } else if (solarIrradiance >= 600) {
    // Good conditions
    breakdown.irradianceBoost = 10;
    score += 10;
  }
  // Below 600 W/m² = no boost

  // Temperature Impact
  if (temperature > 35) {
    breakdown.tempImpact = -10;
    score -= 10;
  }

  // Wind Cooling Boost
  // Wind helps cool panels, improving efficiency
  if (windSpeed > 15) {
    breakdown.windBoost = 5;
    score += 5;
  }

  // Ensure score stays within 0-100 range
  score = Math.max(0, Math.min(100, score));

  return { score, breakdown };
}

/**
 * Determine weather condition based on cloud cover and precipitation
 */
function getWeatherCondition(
  cloudCover: number,
  precipitation: number
): WeatherCondition {
  if (precipitation > 0) {
    return "rain";
  } else if (cloudCover >= 80) {
    return "overcast";
  } else if (cloudCover >= 20) {
    return "partly_cloudy";
  } else {
    return "clear";
  }
}

/**
 * Convert solar impact score to rating
 */
function getSolarRating(score: number): SolarRating {
  if (score >= 80) return "Excellent";
  if (score >= 50) return "Moderate";
  return "Poor";
}

/**
 * Generate human-readable insight based on weather conditions
 */
export function getWeatherInsight(
  score: number,
  cloudCover: number,
  precipitation: number,
  temperature: number,
  windSpeed: number,
  solarIrradiance: number
): string {
  const rating = getSolarRating(score);

  // Rain conditions
  if (precipitation > 0) {
    return "Rain detected — reduced output now, but cleaner panels later will improve efficiency.";
  }

  // Excellent conditions
  if (rating === "Excellent") {
    if (cloudCover <= 10) {
      return "Perfect clear skies — optimal solar production expected today!";
    }
    return "Great conditions for solar energy generation!";
  }

  // Moderate conditions
  if (rating === "Moderate") {
    if (cloudCover > 50) {
      return "Partly cloudy conditions — expect moderate solar production.";
    }
    if (temperature > 35) {
      return "High temperature may slightly reduce panel efficiency despite good sunlight.";
    }
    if (windSpeed > 15) {
      return "Wind cooling may help improve panel efficiency in these conditions.";
    }
    return "Moderate conditions for solar energy generation.";
  }

  // Poor conditions
  if (cloudCover >= 80) {
    return "Heavy cloud cover significantly reducing solar production today.";
  }
  if (solarIrradiance < 400) {
    return "Low solar irradiance — limited energy generation expected.";
  }
  return "Challenging conditions for solar production today.";
}

/**
 * GET /api/weather/current/:solarUnitId handler
 */
export const getCurrentWeather = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { solarUnitId } = req.params;

    const weatherData = await getCurrentWeatherForSolarUnit(solarUnitId);

    res.json(weatherData);
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch current weather for a solar unit and calculate solar impact
 */
export async function getCurrentWeatherForSolarUnit(
  solarUnitId: string
): Promise<WeatherData> {
  // Find the solar unit
  const solarUnit = await SolarUnit.findById(solarUnitId);
  if (!solarUnit) {
    throw new NotFoundError("Solar unit not found");
  }

  // Check if solar unit has location data
  if (!solarUnit.location?.latitude || !solarUnit.location?.longitude) {
    throw new NotFoundError(
      "Solar unit does not have location data. Please update the solar unit with location information."
    );
  }

  const { latitude, longitude, city } = solarUnit.location;

  // Fetch weather data from Open-Meteo API
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,precipitation,cloud_cover,wind_speed_10m,shortwave_radiation,is_day&timezone=auto`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch weather data from Open-Meteo API");
  }

  const data = (await response.json()) as OpenMeteoResponse;

  // Extract current weather values
  const cloudCover = data.current.cloud_cover;
  const precipitation = data.current.precipitation;
  const solarIrradiance = data.current.shortwave_radiation;
  const temperature = data.current.temperature_2m;
  const windSpeed = data.current.wind_speed_10m;
  const isDay = data.current.is_day === 1;

  // Calculate solar impact
  const { score, breakdown } = calculateSolarImpact(
    cloudCover,
    precipitation,
    solarIrradiance,
    temperature,
    windSpeed
  );

  const rating = getSolarRating(score);
  const insight = getWeatherInsight(
    score,
    cloudCover,
    precipitation,
    temperature,
    windSpeed,
    solarIrradiance
  );

  const condition = getWeatherCondition(cloudCover, precipitation);

  // Return transformed weather data with solar context
  return {
    current: {
      cloudCover,
      precipitation,
      solarIrradiance,
      temperature,
      windSpeed,
      condition,
      isDay,
    },
    solarImpact: {
      score,
      rating,
      insight,
      breakdown,
    },
    location: {
      city: city || "Unknown",
      latitude,
      longitude,
    },
    timestamp: new Date().toISOString(),
  };
}
