function modifyAlpha(color, alpha) {
  // Extract numbers from rgb/rgba
  let [r, g, b, a = 1] = color
    .replace(/^rgba?\(|\s+|\)$/g, "") // Remove "rgba(" and ")"
    .split(",")
    .map(Number);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}



function hexToRgba(hex, alpha = 1) {
  hex = hex.replace(/^#/, ""); // Remove #

  // If shorthand hex (#RGB), expand to #RRGGBB
  if (hex.length === 3) {
    hex = hex.split("").map((char) => char + char).join("");
  }

  // Extract RGB values
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // If HEX contains alpha (#RRGGBBAA), override alpha
  if (hex.length === 8) {
    alpha = parseInt(hex.substring(6, 8), 16) / 255; // Convert 0-255 to 0-1
  }

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbaToHex(color) {
  let [r, g, b, a = 1] = color
    .replace(/^rgba?\(|\s+|\)$/g, "") // Remove "rgba(" and ")"
    .split(",")
    .map(Number);

  // Convert RGB to HEX
  let hex = `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;

  // If alpha is not 1, add it to HEX
  if (a < 1) {
    hex += Math.round(a * 255).toString(16).padStart(2, "0").toUpperCase();
  }

  return hex;
}


function trimAlphaFromHex(hex) {
  if (hex.length === 5) {
    return hex.slice(0, hex.length - 1);
  } else if (hex.length === 9) {
    return hex.slice(0, hex.length - 2);
  }
  return hex;
}




module.exports = { modifyAlpha, hexToRgba, rgbaToHex, trimAlphaFromHex }; 