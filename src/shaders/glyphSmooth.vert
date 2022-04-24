#version 300 es
precision mediump float;

in vec2 vs_in_position;

out vec3 vs_out_barycentric;

void main()
{
  const vec3 barycentric[3] = vec3[3](vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0));
  const float scale = 0.5;

  gl_Position = vec4(scale * (2.0 * vs_in_position - 1.0), 0.0, 1.0);
  vs_out_barycentric = barycentric[gl_VertexID % 3];
}