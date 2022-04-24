#version 300 es
precision mediump float;

in vec2 vs_in_position;

out vec3 vs_out_barycentric;

uniform vec2 uTextPosition;
uniform vec2 uFontScale;

void main()
{
  const vec3 barycentric[3] = vec3[3](vec3(1.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0), vec3(0.0, 0.0, 1.0));

  gl_Position = vec4(uTextPosition + vs_in_position * uFontScale, 0.0, 1.0);
  vs_out_barycentric = barycentric[gl_VertexID % 3];
}