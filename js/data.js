/** Content for the portfolio. Colours are palette keys (see css/tokens.css). */
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
    color: "cyan",
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
    color: "amber",
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
    color: "lime",
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
    color: "magenta",
  },
];

export const skills = [
  { name: "JavaScript", color: "amber", icon: "assets/icons/javascript.png" },
  { name: "Django", color: "lime", icon: "assets/icons/django.png" },
  { name: "React", color: "cyan", icon: "assets/icons/react.png" },
  { name: "Next.js", color: "violet", icon: "assets/icons/nextjs.png" },
  { name: "Angular", color: "coral", icon: "assets/icons/angular.png" },
];

/** How many squashed bugs (plus all skills) it takes to “ship the release”. */
export const BUGS_TO_SHIP = 5;
