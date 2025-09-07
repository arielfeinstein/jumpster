import styles from './EditorUI.module.css';
import { useDrag } from 'react-dnd';
import { useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend'
import { pageToPhaser } from '../../utilities/Convertors';
import { EventBus } from '../../EventBus'
import { Popover } from 'radix-ui';
import { Component2Icon } from '@radix-ui/react-icons'
import { Cross1Icon } from '@radix-ui/react-icons'

export type EntityType = 'platform' | 'enemy' | 'coin';

// Editor palette of placeable entities
export default function EditorUI({game} : {game: Phaser.Game}) {
    return (
        <DndProvider backend={HTML5Backend}>
            <>
                <div className={styles.palette}>
                    <PaletteItem entityType="platform" imgSrc="/assets/phaser/platform.png" />
                    <PaletteItem entityType="enemy" imgSrc="/assets/react/goomba.png" />
                    <PaletteItem entityType="coin" imgSrc="/assets/phaser/star.png" />
                </div>
                <HiddenCanvasWrapper game={game} />
                <ChangeDimensionPopover  />
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
    return (
    <div className={styles.popover}>
    <Popover.Root>
        <Popover.Trigger asChild>
            <button className="IconButton" aria-label="Update dimensions">
				<Component2Icon />
            </button>
        </Popover.Trigger>
        <Popover.Portal>
            <Popover.Content className="PopoverContent" sideOffset={5}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p className="Text" style={{ marginBottom: 10 }}>
                        Dimensions
                    </p>
                    <fieldset className="Fieldset">
                        <label className="Label" htmlFor="width">
                            Width
                        </label>
                        <input className="Input" id="width" defaultValue="100%" />
                    </fieldset>
                    <fieldset className="Fieldset">
                        <label className="Label" htmlFor="maxWidth">
                            Max. width
                        </label>
                        <input className="Input" id="maxWidth" defaultValue="300px" />
                    </fieldset>
                </div>
                <Popover.Close className="PopoverClose" aria-label="Close">
                    Close
                </Popover.Close>
                <Popover.Arrow className="PopoverArrow" />
            </Popover.Content>
        </Popover.Portal>
    </Popover.Root>
    </div>
    );
}
