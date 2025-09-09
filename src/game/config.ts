import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu/MainMenu';
import { Editor } from './scenes/Editor/Editor';

export const TILE_SIZE = 32;                 
const TILES_ACROSS = 32;              
const TILES_DOWN = 18;                

const DESIGN_WIDTH = TILE_SIZE * TILES_ACROSS;   // 1024
const DESIGN_HEIGHT = TILE_SIZE * TILES_DOWN;    // 576

export const makeConfig = (
  parent: HTMLElement
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  parent,
  backgroundColor: '#028af8',
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: {
        y: 1200,
        x: 0
      }
    }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
  scene: [Boot, Preloader, Game, GameOver, MainMenu, Editor]
});
