/**
 * Prisma Seed Script
 * ------------------
 * Loads a deterministic demo dataset: no randomness, so dev, CI and a
 * reviewer's machine all end up with byte-identical data and the same search,
 * filter and pagination results.
 *
 * Run with:  npm run db:seed
 *
 * ⚠️  DESTRUCTIVE: this truncates every table before inserting. It is a
 * development/demo tool and must never be run against production data.
 *
 * ⚠️  The college names are real institutions, but every figure — fees,
 * packages, ratings, placement rates, review text — is INVENTED for
 * demonstration. None of it is verified and none of it should be used to make
 * a real admission decision.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Money and ratings are DECIMAL columns. Constructing a Prisma.Decimal (rather
 * than passing a JS number) keeps the seeded values exact — a float cannot
 * represent every rupee amount precisely.
 */
function d(value: number) {
  return new Prisma.Decimal(value);
}

// ──────────────────────────────────────────────────────────────
// College seed data — 28 colleges across India (names real, figures invented)
// ──────────────────────────────────────────────────────────────
const collegeData = [
  {
    name: "Indian Institute of Technology Bombay",
    slug: "iit-bombay",
    location: "Mumbai, Maharashtra",
    city: "Mumbai",
    state: "Maharashtra",
    description:
      "IIT Bombay is one of India's premier engineering institutions, known for cutting-edge research, world-class faculty, and an impressive industry network. Established in 1958, it consistently ranks among the top engineering colleges in India.",
    type: "Public",
    establishedYear: 1958,
    fees: d(250000),
    rating: d(4.8),
    averagePlacement: d(2200000),
    highestPlacement: d(25000000),
    totalStudents: 10000,
    accreditation: "NAAC A++",
    website: "https://www.iitb.ac.in",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(250000), seats: 120 },
      { name: "Electrical Engineering", degree: "B.Tech", duration: "4 years", fees: d(250000), seats: 100 },
      { name: "Mechanical Engineering", degree: "B.Tech", duration: "4 years", fees: d(250000), seats: 80 },
      { name: "Data Science & AI", degree: "M.Tech", duration: "2 years", fees: d(180000), seats: 60 },
    ],
    placements: [
      { year: 2024, averagePackage: d(2200000), highestPackage: d(25000000), placementRate: d(98.5), totalPlaced: 850, topRecruiter: "Google" },
      { year: 2023, averagePackage: d(2000000), highestPackage: d(22000000), placementRate: d(97.8), totalPlaced: 820, topRecruiter: "Microsoft" },
    ],
    reviews: [
      { rating: 5, title: "Best tech college in India", body: "Incredible faculty, amazing peer network, and placement support is unmatched. The infrastructure is world-class and the opportunities you get here are endless." },
      { rating: 5, title: "Changed my life", body: "IIT Bombay shaped me as an engineer and a person. The research culture, the startups from the campus, and the alumni network are simply outstanding." },
      { rating: 4, title: "High pressure but worth it", body: "The workload is intense, but the quality of learning and the brand value you earn makes every sleepless night worthwhile." },
    ],
  },
  {
    name: "Indian Institute of Technology Delhi",
    slug: "iit-delhi",
    location: "New Delhi, Delhi",
    city: "New Delhi",
    state: "Delhi",
    description:
      "IIT Delhi, established in 1961, is a world-renowned institution offering excellence in engineering, technology, and management. Known for its strong research output and exceptional placement record.",
    type: "Public",
    establishedYear: 1961,
    fees: d(230000),
    rating: d(4.7),
    averagePlacement: d(2100000),
    highestPlacement: d(24000000),
    totalStudents: 8500,
    accreditation: "NAAC A++",
    website: "https://home.iitd.ac.in",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(230000), seats: 110 },
      { name: "Electrical Engineering", degree: "B.Tech", duration: "4 years", fees: d(230000), seats: 90 },
      { name: "Civil Engineering", degree: "B.Tech", duration: "4 years", fees: d(230000), seats: 80 },
      { name: "Artificial Intelligence", degree: "M.Tech", duration: "2 years", fees: d(160000), seats: 50 },
    ],
    placements: [
      { year: 2024, averagePackage: d(2100000), highestPackage: d(24000000), placementRate: d(97.2), totalPlaced: 780, topRecruiter: "Amazon" },
      { year: 2023, averagePackage: d(1950000), highestPackage: d(21000000), placementRate: d(96.5), totalPlaced: 750, topRecruiter: "Goldman Sachs" },
    ],
    reviews: [
      { rating: 5, title: "Top-notch education", body: "IIT Delhi offers unparalleled engineering education with world-class research opportunities and fantastic placement support." },
      { rating: 4, title: "Great campus, competitive environment", body: "The campus life is vibrant, competitions are plentiful, and the exposure to startups and corporates is excellent." },
    ],
  },
  {
    name: "Indian Institute of Management Ahmedabad",
    slug: "iim-ahmedabad",
    location: "Ahmedabad, Gujarat",
    city: "Ahmedabad",
    state: "Gujarat",
    description:
      "IIM Ahmedabad is India's top business school, globally recognized for producing outstanding leaders in business and management. The PGP program is among the most sought-after MBA programs in Asia.",
    type: "Public",
    establishedYear: 1961,
    fees: d(2400000),
    rating: d(4.9),
    averagePlacement: d(3500000),
    highestPlacement: d(80000000),
    totalStudents: 1100,
    accreditation: "AMBA",
    website: "https://www.iima.ac.in",
    courses: [
      { name: "Post Graduate Programme in Management", degree: "MBA", duration: "2 years", fees: d(2400000), seats: 400 },
      { name: "Executive MBA", degree: "MBA", duration: "1 year", fees: d(3200000), seats: 60 },
    ],
    placements: [
      { year: 2024, averagePackage: d(3500000), highestPackage: d(80000000), placementRate: d(100), totalPlaced: 400, topRecruiter: "McKinsey" },
      { year: 2023, averagePackage: d(3200000), highestPackage: d(70000000), placementRate: d(100), totalPlaced: 380, topRecruiter: "BCG" },
    ],
    reviews: [
      { rating: 5, title: "Worth every rupee", body: "The brand value, alumni network, and quality of education at IIMA is simply unmatched. Best investment of my life." },
      { rating: 5, title: "Case method is transformative", body: "The case-study based learning model really prepares you for the real world in a way no textbook ever could." },
    ],
  },
  {
    name: "BITS Pilani",
    slug: "bits-pilani",
    location: "Pilani, Rajasthan",
    city: "Pilani",
    state: "Rajasthan",
    description:
      "BITS Pilani is one of India's top private engineering institutions, famous for its flexible curriculum, Practice School internship program, and exceptional alumni network spanning global tech companies.",
    type: "Deemed",
    establishedYear: 1964,
    fees: d(550000),
    rating: d(4.5),
    averagePlacement: d(1600000),
    highestPlacement: d(15000000),
    totalStudents: 7000,
    accreditation: "NAAC A",
    website: "https://www.bits-pilani.ac.in",
    courses: [
      { name: "Computer Science", degree: "B.E.", duration: "4 years", fees: d(550000), seats: 150 },
      { name: "Electronics & Instrumentation", degree: "B.E.", duration: "4 years", fees: d(550000), seats: 100 },
      { name: "Biotechnology", degree: "B.E.", duration: "4 years", fees: d(550000), seats: 60 },
      { name: "MBA", degree: "MBA", duration: "2 years", fees: d(480000), seats: 80 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1600000), highestPackage: d(15000000), placementRate: d(92.0), totalPlaced: 1100, topRecruiter: "Qualcomm" },
      { year: 2023, averagePackage: d(1450000), highestPackage: d(13500000), placementRate: d(91.5), totalPlaced: 1050, topRecruiter: "Texas Instruments" },
    ],
    reviews: [
      { rating: 5, title: "Dual degree is a game changer", body: "The flexibility to pursue two degrees simultaneously while doing an industry internship through PS is something unique to BITS." },
      { rating: 4, title: "Great peer learning culture", body: "The student-driven culture at BITS is exceptional. You learn as much from your peers as from professors." },
    ],
  },
  {
    name: "National Institute of Technology Trichy",
    slug: "nit-trichy",
    location: "Tiruchirappalli, Tamil Nadu",
    city: "Tiruchirappalli",
    state: "Tamil Nadu",
    description:
      "NIT Trichy is consistently ranked as one of the top NITs in India. It offers a wide range of engineering programs with excellent faculty and an active placement cell with consistent corporate tie-ups.",
    type: "Public",
    establishedYear: 1964,
    fees: d(150000),
    rating: d(4.4),
    averagePlacement: d(1200000),
    highestPlacement: d(9500000),
    totalStudents: 8000,
    accreditation: "NAAC A++",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(150000), seats: 120 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(150000), seats: 100 },
      { name: "Mechanical Engineering", degree: "B.Tech", duration: "4 years", fees: d(150000), seats: 90 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1200000), highestPackage: d(9500000), placementRate: d(93.0), totalPlaced: 900, topRecruiter: "TCS" },
      { year: 2023, averagePackage: d(1100000), highestPackage: d(8500000), placementRate: d(92.5), totalPlaced: 870, topRecruiter: "Infosys" },
    ],
    reviews: [
      { rating: 4, title: "Solid education at affordable fees", body: "NIT Trichy offers great education for a fraction of the cost of private colleges. The placements are strong and faculty is knowledgeable." },
      { rating: 4, title: "Good campus life", body: "The campus is beautiful, faculty is helpful, and the technical fests are a highlight of the year." },
    ],
  },
  {
    name: "Vellore Institute of Technology",
    slug: "vit-vellore",
    location: "Vellore, Tamil Nadu",
    city: "Vellore",
    state: "Tamil Nadu",
    description:
      "VIT Vellore is a top-ranked private engineering institution known for its industry partnerships, research programs, and impressive placement record. The campus has world-class infrastructure and a diverse student body.",
    type: "Deemed",
    establishedYear: 1984,
    fees: d(420000),
    rating: d(4.2),
    averagePlacement: d(950000),
    highestPlacement: d(8000000),
    totalStudents: 35000,
    accreditation: "NAAC A++",
    website: "https://vit.ac.in",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(420000), seats: 600 },
      { name: "Information Technology", degree: "B.Tech", duration: "4 years", fees: d(400000), seats: 400 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(410000), seats: 350 },
      { name: "Bioinformatics", degree: "B.Tech", duration: "4 years", fees: d(390000), seats: 80 },
    ],
    placements: [
      { year: 2024, averagePackage: d(950000), highestPackage: d(8000000), placementRate: d(87.0), totalPlaced: 5000, topRecruiter: "Wipro" },
      { year: 2023, averagePackage: d(880000), highestPackage: d(7200000), placementRate: d(85.5), totalPlaced: 4800, topRecruiter: "Cognizant" },
    ],
    reviews: [
      { rating: 4, title: "Great infrastructure and placements", body: "The campus facilities are outstanding and placement support is very active. You get exposure to many companies." },
      { rating: 3, title: "Large batch size is a challenge", body: "The sheer number of students makes it hard to get individual attention, but the overall system is well-organized." },
    ],
  },
  {
    name: "Delhi Technological University",
    slug: "dtu-delhi",
    location: "New Delhi, Delhi",
    city: "New Delhi",
    state: "Delhi",
    description:
      "DTU (formerly Delhi College of Engineering) is one of Delhi's premier engineering colleges. Known for strong placements in IT, core engineering, and consulting sectors with a vibrant student culture.",
    type: "Public",
    establishedYear: 1941,
    fees: d(180000),
    rating: d(4.1),
    averagePlacement: d(1000000),
    highestPlacement: d(10000000),
    totalStudents: 10000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(180000), seats: 180 },
      { name: "Software Engineering", degree: "B.Tech", duration: "4 years", fees: d(180000), seats: 120 },
      { name: "Mechanical Engineering", degree: "B.Tech", duration: "4 years", fees: d(180000), seats: 120 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1000000), highestPackage: d(10000000), placementRate: d(89.0), totalPlaced: 1200, topRecruiter: "Microsoft" },
      { year: 2023, averagePackage: d(920000), highestPackage: d(9200000), placementRate: d(88.5), totalPlaced: 1150, topRecruiter: "Amazon" },
    ],
    reviews: [
      { rating: 4, title: "Good value for money", body: "DTU gives you strong placement opportunities at government college fees. The campus is large and facilities have improved a lot." },
      { rating: 4, title: "Active student culture", body: "The technical fests and student clubs are what make DTU special. Great environment to grow beyond just academics." },
    ],
  },
  {
    name: "Manipal Institute of Technology",
    slug: "manipal-institute-technology",
    location: "Manipal, Karnataka",
    city: "Manipal",
    state: "Karnataka",
    description:
      "MIT Manipal is a top-tier private engineering institution known for its global perspective, diverse student community, and excellent industry connections. The autonomous curriculum is regularly updated with industry inputs.",
    type: "Private",
    establishedYear: 1957,
    fees: d(480000),
    rating: d(4.1),
    averagePlacement: d(900000),
    highestPlacement: d(7500000),
    totalStudents: 15000,
    accreditation: "NAAC A+",
    website: "https://manipal.edu/mit.html",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(480000), seats: 300 },
      { name: "Information Technology", degree: "B.Tech", duration: "4 years", fees: d(460000), seats: 200 },
      { name: "Electronics Engineering", degree: "B.Tech", duration: "4 years", fees: d(470000), seats: 200 },
    ],
    placements: [
      { year: 2024, averagePackage: d(900000), highestPackage: d(7500000), placementRate: d(85.0), totalPlaced: 2200, topRecruiter: "Infosys" },
      { year: 2023, averagePackage: d(830000), highestPackage: d(7000000), placementRate: d(83.5), totalPlaced: 2100, topRecruiter: "TCS" },
    ],
    reviews: [
      { rating: 4, title: "International exposure and great culture", body: "The diverse student body and international tie-ups make Manipal stand apart. Great campus life and reasonable placements." },
      { rating: 4, title: "Industry-aligned curriculum", body: "The curriculum is regularly updated and faculty are often industry practitioners. Labs are modern and well-equipped." },
    ],
  },
  {
    name: "SRM Institute of Science and Technology",
    slug: "srm-kattankulathur",
    location: "Kattankulathur, Tamil Nadu",
    city: "Kattankulathur",
    state: "Tamil Nadu",
    description:
      "SRM is one of India's largest private universities, known for its massive campus, strong research focus, and industry partnerships. It has produced alumni across leading global companies.",
    type: "Deemed",
    establishedYear: 1985,
    fees: d(350000),
    rating: d(3.9),
    averagePlacement: d(750000),
    highestPlacement: d(6000000),
    totalStudents: 55000,
    accreditation: "NAAC A++",
    website: "https://www.srmist.edu.in",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(350000), seats: 1000 },
      { name: "Information Technology", degree: "B.Tech", duration: "4 years", fees: d(340000), seats: 600 },
      { name: "Biomedical Engineering", degree: "B.Tech", duration: "4 years", fees: d(320000), seats: 200 },
    ],
    placements: [
      { year: 2024, averagePackage: d(750000), highestPackage: d(6000000), placementRate: d(80.0), totalPlaced: 8000, topRecruiter: "TCS" },
      { year: 2023, averagePackage: d(700000), highestPackage: d(5500000), placementRate: d(78.5), totalPlaced: 7500, topRecruiter: "Accenture" },
    ],
    reviews: [
      { rating: 4, title: "Great infrastructure", body: "SRM has a massive campus with excellent facilities. Sports, events, and cultural activities are abundant. Placements are decent." },
      { rating: 3, title: "Large batch, average faculty", body: "With such a large intake, quality of teaching can be inconsistent. But the placement cell is active and the brand is recognized." },
    ],
  },
  {
    name: "Anna University",
    slug: "anna-university",
    location: "Chennai, Tamil Nadu",
    city: "Chennai",
    state: "Tamil Nadu",
    description:
      "Anna University is Tamil Nadu's premier state university, offering rigorous engineering programs at affordable costs. Its affiliating university status means quality is maintained across many colleges in the region.",
    type: "Public",
    establishedYear: 1978,
    fees: d(80000),
    rating: d(4.0),
    averagePlacement: d(700000),
    highestPlacement: d(5500000),
    totalStudents: 12000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(80000), seats: 200 },
      { name: "Electronics & Communication Engineering", degree: "B.E.", duration: "4 years", fees: d(80000), seats: 180 },
      { name: "Information Technology", degree: "B.E.", duration: "4 years", fees: d(80000), seats: 160 },
    ],
    placements: [
      { year: 2024, averagePackage: d(700000), highestPackage: d(5500000), placementRate: d(82.0), totalPlaced: 1500, topRecruiter: "TCS" },
      { year: 2023, averagePackage: d(650000), highestPackage: d(5000000), placementRate: d(80.5), totalPlaced: 1400, topRecruiter: "Wipro" },
    ],
    reviews: [
      { rating: 4, title: "Affordable quality education", body: "Anna University offers excellent technical education at government fees. The faculty is experienced and curriculum is comprehensive." },
      { rating: 3, title: "Needs infrastructure upgrade", body: "The teaching quality is good but infrastructure needs improvement. Placement support could be stronger." },
    ],
  },
  {
    name: "Amity University Noida",
    slug: "amity-university-noida",
    location: "Noida, Uttar Pradesh",
    city: "Noida",
    state: "Uttar Pradesh",
    description:
      "Amity University is one of India's largest private universities with a sprawling campus in Noida. It offers diverse programs across engineering, management, law, and media with extensive industry tie-ups.",
    type: "Private",
    establishedYear: 2005,
    fees: d(380000),
    rating: d(3.7),
    averagePlacement: d(650000),
    highestPlacement: d(5000000),
    totalStudents: 60000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(380000), seats: 500 },
      { name: "MBA", degree: "MBA", duration: "2 years", fees: d(450000), seats: 300 },
      { name: "Law", degree: "B.A. LLB", duration: "5 years", fees: d(350000), seats: 200 },
    ],
    placements: [
      { year: 2024, averagePackage: d(650000), highestPackage: d(5000000), placementRate: d(75.0), totalPlaced: 4500, topRecruiter: "Accenture" },
      { year: 2023, averagePackage: d(600000), highestPackage: d(4500000), placementRate: d(73.0), totalPlaced: 4200, topRecruiter: "HCL" },
    ],
    reviews: [
      { rating: 4, title: "Beautiful campus and good events", body: "Amity has a gorgeous campus and organizes excellent events. The industry connections through the placement cell are helpful." },
      { rating: 3, title: "Private college costs are high", body: "The fees are steep for the level of education provided, but the brand name does help with placements to some extent." },
    ],
  },
  {
    name: "Jadavpur University",
    slug: "jadavpur-university",
    location: "Kolkata, West Bengal",
    city: "Kolkata",
    state: "West Bengal",
    description:
      "Jadavpur University is one of India's finest public universities, particularly strong in engineering and technology. Known for exceptional academic rigor, it consistently produces top performers in core engineering roles.",
    type: "Public",
    establishedYear: 1955,
    fees: d(50000),
    rating: d(4.3),
    averagePlacement: d(900000),
    highestPlacement: d(8000000),
    totalStudents: 18000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(50000), seats: 120 },
      { name: "Electronics & Tele-Communication Engineering", degree: "B.E.", duration: "4 years", fees: d(50000), seats: 100 },
      { name: "Chemical Engineering", degree: "B.E.", duration: "4 years", fees: d(50000), seats: 80 },
    ],
    placements: [
      { year: 2024, averagePackage: d(900000), highestPackage: d(8000000), placementRate: d(88.0), totalPlaced: 600, topRecruiter: "TCS Research" },
      { year: 2023, averagePackage: d(830000), highestPackage: d(7500000), placementRate: d(86.5), totalPlaced: 580, topRecruiter: "IBM" },
    ],
    reviews: [
      { rating: 5, title: "Academic excellence at minimal cost", body: "Jadavpur offers world-class education at negligible government fees. The academic culture here is intense but rewarding." },
      { rating: 4, title: "Research-oriented environment", body: "If you love research and deep technical learning, JU is perfect. The professors are experts in their fields." },
    ],
  },
  {
    name: "Pune Institute of Computer Technology",
    slug: "pict-pune",
    location: "Pune, Maharashtra",
    city: "Pune",
    state: "Maharashtra",
    description:
      "PICT is one of Pune's premier private engineering institutes, particularly renowned for its Computer Engineering department. Strong alumni connections in IT hubs of Pune and across the country.",
    type: "Private",
    establishedYear: 1983,
    fees: d(140000),
    rating: d(4.0),
    averagePlacement: d(800000),
    highestPlacement: d(6500000),
    totalStudents: 3000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Engineering", degree: "B.E.", duration: "4 years", fees: d(140000), seats: 240 },
      { name: "Information Technology", degree: "B.E.", duration: "4 years", fees: d(140000), seats: 120 },
      { name: "Electronics & Telecommunication", degree: "B.E.", duration: "4 years", fees: d(140000), seats: 120 },
    ],
    placements: [
      { year: 2024, averagePackage: d(800000), highestPackage: d(6500000), placementRate: d(91.0), totalPlaced: 620, topRecruiter: "Persistent Systems" },
      { year: 2023, averagePackage: d(740000), highestPackage: d(6000000), placementRate: d(90.0), totalPlaced: 600, topRecruiter: "Infosys" },
    ],
    reviews: [
      { rating: 4, title: "Best CS college in Pune after IIT/NIT", body: "PICT's CS department is exceptional. The alumni network in Pune's IT industry is very strong and helpful for placements." },
      { rating: 4, title: "Focused and quality education", body: "Smaller batch sizes mean more individual attention. The placement cell is very active and companies visit regularly." },
    ],
  },
  {
    name: "Indian Institute of Technology Madras",
    slug: "iit-madras",
    location: "Chennai, Tamil Nadu",
    city: "Chennai",
    state: "Tamil Nadu",
    description:
      "IIT Madras has been ranked as India's #1 engineering institution multiple times. Known for exceptional research output, a beautiful forested campus, and outstanding entrepreneurship culture with T-Hub.",
    type: "Public",
    establishedYear: 1959,
    fees: d(240000),
    rating: d(4.9),
    averagePlacement: d(2300000),
    highestPlacement: d(26000000),
    totalStudents: 9000,
    accreditation: "NAAC A++",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(240000), seats: 100 },
      { name: "Aerospace Engineering", degree: "B.Tech", duration: "4 years", fees: d(240000), seats: 60 },
      { name: "Ocean Engineering", degree: "B.Tech", duration: "4 years", fees: d(240000), seats: 50 },
      { name: "Data Science & AI", degree: "M.Tech", duration: "2 years", fees: d(170000), seats: 55 },
    ],
    placements: [
      { year: 2024, averagePackage: d(2300000), highestPackage: d(26000000), placementRate: d(98.2), totalPlaced: 800, topRecruiter: "Qualcomm" },
      { year: 2023, averagePackage: d(2100000), highestPackage: d(23000000), placementRate: d(97.9), totalPlaced: 775, topRecruiter: "Apple" },
    ],
    reviews: [
      { rating: 5, title: "India's finest", body: "The campus with the deer park, the research culture, the startup ecosystem — IIT Madras is a league apart." },
      { rating: 5, title: "Exceptional research opportunities", body: "Nowhere else in India will you find this density of research labs and opportunities to work on cutting-edge projects as an undergrad." },
    ],
  },
  {
    name: "Symbiosis Institute of Technology",
    slug: "symbiosis-institute-technology",
    location: "Pune, Maharashtra",
    city: "Pune",
    state: "Maharashtra",
    description:
      "SIT Pune is part of the Symbiosis International University, offering modern engineering programs with a strong focus on industry integration, project-based learning, and international collaboration.",
    type: "Deemed",
    establishedYear: 2008,
    fees: d(280000),
    rating: d(3.8),
    averagePlacement: d(700000),
    highestPlacement: d(5500000),
    totalStudents: 4000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Engineering", degree: "B.Tech", duration: "4 years", fees: d(280000), seats: 180 },
      { name: "Artificial Intelligence & Machine Learning", degree: "B.Tech", duration: "4 years", fees: d(290000), seats: 120 },
      { name: "Civil Engineering", degree: "B.Tech", duration: "4 years", fees: d(260000), seats: 90 },
    ],
    placements: [
      { year: 2024, averagePackage: d(700000), highestPackage: d(5500000), placementRate: d(83.0), totalPlaced: 450, topRecruiter: "Capgemini" },
      { year: 2023, averagePackage: d(640000), highestPackage: d(5000000), placementRate: d(82.0), totalPlaced: 430, topRecruiter: "Tech Mahindra" },
    ],
    reviews: [
      { rating: 4, title: "Modern approach to engineering", body: "SIT's focus on project-based learning and industry internships makes students job-ready from day one." },
      { rating: 3, title: "Newer institution finding its footing", body: "The institution is relatively new but growing rapidly. Placements are improving year on year." },
    ],
  },
  {
    name: "Thapar Institute of Engineering and Technology",
    slug: "thapar-patiala",
    location: "Patiala, Punjab",
    city: "Patiala",
    state: "Punjab",
    description:
      "Thapar Institute is among the top private engineering universities in North India. Known for its strong academic programs, research facilities, and consistent placement record across IT and core sectors.",
    type: "Deemed",
    establishedYear: 1956,
    fees: d(380000),
    rating: d(4.0),
    averagePlacement: d(950000),
    highestPlacement: d(8000000),
    totalStudents: 12000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(380000), seats: 250 },
      { name: "Electronics & Communication Engineering", degree: "B.E.", duration: "4 years", fees: d(370000), seats: 150 },
      { name: "Mechanical Engineering", degree: "B.E.", duration: "4 years", fees: d(360000), seats: 120 },
    ],
    placements: [
      { year: 2024, averagePackage: d(950000), highestPackage: d(8000000), placementRate: d(90.0), totalPlaced: 1500, topRecruiter: "Adobe" },
      { year: 2023, averagePackage: d(880000), highestPackage: d(7500000), placementRate: d(89.0), totalPlaced: 1450, topRecruiter: "Cisco" },
    ],
    reviews: [
      { rating: 4, title: "Strong placements and good culture", body: "Thapar consistently sends students to top IT companies. The campus life is lively and the faculty is generally supportive." },
      { rating: 4, title: "Good for North India students", body: "For students from Punjab and nearby states, Thapar is an excellent choice with a strong local alumni network." },
    ],
  },
  {
    name: "Birla Institute of Technology Mesra",
    slug: "bit-mesra",
    location: "Ranchi, Jharkhand",
    city: "Ranchi",
    state: "Jharkhand",
    description:
      "BIT Mesra is a prestigious deemed university known for its engineering programs, particularly in Computer Science and IT. Located on a scenic campus, it has a strong tradition of academic excellence.",
    type: "Deemed",
    establishedYear: 1955,
    fees: d(280000),
    rating: d(3.9),
    averagePlacement: d(750000),
    highestPlacement: d(6000000),
    totalStudents: 5500,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(280000), seats: 180 },
      { name: "Information Technology", degree: "B.E.", duration: "4 years", fees: d(280000), seats: 120 },
      { name: "Electrical Engineering", degree: "B.E.", duration: "4 years", fees: d(260000), seats: 100 },
    ],
    placements: [
      { year: 2024, averagePackage: d(750000), highestPackage: d(6000000), placementRate: d(82.0), totalPlaced: 600, topRecruiter: "Infosys" },
      { year: 2023, averagePackage: d(700000), highestPackage: d(5500000), placementRate: d(80.5), totalPlaced: 570, topRecruiter: "Wipro" },
    ],
    reviews: [
      { rating: 4, title: "Peaceful campus, strong academics", body: "The serene campus setting is perfect for studying. Faculty is dedicated and the alumni network is helpful for placements." },
      { rating: 3, title: "Remote location but good brand", body: "Being in Ranchi is a double-edged sword — peaceful but somewhat isolated. The brand name carries weight nationally though." },
    ],
  },
  {
    name: "PES University",
    slug: "pes-university-bangalore",
    location: "Bangalore, Karnataka",
    city: "Bangalore",
    state: "Karnataka",
    description:
      "PES University in Bangalore is one of Karnataka's top private engineering universities, ideally located in India's Silicon Valley. Known for industry-integrated programs and strong tech company placements.",
    type: "Private",
    establishedYear: 1988,
    fees: d(320000),
    rating: d(4.0),
    averagePlacement: d(1100000),
    highestPlacement: d(9000000),
    totalStudents: 8000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(320000), seats: 400 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(310000), seats: 180 },
      { name: "Data Science", degree: "B.Tech", duration: "4 years", fees: d(330000), seats: 120 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1100000), highestPackage: d(9000000), placementRate: d(91.0), totalPlaced: 1200, topRecruiter: "Flipkart" },
      { year: 2023, averagePackage: d(1020000), highestPackage: d(8500000), placementRate: d(90.0), totalPlaced: 1150, topRecruiter: "Swiggy" },
    ],
    reviews: [
      { rating: 4, title: "Best private college in Bangalore for CS", body: "PES's location in Bangalore means you get access to top startups and tech companies for internships and placements. Excellent." },
      { rating: 4, title: "Industry exposure is second to none", body: "Guest lectures, hackathons, industry visits — PES keeps you connected to the tech world throughout your degree." },
    ],
  },
  {
    name: "Netaji Subhas University of Technology",
    slug: "nsut-delhi",
    location: "New Delhi, Delhi",
    city: "New Delhi",
    state: "Delhi",
    description:
      "NSUT (formerly NSIT) is a prestigious Delhi government engineering institution, offering quality education at affordable fees. Known for producing top-ranked coders and software engineers.",
    type: "Public",
    establishedYear: 1983,
    fees: d(160000),
    rating: d(4.1),
    averagePlacement: d(1000000),
    highestPlacement: d(9500000),
    totalStudents: 5000,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Engineering", degree: "B.Tech", duration: "4 years", fees: d(160000), seats: 120 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(160000), seats: 100 },
      { name: "Instrumentation & Control Engineering", degree: "B.Tech", duration: "4 years", fees: d(160000), seats: 80 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1000000), highestPackage: d(9500000), placementRate: d(90.5), totalPlaced: 500, topRecruiter: "Google" },
      { year: 2023, averagePackage: d(930000), highestPackage: d(8800000), placementRate: d(89.5), totalPlaced: 480, topRecruiter: "Microsoft" },
    ],
    reviews: [
      { rating: 5, title: "Delhi's hidden gem", body: "NSUT is seriously underrated. The coding culture, competitive programming scene, and placements rival much more famous colleges." },
      { rating: 4, title: "Strong CSE community", body: "If you're into competitive programming and open source, NSUT's CS community is one of the best in Delhi NCR." },
    ],
  },
  {
    name: "Ramaiah Institute of Technology",
    slug: "ramaiah-institute-technology",
    location: "Bangalore, Karnataka",
    city: "Bangalore",
    state: "Karnataka",
    description:
      "MS Ramaiah Institute of Technology is one of Bangalore's oldest and most respected private engineering institutions. With strong industry connections in the IT capital of India, it offers excellent placement opportunities.",
    type: "Private",
    establishedYear: 1962,
    fees: d(200000),
    rating: d(3.9),
    averagePlacement: d(850000),
    highestPlacement: d(7000000),
    totalStudents: 6000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(200000), seats: 300 },
      { name: "Information Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(200000), seats: 180 },
      { name: "Mechanical Engineering", degree: "B.E.", duration: "4 years", fees: d(190000), seats: 150 },
    ],
    placements: [
      { year: 2024, averagePackage: d(850000), highestPackage: d(7000000), placementRate: d(86.0), totalPlaced: 1100, topRecruiter: "Accenture" },
      { year: 2023, averagePackage: d(790000), highestPackage: d(6500000), placementRate: d(85.0), totalPlaced: 1060, topRecruiter: "Infosys" },
    ],
    reviews: [
      { rating: 4, title: "Solid reputation in Bangalore tech scene", body: "MSRIT's name opens doors in Bangalore. Good placement support and an active alumni network in local companies." },
      { rating: 3, title: "Average infrastructure but good faculty", body: "Infrastructure is dated in places but the faculty quality makes up for it. Good for building core skills." },
    ],
  },
  {
    name: "Lovely Professional University",
    slug: "lovely-professional-university",
    location: "Phagwara, Punjab",
    city: "Phagwara",
    state: "Punjab",
    description:
      "LPU is one of India's largest private universities, known for its modern campus, diverse program offerings, and focus on holistic student development including sports, arts, and entrepreneurship.",
    type: "Private",
    establishedYear: 2005,
    fees: d(240000),
    rating: d(3.6),
    averagePlacement: d(600000),
    highestPlacement: d(4500000),
    totalStudents: 80000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(240000), seats: 2000 },
      { name: "MBA", degree: "MBA", duration: "2 years", fees: d(280000), seats: 500 },
      { name: "BCA", degree: "BCA", duration: "3 years", fees: d(180000), seats: 1000 },
    ],
    placements: [
      { year: 2024, averagePackage: d(600000), highestPackage: d(4500000), placementRate: d(72.0), totalPlaced: 12000, topRecruiter: "Cognizant" },
      { year: 2023, averagePackage: d(550000), highestPackage: d(4200000), placementRate: d(70.5), totalPlaced: 11500, topRecruiter: "HCL" },
    ],
    reviews: [
      { rating: 4, title: "Amazing campus facilities", body: "LPU's campus is truly world-class. Sports facilities, labs, hostels — everything is top-tier. A great college experience." },
      { rating: 3, title: "Very large, management can feel impersonal", body: "With 80,000+ students the administration can feel detached. But if you're self-motivated, the resources available are excellent." },
    ],
  },
  {
    name: "Kalinga Institute of Industrial Technology",
    slug: "kiit-bhubaneswar",
    location: "Bhubaneswar, Odisha",
    city: "Bhubaneswar",
    state: "Odisha",
    description:
      "KIIT is a deemed university in Bhubaneswar known for modern infrastructure, international programs, and a strong focus on industry-relevant skills. One of Eastern India's fastest-growing technical universities.",
    type: "Deemed",
    establishedYear: 1992,
    fees: d(320000),
    rating: d(3.8),
    averagePlacement: d(750000),
    highestPlacement: d(5800000),
    totalStudents: 25000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(320000), seats: 800 },
      { name: "Electronics & Telecommunication", degree: "B.Tech", duration: "4 years", fees: d(310000), seats: 400 },
      { name: "Civil Engineering", degree: "B.Tech", duration: "4 years", fees: d(300000), seats: 300 },
    ],
    placements: [
      { year: 2024, averagePackage: d(750000), highestPackage: d(5800000), placementRate: d(81.0), totalPlaced: 3500, topRecruiter: "TCS" },
      { year: 2023, averagePackage: d(700000), highestPackage: d(5400000), placementRate: d(80.0), totalPlaced: 3400, topRecruiter: "Wipro" },
    ],
    reviews: [
      { rating: 4, title: "Best university in Eastern India", body: "KIIT has transformed Bhubaneswar's education landscape. Excellent campus, international collaborations, and good placement support." },
      { rating: 4, title: "International exposure", body: "The international student programs and foreign tie-ups give KIIT a global outlook that's rare for universities in this region." },
    ],
  },
  {
    name: "Indian Institute of Technology Kanpur",
    slug: "iit-kanpur",
    location: "Kanpur, Uttar Pradesh",
    city: "Kanpur",
    state: "Uttar Pradesh",
    description:
      "IIT Kanpur is acclaimed for its entrepreneurial culture, pioneering computer science department (first in India), and innovative academic structure that encourages interdisciplinary research.",
    type: "Public",
    establishedYear: 1959,
    fees: d(220000),
    rating: d(4.8),
    averagePlacement: d(2150000),
    highestPlacement: d(23000000),
    totalStudents: 8000,
    accreditation: "NAAC A++",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(220000), seats: 95 },
      { name: "Electrical Engineering", degree: "B.Tech", duration: "4 years", fees: d(220000), seats: 80 },
      { name: "Physics", degree: "B.S.", duration: "4 years", fees: d(220000), seats: 50 },
    ],
    placements: [
      { year: 2024, averagePackage: d(2150000), highestPackage: d(23000000), placementRate: d(97.5), totalPlaced: 740, topRecruiter: "Rubrik" },
      { year: 2023, averagePackage: d(2000000), highestPackage: d(21000000), placementRate: d(97.0), totalPlaced: 720, topRecruiter: "Two Sigma" },
    ],
    reviews: [
      { rating: 5, title: "Cradle of innovation", body: "IIT Kanpur has the first CS department in India and the innovation culture here is unlike any other campus. Exceptional." },
      { rating: 5, title: "Outstanding faculty and research", body: "The faculty are world-class researchers who are equally passionate about teaching. Research opportunities are immense." },
    ],
  },
  {
    name: "Coimbatore Institute of Technology",
    slug: "cit-coimbatore",
    location: "Coimbatore, Tamil Nadu",
    city: "Coimbatore",
    state: "Tamil Nadu",
    description:
      "CIT Coimbatore is one of Tamil Nadu's top autonomous colleges, known for its strong engineering programs and solid industry connections with Coimbatore's thriving manufacturing and IT sector.",
    type: "Private",
    establishedYear: 1956,
    fees: d(110000),
    rating: d(3.8),
    averagePlacement: d(620000),
    highestPlacement: d(4800000),
    totalStudents: 4500,
    accreditation: "NAAC A",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(110000), seats: 180 },
      { name: "Electronics & Communication Engineering", degree: "B.E.", duration: "4 years", fees: d(110000), seats: 150 },
      { name: "Mechanical Engineering", degree: "B.E.", duration: "4 years", fees: d(105000), seats: 120 },
    ],
    placements: [
      { year: 2024, averagePackage: d(620000), highestPackage: d(4800000), placementRate: d(84.0), totalPlaced: 700, topRecruiter: "Robert Bosch" },
      { year: 2023, averagePackage: d(580000), highestPackage: d(4500000), placementRate: d(82.5), totalPlaced: 670, topRecruiter: "Komatsu" },
    ],
    reviews: [
      { rating: 4, title: "Strong core engineering culture", body: "CIT has a great reputation among manufacturing companies. If you're in mechanical or ECE, the exposure to industry is excellent." },
      { rating: 3, title: "Good academics, limited IT placements", body: "For pure IT roles the placements are not as strong as Chennai colleges. But for core engineering sectors, CIT is solid." },
    ],
  },
  {
    name: "Indraprastha Institute of Information Technology Delhi",
    slug: "iiit-delhi",
    location: "New Delhi, Delhi",
    city: "New Delhi",
    state: "Delhi",
    description:
      "IIIT Delhi is a premier research university focused exclusively on IT and related fields. Despite being young, it has rapidly built a strong reputation with exceptional research output and top-tier placements.",
    type: "Public",
    establishedYear: 2008,
    fees: d(340000),
    rating: d(4.4),
    averagePlacement: d(1600000),
    highestPlacement: d(16000000),
    totalStudents: 2000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(340000), seats: 100 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(340000), seats: 60 },
      { name: "Computational Biology", degree: "B.Tech", duration: "4 years", fees: d(340000), seats: 30 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1600000), highestPackage: d(16000000), placementRate: d(95.0), totalPlaced: 280, topRecruiter: "Uber" },
      { year: 2023, averagePackage: d(1450000), highestPackage: d(14500000), placementRate: d(94.0), totalPlaced: 260, topRecruiter: "Walmart Labs" },
    ],
    reviews: [
      { rating: 5, title: "Best research culture for a young institution", body: "IIIT Delhi punches way above its age. Exceptional research opportunities and the faculty are world-class researchers." },
      { rating: 4, title: "Intense but extremely rewarding", body: "The academic rigour is like an IIT but in a smaller, more focused setting. Placements are stellar for the batch size." },
    ],
  },
  {
    name: "Chandigarh University",
    slug: "chandigarh-university",
    location: "Mohali, Punjab",
    city: "Mohali",
    state: "Punjab",
    description:
      "Chandigarh University is one of North India's fastest-growing private universities, offering modern programs across engineering, business, and law. Known for strong campus placements and international tie-ups.",
    type: "Private",
    establishedYear: 2012,
    fees: d(260000),
    rating: d(3.7),
    averagePlacement: d(650000),
    highestPlacement: d(5000000),
    totalStudents: 35000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.E.", duration: "4 years", fees: d(260000), seats: 800 },
      { name: "MBA", degree: "MBA", duration: "2 years", fees: d(300000), seats: 400 },
      { name: "Civil Engineering", degree: "B.E.", duration: "4 years", fees: d(240000), seats: 300 },
    ],
    placements: [
      { year: 2024, averagePackage: d(650000), highestPackage: d(5000000), placementRate: d(77.0), totalPlaced: 6500, topRecruiter: "Infosys" },
      { year: 2023, averagePackage: d(600000), highestPackage: d(4600000), placementRate: d(75.5), totalPlaced: 6200, topRecruiter: "Wipro" },
    ],
    reviews: [
      { rating: 4, title: "Great value private university", body: "CU offers a wide range of programs at reasonable fees. The campus is modern and student activities are abundant." },
      { rating: 3, title: "Quality varies by department", body: "The CS department is much stronger than some others. Research before choosing your branch here." },
    ],
  },
  {
    name: "Shiv Nadar University",
    slug: "shiv-nadar-university",
    location: "Greater Noida, Uttar Pradesh",
    city: "Greater Noida",
    state: "Uttar Pradesh",
    description:
      "Shiv Nadar University is one of India's top private research universities, founded by the HCL founder. Known for generous scholarships, research focus, and close ties with the HCL ecosystem.",
    type: "Private",
    establishedYear: 2011,
    fees: d(520000),
    rating: d(4.2),
    averagePlacement: d(1200000),
    highestPlacement: d(10000000),
    totalStudents: 5000,
    accreditation: "NAAC A+",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(520000), seats: 200 },
      { name: "Mathematics & Computing", degree: "B.Tech", duration: "4 years", fees: d(520000), seats: 80 },
      { name: "Electrical Engineering", degree: "B.Tech", duration: "4 years", fees: d(510000), seats: 100 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1200000), highestPackage: d(10000000), placementRate: d(93.0), totalPlaced: 600, topRecruiter: "HCL" },
      { year: 2023, averagePackage: d(1100000), highestPackage: d(9500000), placementRate: d(92.0), totalPlaced: 580, topRecruiter: "Oracle" },
    ],
    reviews: [
      { rating: 5, title: "Scholarship-friendly and research-oriented", body: "SNU offers substantial scholarships and the research environment is genuinely top-class for a private institution." },
      { rating: 4, title: "Small campus, big opportunities", body: "The intimate campus size means you get real attention from faculty. Industry connections through HCL are a real advantage." },
    ],
  },
  {
    name: "NIT Warangal",
    slug: "nit-warangal",
    location: "Warangal, Telangana",
    city: "Warangal",
    state: "Telangana",
    description:
      "NIT Warangal is one of the oldest and most prestigious NITs in India. It is particularly known for its vibrant technical culture, strong alumni base, and consistent placement record.",
    type: "Public",
    establishedYear: 1959,
    fees: d(140000),
    rating: d(4.3),
    averagePlacement: d(1150000),
    highestPlacement: d(9000000),
    totalStudents: 7500,
    accreditation: "NAAC A++",
    courses: [
      { name: "Computer Science & Engineering", degree: "B.Tech", duration: "4 years", fees: d(140000), seats: 110 },
      { name: "Electronics & Communication Engineering", degree: "B.Tech", duration: "4 years", fees: d(140000), seats: 100 },
      { name: "Metallurgical Engineering", degree: "B.Tech", duration: "4 years", fees: d(140000), seats: 70 },
    ],
    placements: [
      { year: 2024, averagePackage: d(1150000), highestPackage: d(9000000), placementRate: d(92.5), totalPlaced: 850, topRecruiter: "Microsoft" },
      { year: 2023, averagePackage: d(1060000), highestPackage: d(8500000), placementRate: d(91.8), totalPlaced: 820, topRecruiter: "Amazon" },
    ],
    reviews: [
      { rating: 4, title: "One of the best NITs", body: "NIT Warangal has a strong legacy and the placements prove it. Very competitive peer group and active coding community." },
      { rating: 4, title: "Great for ECE and CSE", body: "If you're in CS or ECE, NIT Warangal is one of the best affordable options in South India. Strong core engineering culture too." },
    ],
  },
];

// ──────────────────────────────────────────────────────────────
// Reviewers
// ──────────────────────────────────────────────────────────────
// Reviews are spread across several accounts so the detail page shows a
// plausible mix of authors rather than the same name on every review.
const reviewerNames = [
  "Ananya Sharma",
  "Rohan Mehta",
  "Priya Nair",
  "Arjun Reddy",
  "Sneha Iyer",
  "Vikram Bose",
];

const DEMO_PASSWORD = "Demo@123";

async function main() {
  console.log("🌱 Seeding database…");

  // Delete in foreign-key order. The cascades would handle most of this, but
  // being explicit makes the intent obvious and the script order-independent.
  await prisma.savedCollege.deleteMany();
  await prisma.review.deleteMany();
  await prisma.placement.deleteMany();
  await prisma.course.deleteMany();
  await prisma.college.deleteMany();
  await prisma.user.deleteMany();
  console.log("   ✓ Cleared existing data");

  // One hash reused across demo accounts: bcrypt at cost 12 takes ~300ms, and
  // hashing the same password eight times would add needless seconds.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUser = await prisma.user.create({
    data: { name: "Demo Student", email: "demo@example.com", passwordHash },
  });

  await prisma.user.create({
    data: { name: "Second Student", email: "second@example.com", passwordHash },
  });

  const reviewers = await Promise.all(
    reviewerNames.map((name, index) =>
      prisma.user.create({
        data: {
          name,
          email: `reviewer${index + 1}@example.com`,
          passwordHash,
        },
      })
    )
  );

  console.log(`   ✓ Created ${reviewers.length + 2} users`);

  // Insert each college with its courses, placements and reviews in a single
  // nested write — one round-trip per college rather than four.
  let reviewerCursor = 0;

  for (const { courses, placements, reviews, ...college } of collegeData) {
    await prisma.college.create({
      data: {
        ...college,
        courses: { create: courses },
        placements: { create: placements },
        reviews: {
          create: reviews.map((review) => {
            // Round-robin so authorship is spread deterministically.
            const author = reviewers[reviewerCursor % reviewers.length];
            reviewerCursor += 1;
            return { ...review, userId: author.id };
          }),
        },
      },
    });
  }

  console.log(`   ✓ Created ${collegeData.length} colleges with courses, placements and reviews`);

  // Give the demo account a starter shortlist so /saved is not empty on a
  // fresh checkout. Ordered by name for determinism.
  const shortlist = await prisma.college.findMany({
    take: 3,
    orderBy: { name: "asc" },
    select: { id: true },
  });

  await prisma.savedCollege.createMany({
    data: shortlist.map((college) => ({
      userId: demoUser.id,
      collegeId: college.id,
    })),
  });

  const [collegeCount, courseCount, placementCount, reviewCount, userCount] =
    await Promise.all([
      prisma.college.count(),
      prisma.course.count(),
      prisma.placement.count(),
      prisma.review.count(),
      prisma.user.count(),
    ]);

  console.log("\n✅ Seed complete");
  console.log(`   ${collegeCount} colleges · ${courseCount} courses · ${placementCount} placements · ${reviewCount} reviews · ${userCount} users`);
  console.log(`   Sign in with: demo@example.com / ${DEMO_PASSWORD}`);
  console.log("   ⚠️  All figures are invented demo data, not verified statistics.\n");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
