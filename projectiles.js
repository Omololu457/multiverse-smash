// projectiles.js

// Projectile definitions
export const projectiles = {

    // Dragon Ball ki attacks
    galick_gun: {
        damage: 120,
        speed: 15,
        width: 20,
        height: 20,
        type: "ki"
    },
    final_flash: {
        damage: 160,
        speed: 18,
        width: 25,
        height: 25,
        type: "ki"
    },
    big_bang_attack: {
        damage: 130,
        speed: 12,
        width: 22,
        height: 22,
        type: "ki"
    },
    kamehameha: {
        damage: 120,
        speed: 15,
        width: 20,
        height: 20,
        type: "ki"
    },
    solar_kamehameha: {
        damage: 160,
        speed: 18,
        width: 25,
        height: 25,
        type: "ki"
    },
    special_beam_cannon: {
        damage: 150,
        speed: 20,
        width: 20,
        height: 20,
        type: "ki"
    },
    hellzone_grenade: {
        damage: 100,
        speed: 12,
        width: 18,
        height: 18,
        type: "ki"
    },

    // Demon Slayer special moves
    water_surface_slasher: {
        damage: 120,
        speed: 14,
        width: 18,
        height: 18,
        type: "breathing"
    },
    blood_demon_art: {
        damage: 140,
        speed: 16,
        width: 20,
        height: 20,
        type: "demon_power"
    },
    thunder_clap_strike: {
        damage: 150,
        speed: 20,
        width: 20,
        height: 20,
        type: "breathing"
    },
    dual_sword_frenzy: {
        damage: 140,
        speed: 15,
        width: 18,
        height: 18,
        type: "beast_power"
    },
    flame_breathing_first_form: {
        damage: 150,
        speed: 16,
        width: 22,
        height: 22,
        type: "flame_breathing"
    },
    destructive_strike: {
        damage: 160,
        speed: 18,
        width: 25,
        height: 25,
        type: "demon_power"
    },

    // Rick & Morty tech/projectiles
    portal_blast: {
        damage: 140,
        speed: 17,
        width: 20,
        height: 20,
        type: "portal_tech"
    },
    meeseeks_summon: {
        damage: 120,
        speed: 0,
        width: 30,
        height: 30,
        type: "summon"
    },
    manipulative_blast: {
        damage: 140,
        speed: 16,
        width: 20,
        height: 20,
        type: "psychic"
    },
    prime_portal_blast: {
        damage: 160,
        speed: 18,
        width: 25,
        height: 25,
        type: "ultimate_tech"
    },
    nerve_strike: {
        damage: 100,
        speed: 15,
        width: 18,
        height: 18,
        type: "anxiety_power"
    }

}

// Optional: export an empty array for active projectiles (used in abilities.js)
export const activeProjectiles = []