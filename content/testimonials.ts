export type Testimonial = {
  quote: string;
  name: string;
  title: string;
  relation: string;
  photo: string;
};

// Real LinkedIn recommendations. Quotes are verbatim excerpts (trimmed for length).
export const testimonials: Testimonial[] = [
  {
    quote:
      "Justin owned the data transformation suite of products at Domo, and over the course of his time on the product, he scoped, defined and released a brand new refresh of Domo's ETL tool, which has been one of the fastest adopted features by Domo customers.",
    name: "Nihar Namjoshi",
    title: "Building Products @ DigitalOcean",
    relation: "Managed Justin at Domo",
    photo: "/testimonials/nihar-namjoshi.jpg",
  },
  {
    quote:
      "Justin creates order from chaos. Surrounded by cowboy coders, nit-picky designers, high-touch customers, over-promising sales teams, and rigid JIRA admins, you will find Justin in his element. He communicates with each in their native tongue to strategically craft a roadmap understood by all parties.",
    name: "Jason Staten",
    title: "Director of Engineering at Measured",
    relation: "Worked with Justin at Domo",
    photo: "/testimonials/jason-staten.jpg",
  },
  {
    quote:
      "Justin is a phenomenal Product Manager. He is extremely knowledgeable in SaaS based technology. He is motivated, passionate, and dependable. Justin always went above and beyond to make sure that everyone had what they needed to succeed.",
    name: "Ashley Humpherys",
    title: "Product Manager at UnitedHealth Group",
    relation: "Worked with Justin at Domo",
    photo: "/testimonials/ashley-humpherys.jpg",
  },
  {
    quote:
      "Justin is exactly the type of person you want to work with. He gets things done on time, on budget, and fixes problems as they arise. He helped organize PMI's 2016 annual convention, and managed the launch and implementation of our lead and management software across PMI's entire 200+ franchisee network.",
    name: "Christopher Layton",
    title: "Icarus Redivivi Companies",
    relation: "Managed Justin at PMI",
    photo: "/testimonials/christopher-layton.jpg",
  },
  {
    quote:
      "As a Supply Chain Intern, Jay approached the role with a highly effective combination of a beginner's mind and initiative. He played a critical part in designing and executing foundational Supply Planning processes and tools here at Specialized.",
    name: "Brian Wang",
    title: "Technical Program Manager at Google",
    relation: "Managed Justin at Specialized",
    photo: "/testimonials/brian-wang.jpg",
  },
  {
    quote:
      "Working alongside Justin has truly been a wonderful experience. He is not only a dedicated and detail-oriented professional, but he also puts genuine thought into everything he does. His impressive analytical skills allow him to thoughtfully assess different options, leading to decisions that are both well-informed and effective.",
    name: "Joanna Hawkins",
    title: "Customer Support & Culture Specialist",
    relation: "Worked with Justin on the same team",
    photo: "/testimonials/joanna-hawkins.jpg",
  },
  {
    quote:
      "Justin is motivated by progress — he loves to do what he can to improve the world around him and gets a lot of satisfaction from this process. While working with him, I saw him raise the marketing standard to a whole new level.",
    name: "Rashauna Larson",
    title: "Graphic Designer",
    relation: "Worked with Justin at The Quarry",
    photo: "/testimonials/rashauna-larson.jpg",
  },
  {
    quote:
      "Justin is well organized, detail oriented, hard working, and smart. I have rarely had a student with greater clarity about his professional passions and career goals. Justin will make a positive difference wherever he chooses to apply his considerable talents.",
    name: "Kurt Sandholtz",
    title: "Leadership & Career Development",
    relation: "Justin's professor at BYU",
    photo: "/testimonials/kurt-sandholtz.jpg",
  },
];
