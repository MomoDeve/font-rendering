#version 300 es
precision mediump float;

out vec4 fs_out_color;

void main()
{
  fs_out_color = vec4(1.0, 1.0, 1.0, 1.0 / 255.0);
}