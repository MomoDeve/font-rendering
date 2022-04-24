#version 300 es
precision mediump float;

out vec4 fs_out_color;

uniform vec3 uSampleMask;

void main()
{
  fs_out_color = vec4(uSampleMask / vec3(255.0), 1.0);
}