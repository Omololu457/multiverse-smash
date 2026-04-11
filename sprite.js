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
        if (fighter.attacking) return fighter.currentMove; // Links to "light", "heavy", "special_purple"
        if (!fighter.grounded) return 'jump';
        if (Math.abs(fighter.vx) > 0.1) return 'walk';
        return 'idle';
    }

    draw(ctx, fighter, spritesheets) {
        const action = this.determineAction(fighter);
        
        // Reset animation index when switching actions
        if (this.currentAction !== action) {
            this.currentAction = action;
            this.frameIndex = 0;
            this.frameTimer = 0;
        }

        const sheet = spritesheets[action] || spritesheets['idle'];
        const frameData = fighter.animationData[action] || fighter.animationData['idle'];

        // Safety check in case a sheet isn't loaded yet
        if (!sheet || !frameData) return;

        const sx = this.frameIndex * frameData.width;
        const sy = 0;

        // Use the native sprite dimensions defined in characters.js (e.g., Purple is 256w)
        const drawWidth = frameData.width;
        const drawHeight = frameData.height;

        // ANCHORING LOGIC
        // Center horizontally over the hitbox
        const offsetX = (drawWidth - fighter.w) / 2;
        // Anchor to the bottom of the hitbox (assuming sprite height >= hitbox height)
        const offsetY = drawHeight - fighter.h;

        ctx.save();
        if (fighter.facing === -1) {
            ctx.scale(-1, 1);
            // Flip math: Invert the X coordinate, apply offset, and subtract the drawWidth
            ctx.drawImage(
                sheet,
                sx, sy, drawWidth, drawHeight,
                -fighter.x + offsetX - drawWidth, fighter.y - offsetY, drawWidth, drawHeight
            );
        } else {
            // Standard drawing centered and bottom-aligned to the physics box
            ctx.drawImage(
                sheet,
                sx, sy, drawWidth, drawHeight,
                fighter.x - offsetX, fighter.y - offsetY, drawWidth, drawHeight
            );
        }
        ctx.restore();

        // Pause animation completely during hitstop for heavy impact feel
        if (fighter.hitstop <= 0) {
            this.updateFrames(frameData, fighter);
        }
    }

    updateFrames(frameData, fighter) {
        this.frameTimer++;
        let speed = frameData.speed || 5;
        
        // Dynamically adjust animation speed if tied to a specific attack duration
        if (fighter.attacking && fighter.currentAttack) {
            const totalFrames = frameData.frames;
            // Spread the animation evenly across the attack's total physical frames
            speed = Math.max(1, Math.floor(fighter.currentAttack.total / totalFrames));
        }

        if (this.frameTimer >= speed) {
            this.frameIndex++;
            this.frameTimer = 0;

            if (this.frameIndex >= frameData.frames) {
                if (fighter.attacking) {
                    // Lock onto the final recovery frame until the combat phase ends
                    this.frameIndex = frameData.frames - 1;
                } else {
                    // Loop movement and idle animations
                    this.frameIndex = 0; 
                }
            }
        }
    }
}
