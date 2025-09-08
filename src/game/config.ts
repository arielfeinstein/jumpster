import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { Game } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu/MainMenu';
import { Editor } from './scenes/Editor/Editor';

const DESING_WIDTH = 800;
const DESING_HEIGHT = 600;

export const makeConfig = (
  parent: HTMLElement
): Phaser.Types.Core.GameConfig => ({
  type: Phaser.AUTO,
  width: DESING_WIDTH,
  height: DESING_HEIGHT,
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
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true
  },
  scene: [Boot, Preloader, Game, GameOver, MainMenu, Editor]
});
