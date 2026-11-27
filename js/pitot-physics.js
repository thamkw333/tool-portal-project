// Physics for the Pitot-static simulator. No page code in here, so it can be tested on its own.
//
// Assumes the "standard atmosphere" (a textbook model of how air pressure and
// temperature change with height) and stays below 36,000 ft.
//
// Pressures are in pascals (Pa), altitudes in feet, speeds in knots (kt),
// and climb rates in feet per minute (ft/min).
var PitotPhysics = (function () {
  "use strict";

  var M_PER_FT = 0.3048;
  var MS_PER_KT = 0.514444; // metres per second in one knot
  var P0 = 101325; // sea-level air pressure
  var T0 = 288.15; // sea-level temperature, in kelvin
  var LAPSE = 0.0065; // temperature drop per metre of climb
  var G = 9.80665;
  var R = 287.05287;
  var RHO0 = 1.225; // sea-level air density, in kg per cubic metre
  var EXPONENT = G / (R * LAPSE);

  // Outside air pressure at a given altitude.
  function pressureAtAltitude(altitudeFt) {
    var h = altitudeFt * M_PER_FT;
    return P0 * Math.pow(1 - (LAPSE * h) / T0, EXPONENT);
  }

  // The altitude that goes with a given outside air pressure (what an altimeter does).
  function altitudeAtPressure(pressurePa) {
    var h = (T0 / LAPSE) * (1 - Math.pow(pressurePa / P0, 1 / EXPONENT));
    return h / M_PER_FT;
  }

  function densityAtAltitude(altitudeFt) {
    var h = altitudeFt * M_PER_FT;
    return pressureAtAltitude(altitudeFt) / (R * (T0 - LAPSE * h));
  }

  // The extra pressure the pitot tube feels because the aircraft is moving through the air.
  function dynamicPressure(tasKt, altitudeFt) {
    var v = tasKt * MS_PER_KT;
    return 0.5 * densityAtAltitude(altitudeFt) * v * v;
  }

  // What the airspeed indicator shows for a given pressure difference (pitot minus static).
  function airspeedFromPressureDifference(diffPa) {
    if (diffPa <= 0) return 0;
    return Math.sqrt((2 * diffPa) / RHO0) / MS_PER_KT;
  }

  // Called when a blockage starts: remembers the pressures that get trapped at that moment.
  // type is "pitot", "pitotDrain" or "static".
  function lockBlockage(type, flight) {
    var ps = pressureAtAltitude(flight.altitudeFt);
    var q = dynamicPressure(flight.tasKt, flight.altitudeFt);
    return {
      type: type,
      trappedPitotPa: ps + q,
      trappedStaticPa: ps,
      altitudeFt: flight.altitudeFt,
      tasKt: flight.tasKt
    };
  }

  // What the three instruments show.
  // flight: { altitudeFt, tasKt, climbFpm }. blockage: null, or the result of lockBlockage().
  function readings(flight, blockage) {
    var ps = pressureAtAltitude(flight.altitudeFt);
    var q = dynamicPressure(flight.tasKt, flight.altitudeFt);
    var result = {
      airspeedKt: airspeedFromPressureDifference(q),
      altitudeFt: flight.altitudeFt,
      climbFpm: flight.climbFpm
    };

    if (!blockage) return result;

    if (blockage.type === "pitot") {
      // Front opening blocked, drain hole open: the trapped air leaks out,
      // so the pitot line drops to outside pressure and the difference is zero.
      result.airspeedKt = 0;
    } else if (blockage.type === "pitotDrain") {
      // Pressure stuck in the pitot line, so the indicator only follows outside pressure.
      result.airspeedKt = airspeedFromPressureDifference(blockage.trappedPitotPa - ps);
    } else if (blockage.type === "static") {
      // Static pressure stuck at its old value: altimeter frozen, vertical speed zero,
      // and the airspeed indicator compares the pitot pressure with the stale value.
      result.altitudeFt = altitudeAtPressure(blockage.trappedStaticPa);
      result.climbFpm = 0;
      result.airspeedKt = airspeedFromPressureDifference(ps + q - blockage.trappedStaticPa);
    }
    return result;
  }

  return {
    pressureAtAltitude: pressureAtAltitude,
    altitudeAtPressure: altitudeAtPressure,
    densityAtAltitude: densityAtAltitude,
    dynamicPressure: dynamicPressure,
    lockBlockage: lockBlockage,
    readings: readings
  };
})();

// Lets the file be loaded by a test script outside the browser; the page ignores this.
if (typeof module !== "undefined" && module.exports) {
  module.exports = PitotPhysics;
}
