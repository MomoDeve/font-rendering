import opentype = require("opentype.js");

class FontLoader {
  private font: opentypejs.Font;

  constructor(fontData: ArrayBuffer) {
    this.font = opentype.parse(fontData);
  }

  getGlyphNormalizedContours(char: string): opentypejs.Contour[] {
    const glyph = this.font.charToGlyph(char);
    const metrics = glyph.getMetrics();
    glyph.path;
    const contours = glyph.getContours();
    for (var contourId = 0; contourId < contours.length; contourId++) {
      const points = contours[contourId];
      for (var i = 0; i < points.length; i++) {
        points[i].x = (points[i].x - metrics.xMin) / (metrics.xMax - metrics.xMin);
        points[i].y = (points[i].y - metrics.yMin) / (metrics.yMax - metrics.yMin);
      }
    }
    return contours;
  }

}

export {FontLoader}