export const VisualTargets = {
  NAVIGATION_MENU: {
    selector:
      ".w-layout-blockcontainer.wy-nav__container.wy-nav__container--secondary.w-container",
    snapshot: "navigation-menu.png",
    index: 0,
  },

  INDEX_HERO: {
    selector: ".home_hero_content-container",
    snapshot: "index-hero.png",
    index: 0,
  },

  M_LOGO: {
    selector: ".m-logos.bg-light",
    snapshot: "m-logo.png",
    index: 0,
  },

  DATA_WF1: {
    selector: "section[data-wf--section-2col--style-expand-body-copy]",
    snapshot: "data-wf0.png",
    index: 0,
  },

  DATA_WF2: {
    selector: "section[data-wf--section-2col--style-expand-body-copy]",
    snapshot: "data-wf1.png",
    index: 1,
  },
  DATA_WF3: {
    selector: "section[data-wf--section-2col--style-expand-body-copy]",
    snapshot: "data-wf2.png",
    index: 2,
  },
  DATA_WF4: {
    selector: "section[data-wf--section-2col--style-expand-body-copy]",
    snapshot: "data-wf3.png",
    index: 3,
  },
} as const;

export type VisualTargetKey = keyof typeof VisualTargets;
