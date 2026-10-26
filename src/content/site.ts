// Every word on the site lives here. Anything in [BRACKETS] is a placeholder
// waiting on real content.

export const site = {
  url: 'https://rohanreddybandi.github.io/',
  name: { first: 'Rohan Reddy', last: 'Bandi' },
  initials: 'RRB',
  // The hero subheadline: the lead stays, the second line follows the market
  tagline: {
    lead: 'CS @ Purdue.',
    bull: 'Building things people actually use.',
    bear: 'Everything is fine.',
  },
  // Top bar clock. [CONFIRM: West Lafayette, or somewhere else?]
  clock: { city: 'West Lafayette', timeZone: 'America/Indiana/Indianapolis' },
  email: '[EMAIL]',
  links: {
    github: 'https://github.com/RohanReddyBandi',
    linkedin: '[LINKEDIN URL]',
    resume: '/resume.pdf',
  },
  about: {
    // [ABOUT LINE]: one or two casual sentences, in your words
    line: '[ABOUT LINE]',
    facts: [
      { label: 'Studying', value: 'B.S. Computer Science, Purdue University' },
      { label: 'Building', value: 'Trackpad Scale, a Mac app that turns the trackpad into a scale' },
    ],
  },
  nav: [
    { label: 'Work', href: '#work' },
    { label: 'Experience', href: '#experience' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
}
