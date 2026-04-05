import { activateDomain, updateDomains, drawDomains } from "./domains.js"

// Example activation input
if (keys["p"]) {
    activateDomain(player, {
        range: 300,
        duration: 8, // seconds
        cost: 50,
        effect: (target) => {
            target.speed *= 0.8
            target.damageMultiplier = (target.damageMultiplier || 1) * 0.9
        }
    })
}

// In update loop
updateDomains([enemy])

// In draw loop
drawDomains(ctx)