declare module 'suncalc' {
  export interface GetTimesResult {
    solarNoon: Date;
    nadir: Date;
    sunrise: Date;
    sunset: Date;
    sunriseEnd: Date;
    sunsetStart: Date;
    dawn: Date;
    dusk: Date;
    nauticalDawn: Date;
    nauticalDusk: Date;
    nightEnd: Date;
    night: Date;
    goldenHourEnd: Date;
    goldenHour: Date;
  }

  export interface GetPositionResult {
    altitude: number;
    azimuth: number;
  }

  export interface GetMoonPositionResult {
    altitude: number;
    azimuth: number;
    distance: number;
    parallacticAngle: number;
  }

  export interface GetMoonIlluminationResult {
    fraction: number;
    phase: number;
    angle: number;
  }

  export interface GetMoonTimesResult {
    rise?: Date;
    set?: Date;
    alwaysUp?: boolean;
    alwaysDown?: boolean;
  }

  export function getTimes(
    date: Date,
    latitude: number,
    longitude: number,
    height?: number
  ): GetTimesResult;

  export function getPosition(
    date: Date,
    latitude: number,
    longitude: number
  ): GetPositionResult;

  export function getMoonPosition(
    date: Date,
    latitude: number,
    longitude: number
  ): GetMoonPositionResult;

  export function getMoonIllumination(date: Date): GetMoonIlluminationResult;

  export function getMoonTimes(
    date: Date,
    latitude: number,
    longitude: number,
    inUTC?: boolean
  ): GetMoonTimesResult;

  export function addTime(
    angle: number,
    riseName: string,
    setName: string
  ): void;

  const _default: {
    getTimes: typeof getTimes;
    getPosition: typeof getPosition;
    getMoonPosition: typeof getMoonPosition;
    getMoonIllumination: typeof getMoonIllumination;
    getMoonTimes: typeof getMoonTimes;
    addTime: typeof addTime;
  };

  export default _default;
}





