// Cosmic Monitoring Engine: Earth, Satellites, Meteorites & Asteroids (NEOs), Neighboring Planets & Live Webcams
import { SATELLITE_CATALOG, SatelliteId, SatelliteTelemetry } from './satelliteTelemetryEngine';

export interface EarthMonitoringData {
  magneticFieldNt: number;
  magneticDipoleTiltDeg: number;
  kpIndex: number;
  kpStatus: 'Silencioso' | 'Inquieto' | 'Tormenta Menor (G1)' | 'Tormenta Fuerte (G3)';
  solarWindSpeedKmS: number;
  solarWindDensityPcm3: number;
  auroraActivityIndex: 'Bajo' | 'Moderado' | 'Alto' | 'Extremo';
  auroraOvalLatitudeDeg: number;
  solarIrradianceWm2: number;
  globalCloudCoverPct: number;
  surfaceAverageTempC: number;
  earthRotationAngleDeg: number;
  subsolarPoint: { lat: number; lon: number };
  atmosphereLayers: {
    name: string;
    altRangeKm: string;
    tempC: number;
    pressureHpa: number;
    primaryGas: string;
    phenomena: string;
  }[];
  utcTimestampIso: string;
}

export interface NearEarthAsteroid {
  id: string;
  name: string;
  designation: string;
  diameterM: number;
  diameterFormatted: string;
  velocityKmS: number;
  missDistanceKm: number;
  missDistanceLunarDistances: number;
  closeApproachDateFormatted: string;
  hoursUntilApproach: number;
  torinoScale: number;
  isPotentiallyHazardous: boolean;
  spectralType: string;
  orbitClass: 'Apollo' | 'Aten' | 'Amor' | 'Atira';
  estimatedMassTons: number;
}

export interface BolideFireballEvent {
  id: string;
  timestampIso: string;
  locationName: string;
  lat: number;
  lon: number;
  energyRadiatedGj: number;
  impactEnergyKtTnt: number;
  altitudeKm: number;
  velocityKmS: number;
  brightnessMagnitude: number;
}

export interface MeteorShower {
  id: string;
  name: string;
  radiantConstellation: string;
  activePeriod: string;
  peakDate: string;
  zhr: number; // Zenithal Hourly Rate
  velocityKmS: number;
  parentBody: string;
  status: 'Activa' | 'Próximo Pico' | 'En Observación' | 'Fuera de Temporada';
  currentDetectionRatePerHour: number;
}

export interface LiveMeteorPing {
  id: string;
  timestamp: number;
  stationName: string;
  signalStrengthDb: number;
  dopplerDurationMs: number;
  estimatedMassGrams: number;
  altitudeKm: number;
  coords: { lat: number; lon: number };
}

export interface PlanetSolarSystemData {
  id: 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'sun';
  name: string;
  category: string;
  distanceAu: number;
  distanceKm: number;
  lightTravelTimeSec: number;
  lightTravelTimeFormatted: string;
  apparentMagnitude: number;
  elongationDeg: number;
  constellation: string;
  illuminationPct: number;
  orbitalVelocityKmS: number;
  angularDiameterArcsec: number;
  visibilitySummary: string;
  orbitalRadiusVisual: number;
  orbitalAngleDeg: number;
  colorHex: string;
  diameterKm: number;
  moonsCount: number;
  keyFeature: string;
}

export interface SpaceWebcam {
  id: string;
  name: string;
  operator: string;
  category: 'iss_earth' | 'nasa_tv' | 'dscovr_earth' | 'observatory' | 'aurora';
  locationName: string;
  lat: number;
  lon: number;
  altitudeKm: number;
  streamEmbedUrl: string;
  directWebcamUrl: string;
  resolution: string;
  bitrateMbps: number;
  status: 'LIVE_STREAMING' | 'ORBITAL_SUNSET' | 'STANDBY';
  description: string;
  viewAngle: string;
  refreshRateFps: number;
}

// 1. Earth Telemetry Generator
export function getRealtimeEarthMonitoring(): EarthMonitoringData {
  const now = new Date();
  const timeMs = now.getTime();
  const dayFrac = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400;

  // Subsolar point (moves ~360 deg in 24h, declination swings ±23.44)
  const solarLon = -180 + dayFrac * 360;
  const dayOfYear = Math.floor((timeMs - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const solarLat = 23.44 * Math.sin(((dayOfYear - 80) * 2 * Math.PI) / 365.25);

  const earthRotDeg = (dayFrac * 360) % 360;
  const kp = 2.7 + Math.sin(timeMs / 45000) * 0.8;

  return {
    magneticFieldNt: Math.round(48250 + Math.sin(timeMs / 10000) * 45),
    magneticDipoleTiltDeg: 11.4,
    kpIndex: Number(kp.toFixed(1)),
    kpStatus: kp < 3 ? 'Silencioso' : kp < 5 ? 'Inquieto' : 'Tormenta Menor (G1)',
    solarWindSpeedKmS: Math.round(440 + Math.sin(timeMs / 8000) * 22),
    solarWindDensityPcm3: Number((6.2 + Math.cos(timeMs / 7000) * 0.9).toFixed(1)),
    auroraActivityIndex: kp > 4 ? 'Alto' : kp > 3 ? 'Moderado' : 'Bajo',
    auroraOvalLatitudeDeg: Number((66.5 - (kp - 2) * 1.5).toFixed(1)),
    solarIrradianceWm2: 1361.2,
    globalCloudCoverPct: 58.4,
    surfaceAverageTempC: 15.2,
    earthRotationAngleDeg: Number(earthRotDeg.toFixed(2)),
    subsolarPoint: {
      lat: Number(solarLat.toFixed(2)),
      lon: Number(solarLon.toFixed(2)),
    },
    atmosphereLayers: [
      {
        name: 'Troposfera',
        altRangeKm: '0 - 12 km',
        tempC: 15,
        pressureHpa: 1013.25,
        primaryGas: '78% N₂, 21% O₂, 0.9% Ar',
        phenomena: 'Clima global, biosfera y 80% de la masa gaseosa',
      },
      {
        name: 'Estratosfera',
        altRangeKm: '12 - 50 km',
        tempC: -3,
        pressureHpa: 1.0,
        primaryGas: 'Capa de Ozono (O₃) protectora UV',
        phenomena: 'Absorción radiación solar ultravioleta',
      },
      {
        name: 'Mesosfera',
        altRangeKm: '50 - 85 km',
        tempC: -90,
        pressureHpa: 0.01,
        primaryGas: 'Gases rarificados en equilibrio térmico',
        phenomena: 'Desintegración por fricción de meteoritos e inicio de bólidos',
      },
      {
        name: 'Termosfera',
        altRangeKm: '85 - 600 km',
        tempC: 1200,
        pressureHpa: 0.00001,
        primaryGas: 'Plasma ionizado (Ionosfera)',
        phenomena: 'Órbita de la ISS (420 km) y Óvalo de Auroras Boreales',
      },
      {
        name: 'Exosfera',
        altRangeKm: '600 - 10,000 km',
        tempC: 1500,
        pressureHpa: 1e-10,
        primaryGas: 'Hidrógeno y Helio atómico libre',
        phenomena: 'Transición al vacío espacial interplanetario',
      },
    ],
    utcTimestampIso: now.toISOString(),
  };
}

// 2. Near-Earth Objects (Asteroids / NEOs) Database & Approaching Objects
export const NEAR_EARTH_ASTEROIDS: NearEarthAsteroid[] = [
  {
    id: 'neo-99942',
    name: '99942 Apophis (Asteroide)',
    designation: '2004 MN4',
    diameterM: 340,
    diameterFormatted: '340 m (Ø Torre Eiffel)',
    velocityKmS: 30.73,
    missDistanceKm: 31600,
    missDistanceLunarDistances: 0.082,
    closeApproachDateFormatted: '13 Abr 2029 (Aproximación Histórica)',
    hoursUntilApproach: 22800,
    torinoScale: 0,
    isPotentiallyHazardous: true,
    spectralType: 'Sq (Silicato rocoso)',
    orbitClass: 'Aten',
    estimatedMassTons: 4.1e7,
  },
  {
    id: 'neo-2024-yr4',
    name: '2024 YR4 (NEO Reciente)',
    designation: '2024 YR4',
    diameterM: 58,
    diameterFormatted: '58 m',
    velocityKmS: 17.4,
    missDistanceKm: 1845000,
    missDistanceLunarDistances: 4.8,
    closeApproachDateFormatted: 'Próximo paso orbital detectado',
    hoursUntilApproach: 42,
    torinoScale: 0,
    isPotentiallyHazardous: false,
    spectralType: 'C (Carbonáceo)',
    orbitClass: 'Apollo',
    estimatedMassTons: 2.3e5,
  },
  {
    id: 'neo-101955',
    name: '101955 Bennu (Misión OSIRIS-REx)',
    designation: '1999 RQ36',
    diameterM: 490,
    diameterFormatted: '490 m',
    velocityKmS: 27.7,
    missDistanceKm: 7500000,
    missDistanceLunarDistances: 19.5,
    closeApproachDateFormatted: 'Monitoreo continuo JPL/CNEOS',
    hoursUntilApproach: 1450,
    torinoScale: 0,
    isPotentiallyHazardous: true,
    spectralType: 'B (Rico en carbono/volátiles)',
    orbitClass: 'Apollo',
    estimatedMassTons: 7.3e7,
  },
  {
    id: 'neo-2023-dz2',
    name: '2023 DZ2 (City-Killer Size)',
    designation: '2023 DZ2',
    diameterM: 70,
    diameterFormatted: '70 m',
    velocityKmS: 28.0,
    missDistanceKm: 174000,
    missDistanceLunarDistances: 0.45,
    closeApproachDateFormatted: 'En seguimiento telescópico',
    hoursUntilApproach: 310,
    torinoScale: 0,
    isPotentiallyHazardous: true,
    spectralType: 'S (Silicato)',
    orbitClass: 'Apollo',
    estimatedMassTons: 3.5e5,
  },
  {
    id: 'neo-162173',
    name: '162173 Ryugu (Misión Hayabusa2)',
    designation: '1999 JU3',
    diameterM: 870,
    diameterFormatted: '870 m (Ø casi 1 km)',
    velocityKmS: 24.1,
    missDistanceKm: 9800000,
    missDistanceLunarDistances: 25.5,
    closeApproachDateFormatted: 'Órbita estable mapeada',
    hoursUntilApproach: 5200,
    torinoScale: 0,
    isPotentiallyHazardous: true,
    spectralType: 'Cb (Primitivo rico en agua)',
    orbitClass: 'Apollo',
    estimatedMassTons: 4.5e8,
  },
  {
    id: 'neo-2024-bx1',
    name: '2024 BX1 (Bólido Berlín Impacto)',
    designation: 'Sar2736',
    diameterM: 1.2,
    diameterFormatted: '1.2 m (Meteorito Aubrita)',
    velocityKmS: 15.2,
    missDistanceKm: 0,
    missDistanceLunarDistances: 0.0,
    closeApproachDateFormatted: 'Impactado y fragmentado en atmósfera',
    hoursUntilApproach: 0,
    torinoScale: 0,
    isPotentiallyHazardous: false,
    spectralType: 'E (Aubrita rara)',
    orbitClass: 'Apollo',
    estimatedMassTons: 2.2,
  },
];

// 3. Historical and Recent Bolides / Fireball Events (NASA CNEOS Sensor Data)
export const BOLIDE_FIREBALL_EVENTS: BolideFireballEvent[] = [
  {
    id: 'bol-chelyabinsk',
    timestampIso: '2013-02-15T03:20:26Z',
    locationName: 'Cheliábinsk, Montes Urales, Rusia',
    lat: 54.8,
    lon: 61.1,
    energyRadiatedGj: 3750000,
    impactEnergyKtTnt: 440,
    altitudeKm: 23.3,
    velocityKmS: 18.6,
    brightnessMagnitude: -27.3,
  },
  {
    id: 'bol-berlin',
    timestampIso: '2024-01-21T00:32:00Z',
    locationName: 'Havelland, Oeste de Berlín, Alemania',
    lat: 52.6,
    lon: 12.8,
    energyRadiatedGj: 140,
    impactEnergyKtTnt: 0.15,
    altitudeKm: 29.1,
    velocityKmS: 15.2,
    brightnessMagnitude: -14.8,
  },
  {
    id: 'bol-kamchatka',
    timestampIso: '2018-12-18T23:48:20Z',
    locationName: 'Mar de Bering, Península de Kamchatka',
    lat: 56.9,
    lon: 172.4,
    energyRadiatedGj: 1300000,
    impactEnergyKtTnt: 173,
    altitudeKm: 25.6,
    velocityKmS: 32.0,
    brightnessMagnitude: -25.2,
  },
  {
    id: 'bol-spain-portugal',
    timestampIso: '2024-05-18T22:46:00Z',
    locationName: 'Península Ibérica (España / Portugal - Bólido Azul)',
    lat: 40.2,
    lon: -7.5,
    energyRadiatedGj: 850,
    impactEnergyKtTnt: 0.35,
    altitudeKm: 54.0,
    velocityKmS: 45.0,
    brightnessMagnitude: -16.2,
  },
  {
    id: 'bol-pacific',
    timestampIso: '2025-08-11T14:15:30Z',
    locationName: 'Océano Pacífico Sur (Sensor Satelital Infrarrojo)',
    lat: -22.4,
    lon: -138.2,
    energyRadiatedGj: 4800,
    impactEnergyKtTnt: 1.2,
    altitudeKm: 34.2,
    velocityKmS: 22.4,
    brightnessMagnitude: -18.5,
  },
];

// 4. Active Meteor Showers (Lluvias de Meteoros)
export const METEOR_SHOWERS: MeteorShower[] = [
  {
    id: 'perseids',
    name: 'Perseidas (Lágrimas de San Lorenzo)',
    radiantConstellation: 'Perseo (α = 46°, δ = +58°)',
    activePeriod: '17 Jul - 24 Ago',
    peakDate: '12 - 13 de Agosto',
    zhr: 100,
    velocityKmS: 59,
    parentBody: 'Cometa 109P/Swift-Tuttle',
    status: 'En Observación',
    currentDetectionRatePerHour: 18,
  },
  {
    id: 'geminids',
    name: 'Gemínidas (Mayor Tasa Anual)',
    radiantConstellation: 'Géminis (α = 112°, δ = +33°)',
    activePeriod: '04 Dic - 20 Dic',
    peakDate: '13 - 14 de Diciembre',
    zhr: 150,
    velocityKmS: 35,
    parentBody: 'Asteroide 3200 Faetón (Phaethon)',
    status: 'En Observación',
    currentDetectionRatePerHour: 24,
  },
  {
    id: 'quadrantids',
    name: 'Cuadrántidas',
    radiantConstellation: 'Boyero / Quadrans Muralis',
    activePeriod: '28 Dic - 12 Ene',
    peakDate: '03 - 04 de Enero',
    zhr: 110,
    velocityKmS: 41,
    parentBody: 'Asteroide 2003 EH1',
    status: 'Activa',
    currentDetectionRatePerHour: 45,
  },
  {
    id: 'orionids',
    name: 'Oriónidas',
    radiantConstellation: 'Orión (cerca de Betelgeuse)',
    activePeriod: '02 Oct - 07 Nov',
    peakDate: '21 - 22 de Octubre',
    zhr: 25,
    velocityKmS: 66,
    parentBody: 'Cometa 1P/Halley',
    status: 'En Observación',
    currentDetectionRatePerHour: 8,
  },
  {
    id: 'lyrids',
    name: 'Líridas',
    radiantConstellation: 'Lyra (cerca de Vega)',
    activePeriod: '16 Abr - 25 Abr',
    peakDate: '22 - 23 de Abril',
    zhr: 18,
    velocityKmS: 49,
    parentBody: 'Cometa C/1861 G1 Thatcher',
    status: 'En Observación',
    currentDetectionRatePerHour: 5,
  },
];

// 5. Planetary Ephemeris around Earth (Planetas a su alrededor)
export function getRealtimePlanetaryEphemeris(): PlanetSolarSystemData[] {
  const now = new Date();
  const timeMs = now.getTime();
  const dayOfYear = Math.floor((timeMs - new Date(now.getUTCFullYear(), 0, 0).getTime()) / 86400000);
  const tSec = timeMs / 1000;

  // Compute live ephemeris approximation
  // Earth orbit speed: ~29.78 km/s
  // Light speed c: 299,792 km/s

  const planets: PlanetSolarSystemData[] = [
    {
      id: 'moon',
      name: 'La Luna (Satélite Terrestre)',
      category: 'Satélite Natural Terrestre',
      distanceAu: 0.00257,
      distanceKm: Math.round(384400 + Math.sin(tSec / 5000) * 12000),
      lightTravelTimeSec: 1.282,
      lightTravelTimeFormatted: '1.28 segundos',
      apparentMagnitude: -12.74,
      elongationDeg: 135.2,
      constellation: 'Tauro / Géminis',
      illuminationPct: 84.6,
      orbitalVelocityKmS: 1.022,
      angularDiameterArcsec: 1880,
      visibilitySummary: 'Visible claramente en el cielo nocturno y crepuscular',
      orbitalRadiusVisual: 2.2,
      orbitalAngleDeg: (tSec * 0.05) % 360,
      colorHex: '#e2e8f0',
      diameterKm: 3474.8,
      moonsCount: 0,
      keyFeature: 'Fase Gibosa Creciente • Mareas Oceánicas Terrestres • Retrorreflectores Láser Apolo',
    },
    {
      id: 'sun',
      name: 'El Sol (Estrella Central)',
      category: 'Estrella Central (G2V)',
      distanceAu: 1.0002,
      distanceKm: 149597870,
      lightTravelTimeSec: 499.0,
      lightTravelTimeFormatted: '8.32 minutos',
      apparentMagnitude: -26.74,
      elongationDeg: 0,
      constellation: 'Piscis / Leo',
      illuminationPct: 100,
      orbitalVelocityKmS: 0,
      angularDiameterArcsec: 1919,
      visibilitySummary: 'Visible de día • Fuente de luz e ionización de la magnetosfera',
      orbitalRadiusVisual: 0,
      orbitalAngleDeg: 0,
      colorHex: '#f59e0b',
      diameterKm: 1392700,
      moonsCount: 8,
      keyFeature: 'Ciclo Solar 25 • Viento Solar incidente hacia la Tierra a 445 km/s',
    },
    {
      id: 'mercury',
      name: 'Mercurio',
      category: 'Planeta Interior',
      distanceAu: 0.94,
      distanceKm: 140620000,
      lightTravelTimeSec: 469,
      lightTravelTimeFormatted: '7.81 minutos',
      apparentMagnitude: -0.42,
      elongationDeg: 22.4,
      constellation: 'Acuario',
      illuminationPct: 56.1,
      orbitalVelocityKmS: 47.36,
      angularDiameterArcsec: 6.8,
      visibilitySummary: 'Visible muy bajo sobre el horizonte este antes del amanecer',
      orbitalRadiusVisual: 4.0,
      orbitalAngleDeg: (tSec * 0.041) % 360,
      colorHex: '#94a3b8',
      diameterKm: 4879.4,
      moonsCount: 0,
      keyFeature: 'Precesión anómala del perihelio explicada por la Relatividad General de Einstein',
    },
    {
      id: 'venus',
      name: 'Venus (El Lucero del Alba/Tarde)',
      category: 'Planeta Rocoso / Hermano Terrestre',
      distanceAu: 0.72,
      distanceKm: 107710000,
      lightTravelTimeSec: 359,
      lightTravelTimeFormatted: '5.98 minutos',
      apparentMagnitude: -4.38,
      elongationDeg: 46.2,
      constellation: 'Piscis',
      illuminationPct: 52.8,
      orbitalVelocityKmS: 35.02,
      angularDiameterArcsec: 22.4,
      visibilitySummary: 'Extremadamente brillante en el cielo al atardecer (Oeste)',
      orbitalRadiusVisual: 6.2,
      orbitalAngleDeg: (tSec * 0.016) % 360,
      colorHex: '#fef08a',
      diameterKm: 12103.6,
      moonsCount: 0,
      keyFeature: 'Efecto invernadero desbocado a 465°C • Atmósfera de CO₂ al 96%',
    },
    {
      id: 'mars',
      name: 'Marte (El Planeta Rojo)',
      category: 'Planeta Rocoso Exterior',
      distanceAu: 1.48,
      distanceKm: 221400000,
      lightTravelTimeSec: 738,
      lightTravelTimeFormatted: '12.31 minutos',
      apparentMagnitude: 0.85,
      elongationDeg: 95.4,
      constellation: 'Tauro',
      illuminationPct: 90.2,
      orbitalVelocityKmS: 24.07,
      angularDiameterArcsec: 7.2,
      visibilitySummary: 'Visible en mitad de la noche con tono rojizo característico',
      orbitalRadiusVisual: 9.2,
      orbitalAngleDeg: (tSec * 0.008) % 360,
      colorHex: '#f87171',
      diameterKm: 6792.4,
      moonsCount: 2,
      keyFeature: 'Robots activos Perseverance e Ingenuity • Monte Olimpo (22 km altura)',
    },
    {
      id: 'jupiter',
      name: 'Júpiter (Rey del Sistema Solar)',
      category: 'Gigante Gaseoso',
      distanceAu: 4.95,
      distanceKm: 740500000,
      lightTravelTimeSec: 2470,
      lightTravelTimeFormatted: '41.17 minutos',
      apparentMagnitude: -2.35,
      elongationDeg: 148.0,
      constellation: 'Aries',
      illuminationPct: 99.4,
      orbitalVelocityKmS: 13.07,
      angularDiameterArcsec: 42.6,
      visibilitySummary: 'Visible toda la noche; sus 4 lunas galileanas visibles con binoculares',
      orbitalRadiusVisual: 13.0,
      orbitalAngleDeg: (tSec * 0.003) % 360,
      colorHex: '#fdba74',
      diameterKm: 142984,
      moonsCount: 95,
      keyFeature: 'Gran Mancha Roja • Escudo protector de meteoros de la Tierra',
    },
    {
      id: 'saturn',
      name: 'Saturno (Señor de los Anillos)',
      category: 'Gigante Gaseoso con Anillos',
      distanceAu: 9.42,
      distanceKm: 1409200000,
      lightTravelTimeSec: 4700,
      lightTravelTimeFormatted: '78.34 minutos (1.3 h)',
      apparentMagnitude: 0.72,
      elongationDeg: 112.5,
      constellation: 'Acuario',
      illuminationPct: 99.7,
      orbitalVelocityKmS: 9.69,
      angularDiameterArcsec: 17.5,
      visibilitySummary: 'Visible a simple vista en horas de madrugada con brillo dorado',
      orbitalRadiusVisual: 16.5,
      orbitalAngleDeg: (tSec * 0.0015) % 360,
      colorHex: '#fde047',
      diameterKm: 120536,
      moonsCount: 146,
      keyFeature: 'Sistema de anillos de hielo de 282,000 km • Luna Titán con atmósfera densa',
    },
    {
      id: 'uranus',
      name: 'Urano',
      category: 'Gigante de Hielo',
      distanceAu: 19.3,
      distanceKm: 2887000000,
      lightTravelTimeSec: 9630,
      lightTravelTimeFormatted: '2.68 horas',
      apparentMagnitude: 5.75,
      elongationDeg: 104.2,
      constellation: 'Tauro',
      illuminationPct: 100,
      orbitalVelocityKmS: 6.81,
      angularDiameterArcsec: 3.6,
      visibilitySummary: 'Al límite de la visión a simple vista; requiere telescopio pequeño',
      orbitalRadiusVisual: 20.0,
      orbitalAngleDeg: (tSec * 0.0007) % 360,
      colorHex: '#67e8f9',
      diameterKm: 51118,
      moonsCount: 28,
      keyFeature: 'Eje de rotación inclinado a 97.8° (gira prácticamente de lado)',
    },
    {
      id: 'neptune',
      name: 'Neptuno',
      category: 'Gigante de Hielo Exterior',
      distanceAu: 29.8,
      distanceKm: 4457000000,
      lightTravelTimeSec: 14867,
      lightTravelTimeFormatted: '4.13 horas',
      apparentMagnitude: 7.82,
      elongationDeg: 92.1,
      constellation: 'Piscis',
      illuminationPct: 100,
      orbitalVelocityKmS: 5.43,
      angularDiameterArcsec: 2.3,
      visibilitySummary: 'Visible únicamente con telescopio como diminuto disco azul cobalto',
      orbitalRadiusVisual: 23.5,
      orbitalAngleDeg: (tSec * 0.0004) % 360,
      colorHex: '#3b82f6',
      diameterKm: 49528,
      moonsCount: 16,
      keyFeature: 'Vientos atmosféricos más veloces del sistema solar (hasta 2,100 km/h)',
    },
  ];

  return planets;
}

// 6. Live Space & Earth Webcams Database
export const SPACE_WEBCAMS: SpaceWebcam[] = [
  {
    id: 'cam-iss-hd-earth',
    name: 'Cámara ISS HD Live Earth View (NASA)',
    operator: 'NASA / Johnson Space Center',
    category: 'iss_earth',
    locationName: 'Estación Espacial Internacional (Órbita LEO 420 km)',
    lat: 25.42,
    lon: -45.12,
    altitudeKm: 421.5,
    // Real official NASA ISS Live stream on YouTube (reliable live embed)
    streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/P9C25Un7xaM?autoplay=1&mute=1&controls=1&modestbranding=1',
    directWebcamUrl: 'https://eol.jsc.nasa.gov/ESRS/HDEV/',
    resolution: '1080p60 HD',
    bitrateMbps: 8.5,
    status: 'LIVE_STREAMING',
    description: 'Transmisión en directo en tiempo real de la Tierra vista desde las cámaras externas de la ISS. Observa continentes, océanos, amaneceres orbitales y tormentas en vivo cada 92 minutos.',
    viewAngle: 'Nadir (Hacia el suelo terrestre)',
    refreshRateFps: 60,
  },
  {
    id: 'cam-nasa-tv-live',
    name: 'NASA TV Live • Canal Oficial',
    operator: 'NASA Headquarters / Washington DC',
    category: 'nasa_tv',
    locationName: 'Centro de Control de Misiones NASA Houston',
    lat: 29.56,
    lon: -95.09,
    altitudeKm: 0.02,
    streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/21X5lGlDOfg?autoplay=1&mute=1&controls=1',
    directWebcamUrl: 'https://www.nasa.gov/nasatv/',
    resolution: '1080p HD',
    bitrateMbps: 6.0,
    status: 'LIVE_STREAMING',
    description: 'Canal oficial en vivo de la NASA con cobertura 24/7 de operaciones espaciales, caminatas espaciales (EVA), lanzamientos de cohetes y ciencia astronómica.',
    viewAngle: 'Transmisión Multicámara Espacial',
    refreshRateFps: 30,
  },
  {
    id: 'cam-mauna-kea-allsky',
    name: 'Observatorio Mauna Kea All-Sky Cam (Hawái)',
    operator: 'Keck Observatory & CFHT',
    category: 'observatory',
    locationName: 'Cumbre de Mauna Kea, Isla Grande, Hawái (4,207 m s.n.m.)',
    lat: 19.82,
    lon: -155.46,
    altitudeKm: 4.21,
    streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/XqZsoesa55w?autoplay=1&mute=1&controls=1',
    directWebcamUrl: 'https://www.keckobservatory.org/live-cams/',
    resolution: '4K UHD',
    bitrateMbps: 12.0,
    status: 'LIVE_STREAMING',
    description: 'Cámara de cielo nocturno y crepúsculo en la cumbre del volcán Mauna Kea. Monitoreo en vivo de la Vía Láctea, meteoritos, satélites y nubes sobre el Océano Pacífico.',
    viewAngle: 'Gran Angular 180° Bóveda Celeste',
    refreshRateFps: 30,
  },
  {
    id: 'cam-aurora-borealis',
    name: 'Live Aurora Borealis Cam (Tromsø / Laponia)',
    operator: 'Northern Lights Arctic Sky Observatory',
    category: 'aurora',
    locationName: 'Tromsø / Sommarøy, Noruega (Círculo Polar Ártico 69.6° N)',
    lat: 69.65,
    lon: 18.96,
    altitudeKm: 0.12,
    streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/OInHgq-5Z1I?autoplay=1&mute=1&controls=1',
    directWebcamUrl: 'https://auroraskystation.se/',
    resolution: '1080p HD',
    bitrateMbps: 7.5,
    status: 'LIVE_STREAMING',
    description: 'Cámara óptica de alta sensibilidad apuntando hacia el óvalo auroral ártico para capturar en tiempo real las ondas de auroras boreales verdes inducidas por el viento solar.',
    viewAngle: 'Cenit Ártico Polar',
    refreshRateFps: 30,
  },
  {
    id: 'cam-teide-canarias',
    name: 'Observatorio del Teide / Roque de los Muchachos',
    operator: 'Instituto de Astrofísica de Canarias (IAC)',
    category: 'observatory',
    locationName: 'Cumbre de Izaña, Tenerife / La Palma, Canarias',
    lat: 28.3,
    lon: -16.51,
    altitudeKm: 2.39,
    streamEmbedUrl: 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&controls=1',
    directWebcamUrl: 'https://www.iac.es/es/observatorios-de-canarias/observatorio-del-teide/camaras-en-vivo',
    resolution: '1080p HD',
    bitrateMbps: 5.5,
    status: 'LIVE_STREAMING',
    description: 'Uno de los 3 cielos más limpios del planeta Tierra para astronomía y detección de bólidos y basura espacial.',
    viewAngle: 'Horizonte Teide y Mar de Nubes',
    refreshRateFps: 30,
  },
];
