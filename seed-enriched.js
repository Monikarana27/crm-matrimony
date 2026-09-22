const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const religions = ["Hindu", "Muslim", "Sikh", "Jain", "Christian", "Parsi"];
const communities = {
  Hindu: ["Agarwal", "Brahmin", "Baniya", "Kshatriya", "Gupta", "Iyer", "Marwari", "Maheshwari", "Yadav", "Khatri", "Arora"],
  Muslim: ["Shia", "Sunni"],
  Sikh: ["Khatri", "Jat", "Arora"],
  Jain: ["Digambar", "Shwetambar"],
  Christian: ["Catholic", "Protestant"],
  Parsi: ["Parsi"],
};
const motherTongues = ["Hindi", "Punjabi", "Gujarati", "Marathi", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Urdu", "Oriya"];
const professions = ["Civil Servant", "Engineer", "Doctor", "Scientist", "CA/CS", "Businessman", "HR", "Lawyer", "IIT-IIM Grad", "Other Profession"];
const cities = ["Bangalore", "Delhi NCR", "Mumbai", "Chennai", "Chandigarh", "Hyderabad", "Lucknow", "Kolkata", "Pune", "Indore", "Ahmedabad", "Amritsar", "Surat", "Kochi", "Jalandhar", "Bhopal"];
const states = { "Bangalore": "Karnataka", "Delhi NCR": "Delhi", "Mumbai": "Maharashtra", "Chennai": "Tamil Nadu", "Chandigarh": "Punjab", "Hyderabad": "Andhra Pradesh", "Lucknow": "Uttar Pradesh", "Kolkata": "West Bengal", "Pune": "Maharashtra", "Indore": "Madhya Pradesh", "Ahmedabad": "Gujarat", "Amritsar": "Punjab", "Surat": "Gujarat", "Kochi": "Kerala", "Jalandhar": "Punjab", "Bhopal": "Madhya Pradesh" };
const incomeBrackets = ["5-8 LPA", "8-12 LPA", "12-18 LPA", "18-25 LPA", "25-40 LPA", "40+ LPA"];

const maleFirstNames = ["Aditya","Rohan","Vikram","Arjun","Karan","Rahul","Amit","Sanjay","Nikhil","Varun","Aryan","Siddharth","Manoj","Deepak","Rajesh","Ankit","Gaurav","Pranav","Yash","Kunal","Vivek","Suresh","Ravi"];
const femaleFirstNames = ["Priya","Neha","Anjali","Divya","Sneha","Pooja","Ritu","Anita","Kavya","Nisha","Rekha","Suman","Meera","Kritika","Isha","Aparna","Simran","Radhika","Swati","Tanvi","Bhavna","Shreya"];
const lastNames = ["Sharma","Verma","Gupta","Reddy","Rao","Singh","Kapoor","Mehta","Bansal","Agarwal","Malhotra","Iyer","Patel","Nair","Chopra"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDob(minAge, maxAge) {
  const age = minAge + Math.floor(Math.random() * (maxAge - minAge));
  const now = new Date();
  return new Date(now.getFullYear() - age, Math.floor(Math.random() * 12), 1 + Math.floor(Math.random() * 28));
}

async function main() {
  const totalCount = 45;
  const maleCount = 23;

  let mCounter = 1000;
  let fCounter = 1000;

  const createdProfiles = [];

  for (let i = 0; i < totalCount; i++) {
    const isMale = i < maleCount;
    const gender = isMale ? "MALE" : "FEMALE";
    const firstName = isMale ? pick(maleFirstNames) : pick(femaleFirstNames);
    const lastName = pick(lastNames);
    const religion = pick(religions);
    const community = pick(communities[religion]);
    const city = pick(cities);

    const profileCode = isMale ? `SGM${mCounter++}` : `SGF${fCounter++}`;
    const phone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

    const profile = await prisma.profile.create({
      data: {
        profileCode,
        phone,
        name: `${firstName} ${lastName}`,
        gender,
        dob: randomDob(24, 34),
        maritalStatus: "Never Married",
        height: isMale ? `5'${5 + Math.floor(Math.random() * 6)}"` : `5'${0 + Math.floor(Math.random() * 6)}"`,
        motherTongue: pick(motherTongues),
        nativePlace: city,
        country: "India",
        state: states[city],
        city,
        religion,
        caste: community,
        highestQualification: pick(["B.Tech", "MBA", "MBBS", "CA", "M.Sc", "LLB", "B.Com"]),
        profession: pick(professions),
        annualIncome: pick(incomeBrackets),
        diet: pick(["Vegetarian", "Non-Vegetarian", "Eggetarian"]),
        approvalStatus: "APPROVED",
        status: "UNASSIGNED",
      },
    });

    // Fully-filled partner preference — opposite gender's typical range
    const prefReligion = Math.random() < 0.75 ? religion : pick(religions); // mostly same religion, some open
    const prefCommunity = Math.random() < 0.6 ? community : pick(communities[prefReligion]);

    await prisma.partnerPreference.create({
      data: {
        profileId: profile.id,
        minAge: isMale ? 22 : 26,
        maxAge: isMale ? 30 : 36,
        maritalStatus: "Never Married",
        religion: prefReligion,
        caste: prefCommunity,
        city: Math.random() < 0.5 ? city : null, // half open to any city
        profession: Math.random() < 0.4 ? pick(professions) : null,
        annualIncome: pick(incomeBrackets),
        diet: pick(["Vegetarian", "Non-Vegetarian", "No preference"]),
      },
    });

    createdProfiles.push(profile);
  }

  console.log(`Created ${createdProfiles.length} profiles with full preferences.`);

  // Mark 10 as paid clients (5 male, 5 female) — same as before
  let plan = await prisma.plan.findFirst({ where: { active: true } });
  if (!plan) {
    plan = await prisma.plan.create({ data: { name: "Premium Match", price: 25000, durationDays: 180, active: true } });
  }

  const males = createdProfiles.filter((p) => p.gender === "MALE").slice(0, 5);
  const females = createdProfiles.filter((p) => p.gender === "FEMALE").slice(0, 5);

  for (const profile of [...males, ...females]) {
    await prisma.subscription.create({
      data: {
        profileId: profile.id,
        planId: plan.id,
        status: "ACTIVE",
        startDate: new Date(),
        endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`Paid client: ${profile.name} (${profile.profileCode})`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
