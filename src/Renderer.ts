import * as twgl from 'twgl.js';
import glyphFS from './shaders/glyph.frag';
import glyphVS from './shaders/glyph.vert';
import resolveFS from './shaders/resolve.frag';
import resolveVS from './shaders/resolve.vert';
import type {Tuple} from './utils/types';
import {FontLoader} from './FontLoader';

class Renderer {
  private animationHandler = -1;
  private resolveProgram: twgl.ProgramInfo;
  private glyphProgram: twgl.ProgramInfo;
  private glyphBuffer: twgl.BufferInfo;
  private fullscreenTriangle: twgl.BufferInfo;
  private offscreenFrameBuffer: twgl.FramebufferInfo;
  private onUpdateSubscription: VoidFunction | null = null;

  constructor(private canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
    this.render = this.render.bind(this);

    const buffer = require('arraybuffer-loader!./res/TimesNewRoman.ttf');
    const fontLoader = new FontLoader(buffer);
    const vertexData = fontLoader.getTextVertexData('Hello World!');

    // glyph pass data

    this.glyphBuffer = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 4, data: vertexData }
    });

    this.glyphProgram = twgl.createProgramInfo(gl, 
      [glyphVS.sourceCode, glyphFS.sourceCode], 
      ['vs_in_position']
    );

    // resolve pass data

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

  destroyOffscreenFrameBuffer(): void {
    const gl = this.gl;
    
    gl.deleteTexture(this.offscreenFrameBuffer.attachments[0]);
    gl.deleteFramebuffer(this.offscreenFrameBuffer.framebuffer);
  }

  createOffscreenFrameBuffer(width: number, height: number): twgl.FramebufferInfo {
    const gl = this.gl;

    const offscreenTexture = twgl.createTexture(gl, {
      format: gl.RGB,
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
    const displayWidth  = window.innerWidth;
    const displayHeight = window.innerHeight;
 
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
 
    if (needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
      this.destroyOffscreenFrameBuffer();
      this.offscreenFrameBuffer = this.createOffscreenFrameBuffer(displayWidth, displayHeight);
    }
  }

  render(): void {
    this.resizeCanvasToDisplaySize(this.canvas);
    const gl = this.gl;

    twgl.bindFramebufferInfo(gl, this.offscreenFrameBuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const fontSizesInPixels = [
      16, 32, 72, 120, 160
    ];
    const textOffsetsScreenSpace = [
      [-0.95, 0.9], [-0.95, 0.7], [-0.95, 0.4], [-0.95, 0.0], [-0.95, -0.5]
    ];
    const jitterPattern = [
      [-1.0 / 12.0, -5.0 / 12.0],
      [ 1.0 / 12.0,  1.0 / 12.0],
      [ 3.0 / 12.0, -1.0 / 12.0],
      [ 5.0 / 12.0,  5.0 / 12.0],
      [ 7.0 / 12.0, -3.0 / 12.0],
      [ 9.0 / 12.0,  3.0 / 12.0],
    ]
    const sampleMask = [
      [ 1.0,  0.0,  0.0],
      [16.0,  0.0,  0.0],
      [ 0.0,  1.0,  0.0],
      [ 0.0, 16.0,  0.0],
      [ 0.0,  0.0,  1.0],
      [ 0.0,  0.0, 16.0]
    ]

    for (var i = 0; i < fontSizesInPixels.length; i++) {
      for (var jitterId = 0; jitterId < jitterPattern.length; jitterId++) {
        const jitterPosition = [
          jitterPattern[jitterId][0] / this.offscreenFrameBuffer.width + textOffsetsScreenSpace[i][0],
          jitterPattern[jitterId][1] / this.offscreenFrameBuffer.height + textOffsetsScreenSpace[i][1]
        ]
        
        const glyphUniforms = {
          uSampleMask: sampleMask[jitterId],
          uFontScale: [
            2.0 * fontSizesInPixels[i] / this.offscreenFrameBuffer.width, 
            2.0 * fontSizesInPixels[i] / this.offscreenFrameBuffer.height
          ],
          uTextPosition: jitterPosition
        }

        gl.useProgram(this.glyphProgram.program);

        twgl.setUniforms(this.glyphProgram, glyphUniforms);
        twgl.setBuffersAndAttributes(gl, this.glyphProgram, this.glyphBuffer);
        twgl.drawBufferInfo(gl, this.glyphBuffer, gl.TRIANGLES);
      }
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.disable(gl.BLEND);
    gl.useProgram(this.resolveProgram.program);

    const resolveUniforms = {
      uTex: this.offscreenFrameBuffer.attachments[0]
    };
    twgl.setUniforms(this.resolveProgram, resolveUniforms);
    twgl.setBuffersAndAttributes(gl, this.resolveProgram, this.fullscreenTriangle);
    twgl.drawBufferInfo(gl, this.fullscreenTriangle, gl.TRIANGLES);

    this.animationHandler = requestAnimationFrame(this.render);
    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
