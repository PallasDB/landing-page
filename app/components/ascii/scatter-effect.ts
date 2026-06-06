interface ScatterRefs {
    scatterEnabledRef: { current: boolean };
    mouseRadiusRef: { current: number };
    durationRef: { current: number };
    scatterCharsRef: { current: string };
}

export function createScatterEffect({
    scatterEnabledRef,
    mouseRadiusRef,
    durationRef,
    scatterCharsRef,
}: ScatterRefs) {
    let cellChar = new Uint8Array(0);
    let cellLife = new Float32Array(0);
    let cellSpeed = new Float32Array(0);
    let cellTouched = new Uint8Array(0);
    let cursor: { x: number, y: number, t: number } | null = null;
    let cursorPrev: { x: number, y: number, t: number } | null = null;
    let smoothVx = 0;
    let smoothVy = 0;
    let lastFrameMs = -1;
    const pickCharIdx = (): number => Math.floor(Math.random() * scatterCharsRef.current.length);

    let gridCols = 0;
    let gridRows = 0;
    let charW = 1;
    let charH = 1;
    let _scatterStateTexture: WebGLTexture | null = null;

    return {
        setup(gl: WebGL2RenderingContext, cols: number, rows: number, cw: number, ch: number, scatterStateTexture: WebGLTexture) {
            gridCols = cols;
            gridRows = rows;
            charW = cw;
            charH = ch;
            _scatterStateTexture = scatterStateTexture;

            const cellCount = cols * rows;
            cellChar = new Uint8Array(cellCount);
            cellLife = new Float32Array(cellCount);
            cellSpeed = new Float32Array(cellCount);
            cellTouched = new Uint8Array(cellCount);
            cursor = null;
            cursorPrev = null;
            smoothVx = 0;
            smoothVy = 0;
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, scatterStateTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, cols, rows, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, cellChar);
        },

        handleMouseMove(x: number, y: number, t: number) {
            if (scatterEnabledRef.current) {
                cursorPrev = cursor;
                cursor = { x, y, t };
            }
        },

        handleMouseLeave() {
            cursor = null;
            cursorPrev = null;
            smoothVx = 0;
            smoothVy = 0;
        },

        reset(gl: WebGL2RenderingContext) {
            cellChar.fill(0);
            if (_scatterStateTexture && gridCols > 0) {
                gl.activeTexture(gl.TEXTURE5);
                gl.bindTexture(gl.TEXTURE_2D, _scatterStateTexture);
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gridCols, gridRows, gl.RED_INTEGER, gl.UNSIGNED_BYTE, cellChar);
            }
        },

        tick(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
            if (!scatterEnabledRef.current || gridCols === 0 || gridRows === 0) return;
            const now = performance.now();
            const dtSec = lastFrameMs < 0 ? 0 : Math.min(0.1, (now - lastFrameMs) / 1000);
            lastFrameMs = now;
            const radiusPx = Math.min(canvas.width, canvas.height) * mouseRadiusRef.current;

            let cursorActive = false;
            if (cursor && now - cursor.t < 80) {
                if (cursorPrev) {
                    const eventDt = (cursor.t - cursorPrev.t) / 1000;
                    if (eventDt > 0 && eventDt < 0.2) {
                        const vx = (cursor.x - cursorPrev.x) / eventDt;
                        const vy = (cursor.y - cursorPrev.y) / eventDt;
                        smoothVx = smoothVx * 0.7 + vx * 0.3;
                        smoothVy = smoothVy * 0.7 + vy * 0.3;
                    }
                } else {
                    smoothVx = 0;
                    smoothVy = 0;
                }
                if (Math.hypot(smoothVx, smoothVy) > charW * 2) {
                    cursorActive = true;
                }
            } else {
                smoothVx *= 0.6;
                smoothVy *= 0.6;
            }

            cellTouched.fill(0);
            if (cursorActive && cursor && radiusPx > 0) {
                const cx = cursor.x;
                const cy = cursor.y;
                const minCol = Math.max(0, Math.floor((cx - radiusPx) / charW));
                const maxCol = Math.min(gridCols - 1, Math.floor((cx + radiusPx) / charW));
                const minRow = Math.max(0, Math.floor((cy - radiusPx) / charH));
                const maxRow = Math.min(gridRows - 1, Math.floor((cy + radiusPx) / charH));
                for (let row = minRow; row <= maxRow; row++) {
                    for (let col = minCol; col <= maxCol; col++) {
                        const cellCx = (col + 0.5) * charW;
                        const cellCy = (row + 0.5) * charH;
                        const dd = Math.hypot(cellCx - cx, cellCy - cy);
                        if (dd > radiusPx) continue;

                        const k = row * gridCols + col;
                        cellTouched[k] = 1;
                        if (cellChar[k] === 0) {
                            cellChar[k] = 1 + pickCharIdx();
                            cellSpeed[k] = 0.5 + Math.random() * 2.0;
                        }
                        cellLife[k] = 1.0;
                    }
                }
            }

            const lifetimeSec = durationRef.current;
            if (dtSec > 0) {
                for (let row = 0; row < gridRows; row++) {
                    for (let col = 0; col < gridCols; col++) {
                        const k = row * gridCols + col;
                        if (cellChar[k] === 0 || cellTouched[k]) continue;
                        const left  = col > 0 ? cellChar[k - 1] !== 0 : false;
                        const right = col < gridCols-1 ? cellChar[k + 1] !== 0 : false;
                        const up    = row > 0 ? cellChar[k - gridCols] !== 0 : false;
                        const down  = row < gridRows-1 ? cellChar[k + gridCols] !== 0 : false;
                        const isEdge = !left || !right || !up || !down;
                        const rate = (isEdge ? 5.0 : 1.0) * cellSpeed[k] / lifetimeSec;
                        cellLife[k] -= rate * dtSec;
                        if (cellLife[k] <= 0) {
                            cellChar[k] = 0;
                        }
                    }
                }
            }

            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, _scatterStateTexture!);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gridCols, gridRows, gl.RED_INTEGER, gl.UNSIGNED_BYTE, cellChar);
        },
    };
}
