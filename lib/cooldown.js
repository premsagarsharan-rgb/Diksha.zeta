// lib/cooldown.js
// Cooldown utility for move operations

const DEFAULT_COOLDOWN_MINUTES = 5;

// In-memory fallback (production me DB se aayega)
const COOLDOWN_OPTIONS = [0, 2, 5, 10]; // minutes

/**
 * Get cooldown minutes for a user
 * Checks DB for per-user override, else returns default
 */
export async function getCooldownMinutes(db, userId) {
  try {
    const override = await db
      .collection("cooldownOverrides")
      .findOne({ userId, active: true });

    if (override && typeof override.minutes === "number") {
      return override.minutes;
    }
  } catch (e) {
    console.error("getCooldownMinutes error:", e);
  }

  return DEFAULT_COOLDOWN_MINUTES;
}

/**
 * Check if assignment is in cooldown period
 * Returns { inCooldown, remainingMs, remainingSec, cooldownMinutes }
 */
export async function checkCooldown(db, assignment, userId) {
  const cooldownMinutes = await getCooldownMinutes(db, userId);

  // 0 = no cooldown
  if (cooldownMinutes <= 0) {
    return {
      inCooldown: false,
      remainingMs: 0,
      remainingSec: 0,
      cooldownMinutes,
    };
  }

  const lastMovedAt = assignment?.lastMovedAt
    ? new Date(assignment.lastMovedAt)
    : null;

  if (!lastMovedAt) {
    return {
      inCooldown: false,
      remainingMs: 0,
      remainingSec: 0,
      cooldownMinutes,
    };
  }

  const now = new Date();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  const elapsed = now.getTime() - lastMovedAt.getTime();
  const remaining = cooldownMs - elapsed;

  if (remaining <= 0) {
    return {
      inCooldown: false,
      remainingMs: 0,
      remainingSec: 0,
      cooldownMinutes,
    };
  }

  return {
    inCooldown: true,
    remainingMs: remaining,
    remainingSec: Math.ceil(remaining / 1000),
    cooldownMinutes,
    expiresAt: new Date(lastMovedAt.getTime() + cooldownMs).toISOString(),
  };
}

/**
 * Available cooldown options for admin UI
 */
export function getCooldownOptions() {
  return COOLDOWN_OPTIONS;
}

export { DEFAULT_COOLDOWN_MINUTES };
