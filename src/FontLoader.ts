import opentype = require("opentype.js");

class FontLoader {
  private font: opentypejs.Font;

  constructor(fontData: ArrayBuffer) {
    this.font = opentype.parse(fontData);
  }

  normalizeVertexData(vertices: number[], minX: number, minY: number, maxX: number, maxY: number): void {
    const normDim = maxY - minY;
    for (var i = 0; i < vertices.length; i += 2) {
      vertices[i] = (vertices[i] - minX) / normDim;
      vertices[i + 1] = (minY - vertices[i + 1]) / normDim;
    }
  }

  getTextVertexData(text: string): { solid: number[], smooth: number[] } {
    var commands = this.font.getPath(text, 0, 0, 1).commands;

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

    var minX = solidTriangles[0], minY = solidTriangles[1];
    var maxX = solidTriangles[0], maxY = solidTriangles[1];
    for (var i = 0; i < solidTriangles.length; i += 2) {
      minX = Math.min(solidTriangles[i + 0], minX);
      minY = Math.min(solidTriangles[i + 1], minY);
      maxX = Math.max(solidTriangles[i + 0], maxX);
      maxY = Math.max(solidTriangles[i + 1], maxY);
    }

    this.normalizeVertexData(solidTriangles, minX, minY, maxX, maxY);
    this.normalizeVertexData(smoothTriangles, minX, minY, maxX, maxY);

    return { solid: solidTriangles, smooth: smoothTriangles };
  }

}

export {FontLoader}