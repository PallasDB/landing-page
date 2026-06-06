'use client';

import { useRef, useEffect } from "react";
import { computeShapeVectors } from "./ascii-utils";
import { DEFAULT_CHARS, parseProps } from "./ascii-props";
import type { Props } from "./ascii-props";
import { createGLResources } from "./create-gl-resources";
import { createScatterEffect } from "./scatter-effect";
import { createMouseTrail } from "./brighten-effect";
import { createClickEffect } from "./click-effect";
import { createSpreadEffect } from "./spread-effect";

function ImageAscii({
    src,
    numColsRaw = 250,
    brightnessRaw = 1.0,
    saturationRaw = 1.0,
    bgOpacityRaw = 0.3,
    revealEffect = false,
    chars = DEFAULT_CHARS,
    mouseEffect = true,
    clickEffect = true,
    charMode = 'shape',
    className,
    cropFocus = 'center',
    resolveToImage,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const atlasTextureRef = useRef<WebGLTexture | null>(null);
    const scatterAtlasTextureRef = useRef<WebGLTexture | null>(null);

    const { numCols, brightness, saturation, bgOpacity,
            mouseEnabled, mouseStyle, brightenEnabled, scatterEnabled,
            scatterChars, trailLen, trailDecay, duration, mouseRadius, mouseBrightness,
            clickEnabled, clickBrightness, clickSpeed,
            spreadEnabled, spreadExpandDuration, spreadSpeed,
            revealEnabled, revealDuration, revealEffectFlag,
    } = parseProps(numColsRaw, brightnessRaw, saturationRaw, bgOpacityRaw, mouseEffect, clickEffect, revealEffect);

    const brightnessRef = useRef(brightness);
    const saturationRef = useRef(saturation);
    const bgOpacityRef = useRef(bgOpacity);
    const mouseEnabledRef = useRef(mouseEnabled);
    const mouseStyleRef = useRef(mouseStyle);
    const brightenEnabledRef = useRef(brightenEnabled);
    const scatterEnabledRef = useRef(scatterEnabled);
    const mouseBrightnessRef = useRef(mouseBrightness);
    const mouseRadiusRef = useRef(mouseRadius);
    const trailLenRef = useRef(trailLen);
    const trailDecayRef = useRef(trailDecay);
    const durationRef = useRef(duration);
    const scatterCharsRef = useRef(scatterChars);
    const clickEnabledRef = useRef(clickEnabled);
    const clickBrightnessRef = useRef(clickBrightness);
    const clickSpeedRef = useRef(clickSpeed);
    const spreadEnabledRef = useRef(spreadEnabled);
    const spreadExpandDurationRef = useRef(spreadExpandDuration);
    const spreadSpeedRef = useRef(spreadSpeed);
    const numColsRef = useRef(numCols);
    const cropFocusRef = useRef<'left' | 'center' | 'right'>(cropFocus);
    const containerWRef = useRef(0);
    const containerHRef = useRef(0);

    useEffect(() => {
        brightnessRef.current = brightness;
        saturationRef.current = saturation;
        bgOpacityRef.current = bgOpacity;
        mouseEnabledRef.current = mouseEnabled;
        mouseStyleRef.current = mouseStyle;
        brightenEnabledRef.current = brightenEnabled;
        scatterEnabledRef.current = scatterEnabled;
        mouseBrightnessRef.current = mouseBrightness;
        mouseRadiusRef.current = mouseRadius;
        trailLenRef.current = trailLen;
        trailDecayRef.current = trailDecay;
        durationRef.current = duration;
        if (scatterCharsRef.current !== scatterChars && loadedRef.current) {
            scatterCharsRef.current = scatterChars;
            rebuildScatterAtlasRef.current?.();
        } else {
            scatterCharsRef.current = scatterChars;
        }
        clickEnabledRef.current = clickEnabled;
        clickBrightnessRef.current = clickBrightness;
        clickSpeedRef.current = clickSpeed;
        spreadEnabledRef.current = spreadEnabled;
        spreadExpandDurationRef.current = spreadExpandDuration;
        spreadSpeedRef.current = spreadSpeed;
        numColsRef.current = numCols;
    }, [
        brightness, saturation, bgOpacity,
        mouseEnabled, mouseStyle, brightenEnabled, scatterEnabled,
        mouseBrightness, mouseRadius, trailLen, trailDecay, duration, scatterChars,
        clickEnabled, clickBrightness, clickSpeed,
        spreadEnabled, spreadExpandDuration, spreadSpeed, numCols,
    ]);

    const setupGridRef = useRef<((nc: number) => void) | null>(null);
    const rebuildScatterAtlasRef = useRef<(() => void) | null>(null);
    const setupCanvasRef = useRef<((cw: number, ch: number) => void) | null>(null);
    const loadedRef = useRef(false);
    const resolveToImageRef = useRef(resolveToImage);
    useEffect(() => { resolveToImageRef.current = resolveToImage; }, [resolveToImage]);

    useEffect(() => {
        if (loadedRef.current) {
            setupGridRef.current?.(numCols);
        }
    }, [numCols]);

    useEffect(() => {
        cropFocusRef.current = cropFocus;
        if (loadedRef.current && containerWRef.current > 0) {
            setupCanvasRef.current?.(containerWRef.current, containerHRef.current);
        }
    }, [cropFocus]);

    useEffect(() => {
        loadedRef.current = false;

        let shapeData: { char: string, vector: number[] }[] = [];
        let gridCols = 0;
        let gridRows = 0;
        let charW = 1;
        let charH = 1;
        let containerW = 0;
        let containerH = 0;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const image = imageRef.current;
        if (!image) return;

        const gl = canvas.getContext("webgl2");
        if (!gl) return;

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        // flip Y so image top maps to texture top
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const resources = createGLResources(gl);
        if (!resources) return;

        const { program, pass1Program } = resources;
        atlasTextureRef.current = resources.atlasTexture;
        scatterAtlasTextureRef.current = resources.scatterAtlasTexture;

        gl.uniform1i(resources.shapeMatchingLoc, charMode === 'shape' ? 1 : 0);
        gl.uniform1i(resources.revealEffectFlagLoc, revealEffectFlag);
        gl.uniform1f(resources.revealProgressLoc, 0.0);
        gl.uniform1i(resources.videoModeLoc, 0); // always ASCII mode for images

        const scatterEffects = createScatterEffect({ scatterEnabledRef, mouseRadiusRef, durationRef, scatterCharsRef });
        const trailEffects = createMouseTrail({ brightenEnabledRef, trailLenRef, durationRef, trailDecayRef });
        const clickEffects = createClickEffect({ clickEnabledRef, clickSpeedRef, clickBrightnessRef });
        const spreadEffects = createSpreadEffect({ spreadEnabledRef, scatterCharsRef, spreadExpandDurationRef, spreadSpeedRef });

        let animFrameId: number;
        let resolveRafId = -1;
        let startTime = -1;

        const hiddenCanvas = document.createElement('canvas');
        const hiddenCtx = hiddenCanvas.getContext('2d')!;

        const setupGrid = (nc: number) => {
            const baseW = containerW > 0 ? containerW : canvas.width;
            const baseH = containerH > 0 ? containerH : canvas.height;
            charW = Math.max(1, Math.floor(baseW / nc));
            const probe = charW * 2;
            hiddenCtx.font = `${probe}px monospace`;
            charH = Math.max(1, Math.round(probe * charW / hiddenCtx.measureText('M').width));

            gridCols = Math.floor(baseW / charW);
            gridRows = Math.floor(baseH / charH);

            canvas.width = gridCols * charW;
            canvas.height = gridRows * charH;
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(program);
            gl.uniform2f(resources.resLoc, canvas.width, canvas.height);
            gl.useProgram(pass1Program);
            gl.uniform2f(resources.p1ResLoc, canvas.width, canvas.height);
            gl.useProgram(program);

            scatterEffects.setup(gl, gridCols, gridRows, charW, charH, resources.scatterStateTexture);
            spreadEffects.setup(gl, gridCols, gridRows, charW, charH, resources.spreadStateTexture);

            if (charMode === 'shape') {
                shapeData = computeShapeVectors(chars, charW, charH);

                const numChars = shapeData.length;
                const charVectorData = new Float32Array(numChars * 8);
                for (let i = 0; i < numChars; i++) {
                    const v = shapeData[i].vector;
                    charVectorData[i * 4 + 0] = v[0];
                    charVectorData[i * 4 + 1] = v[1];
                    charVectorData[i * 4 + 2] = v[2];
                    charVectorData[i * 4 + 3] = v[3];
                    charVectorData[numChars * 4 + i * 4 + 0] = v[4];
                    charVectorData[numChars * 4 + i * 4 + 1] = v[5];
                }
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, resources.charVectorsTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, numChars, 2, 0, gl.RGBA, gl.FLOAT, charVectorData);

                gl.activeTexture(gl.TEXTURE3);
                gl.bindTexture(gl.TEXTURE_2D, resources.fboTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, gridCols, gridRows, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, null);
                gl.bindFramebuffer(gl.FRAMEBUFFER, resources.fbo);
                gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, resources.fboTexture, 0);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);

                const circleN = Math.max(1, Math.round(charW / 5));
                gl.useProgram(pass1Program);
                gl.uniform2f(resources.p1CellsizeLoc, charW, charH);
                gl.uniform1i(resources.p1CircleNLoc, circleN);
                gl.uniform1i(resources.p1NumCharsLoc, numChars);
                gl.uniform1f(resources.p1ExponentLoc, 2.0);
                gl.useProgram(program);
            }

            gl.uniform2f(resources.gridSizeLoc, gridCols, gridRows);

            hiddenCanvas.width = chars.length * charW;
            hiddenCanvas.height = charH;
            hiddenCtx.font = `${charH}px monospace`;
            hiddenCtx.fillStyle = 'black';
            hiddenCtx.fillRect(0, 0, chars.length * charW, charH);
            hiddenCtx.fillStyle = 'white';
            hiddenCtx.textBaseline = 'top';
            for (let c = 0; c < chars.length; c++) {
                hiddenCtx.fillText(chars[c], c * charW, 0);
            }
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, atlasTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hiddenCanvas);
            gl.uniform1f(resources.numLoc, chars.length);
            gl.uniform2f(resources.sizeLoc, charW, charH);

            rebuildScatterAtlas();
        };

        const rebuildScatterAtlas = () => {
            const sc = scatterCharsRef.current;
            hiddenCanvas.width = sc.length * charW;
            hiddenCanvas.height = charH;
            hiddenCtx.fillStyle = 'black';
            hiddenCtx.fillRect(0, 0, hiddenCanvas.width, charH);
            hiddenCtx.fillStyle = 'white';
            hiddenCtx.textBaseline = 'top';
            hiddenCtx.font = `${charH}px monospace`;
            for (let c = 0; c < sc.length; c++) {
                hiddenCtx.fillText(sc[c], c * charW, 0);
            }
            gl.activeTexture(gl.TEXTURE4);
            gl.bindTexture(gl.TEXTURE_2D, scatterAtlasTextureRef.current);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, hiddenCanvas);
            gl.uniform1f(resources.scatterNumCharsLoc, sc.length);
            scatterEffects.reset(gl);
        };

        setupGridRef.current = setupGrid;
        rebuildScatterAtlasRef.current = rebuildScatterAtlas;

        const setupCanvas = (cw: number, ch: number) => {
            containerW = Math.round(cw);
            containerH = Math.round(ch);
            containerWRef.current = containerW;
            containerHRef.current = containerH;
            canvas.width = containerW;
            canvas.height = containerH;
            setupGrid(numColsRef.current);

            const imageAR = image.naturalWidth / image.naturalHeight;
            const displayAR = canvas.width / canvas.height;
            let scaleX = 1.0;
            let scaleY = 1.0;
            let offsetX = 0.0;
            let offsetY = 0.0;
            if (displayAR > imageAR) {
                scaleY = imageAR / displayAR;
                offsetY = (1.0 - scaleY) / 2.0;
            } else {
                scaleX = displayAR / imageAR;
                const focus = cropFocusRef.current;
                const focusCenter = focus === 'left' ? 0.25 : focus === 'right' ? 0.75 : 0.5;
                offsetX = Math.max(0, Math.min(1 - scaleX, focusCenter - scaleX / 2));
            }
            gl.uniform2f(resources.cropOffsetLoc, offsetX, offsetY);
            gl.uniform2f(resources.cropScaleLoc, scaleX, scaleY);
            gl.useProgram(pass1Program);
            gl.uniform2f(resources.p1CropOffsetLoc, offsetX, offsetY);
            gl.uniform2f(resources.p1CropScaleLoc, scaleX, scaleY);
            gl.useProgram(program);
        };
        setupCanvasRef.current = setupCanvas;

        const onMouseMove = (e: MouseEvent) => {
            if (!mouseEnabledRef.current) return;
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            const t = performance.now();
            trailEffects.handleMouseMove(x, y, t);
            scatterEffects.handleMouseMove(x, y, t);
        };
        canvas.addEventListener("mousemove", onMouseMove);

        const onMouseLeave = () => scatterEffects.handleMouseLeave();
        canvas.addEventListener("mouseleave", onMouseLeave);

        const onClick = (e: MouseEvent) => {
            clickEffects.handleClick(e, canvas);
            spreadEffects.handleClick(e, canvas);
        };
        canvas.addEventListener("click", onClick);

        const loop = () => {
            gl.uniform1f(resources.brightnessLoc, brightnessRef.current);
            gl.uniform1f(resources.saturationLoc, saturationRef.current);
            gl.uniform1f(resources.bgOpacityLoc, bgOpacityRef.current);
            gl.uniform1i(resources.mouseEffectFlagLoc, brightenEnabledRef.current ? 1 : 0);
            gl.uniform1i(resources.scatterEffectFlagLoc, scatterEnabledRef.current ? 1 : 0);
            gl.uniform1i(resources.clickEffectFlagLoc, clickEnabledRef.current ? 1 : 0);
            gl.uniform1i(resources.spreadEffectFlagLoc, spreadEnabledRef.current ? 1 : 0);
            gl.uniform1f(resources.mouseBrightnessLoc, mouseBrightnessRef.current);
            gl.uniform1f(resources.mouseRadiusLoc, Math.min(canvas.width, canvas.height) * mouseRadiusRef.current);

            if (revealEnabled) {
                const progress = startTime < 0 ? 0.0 : Math.min(1.0, (performance.now() - startTime) / (revealDuration * 1000));
                gl.uniform1f(resources.revealProgressLoc, progress);
            }

            trailEffects.tick(gl, resources.mousePositionsLoc, resources.mouseLifeFracsLoc);
            scatterEffects.tick(gl, canvas);
            clickEffects.tick(gl, canvas, resources.ripplePositionsLoc, resources.rippleRadiiLoc, resources.rippleBrightnessesLoc);
            spreadEffects.tick(gl);

            if (charMode === 'shape') {
                gl.bindFramebuffer(gl.FRAMEBUFFER, resources.fbo);
                gl.viewport(0, 0, gridCols, gridRows);
                gl.useProgram(pass1Program);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                gl.bindFramebuffer(gl.FRAMEBUFFER, null);
                gl.viewport(0, 0, canvas.width, canvas.height);
                gl.useProgram(program);
            }
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            animFrameId = requestAnimationFrame(loop);
        };

        const onLoaded = () => {
            const containerEl = containerRef.current!;
            setupCanvas(
                containerEl.clientWidth || image.naturalWidth,
                containerEl.clientHeight || image.naturalHeight,
            );

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, resources.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

            startTime = performance.now();
            loadedRef.current = true;
            animFrameId = requestAnimationFrame(loop);

            // Resolution ramp: coarse ASCII → original image
            const resolveConfig = resolveToImageRef.current;
            if (resolveConfig) {
                const rDuration = (resolveConfig.duration ?? 7) * 1000;
                const rDelay = (resolveConfig.startDelay ?? 1) * 1000;
                const startCols = numCols;
                // target: 1 char per pixel on the narrower axis
                const maxCols = Math.min(Math.floor(containerW), 2000);
                const startBgOpacity = bgOpacity;
                let rStart = -1;
                let lastSetupCols = startCols;

                const resolveLoop = (now: number) => {
                    if (rStart < 0) rStart = now;
                    const elapsed = now - rStart;
                    if (elapsed < rDelay) {
                        resolveRafId = requestAnimationFrame(resolveLoop);
                        return;
                    }

                    const t = Math.min(1, (elapsed - rDelay) / rDuration);
                    // ease-out: fast progress at start (big jumps), slow near the end
                    const eased = 1 - Math.pow(1 - t, 2.5);

                    // Exponential interpolation so each doubling takes equal time
                    const targetCols = Math.round(
                        Math.exp(
                            Math.log(startCols) +
                            eased * (Math.log(maxCols) - Math.log(startCols))
                        )
                    );

                    if (Math.abs(targetCols - lastSetupCols) >= 2) {
                        lastSetupCols = targetCols;
                        setupGrid(targetCols);
                    }

                    // bgOpacity: ease from startBgOpacity → 1.0 in the last 40%
                    if (t > 0.6) {
                        const opT = (t - 0.6) / 0.4;
                        bgOpacityRef.current = startBgOpacity + (1.0 - startBgOpacity) * opT;
                    }

                    if (t < 1) {
                        resolveRafId = requestAnimationFrame(resolveLoop);
                    } else {
                        bgOpacityRef.current = 1.0;
                        if (lastSetupCols < maxCols) setupGrid(maxCols);
                    }
                };

                resolveRafId = requestAnimationFrame(resolveLoop);
            }
        };

        image.addEventListener('load', onLoaded, { once: true });
        // handle already-cached image
        if (image.complete && image.naturalWidth > 0) {
            onLoaded();
        }

        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            if (loadedRef.current && width > 0 && height > 0) {
                setupCanvas(width, height);
            }
        });
        if (containerRef.current) {
            ro.observe(containerRef.current);
        }

        return () => {
            ro.disconnect();
            setupGridRef.current = null;
            rebuildScatterAtlasRef.current = null;
            setupCanvasRef.current = null;
            loadedRef.current = false;
            cancelAnimationFrame(animFrameId);
            if (resolveRafId >= 0) cancelAnimationFrame(resolveRafId);
            image.removeEventListener('load', onLoaded);
            canvas.removeEventListener("mousemove", onMouseMove);
            canvas.removeEventListener("mouseleave", onMouseLeave);
            canvas.removeEventListener("click", onClick);

            gl.deleteTexture(resources.texture);
            gl.deleteTexture(resources.charVectorsTexture);
            gl.deleteFramebuffer(resources.fbo);
            gl.deleteTexture(resources.fboTexture);
            gl.deleteBuffer(resources.buffer);
            gl.deleteShader(resources.vertShader);
            gl.deleteShader(resources.fragShader);
            gl.deleteShader(resources.pass1FragShader);
            gl.deleteProgram(program);
            gl.deleteProgram(pass1Program);
            gl.deleteTexture(atlasTextureRef.current);
            gl.deleteTexture(scatterAtlasTextureRef.current);
            gl.deleteTexture(resources.scatterStateTexture);
            gl.deleteTexture(resources.spreadStateTexture);
        };
    }, [src, charMode, chars, revealEffectFlag, revealDuration, revealEnabled]);

    return (
        <div ref={containerRef} className={className} style={{ height: '100%', width: '100%' }}>
            <img ref={imageRef} src={src} alt="" crossOrigin="anonymous" style={{ display: 'none' }} />
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>
    );
}

export default ImageAscii;
