// Site-wide content settings the team edits by hand.

// Campus photos live in /public/campus/. Set a slot to null to fall back to the product preview.
// Photos from Wikimedia Commons are CC BY-SA 4.0: the credit line must stay visible wherever they're shown.
// Replacing one with your own photo? Set `credit` to null.
export interface Photo {
  src: string;
  alt: string;
  credit: { author: string; license: string; url: string } | null;
}

export const CAMPUS_PHOTOS: { hero: Photo | null; privacy: Photo | null } = {
  hero: {
    src: "/campus/unn-lion-statue.jpg",
    alt: "The lion statue in front of the General Studies building, University of Nigeria, Nsukka",
    credit: {
      author: "Naza Gold",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:General_study_building_(GS)_University_of_Nigeria_Nsukka.jpg",
    },
  },
  privacy: {
    src: "/campus/unn-faculty-of-arts.jpg",
    alt: "The Faculty of Arts building, University of Nigeria, Nsukka",
    credit: {
      author: "Udeagbala",
      license: "CC BY-SA 4.0",
      url: "https://commons.wikimedia.org/wiki/File:Faculty_of_Art_Building,_University_of_Nigeria,_Nsukka.jpg",
    },
  },
};

export const EVENT_NAME = "BlockchainUNN Conference 5.0";
