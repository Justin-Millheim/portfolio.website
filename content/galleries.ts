export type GalleryItem = { src: string; alt: string };

// Gallery image sets keyed by blog slug, referenced from MDX via <Gallery slug="..." />.
export const galleries: Record<string, GalleryItem[]> = {
  "what-connector-means": [
    { src: "/blog/what-connector-means/1.jpg", alt: "Group of eleven people in yellow rain jackets, red helmets, and life vests posing before rafting" },
    { src: "/blog/what-connector-means/2.jpg", alt: "Hikers with backpacks walking up a narrow rocky canyon with green foliage" },
    { src: "/blog/what-connector-means/3.jpg", alt: "Canyoneers in helmets giving a thumbs-up while wading through a narrow slot canyon" },
    { src: "/blog/what-connector-means/4.jpg", alt: "Group of nine people resting on red sandstone in a desert canyon landscape" },
    { src: "/blog/what-connector-means/5.jpg", alt: "Eleven people in headlamps and helmets smiling together inside a dark cave" },
    { src: "/blog/what-connector-means/6.jpg", alt: "Hammocks strung between trees and a group posing by a rock wall" },
    { src: "/blog/what-connector-means/7.jpg", alt: "Large group of young adults gathered outdoors by a cabin" },
  ],
  "what-ai-enthusiast-means": [
    { src: "/blog/what-ai-enthusiast-means/1.jpg", alt: "Illustrated portrait of a bearded man with a detailed sci-fi cityscape behind him" },
    { src: "/blog/what-ai-enthusiast-means/2.jpg", alt: "Stylized digital portrait of a bearded man's face on a teal background" },
    { src: "/blog/what-ai-enthusiast-means/3.jpg", alt: "Painterly digital portrait of a smiling bearded man in a white shirt" },
  ],
  "pma-command-center": [
    { src: "/blog/pma-command-center/1.png", alt: "Notion page titled PMA Command Center listing the club mission and command-center boards" },
    { src: "/blog/pma-command-center/3.png", alt: "Notion kanban board titled Event & Epic Pipeline with columns from Scoping to Past Events" },
    { src: "/blog/pma-command-center/4.png", alt: "Notion kanban board titled Task Master with Not Started, Blocked, In Progress, and Done columns" },
    { src: "/blog/pma-command-center/2.png", alt: "Notion page of PMA leadership meeting notes with dated, collapsible entries" },
  ],
};
