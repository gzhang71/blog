export const site = {
  name: "Guoqing Zhang",
  shortName: "Guoqing",
  role: "Data Scientist / ML Engineer",
  location: "United States",
  tagline:
    "I build models that have to survive contact with reality — LLM systems, causal inference, recommendations, and the tooling that keeps them honest.",
  url: "https://guoqingzhang.dev",
  email: "happyfamilyznq@gmail.com",
};

/** `track` ids are the keys the click dashboard charts. Keep them stable. */
export const links = [
  {
    label: "Resume",
    href: "https://docs.google.com/document/d/1OpJvRsFsBjA1hv0MIiFnIkgEMc0fpTnojHm9TPUqbxE/edit?usp=sharing",
    track: "resume",
    hint: "Google Doc",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/guoqingzhang/",
    track: "linkedin",
    hint: "in/guoqingzhang",
  },
  {
    label: "GitHub",
    href: "https://github.com/gzhang71",
    track: "github",
    hint: "@gzhang71",
  },
] as const;
