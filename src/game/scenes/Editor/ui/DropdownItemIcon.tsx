/**
 * DropdownItemIcon.tsx
 *
 * Shared icon renderer for the editor palette.
 *
 * Handles two cases:
 *  - A standalone image file → rendered as a plain <img>.
 *  - A single frame inside a spritesheet → cropped via CSS custom properties
 *    (background-image / background-position) using the `.spriteIcon` class.
 *
 * Extracted from EditorUI.tsx so the same logic can be reused in the main-menu
 * Help screen without creating a circular dependency.
 */

import React from 'react';
import type { SpriteFrame } from '../types/DockTypes';
import styles from './EditorUI.module.css';

// Must match the `.dropdownItemIcon` height declared in EditorUI.module.css.
const DROPDOWN_ICON_PX = 22;

interface DropdownItemIconProps {
    assetSrc: string;
    spriteFrame?: SpriteFrame;
    alt: string;
}

/**
 * Renders an icon from a standalone image or a specific frame within a spritesheet.
 */
export function DropdownItemIcon({ assetSrc, spriteFrame, alt }: DropdownItemIconProps) {
    if (spriteFrame) {
        const { frameX, frameY, frameSize } = spriteFrame;
        const scale = DROPDOWN_ICON_PX / frameSize;
        return (
            <div
                className={`${styles.dropdownItemIcon} ${styles.spriteIcon}`}
                role="img"
                aria-label={alt}
                style={{
                    '--sprite-src': `url('${assetSrc}')`,
                    '--sprite-pos': `-${frameX * scale}px -${frameY * scale}px`,
                } as React.CSSProperties}
            />
        );
    }
    return <img src={assetSrc} className={styles.dropdownItemIcon} alt={alt} />;
}
