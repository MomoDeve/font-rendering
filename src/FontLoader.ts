import opentype = require("opentype.js");

class FontLoader {
  private font: opentypejs.Font;

  constructor(fontData: ArrayBuffer) {
    this.font = opentype.parse(fontData);
  }

  normalizeVertexData(vertexData: number[], metrics: opentypejs.Metrics): void {
    for (var i = 0; i < vertexData.length; i += 2) {
      vertexData[i + 0] = (vertexData[i + 0] - metrics.xMin) / (metrics.xMax - metrics.xMin);
      vertexData[i + 1] = (vertexData[i + 1] - metrics.yMin) / (metrics.yMax - metrics.yMin);
    }
  }

  getGlyphVertexData(char: string): { solid: number[], smooth: number[] } {
    const glyph = this.font.charToGlyph(char);

    var commands = glyph.path.commands;

    var solidTriangles = Array.of<number>();
    var smoothTriangles = Array.of<number>();

    var firstX = 0, firstY = 0, currentX = 0, currentY = 0;
    var contourCount = 0;
    for(var commandId = 0; commandId < commands.length; commandId++) {
      var command = commands[commandId];
      if (command.type === 'M') {
          firstX = currentX = command.x;
          firstY = currentY = command.y;
      } else if (command.type === 'L') {
        ++contourCount;
        if (contourCount >= 2) {
          solidTriangles.push(firstX, firstY, currentX, currentY, command.x, command.y);
        }
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Q') {
        ++contourCount;
        if (contourCount >= 2) {
          solidTriangles.push(firstX, firstY, currentX, currentY, command.x, command.y);
        }
        smoothTriangles.push(currentX, currentY, command.x1, command.y1, command.x, command.y);
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Z') {
        currentX = firstX;
        currentY = firstY;
        contourCount = 0;
      }
    }

    const metrics = glyph.getMetrics();
    this.normalizeVertexData(solidTriangles, metrics);
    this.normalizeVertexData(smoothTriangles, metrics);

    return { solid: solidTriangles, smooth: smoothTriangles };

    // const contours = glyph.getContours();
    // for (var contourId = 0; contourId < contours.length; contourId++) {
    //   const points = contours[contourId];
    //   for (var i = 0; i < points.length; i++) {
    //     points[i].x = (points[i].x - metrics.xMin) / (metrics.xMax - metrics.xMin);
    //     points[i].y = (points[i].y - metrics.yMin) / (metrics.yMax - metrics.yMin);
    //   }
    // }
    // return contours;
  }

}

export {FontLoader}