interface WeatherData {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  description: string;
  icon: string;
  wind_speed: number;
  clouds: number;
  rain?: number;
}

interface WeatherResponse {
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    humidity: number;
  };
  weather: Array<{
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
  };
  clouds: {
    all: number;
  };
  rain?: {
    "1h"?: number;
  };
}

export async function getWeatherByCoordinates(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  const apiKey = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.error("OpenWeather API key não configurada");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?` +
        new URLSearchParams({
          lat: lat.toString(),
          lon: lon.toString(),
          appid: apiKey,
          units: "metric", // Celsius
          lang: "pt_br",
        })
    );

    if (!response.ok) {
      throw new Error(`Erro na API: ${response.status}`);
    }

    const data: WeatherResponse = await response.json();

    return {
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      temp_min: Math.round(data.main.temp_min),
      temp_max: Math.round(data.main.temp_max),
      humidity: data.main.humidity,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed,
      clouds: data.clouds.all,
      rain: data.rain?.["1h"],
    };
  } catch (error) {
    console.error("Erro ao buscar dados de clima:", error);
    return null;
  }
}

export function getWeatherIconUrl(icon: string): string {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

export function getWeatherRecommendation(weather: WeatherData): {
  suitable: boolean;
  message: string;
  icon: string;
} {
  // Chuva forte
  if (weather.rain && weather.rain > 5) {
    return {
      suitable: false,
      message: "Chuva forte prevista. Não recomendado jogar.",
      icon: "🌧️",
    };
  }

  // Chuva leve
  if (weather.rain && weather.rain > 0) {
    return {
      suitable: false,
      message: "Possibilidade de chuva. Fique atento.",
      icon: "🌦️",
    };
  }

  // Muito quente
  if (weather.temp > 35) {
    return {
      suitable: false,
      message: "Temperatura muito alta. Hidrate-se bem!",
      icon: "🥵",
    };
  }

  // Muito frio
  if (weather.temp < 10) {
    return {
      suitable: false,
      message: "Temperatura baixa. Vista roupas adequadas.",
      icon: "🥶",
    };
  }

  // Condições ideais
  if (weather.temp >= 18 && weather.temp <= 28 && !weather.rain) {
    return {
      suitable: true,
      message: "Condições ideais para jogar!",
      icon: "⚽",
    };
  }

  // Condições aceitáveis
  return {
    suitable: true,
    message: "Condições boas para jogar.",
    icon: "✅",
  };
}
