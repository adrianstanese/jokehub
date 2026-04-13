// Run with: node seed-jokes.mjs YOUR_SITE_URL
// Example: node seed-jokes.mjs https://jokehub.vercel.app

const BASE = process.argv[2] || "https://jokehub.vercel.app";

const jokes = [
  { text: "Why don't scientists trust atoms? Because they make up everything!", author: "ScienceSteve", tags: ["#science", "#dad jokes"] },
  { text: "I told my wife she was drawing her eyebrows too high. She looked surprised.", author: "DadJokeDave", tags: ["#marriage", "#dad jokes"] },
  { text: "Why did the scarecrow win an award? Because he was outstanding in his field.", author: "FarmerFred", tags: ["#work", "#dad jokes"] },
  { text: "I'm afraid of elevators, so I take steps to avoid them.", author: "PunMaster", tags: ["#dad jokes"] },
  { text: "Did you hear about the claustrophobic astronaut? He just needed a little space.", author: "SpaceCase", tags: ["#science", "#dad jokes"] },
  { text: "I told a chemistry joke once. I didn't get much of a reaction.", author: "LabCoatLarry", tags: ["#science", "#school"] },
  { text: "Why can't a bicycle stand on its own? Because it's two tired.", author: "WheelieGood", tags: ["#dad jokes"] },
  { text: "What do you call a fake noodle? An impasta!", author: "ChefChuckle", tags: ["#food", "#dad jokes"] },
  { text: "I used to hate facial hair, but then it grew on me.", author: "BeardedBob", tags: ["#dad jokes"] },
  { text: "What do you call cheese that isn't yours? Nacho cheese.", author: "CheesyCarl", tags: ["#food", "#dad jokes"] },
  { text: "A programmer's wife tells him: 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes home with 12 loaves.", author: "CodeMonkey", tags: ["#programming", "#work"] },
  { text: "Why do bees have sticky hair? Because they use honeycombs.", author: "BuzzLightyear", tags: ["#animals", "#dad jokes"] },
  { text: "I got fired from the keyboard factory. I wasn't putting in enough shifts.", author: "TypeWriter", tags: ["#work", "#dad jokes"] },
  { text: "A doctor tells his patient: 'I have good news and bad news. The bad news is you have 24 hours to live. The good news is I forgot to call you yesterday.'", author: "DrHumor", tags: ["#doctors", "#dad jokes"] },
  { text: "What kind of shoes do frogs wear? Open toad.", author: "RibbitRick", tags: ["#animals", "#dad jokes"] },
  { text: "I wondered why the baseball was getting bigger. Then it hit me.", author: "HomeRunHank", tags: ["#sports", "#dad jokes"] },
  { text: "What do you call two monkeys that share an Amazon account? Prime mates.", author: "JungleJim", tags: ["#animals", "#dad jokes"] },
  { text: "My boss told me to have a good day. So I didn't go to work.", author: "LazyLisa", tags: ["#work", "#dad jokes"] },
  { text: "I used to be addicted to soap, but I'm clean now.", author: "SoapySam", tags: ["#dad jokes"] },
  { text: "Why did the coffee file a police report? It got mugged.", author: "CaffeineKing", tags: ["#food", "#dad jokes"] },
  { text: "Parallel lines have so much in common. It's a shame they'll never meet.", author: "MathMike", tags: ["#science", "#school"] },
  { text: "What did the ocean say to the beach? Nothing, it just waved.", author: "BeachBum", tags: ["#dad jokes"] },
  { text: "Dogs can't operate MRI machines, but cats-can.", author: "VetVictor", tags: ["#animals", "#doctors"] },
  { text: "I'm reading a book about anti-gravity. It's impossible to put down.", author: "BookwormBeth", tags: ["#science", "#dad jokes"] },
  { text: "What do you call a bear with no teeth? A gummy bear.", author: "CandyCathy", tags: ["#animals", "#food"] },
  { text: "The rotation of Earth really makes my day.", author: "AstroAndy", tags: ["#science", "#dad jokes"] },
  { text: "I tried to sue the airport for misplacing my luggage. I lost my case.", author: "TravelTom", tags: ["#dad jokes"] },
  { text: "What does a house wear? Address.", author: "FashionFiona", tags: ["#dad jokes"] },
  { text: "Why do dragons sleep during the day? So they can hunt knights.", author: "FantasyFrank", tags: ["#kids", "#dad jokes"] },
  { text: "I told my computer I needed a break, and now it won't stop sending me Kit-Kats.", author: "TechyTina", tags: ["#programming", "#food"] },
  { text: "Did you hear about the cheese factory that exploded in France? Da brie is everywhere.", author: "FrenchFry", tags: ["#food", "#dad jokes"] },
  { text: "My friend gave birth in her car on the way to the hospital and her husband named the kid Carson.", author: "PunnyPaul", tags: ["#dad jokes", "#kids"] },
  { text: "Two wind turbines stand in a field. One asks: 'What music are you into?' The other replies: 'I'm a huge metal fan.'", author: "GreenGary", tags: ["#science", "#dad jokes"] },
  { text: "Why did the picture go to jail? Because it was framed.", author: "ArtisticAmy", tags: ["#dad jokes"] },
  { text: "What do you call an elephant that doesn't matter? Irrelephant.", author: "ZooKeeper", tags: ["#animals", "#dad jokes"] },
  { text: "I used to steal soap, but I'm clean now.", author: "ReformedRob", tags: ["#dad jokes"] },
  { text: "Why couldn't the leopard play hide-and-seek? Because he was always spotted.", author: "SafariSue", tags: ["#animals", "#kids"] },
  { text: "What do Alexander the Great and Kermit the Frog have in common? The same middle name.", author: "HistoryHal", tags: ["#school", "#kids"] },
  { text: "I asked my dog what two minus two is. He said nothing.", author: "DogDad", tags: ["#animals", "#dad jokes"] },
  { text: "Why are basketball courts always wet? Because the players dribble.", author: "SlamDunkStan", tags: ["#sports", "#kids"] },
  { text: "What do you call advice from a cow? Beef tips.", author: "RanchRandy", tags: ["#animals", "#food"] },
  { text: "I just watched a documentary about beavers. It was the best dam show I've ever seen.", author: "NatureNick", tags: ["#animals", "#dad jokes"] },
  { text: "Why do you never see elephants hiding in trees? Because they're so good at it.", author: "WildlifeWanda", tags: ["#animals", "#kids"] },
  { text: "My wife asked me to stop singing Wonderwall. I said maybe.", author: "RockstarRon", tags: ["#marriage", "#dad jokes"] },
  { text: "What's brown and sticky? A stick.", author: "SimpleSimon", tags: ["#dad jokes", "#kids"] },
  { text: "Did you hear about the kidnapping at school? It's fine, he woke up.", author: "TeacherTed", tags: ["#school", "#kids"] },
  { text: "A furniture store keeps calling me. All I wanted was one night stand.", author: "BachelorBrad", tags: ["#dad jokes"] },
  { text: "Why can't you trust stairs? They're always up to something.", author: "CleverClaire", tags: ["#dad jokes"] },
  { text: "I used to be afraid of hurdles, but I got over it.", author: "TrackstarTracy", tags: ["#sports", "#dad jokes"] },
  { text: "Why don't skeletons ever go trick or treating? Because they have no body to go with.", author: "SpookySpencer", tags: ["#kids", "#dad jokes"] },
];

async function seed() {
  console.log(`🫙 Seeding 50 jokes to ${BASE}...\n`);
  let success = 0;
  let fail = 0;

  for (let i = 0; i < jokes.length; i++) {
    const j = jokes[i];
    try {
      const res = await fetch(`${BASE}/api/jokes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: j.text, author: j.author, lang: "EN", tags: j.tags }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(`  ✅ ${i + 1}/50 — @${j.author}: "${j.text.slice(0, 50)}..."`);
        success++;
      } else {
        console.log(`  ❌ ${i + 1}/50 — ${data.error}`);
        fail++;
      }
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`  ❌ ${i + 1}/50 — Network error`);
      fail++;
    }
  }

  console.log(`\n🎉 Done! ${success} jokes added, ${fail} failed.`);
}

seed();
