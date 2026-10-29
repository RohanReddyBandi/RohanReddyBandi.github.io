// Every word on the site lives here. Anything in [BRACKETS] is a placeholder
// waiting on real content.

export const site = {
  url: 'https://rohanreddybandi.github.io/',
  name: { first: 'Rohan Reddy', last: 'Bandi' },
  initials: 'RRB',
  // The hero subheadline, two lines
  tagline: { lead: 'CS @ Purdue.', rest: 'Building things people actually use.' },
  // Top bar clock. [CONFIRM: West Lafayette, or somewhere else?]
  clock: { city: 'West Lafayette', timeZone: 'America/Indiana/Indianapolis' },
  links: {
    github: 'https://github.com/RohanReddyBandi',
    resume: '/resume.pdf',
  },
  // Projects, in this order. Years come from each repo's first commit.
  // `shot` names the screenshot in src/assets/work/ (see Work.tsx); projects
  // without one show a [SCREENSHOT] placeholder. `short` is the word repeated
  // across that project's row of the gallery wall, `code` its card's tag.
  work: [
    {
      title: 'Duck Days',
      line: 'Pixel-duck countdown widgets for your home screen.',
      detail: 'An iOS app with home screen widgets. Live on the App Store.',
      tags: ['Swift', 'SwiftUI', 'WidgetKit'],
      year: '2026',
      href: 'https://apps.apple.com/us/app/duckdays/id6808773849',
      linkLabel: 'App Store',
      shot: 'duck-days',
      short: 'Duck Days',
      code: 'DD',
      self: false,
    },
    {
      title: 'TRADR',
      line: 'Tinder for stocks.',
      detail:
        'Swipe buy or sell on candlestick charts with fake money, set your own stop loss and take profit, then see what happened and why the call was right or wrong.',
      tags: ['React', 'TypeScript', 'Tailwind', 'lightweight-charts'],
      year: '2026',
      href: 'https://tradr-ebon.vercel.app/',
      linkLabel: 'Live site',
      shot: 'tradr',
      short: 'TRADR',
      code: 'TR',
      self: false,
    },
    {
      title: 'Compound Growth',
      line: 'Starting early beats investing more later.',
      detail:
        'Set a starting amount, a monthly contribution and a return, and watch the curve from 18 to 65 split into what you put in and what compounding made.',
      tags: ['React', 'TypeScript', 'Tailwind', 'Recharts'],
      year: '2025',
      href: 'https://compoundgrowth.vercel.app/',
      linkLabel: 'Live site',
      shot: 'compound-growth',
      short: 'Compound',
      code: 'CG',
      self: false,
    },
    {
      title: 'This Very Website',
      line: 'You’re looking at it.',
      detail:
        'A glyph-field hero you can scramble, a scroll-pinned 3D gallery, a cursor that glitches the page through an SVG backdrop filter, and a duck. Built from scratch.',
      tags: ['React', 'TypeScript', 'GSAP', 'Canvas', 'SVG filters'],
      year: '2026',
      href: 'https://github.com/RohanReddyBandi/RohanReddyBandi.github.io',
      linkLabel: 'Source on GitHub',
      shot: 'this-website',
      short: 'You Are Here',
      code: 'YOU',
      // The finale card: build facts and the site-inside-itself screenshot
      self: true,
    },
  ],
  // Education, in this order. `under` entries sit nested beneath their parent.
  experience: [
    {
      title: 'Purdue University',
      caption: 'B.S. Computer Science',
      when: '[GRAD YEAR]',
      line: '',
      under: [{ title: 'The Data Mine', caption: 'General cohort', when: '[YEAR]', line: '' }],
    },
    {
      title: 'North Allegheny Senior High School',
      caption: '4.38 GPA',
      when: '[GRAD YEAR]',
      line: '',
      under: [],
    },
    {
      title: 'Carnegie Mellon Robotics Academy',
      caption: 'Robotics apprenticeship',
      when: 'Summer 2024',
      line: 'Built an Arduino robot and programmed its movement and sensor responses in C.',
      under: [],
    },
  ],
  nav: [
    { label: 'Projects', href: '#work' },
    { label: 'Education', href: '#experience' },
  ],
}
