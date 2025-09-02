import styles from './EditorUI.module.css';
import { useEffect, useState } from 'react';
import { useDrag } from 'react-dnd';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'

// Editor palette of placeable entities
export default function EditorUI() {
    return (
        <DndProvider backend={HTML5Backend}>
            <>
                <div className={styles.palette}>
                    <PaletteItem entityType="platform" imgSrc="/assets/phaser/platform.png" />
                    <PaletteItem entityType="enemy" imgSrc="/assets/react/goomba.png" />
                    <PaletteItem entityType="coin" imgSrc="/assets/phaser/star.png" />
                </div>
                <HiddenCanvasWrapper />
            </>
        </DndProvider>
    );
}

function PaletteItem({ entityType, imgSrc }: { entityType: string; imgSrc: string }) {
    const [{ isDragging }, dragRef] = useDrag({
        type: 'game-object',
        item: { entityType },
        collect: (monitor) => ({
            isDragging: monitor.isDragging()
        })
    });

    return (
        <button
            ref={el => { dragRef(el) }}
            data-entity={entityType}
            className={styles.tileButton}
        >
            <img src={imgSrc} className={styles.tileIcon} />
        </button>
    );
}

function HiddenCanvasWrapper() {
    const [{ isOver }, dropRef] = useDrop({
        accept: 'game-object',
        drop: (item) => { console.log('dropped', item); },
        collect: (monitor) => ({
            isOver: monitor.isOver()
        })
    })

    const [overlayRect, setOverlayRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

    useEffect(() => {
        const container = document.getElementById('game-container');
        if (!container) return;

        let observedCanvas: HTMLCanvasElement | null = null;

        const update = () => {
            const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
            if (!canvas) return;
            const c = canvas.getBoundingClientRect();
            const p = container.getBoundingClientRect();
            setOverlayRect({
                top: c.top - p.top,
                left: c.left - p.left,
                width: c.width,
                height: c.height
            });
        };

        // Initial compute
        update();

        // Observe canvas size changes
        let resizeObs: ResizeObserver | null = null;
        const attachResizeObserver = () => {
            const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
            if (canvas && canvas !== observedCanvas) {
                resizeObs?.disconnect();
                observedCanvas = canvas;
                resizeObs = new ResizeObserver(() => update());
                resizeObs.observe(canvas);
            }
        };
        attachResizeObserver();

        // Watch for canvas being (re)created by Phaser
        const mutObs = new MutationObserver(() => {
            attachResizeObserver();
            update();
        });
        mutObs.observe(container, { childList: true, subtree: true });

        // Window resize
        window.addEventListener('resize', update);

        return () => {
            mutObs.disconnect();
            resizeObs?.disconnect();
            window.removeEventListener('resize', update);
        };
    }, []);

    const style = overlayRect
        ? {
            top: overlayRect.top,
            left: overlayRect.left,
            width: overlayRect.width,
            height: overlayRect.height,
            backgroundColor: isOver ? 'rgba(217, 15, 15, 0.2)' as const : undefined
        }
        : undefined;

    return (
        <div ref={el => { dropRef(el) }} className={styles.hiddenCanvas} style={style}>
            {isOver && <div className={styles.dropIndicator}>Release to drop</div>}
        </div>
    );
}
