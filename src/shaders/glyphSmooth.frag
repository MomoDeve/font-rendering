#version 300 es
precision mediump float;

in vec3 vs_out_barycentric;

out vec4 fs_out_color;

uniform vec3 uSampleMask;

void main()
{
  float t = vs_out_barycentric.x;
  float s = vs_out_barycentric.y;

  vec3 factor = ((s * 0.5 + t) * (s * 0.5 + t) < t) ? vec3(1.0 / 255.0) : vec3(0.0);
  fs_out_color = vec4(uSampleMask * factor, 1.0);
}