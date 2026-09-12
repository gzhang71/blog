---
name: write-life-post
description: Draft or revise a Personal Life post for this site (content/life/*.md). Use whenever the user wants to add, write, or edit a life post - travel, cooking, running, reading, hobbies, anything non-technical. Enforces a human voice and blocks AI-sounding prose and invented personal details.
---

# Writing a Personal Life post

These are the only pages on the site where the reader is meeting a person
rather than looking something up. Prose that smells machine-generated defeats
the entire purpose of the section.

## The hard rule: never invent a life

You cannot make up what someone did, ate, felt, or thought. Not a place, not a
meal, not a reaction, not a "small moment" for color. An invented personal
detail is a lie published under the user's name.

So: **interview first, write second.** Ask for the raw material and wait for it.

Ask about four to six of these, then write only from the answers:

- What actually happened, in order? Where, when, who with?
- What went wrong, or surprised you?
- One thing you can see when you think about it - an object, a smell, a sound
- What did it cost, how long did it take, how far was it?
- What did you think at the time vs. what do you think now?
- Would you do it again?

If an answer is thin, ask a follow-up rather than filling the gap yourself.
If the user says "just write something", say plainly that you'd be inventing
their life, and ask for three or four specifics instead.

## File

`content/life/<kebab-case-slug>.md`

```markdown
---
title: "How you'd say it out loud to a friend"
date: YYYY-MM-DD
summary: "One line. Concrete, not a thesis statement."
location: "Optional - city, trail, kitchen, or omit"
---
```

## Length

200-600 words. These are short. A life post that runs long starts performing.

## What makes it not sound like AI

**Specifics over categories.** Not "local cuisine" but the name of the dish.
Not "a beautiful hike" but how long it took and where you turned back. Proper
nouns, numbers, brand names, prices. Specificity is the single strongest signal
that a human with a memory wrote this.

**Vary the sentence lengths, hard.** AI prose defaults to a steady 15-25 word
rhythm. Break it. A three-word sentence. Then one that runs longer than it
strictly needs to because that's how people actually talk when they're
recounting something they enjoyed.

**Let it be unresolved.** Not everything means something. A post can end on a
detail, a joke, or nothing in particular. The compulsion to close with a lesson
is the most recognizable AI tell in personal writing.

**Admit the boring and the bad.** The trip where it rained, the recipe that
came out wrong, the book abandoned at page 60. Uniformly positive writing reads
as marketing copy.

**No metaphor imported from work.** Do not compare cooking to running a
baseline, hiking to gradient descent, or a hobby to a model. It's a tic, and it
makes the section read as an extension of the resume.

### Banned outright

Phrases: "there's something about", "little did I know", "lessons learned",
"at the end of the day", "a testament to", "hidden gem", "journey" as a
metaphor, "little slice of", "chef's kiss", "reminded me that sometimes".

Structures:
- Opening with a rhetorical question
- The tricolon - "slower, simpler, and somehow more honest"
- "It's not about X. It's about Y."
- Ending with a reflective one-line paragraph that zooms out to Life In General
- Present-tense scene-setting as an opener ("The sun is barely up when...")
- Em-dash asides in every other sentence

### Rewrite examples

| Don't | Do |
| --- | --- |
| "I embarked on a culinary journey through the region's vibrant flavors." | "I made the pork thing from page 84 four times in two weeks." |
| "The hike was challenging but incredibly rewarding." | "Four hours up, and I ran out of water twenty minutes from the top." |
| "It reminded me that sometimes the simplest things are the best." | (cut it - end on the previous sentence) |

## Checking your own draft

Read it back and ask: could this have been written by someone who wasn't there?
If yes, it's too generic - go back to the user for specifics. Then count the
proper nouns and numbers; under three or four in a 400-word post means it's
still floating above the actual experience.

## After writing

- Show the draft to the user before saving. It's their voice; they get to
  correct it. Expect to revise.
- `npm run build` must pass.
- Check it renders at `/life/<slug>`.
- Do not commit or deploy unless the user asks.
