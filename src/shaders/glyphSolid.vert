#version 300 es
precision mediump float;

in vec2 vs_in_position;

uniform vec2 uTextPosition;
uniform vec2 uFontScale;

void main()
{
  gl_Position = vec4(uTextPosition + vs_in_position * uFontScale, 0.0, 1.0);
}