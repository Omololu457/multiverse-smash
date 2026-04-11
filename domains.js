// domains.js
// Domain Expansion system — activation, update, rendering, and conflict resolution.

export const activeDomains = [];

const DOMAIN_DEFAULTS = {
  range: 320,
  duration: 8,      // seconds
  cost: 100,
  priority: 1,
  damageBoost: 1.35,
  speedPenalty: 0.75,
  background: null
};

// ------------------------------
// ACTIVATION
// ------------------------------

/**
 * activateDomain(fighter, options, context)
 *   fighter  — the fighter triggering the domain
 *   options  — override any DOMAIN_DEFAULTS field
 *   context  — { activeDomains[], camera }
 */
export function activateDomain(fighter, options = {}, context = {}) {
  if (!fighter) return false;

  const cost = options.cost ?? DOMAIN_DEFAULTS.cost;
  if ((fighter.energy || 0) < cost) return false;
  fighter.energy -= cost;

  // Only one domain per fighter at a time
  const existing = activeDomains.findIndex(d => d.owner === fighter);
  if (existing >= 0) activeDomains.splice(existing, 1);

  const domain = {
    owner:       fighter,
    name:        options.name       || fighter.domain?.name  || "Domain Expansion",
    priority:    options.priority   ?? fighter.domain?.priority ?? DOMAIN_DEFAULTS.priority,
    range:       options.range      ?? DOMAIN_DEFAULTS.range,
    timer:       Math.floor((options.duration ?? DOMAIN_DEFAULTS.duration) * 60),
    background:  options.background || fighter.domain?.background || null,
    damageBoost: options.damageBoost ?? DOMAIN_DEFAULTS.damageBoost,
    speedPenalty:options.speedPenalty ?? DOMAIN_DEFAULTS.speedPenalty,
    effect:      options.effect     || null,
    active:      true
  };

  activeDomains.push(domain);

  // Apply immediate owner buff
  fighter.domainBuff        = true;
  fighter.activeDomainTimer = domain.timer;
  fighter.attackMultiplier  = (fighter.attackMultiplier || 1) * domain.damageBoost;

  // Camera focus if available
  if (context?.camera?.shake) context.camera.shake(14, 18);

  return domain;
}

// ------------------------------
// CONFLICT RESOLUTION
// ------------------------------
// When two domains are active simultaneously, the lower priority one collapses.

function resolveConflicts() {
  if (activeDomains.length <= 1) return;

  // Sort descending by priority
  activeDomains.sort((a, b) => b.priority - a.priority);

  // All domains below the highest priority are cancelled
  const highest = activeDomains[0];
  for (let i = activeDomains.length - 1; i >= 1; i--) {
    const loser = activeDomains[i];
    collapseDomain(loser);
    activeDomains.splice(i, 1);
  }
}

function collapseDomain(domain) {
  if (!domain?.owner) return;
  const owner = domain.owner;

  // Revert owner buff
  if (domain.damageBoost && domain.damageBoost !== 1) {
    owner.attackMultiplier = Math.max(1, (owner.attackMultiplier || 1) / domain.damageBoost);
  }
  owner.domainBuff        = false;
  owner.activeDomainTimer = 0;
}

// ------------------------------
// UPDATE (call every frame)
// ------------------------------

/**
 * updateDomains(fighters)
 *   fighters — array of all active fighters to apply domain effects to
 */
export function updateDomains(fighters = []) {
  resolveConflicts();

  for (let i = activeDomains.length - 1; i >= 0; i--) {
    const domain = activeDomains[i];
    if (!domain) { activeDomains.splice(i, 1); continue; }

    domain.timer--;

    // Apply per-frame effect to opponents caught inside
    for (const fighter of fighters) {
      if (!fighter || fighter === domain.owner) continue;

      const ownerCX = (domain.owner.x || 0) + (domain.owner.w || 0) / 2;
      const ownerCY = (domain.owner.y || 0) + (domain.owner.h || 0) / 2;
      const fighterCX = (fighter.x || 0) + (fighter.w || 0) / 2;
      const fighterCY = (fighter.y || 0) + (fighter.h || 0) / 2;

      const dx = fighterCX - ownerCX;
      const dy = fighterCY - ownerCY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= domain.range) {
        // Slow opponent movement inside the domain
        fighter.vx = (fighter.vx || 0) * domain.speedPenalty;
        fighter.vy = (fighter.vy || 0) * domain.speedPenalty;

        // Run custom effect if provided
        if (typeof domain.effect === "function") {
          domain.effect(fighter, domain.owner, dist, domain.range);
        }
      }
    }

    // Expire
    if (domain.timer <= 0) {
      collapseDomain(domain);
      activeDomains.splice(i, 1);
    }
  }
}

// ------------------------------
// DRAWING
// ------------------------------

/**
 * drawDomains(ctx)
 *   Call inside the camera transform (after applyTransform) so the
 *   domain circle follows the owner in world space.
 */
export function drawDomains(ctx) {
  if (!ctx) return;

  for (const domain of activeDomains) {
    if (!domain?.owner) continue;

    const owner  = domain.owner;
    const cx     = (owner.x || 0) + (owner.w || 0) / 2;
    const cy     = (owner.y || 0) + (owner.h || 0) / 2;
    const radius = domain.range;
    const alpha  = Math.min(0.22, (domain.timer / 60) * 0.04 + 0.08);

    ctx.save();

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = owner.color || "rgba(180,100,255,0.9)";
    ctx.lineWidth   = 3;
    ctx.globalAlpha = 0.55;
    ctx.stroke();

    // Inner fill
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = owner.color || "rgba(130,60,200,0.4)";
    ctx.fill();

    ctx.globalAlpha = 1;

    // Domain name label
    if (domain.name) {
      ctx.font      = "700 14px Arial";
      ctx.fillStyle = owner.color || "#d0a0ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(domain.name, cx, cy - radius + 22);
    }

    // Timer bar along bottom of domain
    const timerRatio = Math.max(0, domain.timer / ((domain.timerMax || domain.timer) || 1));
    const barW       = radius * 1.4;
    ctx.fillStyle    = "rgba(0,0,0,0.35)";
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW, 8);
    ctx.fillStyle    = owner.color || "#a855f7";
    ctx.fillRect(cx - barW / 2, cy + radius - 18, barW * timerRatio, 8);

    ctx.restore();
  }
}

// ------------------------------
// HELPERS
// ------------------------------

export function isInsideDomain(fighter) {
  for (const domain of activeDomains) {
    if (!domain?.owner || domain.owner === fighter) continue;
    const cx = (domain.owner.x || 0) + (domain.owner.w || 0) / 2;
    const cy = (domain.owner.y || 0) + (domain.owner.h || 0) / 2;
    const fx = (fighter.x || 0) + (fighter.w || 0) / 2;
    const fy = (fighter.y || 0) + (fighter.h || 0) / 2;
    const dx = fx - cx;
    const dy = fy - cy;
    if (Math.sqrt(dx * dx + dy * dy) <= domain.range) return domain;
  }
  return null;
}

export function clearDomains() {
  for (const domain of activeDomains) collapseDomain(domain);
  activeDomains.length = 0;
}
