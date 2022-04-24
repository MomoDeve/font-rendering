#version 300 es
precision mediump float;

in vec2 vs_out_texcoords;

out vec4 fs_out_color;

uniform sampler2D uTex;

void main() {
  vec4 color = texture(uTex, vs_out_texcoords);
  
  const int SAMPLE_COUNT = 6;
  int samples[SAMPLE_COUNT] = int[SAMPLE_COUNT](
    int(color.r * 255.0) % 16,
    int(color.r * 255.0) / 16,
    int(color.g * 255.0) % 16,
    int(color.g * 255.0) / 16,
    int(color.b * 255.0) % 16,
    int(color.b * 255.0) / 16
  );
  float factor = 0.0;
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    factor += samples[i] % 2 == 1 ? 1.0 : 0.0;
  }

  fs_out_color = vec4(vec3(factor / float(SAMPLE_COUNT)), 1.0);
}