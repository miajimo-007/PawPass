/**
 * General first-aid guidance shown in the Emergency screen and on the pet sitter card.
 * Kept deliberately short and conservative: it tells owners when to call a vet,
 * it does not diagnose or suggest treatment.
 */

export const EMERGENCY_SIGNS: string[] = [
  'Difficulty breathing, open-mouth breathing or blue/pale gums',
  'Straining in the litter box with little or no urine (especially male cats)',
  'Collapse, seizures, or sudden weakness or wobbliness',
  'Possible poisoning (see list below) — even with no symptoms yet',
  'Heavy bleeding, a fall from height, or being hit by a car',
  'Repeated vomiting, or vomiting with blood',
  'Not eating for more than 24 hours',
  'Sudden pain, crying out, or unable to use the back legs',
];

export interface Toxin {
  name: string;
  detail: string;
}

export const COMMON_TOXINS: Toxin[] = [
  { name: 'Lilies', detail: 'All parts, including pollen and vase water — even small amounts can cause kidney failure.' },
  { name: 'Paracetamol (acetaminophen)', detail: 'Highly toxic to cats. Never give human painkillers.' },
  { name: 'Ibuprofen & other human anti-inflammatories', detail: 'Can cause stomach ulcers and kidney damage.' },
  { name: 'Dog flea treatments (permethrin)', detail: 'Spot-ons made for dogs can cause tremors and seizures in cats.' },
  { name: 'Antifreeze (ethylene glycol)', detail: 'Sweet-tasting; tiny amounts can be fatal.' },
  { name: 'Onion, garlic, chives, leeks', detail: 'Raw, cooked or powdered — damage red blood cells.' },
  { name: 'Chocolate & caffeine', detail: 'Toxic to cats as well as dogs.' },
  { name: 'Essential oils', detail: 'Tea tree and many others are toxic on skin or when licked.' },
  { name: 'Rodent and insect poisons', detail: 'Including poisoned prey.' },
];

/** Opens a map search for nearby emergency vets (requires internet). */
export const EMERGENCY_VET_SEARCH_URL = 'https://www.google.com/maps/search/24+hour+emergency+vet';
