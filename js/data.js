/** Content for the portfolio. */
export const projects = [
  {
    id: "search",
    name: "Google Search",
    kind: "Search experience",
    headline: "Curiosity, on demand",
    description:
      "Web, image, and advanced search with a Google-inspired interface and an “I’m Feeling Lucky” shortcut.",
    tags: ["HTML", "CSS", "Search"],
    url: "https://github.com/HananB27/Google-search",
  },
  {
    id: "auction",
    name: "Auction site",
    kind: "Django commerce platform",
    headline: "A better kind of bidding",
    description:
      "Create listings, bid, save a watchlist, explore categories, and discuss your next find.",
    tags: ["Django", "Python", "E-commerce"],
    url: "https://github.com/HananB27/E-Commerce-Django-website",
  },
  {
    id: "wiki",
    name: "Wiki site",
    kind: "Knowledge platform",
    headline: "Room for every rabbit hole",
    description:
      "Search, create, and edit Markdown encyclopedia entries, or discover something unexpected with a random page.",
    tags: ["Django", "Markdown", "Search"],
    url: "https://github.com/HananB27/Wikipedia-made-with-Django",
  },
  {
    id: "mail",
    name: "Mail",
    kind: "API-powered email client",
    headline: "Good things, delivered",
    description:
      "Send and receive messages, reply, and archive conversations through an interactive API-powered client.",
    tags: ["JavaScript", "API", "Email"],
    url: "https://github.com/HananB27/Mail",
  },
];

export const skills = [
  { name: "JavaScript", icon: "assets/icons/javascript.png" },
  { name: "Django", icon: "assets/icons/django.png" },
  { name: "React", icon: "assets/icons/react.png" },
  { name: "Next.js", icon: "assets/icons/nextjs.png" },
  { name: "Angular", icon: "assets/icons/angular.png" },
];

/** Standing kiosks on the island that open panels in game mode. */
export const kiosks = [
  { id: "about", label: "ABOUT", icon: "person" },
  { id: "contact", label: "CONTACT", icon: "mail" },
];

export const profile = {
  name: "Hanan Bajramović",
  role: "Full stack developer",
  intro: "Hey, I’m Hanan. I’m a full stack developer who enjoys making the web feel a little more human.",
  about: [
    "My software engineering background at the International University of Sarajevo shapes how I approach problems: understand the people, untangle the complexity, and build something useful.",
    "I work across Django, React, Next.js, Angular, and JavaScript, connecting thoughtful interfaces with reliable foundations.",
  ],
  email: "hananbajramovic075@gmail.com",
  phone: "+38761501740",
  github: "https://github.com/HananB27",
  linkedin: "https://www.linkedin.com/in/hananb27-498683229",
  resume: "Resume.pdf",
};
