#version 300 es
precision mediump float;

in vec2 vs_out_texcoords;

out vec4 fs_out_color;

uniform sampler2D uTex;

void main() {
  // here we collect 5 samples: `RGB R[GB RGB] RGB ...` and decode sample count
  vec2 uvL = vec2(vs_out_texcoords.x + dFdx(vs_out_texcoords.x), vs_out_texcoords.y);
  vec2 valueL = texture(uTex, uvL).yz * vec2(255.0);
  vec2 lowerL = mod(valueL, 16.0);
  vec2 upperL = (valueL - lowerL) / 16.0;
  vec2 alphaL = mod(lowerL, 2.0) + mod(upperL, 2.0);

  vec3 valueR = texture(uTex, vs_out_texcoords).xyz * vec3(255.0);
  vec3 lowerR = mod(valueR, 16.0);
  vec3 upperR = (valueR - lowerR) / 16.0;
  vec3 alphaR = mod(lowerR, 2.0) + mod(upperR, 2.0);

  // average according to LCD layout
  vec4 factors = vec4(
		(alphaR.x + alphaR.y + alphaR.z) / 6.0,
		(alphaL.y + alphaR.x + alphaR.y) / 6.0,
		(alphaL.x + alphaL.y + alphaR.x) / 6.0,
    0.0
  );

  fs_out_color = vec4(1.0) - factors;
}