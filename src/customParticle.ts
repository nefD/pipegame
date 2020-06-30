import Phaser from 'phaser';

export class CustomParticle extends Phaser.GameObjects.Particles.Particle {

  constructor(emitter: Phaser.GameObjects.Particles.ParticleEmitter) {
    super(emitter);
  }

  update(delta: number, step: number, processors: any[]): boolean {
    let result = super.update(delta, step, processors);

    let angle = Math.atan2(this.velocityY, this.velocityX) + (Math.PI/2);
    this.angle = (angle > 0) ? angle : Phaser.Math.PI2 + angle;

    return result;
  }
}
