export const DEFAULT_CHARS = " `.',-_:!;|\"~+^lr[](\\/L)>t<v=Tz?icf1{sIxY*jJno}CZyVwmSXRqM$O%#9&NW0Q@";

export interface MouseEffectOptions {
    style?: 'brighten' | 'scatter';
    radius?: number;
    duration?: number;
    trailLen?: number;
    trailDecay?: number;
    brightness?: number;
    scatterChars?: string;
}

export interface ClickEffectOptions {
    style?: 'ripple' | 'spread';
    brightness?: number;
    speed?: number;
    spreadExpandDuration?: number;
    spreadSpeed?: number;
}

export interface RevealEffectOptions {
    type?: 'diagonal' | 'radial' | 'random';
    duration?: number;
}

export interface ResolveToImageOptions {
    duration?: number;   // seconds for the resolution ramp (default 7)
    startDelay?: number; // seconds before starting (default 1)
}

export interface Props {
    src: string;
    numColsRaw?: number;
    brightnessRaw?: number;
    saturationRaw?: number;
    bgOpacityRaw?: number;
    revealEffect?: boolean | RevealEffectOptions;
    chars?: string;
    mouseEffect?: boolean | MouseEffectOptions;
    clickEffect?: boolean | ClickEffectOptions;
    charMode?: 'shape' | 'luminance';
    className?: string;
    cropFocus?: 'left' | 'center' | 'right';
    resolveToImage?: ResolveToImageOptions;
}

export interface ParsedProps {
    numCols: number;
    brightness: number;
    saturation: number;
    bgOpacity: number;
    mouseEnabled: boolean;
    mouseStyle: 'brighten' | 'scatter';
    brightenEnabled: boolean;
    scatterEnabled: boolean;
    scatterChars: string;
    trailLen: number;
    trailDecay: number;
    duration: number;
    mouseRadius: number;
    mouseBrightness: number;
    clickEnabled: boolean;
    clickBrightness: number;
    clickSpeed: number;
    spreadEnabled: boolean;
    spreadExpandDuration: number;
    spreadSpeed: number;
    revealEnabled: boolean;
    revealType: string;
    revealDuration: number;
    revealEffectFlag: number;
}

export function parseProps(
    numColsRaw: number,
    brightnessRaw: number,
    saturationRaw: number,
    bgOpacityRaw: number,
    mouseEffect: boolean | MouseEffectOptions,
    clickEffect: boolean | ClickEffectOptions,
    revealEffect: boolean | RevealEffectOptions,
): ParsedProps {
    const mouseEnabled = !!mouseEffect;
    const mouseOpts = typeof mouseEffect === 'object' ? mouseEffect : {};
    const mouseStyle: 'brighten' | 'scatter' = mouseOpts.style ?? 'brighten';
    const brightenEnabled = mouseEnabled && mouseStyle !== 'scatter';
    const scatterEnabled = mouseEnabled && mouseStyle === 'scatter';
    const scatterChars = mouseOpts.scatterChars ?? '->o';
    let trailLen = mouseOpts.trailLen ?? 15;
    let trailDecay = mouseOpts.trailDecay ?? 10;
    let duration = mouseOpts.duration ?? 1.0;
    let mouseRadius = mouseOpts.radius ?? (mouseStyle === 'scatter' ? 0.05 : 0.08);
    let mouseBrightness = mouseOpts.brightness ?? 2.0;

    const anyClickEnabled = !!clickEffect;
    const clickOpts = typeof clickEffect === 'object' ? clickEffect : {};
    const clickStyle = clickOpts.style ?? 'ripple';
    const clickEnabled = anyClickEnabled && clickStyle !== 'spread';
    const spreadEnabled = anyClickEnabled && clickStyle === 'spread';
    let clickBrightness = clickOpts.brightness ?? 1.1;
    let clickSpeed = clickOpts.speed ?? 2;
    let spreadExpandDuration = clickOpts.spreadExpandDuration ?? 1.5;
    let spreadSpeed = clickOpts.spreadSpeed ?? 7.5;

    const revealEnabled = !!revealEffect;
    const revealOpts = typeof revealEffect === 'object' ? revealEffect : {};
    const revealType = revealOpts.type ?? 'random';
    let revealDuration = revealOpts.duration ?? 0.4;

    const numCols = Math.max(20, Math.min(2000, Math.round(numColsRaw)));
    const brightness = Math.max(0.0, Math.min(2.0, brightnessRaw));
    const saturation = Math.max(0.0, Math.min(2.0, saturationRaw));
    const bgOpacity = Math.max(0.0, Math.min(1.0, bgOpacityRaw));
    revealDuration = Math.max(0.1, Math.min(4, revealDuration));
    trailLen = Math.max(0, Math.min(30, Math.round(trailLen)));
    trailDecay = Math.max(1, Math.min(15, trailDecay));
    duration = Math.max(0.1, Math.min(4, duration));
    mouseRadius = Math.max(0.03, Math.min(0.2, mouseRadius));
    mouseBrightness = Math.max(0.2, Math.min(5.0, mouseBrightness));
    clickBrightness = Math.max(1.05, Math.min(2.0, clickBrightness));
    clickSpeed = Math.max(0.5, Math.min(4.0, clickSpeed));
    spreadExpandDuration = Math.max(0.5, Math.min(5.0, spreadExpandDuration));
    spreadSpeed = Math.max(0.5, Math.min(10.0, spreadSpeed));

    let revealEffectFlag;
    if (!revealEnabled) {
        revealEffectFlag = 0;
    } else if (revealType === 'diagonal') {
        revealEffectFlag = 1;
    } else if (revealType === 'radial') {
        revealEffectFlag = 2;
    } else {
        revealEffectFlag = 3;
    }

    return {
        numCols, brightness, saturation, bgOpacity,
        mouseEnabled, mouseStyle, brightenEnabled, scatterEnabled,
        scatterChars, trailLen, trailDecay, duration, mouseRadius, mouseBrightness,
        clickEnabled, clickBrightness, clickSpeed,
        spreadEnabled, spreadExpandDuration, spreadSpeed,
        revealEnabled, revealType, revealDuration, revealEffectFlag,
    };
}
