#version 300 es
precision mediump float;

in vec3 vs_out_barycentric;

out vec4 fs_out_color;

void main()
{
  float t = vs_out_barycentric.x;
  float s = vs_out_barycentric.y;

  float factor = ((s * 0.5 + t) * (s * 0.5 + t) < t) ? 1.0 / 255.0: 0.0;
  fs_out_color = vec4(1.0, 1.0, 1.0, factor);
}