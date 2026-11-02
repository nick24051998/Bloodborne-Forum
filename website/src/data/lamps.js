// The game's lamps for the map on /server/: where each stands in its area, in the game's own coordinates as SuperMedo
// Server's maps use them (x, and z growing downwards), and its name as the game's lamp list shows it.
// Read from the game's files: the map layouts (the lamp object o009900, entity ids <area>950 on) and the menu texts
// (7000<area> on). Each lies on ground SuperMedo Server's hunters walk, the busiest at the first lamps (2.11.2026).
// The Hunter's Dream has no lamp.
export const LAMPS = {
  m21_01: [["Abandoned Old Workshop", 131.8, 140.5]],
  m22_00: [["Hemwick Charnel Lane", -173.3, 487.2], ["Witch's Abode", -336.3, 736.3]],
  m23_00: [["Old Yharnam", 124.3, 36.5], ["Church of the Good Chalice", -141.4, 58.7], ["Graveyard of the Darkbeast", 112.9, -64.7]],
  m24_00: [["Cathedral Ward", 16.3, 103.5], ["Grand Cathedral", 68.8, 341.5]],
  m24_01: [["1st Floor Sickroom", -201.0, 177.9], ["Central Yharnam", -196.8, 65.4], ["Great Bridge", -123.3, 65.6], ["Tomb of Oedon", -33.5, 88.1]],
  m24_02: [["Upper Cathedral Ward", -25.4, 251.2], ["Altar of Despair", 114.9, 426.9], ["Lumenflower Gardens", 44.7, 299.4]],
  m25_00: [["Forsaken Castle Cainhurst", -3.6, -188.1], ["Vileblood Queen's Chamber", 124.5, -454.5], ["Logarius' Seat", 48.7, -351.5]],
  m26_00: [["Nightmare of Mensis", -54.8, 18.3], ["Wet Nurse's Lunarium", 141.9, -37.9], ["Mergo's Loft: Middle", 138.7, -14.9], ["Mergo's Loft: Base", 86.1, -1.4]],
  m27_00: [["Forbidden Woods", -193.2, 252.6], ["Forbidden Grave", -337.8, 478.5]],
  m28_00: [["Yahar'gul, Unseen Village", 257.4, 67.9], ["Advent Plaza", 420.2, -254.8], ["Hypogean Gaol", 217.9, -79.9], ["Yahar'gul Chapel", 258.7, -56.6]],
  m32_00: [["Byrgenwerth", -402.4, 413.9], ["Lecture Building", -473.1, 596.8], ["Moonside Lake", -510.9, 370.3], ["Lecture Building 2nd Floor", -444.9, 515.9]],
  m33_00: [["Nightmare Frontier", 1.8, -3.5], ["Amygdala's Chamber", -107.5, -41.4]],
  m34_00: [["Hunter's Nightmare", -483.7, -496.4], ["Nightmare Church", -434.5, -597.3], ["Underground Corpse Pile", -407.9, -744.6], ["Nightmare Grand Cathedral", -431.2, -258.5]],
  m35_00: [["Research Hall", -320.9, -825.9], ["Lumenwood Garden", -434.2, -826.4], ["Astral Clocktower", -456.9, -822.4]],
  m36_00: [["Fishing Hamlet", -623.2, -817.2], ["Lighthouse Hut", -647.2, -869.3], ["Coast", -695.2, -945.2]],
};
