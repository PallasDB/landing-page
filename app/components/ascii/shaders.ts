export const vertSrc = `#version 300 es

in vec2 a_position;

void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

export const fragSrc = `#version 300 es

precision highp float;
precision highp usampler2D;

// flags
uniform int u_revealEffectFlag;
uniform bool u_videoMode;

// effects
uniform float u_revealProgress;
uniform float u_brightness;
uniform float u_saturation;
uniform float u_bgOpacity;

uniform bool u_mouseEffect;
#define MOUSE_TRAIL_LEN 30
uniform vec2 u_mousePositions[MOUSE_TRAIL_LEN];
uniform float u_mouseLifeFracs[MOUSE_TRAIL_LEN];
uniform float u_mouseRadius;
uniform float u_mouseBrightness;

uniform bool u_clickEffect;
#define MAX_RIPPLES 10
uniform vec2 u_ripplePositions[MAX_RIPPLES];
uniform float u_rippleRadii[MAX_RIPPLES];
uniform float u_rippleBrightnesses[MAX_RIPPLES];

uniform bool u_scatterEffect;
uniform usampler2D u_scatterStateTexture;
uniform sampler2D u_scatterAtlas;
uniform float u_scatterNumChars;

uniform bool u_spreadEffect;
uniform usampler2D u_spreadStateTexture;

uniform bool u_shapeMatching;

uniform sampler2D u_texture;
uniform sampler2D u_atlas;
uniform usampler2D u_fboTexture;
uniform vec2 u_resolution;
uniform vec2 u_cellsize;
uniform float u_numChars;
uniform vec2 u_gridSize;
uniform vec2 u_cropOffset;
uniform vec2 u_cropScale;

out vec4 fragColor;

float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) * 0.5;
    float d = maxC - minC;
    float h = 0.0, s = 0.0;
    if (d > 0.0) {
        s = d / (1.0 - abs(2.0 * l - 1.0));
        if (maxC == c.r) h = mod((c.g - c.b) / d, 6.0) / 6.0;
        else if (maxC == c.g) h = ((c.b - c.r) / d + 2.0) / 6.0;
        else h = ((c.r - c.g) / d + 4.0) / 6.0;
    }
    return vec3(h, s, l);
}

vec3 hsl2rgb(vec3 c) {
    float h = c.x, s = c.y, l = c.z;
    float a = s * (1.0 - abs(2.0 * l - 1.0));
    vec3 rgb = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + a * (rgb - 0.5);
}

void main() {
    vec2 fragCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
    vec2 cellCoord = floor(fragCoord / u_cellsize);

    if (u_revealEffectFlag == 1) {
        float revealThreshold = (cellCoord.x + cellCoord.y) / (u_gridSize.x + u_gridSize.y - 2.0);
        if (revealThreshold > u_revealProgress) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    } else if (u_revealEffectFlag == 2) {
        float dist = length(cellCoord / u_gridSize - vec2(0.5));
        float revealThreshold = dist / 0.7071;
        if (revealThreshold > u_revealProgress) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    } else if (u_revealEffectFlag == 3) {
        float revealThreshold = hash(cellCoord);
        if (revealThreshold > u_revealProgress) {
            fragColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
        }
    }

    vec2 cellCenter = (cellCoord + 0.5) * u_cellsize;
    vec2 rawUV = u_videoMode ? (fragCoord / u_resolution) : (cellCenter / u_resolution);
    vec2 sampleUV = u_cropOffset + rawUV * u_cropScale;

    vec3 cellColor = texture(u_texture, sampleUV).rgb;
    float luminosity = dot(cellColor, vec3(0.299, 0.587, 0.114));
    vec3 hsl = rgb2hsl(cellColor);
    hsl.z = clamp(hsl.z * u_brightness, 0.0, 1.0);
    hsl.y = clamp(hsl.y * u_saturation, 0.0, 1.0);
    cellColor = hsl2rgb(hsl);

    vec2 withinCellPos = fract(fragCoord / u_cellsize);

    float glyphMask = 0.0;
    if (!u_videoMode) {
        uint charInd;
        if (u_shapeMatching) {
            charInd = texelFetch(u_fboTexture, ivec2(cellCoord), 0).r;
        } else {
            charInd = uint(floor(luminosity * (u_numChars - 1.0)));
        }
        float atlasU = (float(charInd) + withinCellPos.x) / u_numChars;
        float atlasV = withinCellPos.y;
        glyphMask = texture(u_atlas, vec2(atlasU, atlasV)).r;
    }

    vec3 bgColor = cellColor * u_bgOpacity;

    bool scatterHit = false;
    vec3 scatterColor = vec3(0.0);
    if (u_scatterEffect) {
        uint state = texelFetch(u_scatterStateTexture, ivec2(cellCoord), 0).r;
        if (state > 0u) {
            int idx = int(state) - 1;
            float su = (float(idx) + withinCellPos.x) / u_scatterNumChars;
            float mask = texture(u_scatterAtlas, vec2(su, withinCellPos.y)).r;
            vec3 scatterBg = u_videoMode ? cellColor : bgColor;
            scatterColor = mix(scatterBg, vec3(1.0), mask);
            scatterHit = true;
        }
    }

    if (!scatterHit && u_spreadEffect) {
        uint state = texelFetch(u_spreadStateTexture, ivec2(cellCoord), 0).r;
        if (state > 0u) {
            int idx = int(state) - 1;
            float su = (float(idx) + withinCellPos.x) / u_scatterNumChars;
            float mask = texture(u_scatterAtlas, vec2(su, withinCellPos.y)).r;
            vec3 scatterBg = u_videoMode ? cellColor : bgColor;
            scatterColor = mix(scatterBg, vec3(1.0), mask);
            scatterHit = true;
        }
    }

    vec3 finalColor;
    if (scatterHit) {
        finalColor = scatterColor;
    } else {
        finalColor = u_videoMode ? cellColor : mix(bgColor, cellColor, glyphMask);

        if (u_mouseEffect) {
            bool inside = false;
            for (int i = 0; i < MOUSE_TRAIL_LEN; i++) {
                if (u_mouseLifeFracs[i] <= 0.0) {
                    continue;
                }
                float r = u_mouseRadius * u_mouseLifeFracs[i];
                if (distance(cellCenter, u_mousePositions[i]) < r) {
                    inside = true;
                    break;
                }
            }
            if (inside) {
                finalColor = clamp(finalColor * u_mouseBrightness, 0.0, 1.0);
            }
        }

        if (u_clickEffect) {
            float boost = 1.0;
            for (int i = 0; i < MAX_RIPPLES; i++) {
                if (u_rippleBrightnesses[i] <= 1.0) {
                    continue;
                }
                if (distance(cellCenter, u_ripplePositions[i]) < u_rippleRadii[i]) {
                    boost *= u_rippleBrightnesses[i];
                }
            }
            if (boost > 1.0) {
                finalColor = clamp(finalColor * boost, 0.0, 1.0);
            }
        }
    }

    fragColor = vec4(finalColor, 1.0);
}`;

export const pass1FragSrc = `#version 300 es

precision highp float;
precision highp usampler2D;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform vec2 u_cellsize;
uniform int u_circleN;
uniform sampler2D u_charVectors;
uniform int u_numCharsInt;
uniform float u_shapeExponent;
uniform vec2 u_cropOffset;
uniform vec2 u_cropScale;

out uvec4 fragCharInd;

void main() {
    ivec2 cellCoord = ivec2(floor(gl_FragCoord.xy));

    const vec2 CIRCLES[6] = vec2[6](
        vec2(0.25, 0.25), vec2(0.75, 0.25),
        vec2(0.25, 0.50), vec2(0.75, 0.50),
        vec2(0.25, 0.75), vec2(0.75, 0.75)
    );
    vec2 radiusUV = vec2(u_cellsize.x / 5.0) / u_resolution * u_cropScale;

    float sv[6];
    for (int ci = 0; ci < 6; ci++) {
        vec2 centerUV = u_cropOffset + (vec2(cellCoord) + CIRCLES[ci]) * u_cellsize / u_resolution * u_cropScale;
        float total = 0.0;
        int count = 0;
        for (int dx = -u_circleN; dx <= u_circleN; dx++) {
            for (int dy = -u_circleN; dy <= u_circleN; dy++) {
                if (dx*dx + dy*dy <= u_circleN*u_circleN) {
                    vec2 sampleUV = centerUV + vec2(float(dx), float(dy)) * radiusUV / float(u_circleN);
                    vec3 sc = texture(u_texture, sampleUV).rgb;
                    total += dot(sc, vec3(0.299, 0.587, 0.114));
                    count++;
                }
            }
        }
        sv[ci] = count > 0 ? total / float(count) : 0.0;
    }

    float maxVal = 0.0;
    for (int d = 0; d < 6; d++) maxVal = max(maxVal, sv[d]);
    if (maxVal > 0.0) {
        for (int d = 0; d < 6; d++) sv[d] = pow(sv[d] / maxVal, u_shapeExponent) * maxVal;
    }

    uint bestChar = 0u;
    float bestDist = 1e10;
    for (int i = 0; i < u_numCharsInt; i++) {
        vec4 r0 = texelFetch(u_charVectors, ivec2(i, 0), 0);
        vec4 r1 = texelFetch(u_charVectors, ivec2(i, 1), 0);
        float dist = 0.0;
        float diffs[6] = float[6](
            sv[0] - r0.r, sv[1] - r0.g, sv[2] - r0.b, sv[3] - r0.a,
            sv[4] - r1.r, sv[5] - r1.g
        );
        for (int d = 0; d < 6; d++) {
            dist += diffs[d] * diffs[d];
        }
        if (dist < bestDist) {
            bestDist = dist; bestChar = uint(i);
        }
    }

    fragCharInd = uvec4(bestChar, 0u, 0u, 0u);
}`;
