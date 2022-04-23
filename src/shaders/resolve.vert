#version 300 es
precision mediump float;

in vec2 vs_in_position;

out vec2 vs_out_texcoords;

void main() {
  gl_Position = vec4(vs_in_position, 0, 1);
  vs_out_texcoords = 0.5 * vs_in_position + vec2(0.5);
}