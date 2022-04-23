#version 300 es
precision mediump float;

in vec2 vs_out_texcoords;

out vec4 fs_out_color;

uniform sampler2D uTex;

void main() {
  vec4 color = texture(uTex, vs_out_texcoords);
  float factor = int(color.a * 255.0) % 2 == 1 ? 1.0 : 0.0;
  fs_out_color = vec4(color.rgb * factor, 1.0);
}