#version 300 es
precision mediump float;

in vec2 vs_in_position;

void main()
{
  const float scale = 0.5;
  gl_Position = vec4(scale * (2.0 * vs_in_position - 1.0), 0.0, 1.0);
}