import { CONFIG } from "./config.js";

// Compact first-name lists used only as a fallback guess.
// Unisex / ambiguous names are omitted so we fall through to neutral/random.
const FEMALE_NAMES = new Set([
  "aaliyah", "abby", "abigail", "ada", "adel", "adele", "adeline", "aisha",
  "alana", "alejandra", "alessandra", "alexa", "alexandra", "alice", "alicia",
  "alina", "alisha", "alison", "allison", "alya", "alyaa", "amal", "amanda",
  "amara", "amelia", "amina", "aminah", "amira", "amy", "ana", "anastasia",
  "andrea", "angel", "angela", "angelica", "anika", "anita", "anjali", "anna",
  "annabelle", "anne", "annie", "ananya", "aria", "ariana", "arianna", "asha",
  "ashley", "asia", "athena", "aubrey", "audrey", "aurora", "ava", "avery",
  "ayesha", "ayla", "barbara", "beatrice", "bella", "beth", "bianca", "brenda",
  "brianna", "britney", "brittany", "brooke", "camila", "carla", "carly",
  "carmen", "carolina", "caroline", "carolyn", "cassandra", "catherine",
  "cathy", "cecilia", "celine", "charlotte", "chelsea", "chloe", "christina",
  "christine", "cindy", "claire", "clara", "claudia", "crystal", "daisy",
  "dakota", "dana", "daniela", "daria", "deborah", "denise", "diana", "diane",
  "dina", "donna", "dora", "doris", "elena", "elisa", "elisabeth", "elise",
  "eliza", "elizabeth", "ella", "elle", "ellen", "ellie", "eloise", "elsa",
  "emilia", "emily", "emma", "erica", "erika", "erin", "esther", "eva",
  "evangelina", "evelyn", "farah", "fatima", "fatimah", "fatma", "fiona",
  "florence", "frances", "francesca", "freya", "gabriela", "gabriella",
  "georgia", "gina", "giulia", "grace", "hailey", "hana", "hanan", "hannah",
  "harper", "hasna", "hazel", "heather", "heidi", "helen", "helena", "hiba",
  "hira", "holly", "ibtihal", "iman", "ingrid", "irene", "iris", "isabel",
  "isabella", "isabelle", "isha", "isla", "ivy", "jackie", "jacqueline",
  "jade", "jamila", "jana", "jane", "janet", "janice", "jasmine", "jean",
  "jenna", "jennifer", "jenny", "jessica", "jill", "joanna", "jocelyn",
  "johanna", "josephine", "joy", "joyce", "julia", "juliana", "julie",
  "juliet", "kaitlyn", "kamila", "kara", "karen", "karina", "karla", "kate",
  "katelyn", "katherine", "kathleen", "kathryn", "kathy", "katie", "katrina",
  "kayla", "keira", "kelsey", "kenya", "khadija", "khadijah", "kim",
  "kimberly", "kiran", "kristen", "kristin", "kristina", "laila", "lana",
  "lara", "larissa", "laura", "lauren", "lauryn", "layla", "leah", "leila",
  "lena", "leona", "leslie", "lia", "lian", "liliana", "lillian", "lily",
  "lina", "linda", "lindsay", "lisa", "lola", "lora", "lorelai", "louise",
  "lucia", "lucy", "luna", "luz", "lydia", "lynn", "macy", "maddie",
  "madeleine", "madeline", "madison", "maha", "maia", "mais", "maisa",
  "malaika", "mandy", "mara", "margaret", "maria", "mariah", "marian",
  "mariam", "marianne", "marie", "marilyn", "marina", "marion", "marisa",
  "marisol", "marwa", "mary", "maryam", "maya", "megan", "meghan", "mehwish",
  "meera", "melanie", "melinda", "melissa", "melody", "mia", "michaela",
  "michelle", "mila", "mina", "mira", "miranda", "miriam", "mona", "monica",
  "monique", "morgan", "mya", "mylee", "nadia", "nadine", "nancy", "naomi",
  "natalia", "natalie", "natasha", "nawal", "naya", "neha", "nicole", "nina",
  "noelle", "noor", "nora", "noura", "nur", "olga", "olivia", "paige",
  "pamela", "paola", "patricia", "paula", "paulina", "pearl", "penelope",
  "phoebe", "piper", "pooja", "priya", "priyanka", "quinn", "rabia", "rachel",
  "rafa", "rania", "rebeca", "rebecca", "reema", "rehana", "rena", "renee",
  "riley", "rim", "rita", "riya", "roberta", "rosa", "rosalie", "rose",
  "rosie", "roxane", "ruby", "ruth", "sabrina", "safa", "safaa", "safaah",
  "sakina", "sally", "salma", "samantha", "sandra", "sara", "sarah", "sari",
  "sasha", "savanna", "savannah", "scarlett", "selena", "selma", "sharon",
  "sheila", "shilla", "shirley", "sidra", "sienna", "simran", "skye", "sofia",
  "sonia", "sophia", "sophie", "stacy", "stella", "stephanie", "susan",
  "susanna", "sydney", "sylvia", "tania", "tanya", "tara", "tasneem", "taylor",
  "teresa", "tiffany", "tina", "tracy", "uma", "valentina", "valeria",
  "vanessa", "veronica", "victoria", "viola", "violet", "vivian", "wafa",
  "wendy", "willa", "yasmin", "yasmeen", "yasmine", "yolanda", "yusra",
  "zahra", "zainab", "zara", "zoe", "zoey", "zoya",
]);

const MALE_NAMES = new Set([
  "aamir", "aaron", "abbas", "abdallah", "abdul", "abdullah", "abe", "adam",
  "adel", "aditya", "adrian", "ahmad", "ahmed", "ajay", "alan", "albert",
  "alec", "alejandro", "alessandro", "alex", "alexander", "alfie", "ali",
  "allen", "ammar", "amir", "amit", "amjad", "amos", "ander", "anderson",
  "andre", "andreas", "andrew", "andy", "angel", "ankit", "anthony", "antonio",
  "arjun", "arthur", "arturo", "asad", "ashraf", "ashton", "atif", "austin",
  "ayden", "ayman", "aziz", "barry", "ben", "benjamin", "bilal", "billy",
  "bob", "bobby", "brad", "bradley", "brandon", "brian", "bruce", "bruno",
  "bryan", "caleb", "calvin", "cameron", "carl", "carlos", "carter", "cedric",
  "charles", "charlie", "chen", "chris", "christian", "christopher", "claude",
  "clayton", "cody", "colin", "connor", "corey", "craig", "curtis", "dale",
  "damian", "damien", "dan", "daniel", "danny", "darren", "dave", "david",
  "dean", "dennis", "derek", "diego", "dominic", "donald", "douglas", "drew",
  "duncan", "dustin", "dylan", "eddie", "edgar", "eduardo", "edward", "edwin",
  "eli", "elias", "elijah", "emilio", "emir", "emmanuel", "eric", "erik",
  "ethan", "eugene", "evan", "fabio", "fahad", "faisal", "farhan", "farid",
  "felix", "fernando", "finn", "francis", "francisco", "frank", "franklin",
  "fred", "frederick", "gabriel", "gary", "gavin", "george", "gerald",
  "gianni", "gilbert", "gordon", "graham", "greg", "gregory", "guillaume",
  "gustavo", "hamza", "hari", "harold", "harry", "hasan", "hassan", "hector",
  "henry", "herbert", "herman", "howard", "hudson", "hugh", "hugo", "hussain",
  "hussein", "ian", "ibrahim", "idris", "ignacio", "ilyas", "imran", "isaac",
  "ismail", "ivan", "jack", "jackson", "jacob", "jacques", "jake", "james",
  "jamie", "jared", "jason", "javier", "jay", "jeff", "jeffrey", "jeremy",
  "jerome", "jerry", "jesse", "jesus", "jim", "jimmy", "joao", "joe", "joel",
  "john", "johnny", "jon", "jonathan", "jordan", "jorge", "jose", "joseph",
  "josh", "joshua", "juan", "julian", "julio", "justin", "kamal", "karl",
  "karthik", "keith", "ken", "kenneth", "kevin", "khalid", "khaled", "kirk",
  "krishna", "kurt", "kyle", "lance", "larry", "lawrence", "leo", "leon",
  "leonard", "leonardo", "levi", "liam", "lloyd", "logan", "lorenzo", "louis",
  "luca", "lucas", "luis", "luke", "malcolm", "malik", "manuel", "marc",
  "marco", "marcus", "mario", "mark", "martin", "mario", "mason", "mateo",
  "matheus", "mathis", "matt", "matthew", "maurice", "max", "maximilian",
  "micah", "michael", "micheal", "miguel", "mike", "miles", "mohamed",
  "mohammad", "mohammed", "moises", "morris", "muhammad", "mustafa", "nabil",
  "nadeem", "nathan", "nathaniel", "neil", "nelson", "nicholas", "nick",
  "nicolas", "nigel", "noah", "nolan", "omar", "osama", "oscar", "osman",
  "otto", "owais", "owen", "pablo", "patrick", "patrik", "paul", "pedro",
  "peter", "phil", "philip", "phillip", "pierre", "preston", "qasim", "rafael",
  "raheem", "rahul", "ralph", "rami", "randy", "rashid", "rayan", "rayyan",
  "raymond", "ricardo", "richard", "rick", "ricky", "riley", "robert",
  "roberto", "robin", "rodney", "roger", "rohan", "rohit", "roland", "roman",
  "ron", "ronald", "rory", "roy", "ruben", "russell", "ryan", "saad", "said",
  "sakib", "salah", "salim", "sam", "sami", "samuel", "sander", "santiago",
  "scott", "sean", "sebastian", "sergio", "seth", "shahid", "shahzad",
  "shane", "shaun", "shawn", "simon", "solomon", "stanley", "stefan",
  "stephan", "stephen", "steve", "steven", "stuart", "sultan", "suresh",
  "syed", "tariq", "ted", "terry", "theo", "theodore", "thomas", "tim",
  "timothy", "tobias", "tom", "tommy", "tony", "travis", "trevor", "troy",
  "tyler", "umar", "usman", "victor", "vincent", "vince", "vikram", "wade",
  "walter", "warren", "wayne", "william", "wilson", "woody", "wyatt", "xavier",
  "yahya", "yousef", "youssef", "yusuf", "zachary", "zach", "zaid", "zain",
  "zakaria", "zane",
]);

function normalizeToken(raw) {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z\s\u00c0-\u024f]/g, " ")
    .trim();
}

function tokenizeNickname(nickname) {
  const cleaned = normalizeToken(nickname);
  if (!cleaned) return [];
  return cleaned.split(/\s+/).filter(Boolean);
}

function wordSet(list) {
  return new Set(list.map((w) => normalizeToken(w)).filter(Boolean));
}

export function genderFromComment(comment, cfg = CONFIG.gender) {
  const text = normalizeToken(comment);
  if (!text) return null;
  const tokens = new Set(text.split(/\s+/));
  // Single-letter aliases (m/f/g/b) only count as a whole comment or token.
  const female = wordSet(cfg.femaleWords);
  const male = wordSet(cfg.maleWords);
  for (const token of tokens) {
    if (female.has(token) && !male.has(token)) return "female";
    if (male.has(token) && !female.has(token)) return "male";
  }
  return null;
}

export function genderFromNickname(nickname) {
  const tokens = tokenizeNickname(nickname);
  for (const token of tokens) {
    if (FEMALE_NAMES.has(token) && !MALE_NAMES.has(token)) return "female";
    if (MALE_NAMES.has(token) && !FEMALE_NAMES.has(token)) return "male";
  }
  return null;
}

/**
 * Resolve a fighter presentation.
 * Priority: explicit chat pick, existing pick, first-name guess, then fallback.
 */
export function resolveGender({ comment, nickname, existing } = {}, cfg = CONFIG.gender) {
  const fromComment = genderFromComment(comment, cfg);
  if (fromComment) return { gender: fromComment, source: "comment" };
  if (existing === "female" || existing === "male") {
    return { gender: existing, source: "saved" };
  }
  const fromName = genderFromNickname(nickname);
  if (fromName) return { gender: fromName, source: "name" };
  if (cfg.fallback === "neutral") return { gender: "neutral", source: "fallback" };
  // Deterministic "random" so the same viewer keeps the same look if they rejoin
  // before we have a saved gender.
  const key = String(nickname || "");
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const gender = Math.abs(hash) % 2 === 0 ? "female" : "male";
  return { gender, source: "random" };
}

export function teamFromComment(comment, cfg = CONFIG.teams) {
  const text = normalizeToken(comment);
  if (!text) return null;
  const tokens = new Set(text.split(/\s+/));
  for (const token of tokens) {
    if (cfg.roseWords.includes(token)) return "rose";
    if (cfg.skyWords.includes(token)) return "sky";
  }
  return null;
}
