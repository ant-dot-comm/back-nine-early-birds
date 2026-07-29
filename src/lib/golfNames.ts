// Golf display-name generator data + helpers.
// A standard name is: <Adjective> <Golf noun> <Nickname>, e.g. "Whiskey Driver Daddy".
// Secret (ultra-rare) names are single titles, only obtainable via a signup roll
// or unlocked as an achievement on the account page. Edit these lists freely.

export const ADJECTIVES = [
  "Ace", "Aggressive", "Airborne", "Alcoholic", "Almost", "Angry", "Backspin", "Bad", "Baller", "Bandit",
  "Beer", "Birdie", "Blackout", "Bogey", "Breakfast", "Broken", "Bruised", "Buzzed", "Captain", "Cart",
  "Cart Path", "Casual", "Chaotic", "Chunky", "Clutch", "Cold", "Confident", "Cursed", "Dangerous", "Day Drinking",
  "Deadly", "Dirty", "Double", "Drunken", "Duff", "Eagle", "Extra", "Fairway", "Fast", "Fearless",
  "Feral", "Flawless", "Flushed", "Fore", "Fresh", "Friday", "Full Send", "Gimme", "Golden", "Greasy",
  "Greenside", "Grip It", "Half Send", "Hammered", "Happy", "Hardcore", "Hazard", "High", "Hole Hunter", "Hook",
  "Hot", "Hungover", "Ice Cold", "Iron", "Jackpot", "Juiced", "King", "Legendary", "Lip Out", "Locked In",
  "Long Drive", "Lucky", "Master", "Maximum", "Menace", "Mulligan", "No Glove", "OB", "Old Man", "Outta Bounds",
  "Par", "Pin Seeking", "Pure", "Range", "Reckless", "Rough", "Sand", "Savage", "Scratch", "Send It",
  "Shank", "Short Game", "Sleeper", "Sunday", "Tap In", "Three Putt", "Turbo", "Uncrustable", "Vodka", "Weekend",
  "Whiskey", "Wild", "Worm Burner", "Yips",
] as const;

export const NOUNS = [
  "Driver", "Putter", "Wedge", "Iron", "Hybrid", "Wood", "Ball", "Cart", "Flagstick", "Pin",
  "Cup", "Green", "Fairway", "Rough", "Bunker", "Hazard", "Water", "Tee", "Divot", "Range",
  "Mulligan", "Breakfast Ball", "Provisional", "Scorecard", "Cart Girl", "Beer Cart", "GPS", "Bushes", "Trees", "Bridge",
  "Creek", "Clubhouse", "Snack Shack", "Marshal", "Starter", "Birdie", "Bogey", "Double Bogey", "Triple Bogey", "Par Save",
  "Skull Shot", "Chunk", "Blade", "Hook", "Slice", "Duck Hook", "Push", "Pull", "Top", "Thin Shot",
  "Flop Shot", "Texas Wedge", "Lag Putt", "Tap In", "Lip Out", "Hosel Rocket", "Rocket", "Missile", "Bomb", "Nuke",
  "Laser", "Cannon", "Hammer", "Sausage", "Hot Dog", "Beer", "Whiskey", "Shotgun", "Cigar", "Sunburn",
  "Hangover", "Rain Check", "Golf Glove", "Spike", "Umbrella", "Cooler", "Ice Chest", "Wallet", "Score", "Skins",
  "Nassau", "Money Ball", "Closest Pin", "Longest Drive", "Money Putt", "Birdie Juice", "Cart Keys", "Air Horn", "Range Bucket", "Grass",
  "Pebble", "Pine Straw", "Club Cleaner", "Ball Marker", "Towel",
] as const;

export const NICKNAMES = [
  "Assassin", "Bandit", "Baron", "Beast", "Big Dog", "Boss", "Bruiser", "Bubba", "Captain", "Champion",
  "Chaos", "Chief", "Chiller", "Clapper", "Cleaner", "Collector", "Cowboy", "Crusher", "Daddy", "Dealer",
  "Degenerate", "Destroyer", "Doctor", "Donkey", "Dude", "Enforcer", "Expert", "Fiasco", "Fiend", "Freak",
  "Gangster", "General", "Gentleman", "Goblin", "Goose", "Gremlin", "Grinder", "Gunslinger", "Hero", "Hitman",
  "Hooligan", "Hustler", "Inspector", "Juggernaut", "Junkie", "King", "Legend", "Machine", "Madman", "Magician",
  "Mayor", "Mechanic", "Menace", "Monster", "MVP", "Nightmare", "Ninja", "Nut", "Operator", "Outlaw",
  "Overlord", "Papi", "Phantom", "Pirate", "Predator", "President", "Professional", "Professor", "Psycho", "Ranger",
  "Reaper", "Renegade", "Ripper", "Rookie", "Savage", "Sheriff", "Shooter", "Slayer", "Sniper", "Specialist",
  "Squire", "Stud", "Survivor", "Terminator", "The Great", "The Problem", "The Worst", "Titan", "Troublemaker", "Uncle",
  "Villain", "Warrior", "Whisperer", "Wizard", "Wolf", "Workhorse", "Wrecking Ball", "Yeti",
] as const;

/** Ordered — achievement unlocks reveal these from the top down. */
export const SECRET_NAMES = [
  "The Chosen One", "Golf Jesus", "Lord of the Links", "Putter Whisperer", "The Beverage Cart",
  "Patron Saint of Mulligans", "King of Pace of Play", "The Sandman", "Mr. Fore Right", "The Breakfast Ball",
  "Course Record Holder", "Grip Reaper", "Cart Mafia", "Putt Daddy Supreme", "Birdie Factory",
  "Bogey Collector", "Captain Lip Out", "CEO of Three Putts", "Greenside Goblin", "The Beverage Bandit",
  "Lord Bogey", "Shank Commander", "Commissioner of Chaos",
] as const;

export interface GolfNameParts {
  adjective: string;
  noun: string;
  nickname: string;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomGolfName(): GolfNameParts {
  return { adjective: pick(ADJECTIVES), noun: pick(NOUNS), nickname: pick(NICKNAMES) };
}

export function formatGolfName(p: GolfNameParts): string {
  return `${p.adjective} ${p.noun} ${p.nickname}`.replace(/\s+/g, " ").trim();
}
