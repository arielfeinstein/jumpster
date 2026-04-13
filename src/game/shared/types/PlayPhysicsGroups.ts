import Phaser from 'phaser';

export interface PlayPhysicsGroups {
    solid: Phaser.Physics.Arcade.StaticGroup;
    hazard: Phaser.Physics.Arcade.StaticGroup;
    collectible: Phaser.Physics.Arcade.StaticGroup;
    checkpoint: Phaser.Physics.Arcade.StaticGroup;
    goal: Phaser.Physics.Arcade.StaticGroup;
    stompable: Phaser.Physics.Arcade.Group;
}
