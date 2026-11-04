// BB Helper on the website (Nick, 4.11.2026): a help bot without AI in the corner of every page. It asks with buttons
// and answers with the FAQ (src/texts/faq.md, by id) and short tips from the BB Report Tool's knowledge
// (public/tool/knowledge.json, by check id), so it knows whatever those two know. What a visitor types stays in the
// browser. /quick-help.json puts it together; the build stops on a step or FAQ id that doesn't exist.
//
// A step either asks (say + choices: [button, next step]) or answers (faq: FAQ ids, tips: [knowledge check id, our own
// heading], links: [text, page]). The tool's own titles name a finding from the log ("Model detail is on Highest"),
// which a website can't make, so tips carry a heading of their own and take only the advice. After an answer the bot
// asks "Did that help?"; no leads to `stuck`.

export const START = 'start';

export const STEPS = {
  start: {
    say: "Hi, I'm BB Helper. I answer from our FAQ, without AI. What's wrong?",
    choices: [
      ["The game won't start", 'start-fail'],
      ['It crashes while I play', 'crash'],
      ['Stutter, low FPS or graphics', 'graphics'],
      ['Online or co-op', 'online'],
      ['Controller, saves or mods', 'play'],
      ['Installing or updating', 'install'],
    ],
  },

  'start-fail': {
    say: 'What happens when you press PLAY?',
    choices: [
      ['It closes right away', 'code-3'],
      ['I get an error code or message', 'codes'],
      ['Only a black screen', 'black-screen'],
      ['Windows or my antivirus blocks it', 'antivirus'],
      ["The launcher doesn't open at all", 'no-launcher'],
    ],
  },
  'code-3': { faq: ['code-3'] },
  // Pick a common code or type one; the answers are the items of the FAQ's error code list
  codes: { say: 'Type the code or the message in the box below, or pick a common one:', codes: true },
  'black-screen': { faq: ['black-screen'], tips: [['gpu-driver-crash', 'Update the graphics driver']] },
  antivirus: { faq: ['antivirus'] },
  'no-launcher': {
    say: "Without the launcher its own Help can't run. Try these, in this order:",
    tips: [
      ['fresh-install', 'Unpack the port again'],
      ['reset-launcher-data', 'Reset the launcher settings'],
    ],
    links: [['The BB Report Tool makes a report without the launcher', 'tool/']],
  },

  crash: {
    faq: ['crashes'],
    tips: [
      ['dlss-to-fsr4', 'It freezes with DLSS'],
      ['clear-shader-cache-crash', 'Clear the shader cache'],
      ['mods-off', 'Test once without mods'],
    ],
    choices: [['I saw an error code or message', 'codes']],
  },

  graphics: {
    say: 'What do you see?',
    choices: [
      ['Stutter or low FPS', 'stutter'],
      ['Black screen, flicker or stretched polygons', 'black-screen'],
      ['Which settings for my graphics card?', 'best-settings'],
      ['A wide or ultrawide screen', 'ultrawide'],
    ],
  },
  stutter: {
    faq: ['stutter'],
    tips: [
      ['fps-cap-120', 'FPS drops and crackling audio with a 60 FPS cap'],
      ['gameinput-service', 'Stutter with a controller'],
      ['cpu-cores-generic', 'Windows uses fewer CPU cores than you have'],
    ],
  },
  'best-settings': {
    say: 'The best settings page has settings for your graphics card and explains the goals Smooth, Balanced and Quiet.',
    links: [['Best settings', 'best-settings/']],
  },
  ultrawide: { faq: ['ultrawide'] },

  online: {
    say: 'What do you need?',
    choices: [
      ['Play online for the first time', 'online-first'],
      ['Play with a friend', 'friend'],
      ["Online doesn't connect", 'online-connection'],
      ['An account or a new password', 'account'],
    ],
  },
  'online-first': { faq: ['online'] },
  friend: { faq: ['friend'] },
  'online-connection': { faq: ['online-connection'], links: [['Online play, step by step', 'server/#play']] },
  account: { faq: ['account'] },

  play: {
    say: 'Which one?',
    choices: [
      ['My controller', 'controller'],
      ['My character is gone or broken', 'save-lost'],
      ['Move my characters to a new PC', 'new-pc'],
      ['Bring a character from another version', 'transfer-saves'],
      ['Install mods', 'mods'],
    ],
  },
  controller: { faq: ['controller'], tips: [['steam-input', "The game doesn't see my controller"]] },
  'save-lost': { faq: ['save-lost'] },
  'new-pc': { faq: ['new-pc'] },
  'transfer-saves': { faq: ['transfer-saves'] },
  mods: { faq: ['mods'] },

  install: {
    say: 'Where are you stuck?',
    choices: [
      ["I'm new: what do I need?", 'new'],
      ["The launcher doesn't offer the update", 'update-1-9-3'],
      ['Will an update delete my saves?', 'updates-and-saves'],
      ['Start it from Steam', 'steam'],
      ['Steam Deck, ROG Ally or Linux', 'handhelds'],
    ],
  },
  new: { faq: ['game-files', 'download'], links: [['Install guide, step by step', 'install/']] },
  'update-1-9-3': { faq: ['update-1-9-3'] },
  'updates-and-saves': { faq: ['updates-and-saves'] },
  steam: { faq: ['steam'] },
  handhelds: { faq: ['handhelds'] },

  // "No" after an answer, and typed questions without a match: where a person helps
  stuck: { say: "Sorry that didn't do it. Here is how to get help from a person:", faq: ['help'], end: true },
};
