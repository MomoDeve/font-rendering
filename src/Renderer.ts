import * as twgl from 'twgl.js';
import glyphFS from './shaders/glyph.frag';
import glyphVS from './shaders/glyph.vert';
import glyphSmoothFS from './shaders/glyphSmooth.frag';
import glyphSmoothVS from './shaders/glyphSmooth.vert';
import resolveFS from './shaders/resolve.frag';
import resolveVS from './shaders/resolve.vert';
import type {Tuple} from './utils/types';
import {FontLoader} from './FontLoader';

class Renderer {
  private animationHandler = -1;
  private resolveProgram: twgl.ProgramInfo;
  private glyphSolidTriangleProgram: twgl.ProgramInfo;
  private glyphSmoothTriangleProgram: twgl.ProgramInfo;
  private glyphSolidTriangleBuffer: twgl.BufferInfo;
  private glyphSmoothTriangleBuffer: twgl.BufferInfo;
  private fullscreenTriangle: twgl.BufferInfo;
  private offscreenFrameBuffer: twgl.FramebufferInfo;
  private onUpdateSubscription: VoidFunction | null = null;

  stats = {
    ft: 0, // time between frame begin and end (frame time)
    dt: 0, // time between frame begin points (delta time)
    fps: 0, // Frames Per Second
    lastTime: 0, // last render timestamp
  };

  props = {
    color: [1.0, 1.0, 1.0, 1.0] as Tuple<number, 4>,
    sinOffset: [2, 4],
    timeMultiplier: 1.0,
    time: 1000,
  };

  constructor(private canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
    this.render = this.render.bind(this);

    const buffer = require('arraybuffer-loader!./res/TimesNewRoman.ttf');
    const fontLoader = new FontLoader(buffer);
    const vertexData = fontLoader.getGlyphVertexData('Q');
    // on curve rendering pass

    this.glyphSolidTriangleBuffer = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 2, data: vertexData.solid }
    });

    this.glyphSolidTriangleProgram = twgl.createProgramInfo(gl, 
      [glyphVS.sourceCode, glyphFS.sourceCode], 
      ['vs_in_position']
    );

    // off curve rendering pass

    this.glyphSmoothTriangleBuffer = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 2, data: vertexData.smooth }
    });


    this.glyphSmoothTriangleProgram = twgl.createProgramInfo(gl, 
      [glyphSmoothVS.sourceCode,glyphSmoothFS.sourceCode], 
      ['vs_in_position']
    );


    // resolve pass

    this.offscreenFrameBuffer = this.createOffscreenFrameBuffer(canvas.width, canvas.height);

    this.fullscreenTriangle = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 2, data: [
         -1, -1, 
          3, -1,
         -1,  3
      ]}
    });

    this.resolveProgram = twgl.createProgramInfo(gl,
      [resolveVS.sourceCode, resolveFS.sourceCode],
      ['vs_in_position']
    );
  }

  static initialize(canvas: HTMLCanvasElement): Renderer | null {
    const attributes: WebGLContextAttributes = {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    };
    const gl = canvas.getContext('webgl2', attributes);
    if (gl === null) {
      return null;
    }
    return new Renderer(canvas, gl);
  }

  start(): void {
    this.animationHandler = requestAnimationFrame(this.render);
  }

  stop(): void {
    cancelAnimationFrame(this.animationHandler);
  }

  onUpdate(cb: VoidFunction) {
    this.onUpdateSubscription = cb;
  }

  createOffscreenFrameBuffer(width: number, height: number): twgl.FramebufferInfo {
    const gl = this.gl;

    const offscreenTexture = twgl.createTexture(gl, {
      format: gl.RGBA,
      width: width,
      height: height,
    });

    return twgl.createFramebufferInfo(gl, [
        { attachment: offscreenTexture }
      ],
      width, height
    );
  }

  resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
 
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
 
    if (needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;

      this.offscreenFrameBuffer = this.createOffscreenFrameBuffer(displayWidth, displayHeight);
    }
  }

  render(time: number): void {
    this.resizeCanvasToDisplaySize(this.canvas);

    const t0 = performance.now();
    const gl = this.gl;
    this.stats.dt = time - this.stats.lastTime;
    this.props.time += this.stats.dt * this.props.timeMultiplier;
    this.stats.fps = 1000.0 / this.stats.dt; // approximation from delta time, you can count frames in second instead

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.offscreenFrameBuffer.framebuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    gl.useProgram(this.glyphSolidTriangleProgram.program);

    twgl.setBuffersAndAttributes(gl, this.glyphSolidTriangleProgram, this.glyphSolidTriangleBuffer);
    twgl.drawBufferInfo(gl, this.glyphSolidTriangleBuffer, gl.TRIANGLES);

    gl.useProgram(this.glyphSmoothTriangleProgram.program);

    twgl.setBuffersAndAttributes(gl, this.glyphSmoothTriangleProgram, this.glyphSmoothTriangleBuffer);
    twgl.drawBufferInfo(gl, this.glyphSmoothTriangleBuffer, gl.TRIANGLES)

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.disable(gl.BLEND);
    gl.useProgram(this.resolveProgram.program);

    const resolveUniforms = {
      uTex: this.offscreenFrameBuffer.attachments[0]
    };
    twgl.setUniforms(this.resolveProgram, resolveUniforms);

    twgl.setBuffersAndAttributes(gl, this.resolveProgram, this.fullscreenTriangle);
    twgl.drawBufferInfo(gl, this.fullscreenTriangle, gl.TRIANGLES);

    this.stats.lastTime = time;
    this.animationHandler = requestAnimationFrame(this.render);
    this.stats.ft = performance.now() - t0;

    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
