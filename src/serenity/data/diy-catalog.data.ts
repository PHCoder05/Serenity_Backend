export type DiyStepKey = 'base' | 'protein' | 'fibre';

export type DiyCatalogItemSeed = {
  id: string;
  name: string;
  description: string;
  imageKey: string;
  priceDelta?: number;
};

export type DiyCatalogStepSeed = {
  key: DiyStepKey;
  title: string;
  heroKey: string;
  heroSelectedKey: string;
  items: DiyCatalogItemSeed[];
};

/** Product content for the DIY bowl builder. imageKey maps to app assets. */
export const DIY_CATALOG_STEPS: DiyCatalogStepSeed[] = [
  {
    key: 'base',
    title: 'Select Base',
    heroKey: 'hero-empty',
    heroSelectedKey: 'hero-base',
    items: [
      {
        id: 'white-rice',
        name: 'White Rice',
        description: 'Steamed Basmati rice.',
        imageKey: 'item-white-rice',
        priceDelta: 0,
      },
      {
        id: 'jeera-rice',
        name: 'Jeera Rice',
        description: 'Steamed Basmati rice with a jeera tadka.',
        imageKey: 'item-jeera-rice',
        priceDelta: 0,
      },
      {
        id: 'herbed-rice',
        name: 'Herbed Rice',
        description:
          'Steamed Basmati rice tossed in basil and coriander leaves.',
        imageKey: 'item-herbed-rice',
        priceDelta: 20,
      },
      {
        id: 'brown-rice',
        name: 'Brown Rice',
        description: 'Healthy steamed brown rice.',
        imageKey: 'item-brown-rice',
        priceDelta: 30,
      },
    ],
  },
  {
    key: 'protein',
    title: 'Select Protein',
    heroKey: 'hero-base',
    heroSelectedKey: 'hero-protein',
    items: [
      {
        id: 'rajma-masala',
        name: 'Rajma Masala',
        description: 'Dhaba style rajma masala.',
        imageKey: 'item-rajma',
        priceDelta: 0,
      },
      {
        id: 'soya-kheema',
        name: 'Soya Kheema',
        description: 'Rich in protein.',
        imageKey: 'item-soya',
        priceDelta: 0,
      },
      {
        id: 'amritsari-chole',
        name: 'Amritsari Chole',
        description: 'Slow-cooked chole with Amritsari spice.',
        imageKey: 'item-chole',
        priceDelta: 20,
      },
      {
        id: 'paneer-lababdar',
        name: 'Paneer Lababdar',
        description: 'Creamy paneer in rich gravy.',
        imageKey: 'item-paneer',
        priceDelta: 40,
      },
    ],
  },
  {
    key: 'fibre',
    title: 'Select Fibre',
    heroKey: 'hero-protein',
    heroSelectedKey: 'hero-final',
    items: [
      {
        id: 'dahi-raita',
        name: 'Dahi Raita',
        description: 'Cooling yogurt with cucumber.',
        imageKey: 'item-raita',
        priceDelta: 0,
      },
      {
        id: 'kachumbar',
        name: 'Kachumbar',
        description: 'Fresh chopped salad.',
        imageKey: 'item-kachumbar',
        priceDelta: 0,
      },
      {
        id: 'thai-slaw',
        name: 'Thai Slaw',
        description: 'Crunchy slaw with light dressing.',
        imageKey: 'item-thai-slaw',
        priceDelta: 20,
      },
      {
        id: 'thai-salad',
        name: 'Thai Salad',
        description: 'Herb-forward Thai-style salad.',
        imageKey: 'item-thai-salad',
        priceDelta: 20,
      },
    ],
  },
];

export const DIY_DEFAULT_MENU_ITEM_ID = 'golden-lentil-bowl';
