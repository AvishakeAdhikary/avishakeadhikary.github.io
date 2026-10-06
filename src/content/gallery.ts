import type { AudioTrack, GalleryItem } from "./types";

/** Keys into media-manifest images. Never add document scans here (PII). */
export const gallery: GalleryItem[] = [
  { image: "gallery/AvishakeAmityMCAGradMain.JPG", alt: "Avishake at the MCA convocation", caption: "MCA convocation · Amity University Kolkata, 2023" },
  { image: "awards/baljit-shastri-award.jpg", alt: "Shree Baljit Shastri Award plate", caption: "Shree Baljit Shastri Award · Class of 2023" },
  { image: "gallery/PTSGroup.jpg", alt: "PTS Consulting Services team photo", caption: "The PTS Consulting Services team" },
  { image: "gallery/AvishakeAmityMCAGrad.jpg", alt: "Graduation day", caption: "Graduation day" },
  { image: "gallery/AvishakeAmityBCAGrad.jpg", alt: "BCA graduation", caption: "BCA graduation · 2021" },
  { image: "gallery/AvishakeCover.jpg", alt: "Avishake portrait", caption: "Off-duty" },
  { image: "gallery/AvishakeAmityMerc.HEIC", alt: "Avishake driving a Mercedes", caption: "Behind the wheel · Amity" },
  { image: "gallery/AmityFriends.jpg", alt: "Friends at Amity", caption: "Friends at Amity" },
  { image: "gallery/AvishakeAmityBCAMahalaya.jpg", alt: "Mahalaya celebration at Amity", caption: "Mahalaya at Amity" },
  { image: "gallery/AvishakeAmityBCAJuniorFreshers.jpg", alt: "Junior freshers event", caption: "Hosting the junior freshers" },
  { image: "gallery/AvishakeAmityBCAJuniors.jpg", alt: "With BCA juniors", caption: "With the BCA juniors" },
  { image: "gallery/AvishakeAmityBCAJuniorsAmiphoria.jpg", alt: "Amiphoria fest", caption: "Amiphoria fest" },
  { image: "gallery/AvishakeTanumay.jpg", alt: "Avishake with Tanumay", caption: "With Tanumay" },
  { image: "gallery/AvishakeAdhikaryFreshersDPOptimized.png", alt: "Freshers portrait", caption: "Freshers" },
];

/**
 * CC0 playlist for the music player (Settings → Music source → CC0 playlist).
 * Only CC0 / public-domain tracks belong here. Originals live in
 * media/originals/audio/; `npm run media:optimize` encodes them to AAC .m4a.
 * Licenses verified on each OpenGameArt page (2026-10-04).
 */
export const audioTracks: AudioTrack[] = [
  {
    title: "Chill lofi inspired",
    artist: "omfgdude",
    src: "/media/audio/chill-lofi-inspired.m4a",
    license: "CC0",
    sourceUrl: "https://opengameart.org/content/chill-lofi-inspired",
  },
  {
    title: "Cyberpunk Moonlight Sonata",
    artist: "Joth",
    src: "/media/audio/cyberpunk-moonlight-sonata.m4a",
    license: "CC0",
    sourceUrl: "https://opengameart.org/content/cyberpunk-moonlight-sonata",
  },
  {
    title: "Snowfall",
    artist: "Kistol",
    src: "/media/audio/snowfall.m4a",
    license: "CC0",
    sourceUrl: "https://opengameart.org/content/snowfall",
  },
  {
    title: "The Field Of Dreams",
    artist: "pauliuw",
    src: "/media/audio/the-field-of-dreams.m4a",
    license: "CC0",
    sourceUrl: "https://opengameart.org/content/the-field-of-dreams",
  },
];
