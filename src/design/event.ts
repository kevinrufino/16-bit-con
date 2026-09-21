export const event = {
  name: "16-Bit Con",
  date: "October 3–5, 2026",
  shortDate: "3–5 OCT 2026",
  location: "Javits Center, New York",
  booth: "630",
  tagline: "The retro gaming convention for people who never stopped playing.",
};
export const sessions = [
  {
    time: "10:00 AM",
    title: "The future of retro.",
    type: "Opening keynote",
    place: "Main stage",
    detail:
      "Old hardware. New tricks. What happens when the people who grew up playing start building what comes next?",
    scene: "keynote",
    pattern: "scan",
    tone: "day",
  },
  {
    time: "2:00 PM",
    title: "Pixel art in the age of AI.",
    type: "Panel",
    place: "Main stage",
    detail:
      "Every pixel is a decision. Artists and builders get into the craft, the shortcuts, and the choices that still belong to us.",
    scene: "pixels",
    pattern: "bayer",
    tone: "leaf",
  },
  {
    time: "6:00 PM",
    title: "Vega after party.",
    type: "After party",
    place: "Booth 630",
    detail:
      "Save your progress. Find your people. Meet us at Booth 630 for one more round and a soundtrack worth staying for.",
    scene: "party",
    pattern: "radiate",
    tone: "night",
  },
] as const;
