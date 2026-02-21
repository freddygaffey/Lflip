import SunCalc from 'suncalc';
import { HOME_LAT, HOME_LNG } from '../../config';

export function isNightTime(date: Date, lat = HOME_LAT, lng = HOME_LNG): boolean {
  const times = SunCalc.getTimes(date, lat, lng);
  const ts = date.getTime();
  return ts < times.sunrise.getTime() || ts > times.sunset.getTime();
}

export function getSunriseSunset(date: Date, lat = HOME_LAT, lng = HOME_LNG) {
  const times = SunCalc.getTimes(date, lat, lng);
  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
  };
}
