// registry.js — RESOURCE_REGISTRY and CRAFT_REGISTRY data

export const RESOURCE_REGISTRY = [
  {
    id: "water_1",
    type: "water",
    position: { x: 2, y: 3 },
    supply: 4,
    tileFile: "rpgTile010.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_water",
      title: "Gather Water",
      description: "Gather water from a nearby water source. Adds 2 water to Erwin's inventory. Erwin must be near a water source.",
      yield: { item: "water", amount: 2 },
      tip: "Moving water is safer to drink than still water."
    }
  },
  {
    id: "water_2",
    type: "water",
    position: { x: 12, y: 11 },
    supply: 4,
    tileFile: "rpgTile010.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_water",
      title: "Gather Water",
      description: "Gather water from a nearby water source. Adds 2 water to Erwin's inventory. Erwin must be near a water source.",
      yield: { item: "water", amount: 2 },
      tip: "Moving water is safer to drink than still water."
    }
  },
  {
    id: "berry_1",
    type: "berry",
    position: { x: 5, y: 1 },
    supply: 5,
    tileFile: "rpgTile157.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_food",
      title: "Gather Food",
      description: "Gather berries from a nearby bush. Adds 3 berries to Erwin's inventory. Erwin must be near a berry bush.",
      yield: { item: "berries", amount: 3 },
      tip: "Dark-colored berries in the wild can be poisonous. These ones are safe."
    }
  },
  {
    id: "berry_2",
    type: "berry",
    position: { x: 10, y: 13 },
    supply: 5,
    tileFile: "rpgTile157.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_food",
      title: "Gather Food",
      description: "Gather berries from a nearby bush. Adds 3 berries to Erwin's inventory. Erwin must be near a berry bush.",
      yield: { item: "berries", amount: 3 },
      tip: "Dark-colored berries in the wild can be poisonous. These ones are safe."
    }
  },
  {
    id: "tree_1",
    type: "tree",
    position: { x: 1, y: 8 },
    supply: 6,
    tileFile: "rpgTile155.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "chop_wood",
      title: "Chop Wood",
      description: "Chop wood from a nearby tree. Adds 2 wood to Erwin's inventory. Erwin must be near a tree.",
      yield: { item: "wood", amount: 2 },
      tip: "Green wood burns with smoke. Dry wood burns clean."
    }
  },
  {
    id: "tree_2",
    type: "tree",
    position: { x: 8, y: 3 },
    supply: 6,
    tileFile: "rpgTile155.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "chop_wood",
      title: "Chop Wood",
      description: "Chop wood from a nearby tree. Adds 2 wood to Erwin's inventory. Erwin must be near a tree.",
      yield: { item: "wood", amount: 2 },
      tip: "Green wood burns with smoke. Dry wood burns clean."
    }
  },
  {
    id: "tree_3",
    type: "tree",
    position: { x: 13, y: 7 },
    supply: 6,
    tileFile: "rpgTile155.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "chop_wood",
      title: "Chop Wood",
      description: "Chop wood from a nearby tree. Adds 2 wood to Erwin's inventory. Erwin must be near a tree.",
      yield: { item: "wood", amount: 2 },
      tip: "Green wood burns with smoke. Dry wood burns clean."
    }
  },
  {
    id: "stone_1",
    type: "stone",
    position: { x: 4, y: 12 },
    supply: 4,
    tileFile: "rpgTile131.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "mine_stone",
      title: "Mine Stone",
      description: "Mine stone from a nearby deposit. Adds 2 stone to Erwin's inventory. Erwin must be near a stone deposit.",
      yield: { item: "stone", amount: 2 },
      tip: "Flat stones make good knife edges when you chip them right."
    }
  },
  {
    id: "stone_2",
    type: "stone",
    position: { x: 11, y: 5 },
    supply: 4,
    tileFile: "rpgTile131.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "mine_stone",
      title: "Mine Stone",
      description: "Mine stone from a nearby deposit. Adds 2 stone to Erwin's inventory. Erwin must be near a stone deposit.",
      yield: { item: "stone", amount: 2 },
      tip: "Flat stones make good knife edges when you chip them right."
    }
  },
  {
    id: "vine_1",
    type: "vine",
    position: { x: 6, y: 10 },
    supply: 3,
    tileFile: "rpgTile161.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "collect_vine",
      title: "Collect Vine",
      description: "Collect vines to make rope. Adds 1 rope to Erwin's inventory. Erwin must be near a vine.",
      yield: { item: "rope", amount: 1 },
      tip: "Twist two vines together. A twisted rope is three times stronger."
    }
  },
  {
    id: "vine_2",
    type: "vine",
    position: { x: 9, y: 2 },
    supply: 3,
    tileFile: "rpgTile161.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "collect_vine",
      title: "Collect Vine",
      description: "Collect vines to make rope. Adds 1 rope to Erwin's inventory. Erwin must be near a vine.",
      yield: { item: "rope", amount: 1 },
      tip: "Twist two vines together. A twisted rope is three times stronger."
    }
  },
  {
    id: "herb_1",
    type: "herb",
    position: { x: 3, y: 6 },
    supply: 4,
    tileFile: "rpgTile159.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_herbs",
      title: "Gather Herbs",
      description: "Gather herbs from a nearby patch. Adds 2 herbs to Erwin's inventory. Erwin must be near an herb patch.",
      yield: { item: "herbs", amount: 2 },
      tip: "Plantain leaves can stop bleeding when pressed on a wound."
    }
  },
  {
    id: "herb_2",
    type: "herb",
    position: { x: 12, y: 8 },
    supply: 4,
    tileFile: "rpgTile159.png",
    depletedTileFile: "rpgTile004.png",
    tool: {
      name: "gather_herbs",
      title: "Gather Herbs",
      description: "Gather herbs from a nearby patch. Adds 2 herbs to Erwin's inventory. Erwin must be near an herb patch.",
      yield: { item: "herbs", amount: 2 },
      tip: "Plantain leaves can stop bleeding when pressed on a wound."
    }
  }
];

export const CRAFT_REGISTRY = [
  {
    name: "eat_food",
    title: "Eat Food",
    description: "Eat berries to restore 10 health. Needs at least 1 berries in inventory.",
    requires: { berries: 1 },
    consumes: { berries: 1 },
    healthChange: 10,
    triggersWin: false,
    tip: "Eat small amounts often. A full stomach in the wild slows you down."
  },
  {
    name: "drink_water",
    title: "Drink Water",
    description: "Drink water to restore 8 health. Needs at least 1 water in inventory.",
    requires: { water: 1 },
    consumes: { water: 1 },
    healthChange: 8,
    triggersWin: false,
    tip: "Drink before you feel thirsty. Thirst means you are already dehydrated."
  },
  {
    name: "make_medicine",
    title: "Make Medicine",
    description: "Crush herbs with water to make medicine. Restores 25 health. Needs 2 herbs and 1 water.",
    requires: { herbs: 2, water: 1 },
    consumes: { herbs: 2, water: 1 },
    healthChange: 25,
    triggersWin: false,
    tip: "Boiled herbs lose some strength. Crush them raw for a stronger remedy."
  },
  {
    name: "craft_shelter",
    title: "Craft Shelter",
    description: "Build a shelter to survive the night. Needs 5 wood, 3 stone, and 2 rope. This wins the game.",
    requires: { wood: 5, stone: 3, rope: 2 },
    consumes: { wood: 5, stone: 3, rope: 2 },
    healthChange: 0,
    triggersWin: true,
    tip: "A shelter facing away from the wind stays warmer at night."
  }
];
