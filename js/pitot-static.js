// Page code for the Pitot-static simulator: reads the controls, draws the three dials,
// and writes the plain-language explanation. The physics lives in pitot-physics.js.
(function () {
  "use strict";

  var P = PitotPhysics;
  var SVG_NS = "http://www.w3.org/2000/svg";
  var CX = 100; // dial centre
  var CY = 100;

  // What the student has set, and the blockage (null means none).
  var flight = { altitudeFt: 5000, tasKt: 120, climbFpm: 0 };
  var blockage = null;

  var FIELDS = {
    altitudeFt: { id: "altitude", min: 0, max: 20000 },
    tasKt: { id: "airspeed", min: 0, max: 250 },
    climbFpm: { id: "climb", min: -2000, max: 2000 }
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fmt(n) {
    return Math.round(n).toLocaleString("en-US");
  }

  // ---------- Drawing helpers ----------

  function svgEl(name, attrs, parent) {
    var el = document.createElementNS(SVG_NS, name);
    for (var key in attrs) {
      el.setAttribute(key, attrs[key]);
    }
    parent.appendChild(el);
    return el;
  }

  // A point on the dial. Angles run clockwise from 12 o'clock, in degrees.
  function point(angle, radius) {
    var a = (angle * Math.PI) / 180;
    return { x: CX + radius * Math.sin(a), y: CY - radius * Math.cos(a) };
  }

  function drawFace(svg) {
    svgEl("circle", { cx: CX, cy: CY, r: 96, "class": "dial-face" }, svg);
  }

  function drawTick(svg, angle, outer, inner, major) {
    var p1 = point(angle, outer);
    var p2 = point(angle, inner);
    svgEl("line", {
      x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
      "class": major ? "tick major" : "tick"
    }, svg);
  }

  function drawLabel(svg, angle, radius, text) {
    var p = point(angle, radius);
    var el = svgEl("text", { x: p.x, y: p.y, "class": "dial-label" }, svg);
    el.textContent = text;
  }

  function drawUnit(svg, y, text) {
    var el = svgEl("text", { x: CX, y: y, "class": "dial-unit" }, svg);
    el.textContent = text;
  }

  // A needle drawn pointing straight up; rotating the group aims it.
  function drawNeedle(svg, length, width) {
    var group = svgEl("g", {}, svg);
    svgEl("line", {
      x1: CX, y1: CY + 12, x2: CX, y2: CY - length,
      "class": "needle", "stroke-width": width
    }, group);
    return group;
  }

  function drawHub(svg) {
    svgEl("circle", { cx: CX, cy: CY, r: 5, "class": "hub" }, svg);
  }

  function aim(needle, angle) {
    needle.setAttribute("transform", "rotate(" + angle + " " + CX + " " + CY + ")");
  }

  // ---------- Dial layouts ----------

  // Airspeed: 0-250 kt sweeps 270 degrees, from the 7:30 position round to 4:30.
  function asiAngle(kt) {
    return -135 + (270 * clamp(kt, 0, 250)) / 250;
  }

  function buildAsi(svg) {
    drawFace(svg);
    for (var kt = 0; kt <= 250; kt += 10) {
      var major = kt % 50 === 0;
      drawTick(svg, asiAngle(kt), 92, major ? 80 : 86, major);
      if (major) drawLabel(svg, asiAngle(kt), 66, String(kt));
    }
    drawUnit(svg, 138, "KNOTS");
    var needle = drawNeedle(svg, 74, 3);
    drawHub(svg);
    return needle;
  }

  // Altimeter: one turn of the long needle is 1,000 ft; one turn of the short needle is 10,000 ft.
  function buildAltimeter(svg) {
    drawFace(svg);
    for (var i = 0; i < 50; i++) {
      var major = i % 5 === 0;
      drawTick(svg, i * 7.2, 92, major ? 80 : 86, major);
      if (major) drawLabel(svg, i * 7.2, 68, String(i / 5));
    }
    drawUnit(svg, 138, "FEET");
    var hundreds = drawNeedle(svg, 80, 2.5);
    var thousands = drawNeedle(svg, 50, 5);
    drawHub(svg);
    return { hundreds: hundreds, thousands: thousands };
  }

  // Vertical speed: zero at 9 o'clock, climb up and round through the top, descent round the bottom.
  function vsiAngle(fpm) {
    return 270 + (170 * clamp(fpm, -2000, 2000)) / 2000;
  }

  function buildVsi(svg) {
    drawFace(svg);
    for (var fpm = -2000; fpm <= 2000; fpm += 250) {
      var major = fpm % 500 === 0;
      drawTick(svg, vsiAngle(fpm), 92, major ? 80 : 86, major);
    }
    var labels = [
      [-2000, "-2"], [-1000, "-1"], [0, "0"], [1000, "+1"], [2000, "+2"]
    ];
    labels.forEach(function (item) {
      drawLabel(svg, vsiAngle(item[0]), 64, item[1]);
    });
    drawUnit(svg, 138, "x1000 FT/MIN");
    var needle = drawNeedle(svg, 74, 3);
    drawHub(svg);
    return needle;
  }

  var asiNeedle = buildAsi(byId("asi-dial"));
  var altNeedles = buildAltimeter(byId("alt-dial"));
  var vsiNeedle = buildVsi(byId("vsi-dial"));

  // ---------- Showing the readings ----------

  function showInstrument(prefix, svgLabel, readingText, actualText, isWrong) {
    byId(prefix + "-reading").textContent = readingText;
    byId(prefix + "-actual").textContent = "Actual: " + actualText;
    byId(prefix + "-flag").textContent = isWrong ? "Reading is wrong" : "";
    byId(prefix + "-dial").setAttribute("aria-label", svgLabel + ": " + readingText);
  }

  function signed(fpm) {
    var n = Math.round(fpm);
    return (n > 0 ? "+" : "") + fmt(n) + " ft/min";
  }

  // Plain-language explanation for the chosen blockage.
  function explain() {
    var main = byId("explain-main");
    var now = byId("explain-now");

    if (!blockage) {
      main.textContent = "No blockage. The pitot tube and static port are both clear, so all three instruments read correctly.";
      now.textContent = "Pick a blockage on the left to see what changes.";
      return;
    }

    var lockAlt = blockage.altitudeFt;
    var diff = flight.altitudeFt - lockAlt;
    var level = Math.abs(diff) < 50;
    var above = diff >= 50;

    if (blockage.type === "pitot") {
      main.textContent = "The front opening of the pitot tube is blocked, but its drain hole is still open. The air trapped in the tube slowly leaks out, so the airspeed indicator falls to zero. The altimeter and vertical speed indicator use the static port, so they still read correctly.";
      now.textContent = "The airspeed indicator stays at zero whatever speed or altitude you set.";
    } else if (blockage.type === "pitotDrain") {
      main.textContent = "Both the front opening and the drain hole are blocked, so the air pressure in the pitot tube is stuck at its value from " + fmt(lockAlt) + " ft and " + fmt(blockage.tasKt) + " kt. The airspeed indicator now responds only to the outside air pressure, which changes with altitude. It does not react to speed changes at all. The altimeter and vertical speed indicator still read correctly.";
      if (level) {
        now.textContent = "You are at the altitude where the blockage began, so the airspeed indicator looks normal. Change the altitude to see it drift, and notice that changing the airspeed does nothing.";
      } else if (above) {
        now.textContent = "You are above " + fmt(lockAlt) + " ft, so the outside pressure is lower and the airspeed indicator reads higher than it did when the blockage began, even if you slow down.";
      } else {
        now.textContent = "You are below " + fmt(lockAlt) + " ft, so the outside pressure is higher and the airspeed indicator reads lower than it did when the blockage began, even if you speed up.";
      }
    } else {
      main.textContent = "The static port is blocked, so the air pressure in the static line is stuck at its value from " + fmt(lockAlt) + " ft. The altimeter stays frozen at that altitude and the vertical speed indicator reads zero. The airspeed indicator compares the pitot pressure with that stuck pressure. Even a few hundred feet of climb or descent changes its reading a lot.";
      if (level) {
        now.textContent = "You are at the altitude where the blockage began, so everything still looks right. Climb or descend to see the instruments go wrong.";
      } else if (above) {
        now.textContent = "You are above " + fmt(lockAlt) + " ft, so the airspeed indicator reads too low, while the altimeter is stuck at " + fmt(lockAlt) + " ft and the vertical speed indicator shows zero.";
      } else {
        now.textContent = "You are below " + fmt(lockAlt) + " ft, so the airspeed indicator reads too high, while the altimeter is stuck at " + fmt(lockAlt) + " ft and the vertical speed indicator shows zero.";
      }
    }
  }

  function render() {
    var shown = P.readings(flight, blockage);
    var actual = P.readings(flight, null);

    aim(asiNeedle, asiAngle(shown.airspeedKt));
    aim(altNeedles.hundreds, 360 * ((shown.altitudeFt % 1000) / 1000));
    aim(altNeedles.thousands, 360 * ((shown.altitudeFt % 10000) / 10000));
    aim(vsiNeedle, vsiAngle(shown.climbFpm));

    showInstrument("asi", "Airspeed indicator",
      fmt(shown.airspeedKt) + " kt", fmt(actual.airspeedKt) + " kt",
      Math.abs(shown.airspeedKt - actual.airspeedKt) >= 1);
    showInstrument("alt", "Altimeter",
      fmt(shown.altitudeFt) + " ft", fmt(actual.altitudeFt) + " ft",
      Math.abs(shown.altitudeFt - actual.altitudeFt) >= 10);
    showInstrument("vsi", "Vertical speed indicator",
      signed(shown.climbFpm), signed(actual.climbFpm),
      Math.abs(shown.climbFpm - actual.climbFpm) >= 10);

    explain();
  }

  // ---------- Controls ----------

  // Keeps a slider and its number box in step with each other.
  function setupField(key) {
    var field = FIELDS[key];
    var range = byId(field.id + "-range");
    var number = byId(field.id + "-number");

    function set(value, source) {
      var v = Number(value);
      if (!isFinite(v)) return;
      v = clamp(v, field.min, field.max);
      flight[key] = v;
      if (source !== range) range.value = v;
      if (source !== number) number.value = v;
      render();
    }

    range.addEventListener("input", function () {
      set(range.value, range);
    });
    number.addEventListener("input", function () {
      if (number.value !== "") set(number.value, number);
    });
    // When the box loses focus, tidy up an empty or out-of-range entry.
    number.addEventListener("change", function () {
      set(number.value === "" ? flight[key] : number.value);
    });
  }

  Object.keys(FIELDS).forEach(setupField);

  var radios = document.querySelectorAll('input[name="blockage"]');
  Array.prototype.forEach.call(radios, function (radio) {
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      // The blockage starts now, at whatever the flight conditions are at this moment.
      blockage = radio.value === "none" ? null : P.lockBlockage(radio.value, flight);
      render();
    });
  });

  render();
})();
