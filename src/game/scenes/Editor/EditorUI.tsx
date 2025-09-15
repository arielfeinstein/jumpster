import styles from './EditorUI.module.css';
import { useDrag } from 'react-dnd';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { pageToPhaser } from '../../utilities/Convertors';
import { EventBus } from '../../EventBus'
import { Popover } from 'radix-ui';
import { Component2Icon } from '@radix-ui/react-icons'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useRef, useEffect, useState } from 'react';

export type EntityType = 'platform' | 'enemy' | 'coin' | 'checkpoint' | 'start-flag' | 'end-flag';

// Editor palette of placeable entities
// todo: add a prop for the current scene (editor)
export default function EditorUI({ game }: { game: Phaser.Game }) {
    return (
        <DndProvider backend={HTML5Backend}>
            <>
                <div className={styles.controlsRow}>
                    <div className={styles.palette}>
                        <PaletteItem entityType="platform" imgSrc="/assets/react/platform.png" />
                        <PaletteItem entityType="enemy" imgSrc="/assets/react/enemy.png" />
                        <PaletteItem entityType="coin" imgSrc="/assets/phaser/coin.png" />
                        <PaletteItem entityType="checkpoint" imgSrc="/assets/react/checkpoint-flag.png" />
                        <PaletteItem entityType="start-flag" imgSrc="/assets/phaser/start-flag.png" /> 
                        <PaletteItem entityType="end-flag" imgSrc="/assets/phaser/end-flag.png" />

                    </div>
                    <ChangeDimensionPopover />
                </div>
                <HiddenCanvasWrapper game={game} />
            </>
        </DndProvider>
    );
}

function PaletteItem({ entityType, imgSrc }: { entityType: EntityType; imgSrc: string }) {
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

type Bounds = { left: number; top: number; width: number; height: number };

/**
 * useScaleBounds
 * Computes the visible game rectangle inside `#game-container` using Phaser's ScaleManager.
 * - Positions are relative to the container (not the viewport).
 * - Uses `displaySize` for width/height and container centering math for top/left.
 * - Subscribes to `scale.resize` and updates state when the game resizes.
 * Returns `null` until the first measurement completes.
 */
function useScaleBounds(game: Phaser.Game) {
    const [bounds, setBounds] = useState<Bounds | null>(null);

    useEffect(() => {
        if (!game) return;
        const scale = game.scale;

        const update = () => {
            const parentW = scale.parentSize.width;
            const parentH = scale.parentSize.height;
            const dispW = scale.displaySize.width;
            const dispH = scale.displaySize.height;

            const left = Math.floor((parentW - dispW) / 2);
            const top = Math.floor((parentH - dispH) / 2);

            setBounds({
                left,
                top,
                width: Math.floor(dispW),
                height: Math.floor(dispH),
            });
        };

        update();
        const onResize = () => update();
        scale.on('resize', onResize);
        return () => {
            scale.off('resize', onResize);
        };
    }, [game]);

    return bounds;
}

/**
 * useEditorDrop
 * Sets up the react-dnd drop target for game entities.
 * - Accepts items of type `game-object` with `{ entityType }`.
 * - Converts the drop point (client coords) to world coords via `pageToPhaser`.
 * - Emits `editor-place-entity` with `{ entityType, x, y }`.
 * Returns the standard `useDrop` tuple (collecting `{ isOver }`).
 */
function useEditorDrop(game: Phaser.Game) {
    return useDrop({
        accept: 'game-object',
        drop: (item: { entityType: EntityType }, monitor) => {
            console.log('dropped', item);
            const clientOffset = monitor.getClientOffset();
            if (!clientOffset) return;
            const { world } = pageToPhaser(
                clientOffset,
                game,
                game.scene.getScene('Editor').cameras.main
            );
            console.log('world coords', world.x, world.y);
            EventBus.emit('editor-place-entity', {
                entityType: item.entityType,
                x: world.x,
                y: world.y
            });
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            isDragging: monitor.canDrop(), 
        })
    });
}

/**
 * HiddenCanvasWrapper
 * Absolutely positioned overlay that matches the scaled game area (excludes pillarboxing),
 * used to capture drag/drop and pointer interactions aligned with the canvas.
 * Relies on `useScaleBounds` for size/position and `useEditorDrop` for DnD behavior.
 */
function HiddenCanvasWrapper({ game }: { game: Phaser.Game }) {
    const [{ isOver, isDragging }, dropRef] = useEditorDrop(game);
    const bounds = useScaleBounds(game);

    if (!bounds) return null;

    return (
        <div
            ref={el => { dropRef(el) }}
            className={styles.hiddenCanvas}
            style={{
                backgroundColor: isDragging && isOver ? 'rgba(217, 15, 15, 0.2)' : 'transparent',
                top: bounds.top,
                left: bounds.left,
                width: bounds.width,
                height: bounds.height,
                pointerEvents: isDragging ? 'auto' : 'none'
            }}
        >
            {isDragging && isOver && <div className={styles.dropIndicator}>Release to drop</div>}
        </div>
    );
}

function ChangeDimensionPopover() {

    const widthInputRef = useRef<HTMLInputElement>(null);
    const heightInputRef = useRef<HTMLInputElement>(null);

    const handleDimensionChange = () => {
        const worldWidthUnit = parseInt(widthInputRef.current?.value || '0', 10);
        const worldHeightUnit = parseInt(heightInputRef.current?.value || '0', 10);
        EventBus.emit('editor-change-dimensions', { worldWidthUnit, worldHeightUnit });
        console.log('Change dimensions to:', worldWidthUnit, worldHeightUnit);
    }
    
    return (
        <div className={styles.popover}>
            <Popover.Root>
                <Popover.Trigger asChild>
                    <button className={styles.popoverTrigger} aria-label="Update dimensions">
                        <Component2Icon />
                    </button>
                </Popover.Trigger>
                <Popover.Portal>
                    <Popover.Content className={styles.popoverContent}>
                        <p className={styles.popoverTitle}>Dimensions</p>
                        <fieldset className={styles.fieldset}>
                            <label className={styles.label} htmlFor="width">
                                Width
                            </label>
                            <input className={styles.input} id="width" ref={widthInputRef} />
                        </fieldset>
                        <fieldset className={styles.fieldset}>
                            <label className={styles.label} htmlFor="height">
                                Height
                            </label>
                            <input className={styles.input} id="height" ref={heightInputRef} />
                        </fieldset>
                        <Popover.Close className={styles.popoverClose} aria-label="Close">
                            <Cross1Icon />
                        </Popover.Close>
                        {
                            /* todo: - add submitButton
                                      - add click listener
                                      - add focus (don't exit when clicked on game canvas) */
                        }
                        <Popover.Close className={styles.submitButton} aria-label="Apply changes" onClick={handleDimensionChange}>
                            Apply
                        </Popover.Close>
                        <Popover.Arrow className={styles.popoverArrow} />
                    </Popover.Content>
                </Popover.Portal>
            </Popover.Root>
        </div>
    );
}
