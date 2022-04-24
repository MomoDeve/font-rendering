#version 300 es
precision mediump float;

in vec4 vs_in_position;

out vec2 vs_out_barycentric;

uniform vec2 uTextPosition;
uniform vec2 uFontScale;

void main()
{
  gl_Position = vec4(uTextPosition + vs_in_position.xy * uFontScale, 0.0, 1.0);
  vs_out_barycentric = vs_in_position.zw;
}