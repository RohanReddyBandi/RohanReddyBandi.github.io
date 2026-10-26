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
  // Selected work. Years come from each repo's first commit. Previews are
  // [SCREENSHOT] placeholders until real images land in src/assets/work/.
  work: [
    {
      title: 'TRADR',
      line: 'Tinder for stocks.',
      detail:
        'Swipe buy or sell on candlestick charts with fake money, set your own stop loss and take profit, then see what happened and why the call was right or wrong.',
      tags: ['React', 'TypeScript', 'Tailwind', 'lightweight-charts'],
      year: '2026',
      href: 'https://tradr-ebon.vercel.app/',
      linkLabel: 'Live site',
      inProgress: false,
    },
    {
      title: 'Duck Days',
      line: 'Pixel-duck countdown widgets for your home screen.',
      detail: 'An iOS app with home screen widgets. Live on the App Store.',
      tags: ['Swift', 'SwiftUI', 'WidgetKit'],
      year: '2026',
      href: 'https://apps.apple.com/us/app/duckdays/id6808773849',
      linkLabel: 'App Store',
      inProgress: false,
    },
    {
      title: 'Trackpad Scale',
      line: 'A Mac app that uses the trackpad to weigh things.',
      detail: '',
      tags: ['macOS', '[TAGS]'],
      year: '2026',
      href: '',
      linkLabel: '',
      inProgress: true,
    },
  ],
  // Experience reel, in this order. [YEAR]-style brackets are waiting on you.
  experience: [
    {
      title: 'Carnegie Mellon Robotics Academy',
      caption: 'Robotics apprenticeship',
      when: 'Summer 2024',
      line: 'Built an Arduino robot and programmed its movement and sensor responses in C.',
    },
    {
      title: 'The Data Mine',
      caption: 'Purdue University',
      when: '[YEAR]',
      line: 'General cohort.',
    },
    {
      title: 'DECA',
      caption: '[EVENT]',
      when: '[YEAR]',
      line: 'Qualified for ICDC, the International Career Development Conference.',
    },
    {
      title: 'Purdue University',
      caption: 'B.S. Computer Science',
      when: '[GRAD YEAR]',
      line: 'Studying computer science.',
    },
  ],
  ticker: [
    { name: 'TRADR', up: true },
    { name: 'Duck Days', up: true },
    { name: 'Purdue CS', up: true },
    { name: 'Sleep', up: false },
    { name: 'Coffee', up: true },
  ],
  nav: [
    { label: 'Work', href: '#work' },
    { label: 'Experience', href: '#experience' },
    { label: 'About', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ],
}
