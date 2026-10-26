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
      { label: 'Shipped', value: 'Duck Days, live on the App Store' },
    ],
  },
  // Selected work, in this order. Years come from each repo's first commit.
  // `shot` names the screenshot in src/assets/work/ (see Work.tsx); projects
  // without one show a [SCREENSHOT] placeholder.
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
    },
  ],
  // Experience, in this order. `under` entries sit nested beneath their parent.
  experience: [
    {
      title: 'Purdue University',
      caption: 'B.S. Computer Science',
      when: '[GRAD YEAR]',
      line: '',
      under: [{ title: 'The Data Mine', caption: 'General cohort', when: '[YEAR]', line: '' }],
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
    { label: 'Work', href: '#work' },
    { label: 'Experience', href: '#experience' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
}
