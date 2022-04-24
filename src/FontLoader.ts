import opentype = require("opentype.js");

class FontLoader {
  private font: opentypejs.Font;

  constructor(fontData: ArrayBuffer) {
    this.font = opentype.parse(fontData);
  }

  private normalizeVertexData = (vertices: number[]) => {
    // normalize vertex data by flipping y coordinate of vertices, subtructing offset and dividing by max glyph size 
    var minX = vertices[0], minY = vertices[1];
    var maxX = vertices[0], maxY = vertices[1];
    for (var i = 0; i < vertices.length; i += 4) {
      minX = Math.min(vertices[i + 0], minX);
      minY = Math.min(vertices[i + 1], minY);
      maxX = Math.max(vertices[i + 0], maxX);
      maxY = Math.max(vertices[i + 1], maxY);
    }

    const normDim = maxY - minY;
    for (var i = 0; i < vertices.length; i += 4) {
      vertices[i + 0] = (vertices[i + 0] - minX) / normDim;
      vertices[i + 1] = (minY - vertices[i + 1]) / normDim;
    }
  }

  private addSolidVertex = (vertices: number[], x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    vertices.push(
      x1, y1, 0.0, 1.0,
      x2, y2, 0.0, 1.0,
      x3, y3, 0.0, 1.0
    )
  }

  private addSmoothVertex = (vertices: number[], x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    vertices.push(
      x1, y1, 0.0, 0.0,
      x2, y2, 0.5, 0.0,
      x3, y3, 1.0, 1.0
    )
  }

  generateVertexData(text: string): number[] {
    var commands = this.font.getPath(text, 0, 0, 1).commands;

    var vertices = Array.of<number>();

    var firstX = 0, firstY = 0, currentX = 0, currentY = 0;
    var contourCount = 0;
    // parse command list
    for(var commandId = 0; commandId < commands.length; commandId++) {
      var command = commands[commandId];
      if (command.type === 'M') {
          firstX = currentX = command.x;
          firstY = currentY = command.y;
      } else if (command.type === 'L') {
        ++contourCount;
        if (contourCount >= 2) {
          this.addSolidVertex(vertices, firstX, firstY, currentX, currentY, command.x, command.y);
        }
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Q') {
        ++contourCount;
        if (contourCount >= 2) {
          this.addSolidVertex(vertices, firstX, firstY, currentX, currentY, command.x, command.y);
        }
        this.addSmoothVertex(vertices, currentX, currentY, command.x1, command.y1, command.x, command.y);
        currentX = command.x;
        currentY = command.y;
      } else if (command.type === 'Z') {
        currentX = firstX;
        currentY = firstY;
        contourCount = 0;
      }
    }

    this.normalizeVertexData(vertices);
    return vertices;
  }

}

export {FontLoader}