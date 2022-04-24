#version 300 es
precision mediump float;

in vec2 vs_out_barycentric;

out vec4 fs_out_color;

uniform vec3 uSampleMask;

void main()
{
  float x = vs_out_barycentric.x;
  float y = vs_out_barycentric.y;
  
  // factor is used for smooth vertices to discard pixels which are off-curve
  vec3 factor = (x * x - y <= 0.0) ? vec3(1.0 / 255.0) : vec3(0.0);
  fs_out_color = vec4(uSampleMask * factor, 1.0);
}