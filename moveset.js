// moveset.js
export const moveset = {
  // ======================
  // DRAGON BALL MOVES
  // ======================

  goku: {
    light: {
      type: "normal",
      damage: 45,
      startup: 4,
      active: 3,
      recovery: 10,
      hitstun: 12,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 85,
      startup: 8,
      active: 4,
      recovery: 18,
      hitstun: 18,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 7,
      active: 4,
      recovery: 16,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 14,
      airOK: true
    },
    specials: {
      dragonFist: {
        type: "special",
        cost: 40,
        damage: 150,
        startup: 14,
        active: 5,
        recovery: 24,
        hitstun: 26,
        blockstun: 14,
        knockbackX: 10,
        knockbackY: -4,
        airOK: false,
        effect: "punch attack with dragon aura"
      }
    },
    ultimate: {
      superSaiyanBlue: {
        type: "ultimate",
        cost: 100,
        startup: 20,
        active: 8,
        recovery: 30,
        duration: 8,
        effect: "massive speed and attack boost, ki attacks deal double damage"
      }
    }
  },

  vegeta: {
    light: {
      type: "normal",
      damage: 45,
      startup: 4,
      active: 3,
      recovery: 10,
      hitstun: 12,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 85,
      startup: 8,
      active: 4,
      recovery: 18,
      hitstun: 18,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 7,
      active: 4,
      recovery: 16,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 14,
      airOK: true
    },
    specials: {
      galickGun: {
        type: "special",
        cost: 30,
        damage: 120,
        startup: 12,
        active: 5,
        recovery: 22,
        hitstun: 22,
        blockstun: 13,
        knockbackX: 8,
        knockbackY: -2,
        airOK: false,
        effect: "powerful ki beam"
      },
      finalFlash: {
        type: "special",
        cost: 40,
        damage: 160,
        startup: 18,
        active: 6,
        recovery: 28,
        hitstun: 28,
        blockstun: 16,
        knockbackX: 12,
        knockbackY: -3,
        airOK: false,
        effect: "concentrated energy blast"
      },
      bigBangAttack: {
        type: "special",
        cost: 25,
        damage: 130,
        startup: 10,
        active: 5,
        recovery: 20,
        hitstun: 20,
        blockstun: 12,
        knockbackX: 9,
        knockbackY: -1,
        airOK: false,
        effect: "explosive ki attack"
      }
    },
    ultimate: {
      superSaiyanBlueEvolution: {
        type: "ultimate",
        cost: 100,
        startup: 20,
        active: 8,
        recovery: 30,
        duration: 8,
        effect: "increased attack, speed, and ki regeneration"
      }
    }
  },

  piccolo: {
    light: {
      type: "normal",
      damage: 40,
      startup: 5,
      active: 3,
      recovery: 11,
      hitstun: 11,
      blockstun: 7,
      knockbackX: 2,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 19,
      hitstun: 17,
      blockstun: 11,
      knockbackX: 5,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 60,
      startup: 8,
      active: 4,
      recovery: 16,
      hitstun: 18,
      blockstun: 9,
      knockbackX: 2,
      knockbackY: -7,
      launch: 11,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 55,
      startup: 6,
      active: 3,
      recovery: 10,
      hitstun: 12,
      blockstun: 7,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 70,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 16,
      blockstun: 9,
      knockbackX: 1,
      knockbackY: 9,
      spike: 12,
      airOK: true
    },
    specials: {
      specialBeamCannon: {
        type: "special",
        cost: 35,
        damage: 150,
        startup: 16,
        active: 4,
        recovery: 24,
        hitstun: 26,
        blockstun: 14,
        knockbackX: 11,
        knockbackY: -3,
        airOK: false,
        effect: "piercing ki attack"
      },
      hellzoneGrenade: {
        type: "special",
        cost: 30,
        damage: 100,
        startup: 14,
        active: 8,
        recovery: 24,
        hitstun: 20,
        blockstun: 12,
        knockbackX: 7,
        knockbackY: -1,
        airOK: false,
        effect: "multi-ki ball attack"
      }
    },
    ultimate: {
      fusedWithKami: {
        type: "ultimate",
        cost: 100,
        startup: 18,
        active: 8,
        recovery: 28,
        duration: 6,
        effect: "enhanced stats and ki attacks"
      }
    }
  },

  frieza: {
    light: {
      type: "normal",
      damage: 45,
      startup: 4,
      active: 3,
      recovery: 10,
      hitstun: 12,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 85,
      startup: 8,
      active: 4,
      recovery: 18,
      hitstun: 18,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 7,
      active: 4,
      recovery: 16,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 14,
      airOK: true
    },
    specials: {
      deathBeam: {
        type: "special",
        cost: 20,
        damage: 90,
        startup: 8,
        active: 3,
        recovery: 16,
        hitstun: 16,
        blockstun: 10,
        knockbackX: 6,
        knockbackY: -1,
        airOK: true,
        effect: "precise ki blast"
      },
      novaStrike: {
        type: "special",
        cost: 30,
        damage: 140,
        startup: 12,
        active: 5,
        recovery: 22,
        hitstun: 24,
        blockstun: 13,
        knockbackX: 10,
        knockbackY: -2,
        airOK: false,
        effect: "large ki explosion"
      },
      ultimateDeathBall: {
        type: "special",
        cost: 50,
        damage: 200,
        startup: 20,
        active: 6,
        recovery: 30,
        hitstun: 32,
        blockstun: 18,
        knockbackX: 14,
        knockbackY: -4,
        airOK: false,
        effect: "huge energy sphere"
      }
    },
    ultimate: {
      goldenFrieza: {
        type: "ultimate",
        cost: 100,
        startup: 18,
        active: 8,
        recovery: 28,
        duration: 8,
        effect: "massive speed and attack boost, all ki moves amplified"
      }
    }
  },

  cell: {
    light: {
      type: "normal",
      damage: 50,
      startup: 5,
      active: 3,
      recovery: 11,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 95,
      startup: 9,
      active: 4,
      recovery: 19,
      hitstun: 19,
      blockstun: 12,
      knockbackX: 7,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 75,
      startup: 8,
      active: 4,
      recovery: 17,
      hitstun: 21,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 13,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 65,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 14,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 85,
      startup: 9,
      active: 4,
      recovery: 15,
      hitstun: 19,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 14,
      airOK: true
    },
    specials: {
      kamehameha: {
        type: "special",
        cost: 30,
        damage: 120,
        startup: 12,
        active: 5,
        recovery: 22,
        hitstun: 22,
        blockstun: 13,
        knockbackX: 8,
        knockbackY: -2,
        airOK: false,
        effect: "ki blast"
      },
      solarKamehameha: {
        type: "special",
        cost: 40,
        damage: 160,
        startup: 18,
        active: 6,
        recovery: 28,
        hitstun: 28,
        blockstun: 16,
        knockbackX: 12,
        knockbackY: -3,
        airOK: false,
        effect: "stronger ki blast"
      }
    },
    ultimate: {
      perfectCell: {
        type: "ultimate",
        cost: 100,
        startup: 20,
        active: 8,
        recovery: 30,
        duration: 8,
        effect: "max attack, speed, and ki regeneration"
      }
    }
  },

  // ======================
  // DEMON SLAYER MOVES
  // ======================

  zenitsu: {
    light: {
      type: "normal",
      damage: 50,
      startup: 3,
      active: 2,
      recovery: 8,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 90,
      startup: 7,
      active: 3,
      recovery: 16,
      hitstun: 19,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 6,
      active: 3,
      recovery: 14,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 4,
      active: 2,
      recovery: 8,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 7,
      active: 3,
      recovery: 12,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 13,
      airOK: true
    },
    specials: {
      thunderClapStrike: {
        type: "special",
        cost: 30,
        damage: 150,
        startup: 8,
        active: 4,
        recovery: 18,
        hitstun: 25,
        blockstun: 13,
        knockbackX: 10,
        knockbackY: -2,
        airOK: true,
        effect: "instant high-speed lightning attack"
      }
    },
    ultimate: {
      thunderBreathingMastery: {
        type: "ultimate",
        cost: 100,
        startup: 16,
        active: 8,
        recovery: 24,
        duration: 6,
        effect: "extreme speed, multi-strike combos, high crit chance"
      }
    }
  },

  // ======================
  // RICK AND MORTY MOVES
  // ======================

  rick: {
    light: {
      type: "normal",
      damage: 50,
      startup: 5,
      active: 3,
      recovery: 11,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 90,
      startup: 9,
      active: 4,
      recovery: 19,
      hitstun: 19,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 8,
      active: 4,
      recovery: 16,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 6,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 13,
      airOK: true
    },
    specials: {
      portalBlast: {
        type: "special",
        cost: 30,
        damage: 140,
        startup: 11,
        active: 5,
        recovery: 21,
        hitstun: 22,
        blockstun: 13,
        knockbackX: 8,
        knockbackY: -2,
        airOK: true,
        effect: "shoots a portal-based energy projectile"
      },
      meeseeksSummon: {
        type: "special",
        cost: 40,
        damage: 120,
        startup: 14,
        active: 6,
        recovery: 24,
        hitstun: 20,
        blockstun: 12,
        knockbackX: 7,
        knockbackY: -1,
        airOK: false,
        effect: "summons a Meeseeks to assist in attacks"
      }
    },
    ultimate: {
      ultimateGadgetry: {
        type: "ultimate",
        cost: 100,
        startup: 20,
        active: 8,
        recovery: 30,
        duration: 8,
        effect: "all attacks gain massive damage and range, random gadget effects trigger"
      }
    }
  },

  morty: {
    light: {
      type: "normal",
      damage: 40,
      startup: 5,
      active: 3,
      recovery: 11,
      hitstun: 11,
      blockstun: 7,
      knockbackX: 2,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 70,
      startup: 9,
      active: 4,
      recovery: 18,
      hitstun: 16,
      blockstun: 10,
      knockbackX: 5,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 60,
      startup: 8,
      active: 4,
      recovery: 16,
      hitstun: 18,
      blockstun: 9,
      knockbackX: 2,
      knockbackY: -7,
      launch: 11,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 50,
      startup: 6,
      active: 3,
      recovery: 10,
      hitstun: 11,
      blockstun: 7,
      knockbackX: 2,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 65,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 15,
      blockstun: 8,
      knockbackX: 1,
      knockbackY: 9,
      spike: 11,
      airOK: true
    },
    specials: {
      nerveStrike: {
        type: "special",
        cost: 25,
        damage: 100,
        startup: 9,
        active: 4,
        recovery: 18,
        hitstun: 18,
        blockstun: 11,
        knockbackX: 6,
        knockbackY: -1,
        airOK: false,
        effect: "quick panic-fueled strike"
      }
    },
    ultimate: {
      mortysCourage: {
        type: "ultimate",
        cost: 100,
        startup: 18,
        active: 8,
        recovery: 26,
        duration: 6,
        effect: "dramatically boosts attack and speed temporarily"
      }
    }
  },

  evilMorty: {
    light: {
      type: "normal",
      damage: 45,
      startup: 4,
      active: 3,
      recovery: 10,
      hitstun: 12,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 85,
      startup: 8,
      active: 4,
      recovery: 18,
      hitstun: 18,
      blockstun: 12,
      knockbackX: 6,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 70,
      startup: 7,
      active: 4,
      recovery: 16,
      hitstun: 20,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 12,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 60,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 80,
      startup: 9,
      active: 4,
      recovery: 14,
      hitstun: 18,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 13,
      airOK: true
    },
    specials: {
      manipulativeBlast: {
        type: "special",
        cost: 30,
        damage: 140,
        startup: 12,
        active: 5,
        recovery: 21,
        hitstun: 23,
        blockstun: 13,
        knockbackX: 9,
        knockbackY: -2,
        airOK: true,
        effect: "psychic energy attack"
      }
    },
    ultimate: {
      evilMortysTakeover: {
        type: "ultimate",
        cost: 100,
        startup: 18,
        active: 8,
        recovery: 28,
        duration: 8,
        effect: "increased speed, damage, and enemy debuffs"
      }
    }
  },

  rickPrime: {
    light: {
      type: "normal",
      damage: 55,
      startup: 4,
      active: 3,
      recovery: 10,
      hitstun: 13,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: 0,
      airOK: false
    },
    heavy: {
      type: "normal",
      damage: 95,
      startup: 8,
      active: 4,
      recovery: 18,
      hitstun: 19,
      blockstun: 12,
      knockbackX: 7,
      knockbackY: 1,
      airOK: false
    },
    upAttack: {
      type: "launcher",
      damage: 75,
      startup: 7,
      active: 4,
      recovery: 16,
      hitstun: 21,
      blockstun: 10,
      knockbackX: 2,
      knockbackY: -8,
      launch: 13,
      airOK: false
    },
    airAttack: {
      type: "air",
      damage: 65,
      startup: 5,
      active: 3,
      recovery: 10,
      hitstun: 14,
      blockstun: 8,
      knockbackX: 3,
      knockbackY: -2,
      airOK: true
    },
    downAir: {
      type: "spike",
      damage: 90,
      startup: 9,
      active: 4,
      recovery: 15,
      hitstun: 19,
      blockstun: 10,
      knockbackX: 1,
      knockbackY: 10,
      spike: 14,
      airOK: true
    },
    specials: {
      primePortalBlast: {
        type: "special",
        cost: 35,
        damage: 160,
        startup: 12,
        active: 5,
        recovery: 22,
        hitstun: 26,
        blockstun: 14,
        knockbackX: 11,
        knockbackY: -2,
        airOK: true,
        effect: "extremely powerful multiverse energy attack"
      }
    },
    ultimate: {
      rickPrimesSupremacy: {
        type: "ultimate",
        cost: 100,
        startup: 20,
        active: 10,
        recovery: 30,
        duration: 10,
        effect: "massive speed, attack boost, and random gadget chaos"
      }
    }
  }
};