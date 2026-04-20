// projectiles.js

// 1. Projectile definitions (the data)
export const projectiles = {
    // Dragon Ball ki attacks
    galick_gun: { damage: 120, speed: 15, width: 20, height: 20, type: "ki" },
    final_flash: { damage: 160, speed: 18, width: 25, height: 25, type: "ki" },
    big_bang_attack: { damage: 130, speed: 12, width: 22, height: 22, type: "ki" },
    kamehameha: { damage: 120, speed: 15, width: 20, height: 20, type: "ki" },
    solar_kamehameha: { damage: 160, speed: 18, width: 25, height: 25, type: "ki" },
    special_beam_cannon: { damage: 150, speed: 20, width: 20, height: 20, type: "ki" },
    hellzone_grenade: { damage: 100, speed: 12, width: 18, height: 18, type: "ki" },

    // Demon Slayer special moves
    water_surface_slasher: { damage: 120, speed: 14, width: 18, height: 18, type: "breathing" },
    blood_demon_art: { damage: 140, speed: 16, width: 20, height: 20, type: "demon_power" },
    thunder_clap_strike: { damage: 150, speed: 20, width: 20, height: 20, type: "breathing" },
    dual_sword_frenzy: { damage: 140, speed: 15, width: 18, height: 18, type: "beast_power" },
    flame_breathing_first_form: { damage: 150, speed: 16, width: 22, height: 22, type: "flame_breathing" },
    destructive_strike: { damage: 160, speed: 18, width: 25, height: 25, type: "demon_power" },

    // Rick & Morty tech/projectiles
    portal_blast: { damage: 140, speed: 17, width: 20, height: 20, type: "portal_tech" },
    meeseeks_summon: { damage: 120, speed: 0, width: 30, height: 30, type: "summon" },
    manipulative_blast: { damage: 140, speed: 16, width: 20, height: 20, type: "psychic" },
    prime_portal_blast: { damage: 160, speed: 18, width: 25, height: 25, type: "ultimate_tech" },
    nerve_strike: { damage: 100, speed: 15, width: 18, height: 18, type: "anxiety_power" }
};

// 2. The dynamic state (the live projectiles on screen)
export const activeProjectiles = [];

// 3. The spawning logic (the function the game calls)
/**
 * Spawns a projectile based on move data
 * @param {Object} fighter - The character firing the projectile
 * @param {Object} moveData - The data from the character's move
 */
export function spawnProjectileFromMove(fighter, moveData) {
    const projConfig = projectiles[moveData.projectileId];
    
    if (!projConfig) {
        console.warn(`Projectile ID "${moveData.projectileId}" not found in projectiles.js`);
        return;
    }

    const proj = {
        id: moveData.projectileId,
        // Position logic: spawn in front of the character based on facing direction
        x: fighter.facing === 1 ? fighter.x + fighter.w : fighter.x - projConfig.width,
        y: fighter.y + fighter.h / 3, // Spawn at chest height
        vx: projConfig.speed * fighter.facing,
        vy: 0,
        w: projConfig.width,
        h: projConfig.height,
        damage: projConfig.damage * (fighter.attackMultiplier || 1),
        owner: fighter,
        type: projConfig.type,
        active: true,
        category: moveData.category || "special"
    };

    activeProjectiles.push(proj);
    return proj;
}
