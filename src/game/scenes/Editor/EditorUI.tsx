import styles from './EditorUI.module.css';
import { useDrag } from 'react-dnd';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { pageToPhaser } from '../../utilities/Convertors';
import { EventBus } from '../../EventBus'
import { Popover } from 'radix-ui';
import { Component2Icon } from '@radix-ui/react-icons'
import { Cross1Icon } from '@radix-ui/react-icons'
import { useRef } from 'react';

export type EntityType = 'platform' | 'enemy' | 'coin';

// Editor palette of placeable entities
export default function EditorUI({ game }: { game: Phaser.Game }) {
    return (
        <DndProvider backend={HTML5Backend}>
            <>
                <div className={styles.controlsRow}>
                    <div className={styles.palette}>
                        <PaletteItem entityType="platform" imgSrc="/assets/phaser/platform.png" />
                        <PaletteItem entityType="enemy" imgSrc="/assets/react/goomba.png" />
                        <PaletteItem entityType="coin" imgSrc="/assets/phaser/star.png" />
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

function HiddenCanvasWrapper({ game }: { game: Phaser.Game }) {
    const [{ isOver }, dropRef] = useDrop({
        accept: 'game-object',
        drop: (item: { entityType: EntityType }, monitor) => {
            console.log('dropped', item);
            const clientOffset = monitor.getClientOffset(); // xy coordinates
            if (!clientOffset) return;
            const { canvas } = pageToPhaser(clientOffset, game);
            console.log('canvas coords', canvas.x, canvas.y);
            EventBus.emit('editor-place-entity', {
                entityType: item.entityType,
                x: canvas.x,
                y: canvas.y
            });
        },
        collect: (monitor) => ({
            isOver: monitor.isOver()
        })
    })

    return (
        <div ref={el => { dropRef(el) }} className={styles.hiddenCanvas} style={{ backgroundColor: isOver ? 'rgba(217, 15, 15, 0.2)' : undefined }}>
            {isOver && <div className={styles.dropIndicator}>Release to drop</div>}
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
