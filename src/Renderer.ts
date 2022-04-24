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
  private glyphFrameBuffer: twgl.FramebufferInfo;
  private onUpdateSubscription: VoidFunction | null = null;

  constructor(private canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
    this.render = this.render.bind(this);

    // load font and generate text vertices
    // format of vertex is [position.x, position.y, barycentric.s, barycentric.t]

    const fontRawData = require('arraybuffer-loader!./res/Calibri.ttf');
    const fontLoader = new FontLoader(fontRawData);
    const vertexData = fontLoader.generateVertexData('Hello World!');

    // glyph pass data

    this.glyphBuffer = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 4, data: vertexData }
    });

    this.glyphProgram = twgl.createProgramInfo(gl, 
      [glyphVS.sourceCode, glyphFS.sourceCode], 
      ['vs_in_position']
    );

    // resolve pass data

    this.glyphFrameBuffer = this.createGlyphFrameBuffer(canvas.width, canvas.height);

    this.fullscreenTriangle = twgl.createBufferInfoFromArrays(gl, {
      vs_in_position: { numComponents: 2, data: [
         -1.0, -1.0, 
          3.0, -1.0,
         -1.0,  3.0
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
  createGlyphFrameBuffer(width: number, height: number): twgl.FramebufferInfo {
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

  destroyGlyphFrameBuffer(framebufferInfo: twgl.FramebufferInfo): void {
    const gl = this.gl;
    
    gl.deleteTexture(framebufferInfo.attachments[0]);
    gl.deleteFramebuffer(framebufferInfo.framebuffer);
  }

  resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): void {
    const displayWidth  = window.innerWidth;
    const displayHeight = window.innerHeight;
 
    const needResize = canvas.width  !== displayWidth ||
                       canvas.height !== displayHeight;
 
    if (needResize) {
      canvas.width  = displayWidth;
      canvas.height = displayHeight;
      this.destroyGlyphFrameBuffer(this.glyphFrameBuffer);
      this.glyphFrameBuffer = this.createGlyphFrameBuffer(displayWidth, displayHeight);
    }
  }

  renderGryphs(): void {
    const gl = this.gl;

    twgl.bindFramebufferInfo(gl, this.glyphFrameBuffer);
    gl.clearColor(0.0, 0.0, 0.0, 0.0); 
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    // used to render multiple text lines with different font sizes
    const fontSizesInPixels = [
      8, 16, 32, 72, 120, 160
    ];
    const textOffsetsScreenSpace = [
      [-0.95, 0.95], [-0.95, 0.859], [-0.95, 0.7], [-0.95, 0.4], [-0.95, 0.0], [-0.95, -0.5]
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
      // anti-aliasing loop, apply jitter & use sample mask to fill different bits framebuffer
      for (var jitterId = 0; jitterId < jitterPattern.length; jitterId++) {
        const jitterPosition = [
          jitterPattern[jitterId][0] / this.glyphFrameBuffer.width  + textOffsetsScreenSpace[i][0],
          jitterPattern[jitterId][1] / this.glyphFrameBuffer.height + textOffsetsScreenSpace[i][1]
        ]
        
        const glyphUniforms = {
          uSampleMask: sampleMask[jitterId],
          uFontScale: [
            2.0 * fontSizesInPixels[i] / this.glyphFrameBuffer.width, 
            2.0 * fontSizesInPixels[i] / this.glyphFrameBuffer.height
          ],
          uTextPosition: jitterPosition
        }

        gl.useProgram(this.glyphProgram.program);

        twgl.setUniforms(this.glyphProgram, glyphUniforms);
        twgl.setBuffersAndAttributes(gl, this.glyphProgram, this.glyphBuffer);
        twgl.drawBufferInfo(gl, this.glyphBuffer, gl.TRIANGLES);
      }
    }
  }

  resolveGlyphFrameBuffer(): void {
    const gl = this.gl;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);

    gl.disable(gl.BLEND);
    gl.useProgram(this.resolveProgram.program);

    const resolveUniforms = {
      uTex: this.glyphFrameBuffer.attachments[0]
    };
    twgl.setUniforms(this.resolveProgram, resolveUniforms);
    twgl.setBuffersAndAttributes(gl, this.resolveProgram, this.fullscreenTriangle);
    twgl.drawBufferInfo(gl, this.fullscreenTriangle, gl.TRIANGLES);

  }

  render(): void {
    this.resizeCanvasToDisplaySize(this.canvas);
    
    this.renderGryphs();
    this.resolveGlyphFrameBuffer();

    this.animationHandler = requestAnimationFrame(this.render);
    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
