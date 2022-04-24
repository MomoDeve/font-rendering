import opentype = require("opentype.js");

class FontLoader {
  private font: opentypejs.Font;

  constructor(fontData: ArrayBuffer) {
    this.font = opentype.parse(fontData);
  }

  normalizeVertexData(vertices: number[], minX: number, minY: number, maxX: number, maxY: number): void {
    const normDim = maxY - minY;
    for (var i = 0; i < vertices.length; i += 4) {
      vertices[i + 0] = (vertices[i + 0] - minX) / normDim;
      vertices[i + 1] = (minY - vertices[i + 1]) / normDim;
    }
  }

  getTextVertexData(text: string): number[] {
    var commands = this.font.getPath(text, 0, 0, 1).commands;

    var vertices = Array.of<number>();

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
          vertices.push(
            firstX,    firstY,    0.0, 1.0,
            currentX,  currentY,  0.0, 1.0,
            command.x, command.y, 0.0, 1.0
          );
        }
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Q') {
        ++contourCount;
        if (contourCount >= 2) {
          vertices.push(
            firstX,    firstY,    0.0, 1.0,
            currentX,  currentY,  0.0, 1.0,
            command.x, command.y, 0.0, 1.0
          );
        }
        vertices.push(
          currentX,   currentY,   0.0, 0.0,
          command.x1, command.y1, 0.5, 0.0,
          command.x,   command.y, 1.0, 1.0
        );
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Z') {
        currentX = firstX;
        currentY = firstY;
        contourCount = 0;
      }
    }

    var minX = vertices[0], minY = vertices[1];
    var maxX = vertices[0], maxY = vertices[1];
    for (var i = 0; i < vertices.length; i += 4) {
      minX = Math.min(vertices[i + 0], minX);
      minY = Math.min(vertices[i + 1], minY);
      maxX = Math.max(vertices[i + 0], maxX);
      maxY = Math.max(vertices[i + 1], maxY);
    }

    this.normalizeVertexData(vertices, minX, minY, maxX, maxY);
    return vertices;
  }

}

export {FontLoader}