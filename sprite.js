// sprite.js
// Handles character animations, sheet switching, and frame syncing with combat phases

export class SpriteHandler {
    constructor() {
        this.animations = {};
        this.currentAction = 'idle';
        this.frameIndex = 0;
        this.frameTimer = 0;
    }

    determineAction(fighter) {
        if (fighter.hitstop > 0) return this.currentAction; 
        if (fighter.hitstun > 0) return 'hurt';
        if (fighter.attacking) return fighter.currentMove; 
        if (!fighter.grounded) return 'jump';
        if (Math.abs(fighter.vx) > 0.1) return 'walk';
        return 'idle';
    }

    draw(ctx, fighter, spritesheets) {
        const action = this.determineAction(fighter);
        
        if (this.currentAction !== action) {
            this.currentAction = action;
            this.frameIndex = 0;
            this.frameTimer = 0;
        }

        const sheet = spritesheets[action] || spritesheets['idle'];
        const frameData = fighter.animationData[action] || fighter.animationData['idle'];

        const sx = this.frameIndex * frameData.width;
        const sy = 0;

        ctx.save();
        if (fighter.facing === -1) {
            ctx.scale(-1, 1);
            ctx.drawImage(
                sheet,
                sx, sy, frameData.width, frameData.height,
                -fighter.x - fighter.w, fighter.y, fighter.w, fighter.h
            );
        } else {
            ctx.drawImage(
                sheet,
                sx, sy, frameData.width, frameData.height,
                fighter.x, fighter.y, fighter.w, fighter.h
            );
        }
        ctx.restore();

        if (fighter.hitstop <= 0) {
            this.updateFrames(frameData, fighter);
        }
    }

    updateFrames(frameData, fighter) {
        this.frameTimer++;
        let speed = frameData.speed || 5;
        
        if (fighter.attacking && fighter.currentAttack) {
            const totalFrames = frameData.frames;
            speed = Math.max(1, Math.floor(fighter.currentAttack.total / totalFrames));
        }

        if (this.frameTimer >= speed) {
            this.frameIndex++;
            this.frameTimer = 0;

            if (this.frameIndex >= frameData.frames) {
                if (fighter.attacking) {
                    this.frameIndex = frameData.frames - 1;
                } else {
                    this.frameIndex = 0; 
                }
            }
        }
    }
}
